import type Room from "./room";
import type * as api from "./api";
import { Event, StateEvent } from "./event";

function getRelations(event: Event): Array<{ relType: string, eventId: string, key?: string, fallback: boolean }> {
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

export default class Timeline extends Array {
  public client = this.room.client;
  private events = this.room.events;
  private _forwardsProm: Promise<api.Messages> | null = null;
  private _backwardsProm: Promise<api.Messages> | null = null;
  
  constructor(
    public room: Room,
    private batchPrev: string | null,
    private batchNext: string | null,
  ) {
    super();
  }
  
  private getFetch(direction: "backwards" | "forwards"): Promise<api.Messages> | null {
    const limit = this.length < 20 ? 20 : 200;
    if (direction === "backwards") {
      if (this._backwardsProm) return this._backwardsProm;
      if (!this.batchPrev) return null;
      this._backwardsProm = this.client.fetcher.fetchMessages(this.room.id, this.batchPrev, "b", limit);
      return this._backwardsProm;
    } else {
      if (this._forwardsProm) return this._forwardsProm;
      if (!this.batchNext) return null;
      this._forwardsProm = this.client.fetcher.fetchMessages(this.room.id, this.batchNext, "f", limit);
      return this._forwardsProm;
    }
  }
  
  async fetch(direction: "backwards" | "forwards") {
    const res = await this.getFetch(direction);
    if (!res) return 0;
    if (direction === "backwards") {
      this.batchPrev = res.end;
      this._backwardsProm = null;
    } else {
      this.batchNext = res.end;
      this._forwardsProm = null;
    }
    
    for (let raw of res.state ?? []) {
      this.room.handleState(new StateEvent(this.room, raw));
    }
    
    let added = 0;
    for (let raw of res.chunk ?? []) {
      if (raw.unsigned?.redacted_because) continue;
      if (raw.type === "m.room.redaction") continue;
      this._add(new Event(this.room, raw), direction === "backwards");
      added++;
    }
    
    return added;
  }

  // merge(other: Timeline): boolean {
  // }

  _add(event: Event, toBeginning = false) {
    const relQueue = this.events._queuedRelations;
    
    // queue outgoing relations
    for (let { eventId, relType, key, fallback } of getRelations(event)) {
      const rel = { event, relType, key, fallback };
      if (this.events.has(eventId)) {
        this.events.get(eventId)!._handleRelation(rel, toBeginning);
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

    // TEMP: discard doesn't like having m.reaction events in the timeline
    this.events.set(event.id, event);
    if (event.type !== "m.reaction" && !event.content["m.new_content"]) this[toBeginning ? "unshift" : "push"](event);
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
