import type Room from "./room";
// import type { RawStateEvent } from "./api";
import { Event, StateEvent } from "./event";

export default class Timeline extends Array {
  public client = this.room.client;
  private relations = new Map<string, Array<Event>>();
  
  constructor(
    public room: Room,
    public batchPrev: string | null,
    public batchNext: string | null,
    events: Array<Event>,
  ) {
    super();
    this.push(...events);
  }
  
  async fetch(direction: "backwards" | "forwards") {
    if (direction === "backwards") {
      if (!this.batchPrev) return;
      const res = await this.client.fetcher.fetchMessages(this.room.id, this.batchPrev, "b");
      this.batchPrev = res.end;
      for (let raw of res.state) {
        this.room.handleState(new StateEvent(this.client, this.room, raw));
      }
      for (let raw of res.batch) {
        if (raw.unsigned?.redacted_because) continue;
        // raw.type === "m.room.redaction"
      }
    } else {
      // if (!this.batchNext) return;
      // const res = await this.client.fetcher.fetchMessages(this.room.id, this.batchNext, "f");
      // this.batchNext = res.start;
      // for (let raw of res.state) {
      //   this.room.handleState(new StateEvent(this.client, this.room, raw));
      // }
    }
  }
}
