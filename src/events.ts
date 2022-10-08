import type Room from "./room";
import { Event } from "./event";
import Timeline from "./timeline";

export default class Events extends Map {
  public client = this.room.client;
  _relations = new Map();
  
  constructor(
    public room: Room,
    public readonly live: Timeline,
  ) {
    super();
  }
  
  async fetch(id: string): Promise<Event> {
    if (this.has(id)) return this.get(id);
    const raw = await this.client.fetcher.fetchEvent(this.room.id, id);
    const event = new Event(this.room, raw);
    this.set(id, event);
    return event;
  }
  
  async context(_id: string): Promise<Timeline> {
    throw "unimplemented!";
  }
}
