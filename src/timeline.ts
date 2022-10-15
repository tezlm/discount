import type Room from "./room";
// import type { RawStateEvent } from "./api";
import { Event, StateEvent } from "./event";
 
export default class Timeline extends Array {
  public client = this.room.client;
  private events = this.room.events;
  // private relations = new Map<string, Array<Event>>();
  
  constructor(
    public room: Room,
    private batchPrev: string | null,
    private batchNext: string | null,
  ) {
    super();
  }

  async fetch(direction: "backwards" | "forwards") {
    if (direction === "backwards") {
      if (!this.batchPrev) return 0;
      const res = await this.client.fetcher.fetchMessages(this.room.id, this.batchPrev, "b");
      this.batchPrev = res.end;
      for (let raw of res.state) {
        this.room.handleState(new StateEvent(this.room, raw));
      }
      for (let raw of res.chunk) {
        if (raw.unsigned?.redacted_because) continue;
        if (raw.type === "m.room.redaction") continue;
        this._add(new Event(this.room, raw));
      }
    } else {
      if (!this.batchNext) return 0;
      const res = await this.client.fetcher.fetchMessages(this.room.id, this.batchNext, "f");
      this.batchNext = res.start;
      for (let raw of res.state) {
        this.room.handleState(new StateEvent(this.room, raw));
      }
    }
  }

  // merge(other: Timeline): boolean {
  // }

  _add(event: Event, toBeginning = false) {
    if (this.events.has(event.id)) {
      console.warn("skipping duplicate event " + event.id);
      return;
    }

    // TODO: relations
    /*
    if (this.events.has(rel.eventId)) {
      this.events.get(rel.eventId)._handleRelation(rel.relType);
    }
    */

    this.events.set(event.id, event);
    this[toBeginning ? "unshift" : "push"](event);
  }
}
