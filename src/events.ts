import type Client from "./client.ts";
import type Room from "./room.ts";
import { Event, StateEvent, Relation } from "./event.ts";
import Timeline from "./timeline.ts";

function parseRelations(event: Event): Array<{ relType: string, eventId: string, key?: string, fallback: boolean }> {
  const cont = event.content["m.relates_to"];
  if (!cont) return [];
  const relations = [];
  if (cont["m.in_reply_to"]) {
    relations.push({
      relType: "m.in_reply_to",
      eventId: cont["m.in_reply_to"].event_id,
      fallback: cont.is_falling_back
    });
  }
  if (cont.rel_type) {
    relations.push({
      relType: cont.rel_type,
      eventId: cont.event_id,
      key: cont.key,
      fallback: false,
    });
  }
  return relations;
}

export default class Events extends Map<string, Event> {
  public client: Client;
  public room: Room;
  public live: Timeline;
  public timelines = new Set<Timeline>();
  public _queuedRelations = new Map<string, Array<Relation>>();
  
  constructor(public room: Room) {
    super();
    this.client = room.client;
    this.room = room;
    this.live = new Timeline(room, "", null, this);
  }
  
  _handleEvent(event: Event, toBeginning = false) {
    const relQueue = this._queuedRelations;
    
    // queue outgoing relations
    for (let { eventId, relType, key, fallback } of parseRelations(event)) {
      const rel = { event, relType, key, fallback };
      if (this.has(eventId)) {
        this.get(eventId)!._handleRelation(rel, toBeginning);
      } else if (relQueue.has(eventId)) {
        relQueue.get(eventId)![toBeginning ? "unshift" : "push"](rel);
      } else {
        relQueue.set(eventId, [rel]);
      }
    }
    
    // parse incoming relations
    if (relQueue.has(event.id)) {
      for (let rel of relQueue.get(event.id)!) {
        event._handleRelation(rel);
      }
    }

    this.set(event.id, event);
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
