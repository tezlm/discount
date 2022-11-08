import type Room from "./room";
import { Event, StateEvent, Relation } from "./event";
import Timeline from "./timeline";

export default class Events extends Map<string, Event> {
  public client = this.room.client;
  public live: Timeline | null = null;
  public _queuedRelations: Map<string, Array<Relation>> = new Map();
  
  constructor(public room: Room) {
    super();
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
      // const context = await this.client.fetcher.fetchContext(this.room.id, eventId, 50);
      // console.log(context);
      throw new Error("fetching a timeline from event context is currently unimplemented!");
    } else {
      if (this.live) return this.live;
      const res = await this.client.fetcher.fetchMessages(this.room.id);
      const timeline = new Timeline(this.room, res.end, res.start);
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
