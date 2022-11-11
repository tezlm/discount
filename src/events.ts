import type Client from "./client";
import type Room from "./room";
import { Event, StateEvent, Relation } from "./event";
import Timeline from "./timeline";

export default class Events extends Map<string, Event> {
  public client: Client;
  public live: Timeline | null = null;
  public timelines = new Set<Timeline>();
  public _queuedRelations = new Map<string, Array<Relation>>();
  
  constructor(public room: Room) {
    super();
    this.client = room.client;
  }
  
  async fetch(eventId: string): Promise<Event> {
    if (this.has(eventId)) return this.get(eventId)!;
    const raw = await this.client.fetcher.fetchEvent(this.room.id, eventId);
    const event = new Event(this.room, raw);
    this.set(eventId, event);
    return event;
  }
  
  async fetchTimeline(eventId?: string): Promise<Timeline> {
    if (eventId) {
      if (this.live?.find(i => i.id === eventId)) return this.live;
      for (let tl of this.timelines) {
        if (tl.find(i => i.id === eventId)) return tl;
      }
      
      const res = await this.client.fetcher.fetchContext(this.room.id, eventId, 50);
      const timeline = new Timeline(this.room, res.start, res.end);
      for (let raw of res.state ?? []) {
        this.room.handleState(new StateEvent(this.room, raw));
      }
      
      for (let raw of [...res.events_before, res.event, ...res.events_after]) {
        if (raw.unsigned?.redacted_because) continue;
        if (raw.type === "m.room.redaction") continue;
        if (raw.state_key && this.room.getState(raw.type, raw.state_key)?.id !== raw.event_id) {
          this.room.handleState(new StateEvent(this.room, raw as any));
        }

        timeline._add(new Event(this.room, raw));
      }
    
      this.timelines.add(timeline);
      return timeline;
    } else {
      if (this.live) return this.live;
      const res = await this.client.fetcher.fetchMessages(this.room.id);
      // const timeline = new Timeline(this.room, res.end, res.start);
      const timeline = new Timeline(this.room, res.end, null);
      for (let raw of res.state ?? []) {
        this.room.handleState(new StateEvent(this.room, raw));
      }
    
      for (let raw of res.chunk.reverse()) {
        if (raw.unsigned?.redacted_because) continue;
        if (raw.type === "m.room.redaction") continue;
        if (raw.state_key && this.room.getState(raw.type, raw.state_key)?.id !== raw.event_id) {
          this.room.handleState(new StateEvent(this.room, raw as any));
        }

        timeline._add(new Event(this.room, raw));
      }
      
      this.live = timeline;
      return timeline;
    }
  }
}
