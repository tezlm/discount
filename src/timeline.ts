import type Room from "./room.ts";
import type Client from "./client.ts";
import type Events from "./events.ts";
import type * as api from "./api.ts";
import { Event, StateEvent } from "./event.ts";

export default class Timeline extends Array {
  public client: Client;
  private events: Events;
  private _forwardsProm: Promise<number> | null = null;
  private _backwardsProm: Promise<number> | null = null;
  
  constructor(
    public room: Room,
    public batchPrev: string | null,
    public batchNext: string | null,
    _events?: Events,
  ) {
    super();
    this.client = room.client;
    this.events = _events ?? room.events;
  }
  
  private async fetchItems(direction: "backwards" | "forwards"): Promise<number> {
    const limit = this.length < 20 ? 20 : 100;
    let res: api.Messages;
    if (direction === "backwards") {
      if (this.batchPrev === null) return 0;
      res = await this.client.fetcher.fetchMessages(this.room.id, { from: this.batchPrev, direction: "b", limit });
      this.batchPrev = res.end ?? null;
    } else {
      if (this.batchNext === null) return 0;
      res = await this.client.fetcher.fetchMessages(this.room.id, { from: this.batchNext, direction: "f", limit });
      this.batchNext = res.end ?? null;
    }
    
    for (let raw of res.state ?? []) {
      this.room.handleState(new StateEvent(this.room, raw));
    }
    
    let added = 0;
    for (let raw of res.chunk ?? []) {
      if (raw.unsigned?.redacted_because) continue;
      if (raw.type === "m.room.redaction") continue;
      if (raw.state_key && this.room.getState(raw.type, raw.state_key)?.id !== raw.event_id) {
        this.room.handleState(new StateEvent(this.room, raw as any));
      }
      
      this._add(new Event(this.room, raw), direction === "backwards");
      added++;
    }
    return added;
  }
  
  async fetch(direction: "backwards" | "forwards") {
    const promName = direction === "backwards" ? "_backwardsProm" : "_forwardsProm";
    if (this[promName]) return this[promName];
    
    const prom = this.fetchItems(direction)
      .then((count: number) => {
        this[promName] = null;
        return count;
      });
    this[promName] = prom;
    return prom;    
  }

  // merge(other: Timeline): boolean {
  // }

  _add(event: Event, toBeginning = false) {
    if (this.find(i => i.id === event.id)) {
      console.warn("got duplicate event!", event.id);
      return;
    }

    this.events._handleEvent(event, toBeginning);
    if (event.type === "m.reaction") return; // TODO: remove
    if (event.content["m.relates_to"]?.rel_type === "m.replace") return;
    this[toBeginning ? "unshift" : "push"](event);
  }
  
  _redact(redaction: Event) {
    const redactedId = redaction.raw.redacts ?? redaction.content.redacts;
    const redactedEvent = this.events.get(redactedId);
    const idx = this.lastIndexOf(redactedEvent);
    if (idx !== -1) this.splice(idx, 1);
    if (redactedEvent?.relationsOut) {
      for (let rel of redactedEvent.relationsOut) {
        rel.event._handleUnrelation({ ...rel, event: redactedEvent });
      }
    }
    this.events.delete(redactedId);
  }
}
