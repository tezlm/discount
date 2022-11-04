import type Room from "./room";
import { Event, Relation } from "./event";
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
      throw "unimplemented! cannot fetch timeline for context";
    } else {
      if (this.live) return this.live;
      throw "unimplemented! cannot fetch new live timeline";
    }
  }
}
