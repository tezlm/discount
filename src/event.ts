import type Room from "./room.ts";
import type Member from "./member.ts";
import type Client from "./client.ts";
import type { RawEvent, RawStateEvent, RawEphemeralEvent } from "./api.ts";
import Relations from "./relations.ts";
import { intern } from "./util.ts";

export interface RawLocalEvent {
  type: string,
  content: any,
  state_key?: any,
  redacts?: string,
}

export interface Relation {
  event: Event,
  relType: string,
  key?: string,
  fallback: boolean,
}

function useLessMemory(raw: RawEvent) {
  raw.type = intern(raw.type);
  raw.sender = intern(raw.sender);
  raw.event_id = intern(raw.event_id);
  if (raw.state_key) raw.state_key = intern(raw.state_key);
  if (raw.type === "m.room.membership") {
    const content = raw.content;
    content.displayname && (content.displayname = intern(content.displayname));
    content.avatar_url && (content.avatar_url = intern(content.avatar_url));
    content.membership && (content.membership = intern(content.membership));
  }
}

export class Event<RawType extends RawEvent = RawEvent> {
  public client: Client;
  public raw: RawType;
  public relationsIn:  Array<Relation> | null = null; // events pointing to me
  public relationsOut: Array<Relation> | null = null; // events i point to
  private _contentCache: any = null;
  
  public id: string;
  public type: string;
  public stateKey: string | undefined;
  
  constructor(public room: Room, raw: RawType) {
    this.client = room.client;
    
    useLessMemory(raw);
    this.raw = raw;
    
    this.id = raw.event_id;
    this.type = raw.type;
    this.stateKey = raw.state_key;
  }
    
  _handleRelation(relation: Relation, toBeginning = false) {
    const { event, relType } = relation;
    
    if (relType === "m.replace") {
      if (event.raw.sender !== this.raw.sender) return;
      this._contentCache = null;
      this.flags.add("edited");
    } else if (relType === "m.annotation") {
      this._reactionsCache = null;
    }
    
    if (event.relationsOut === null) {
      event.relationsOut = [{ ...relation, event: this }];
    } else {
      event.relationsOut[toBeginning ? "unshift" : "push"]({ ...relation, event: this });
    }
    
    if (this.relationsIn === null) {
      this.relationsIn = [relation];
    } else {
      this.relationsIn[toBeginning ? "unshift" : "push"](relation);
    }
  }
  
  _handleUnrelation(rel: Relation) {
    if (!this.relationsIn) return;
    const { relType } = rel;
    for (let i = 0; i < this.relationsIn.length; i++) {
      if (this.relationsIn[i].event.id === rel.event.id) {
        this.relationsIn.splice(i--, 1);
        if (relType === "m.replace") this._contentCache = null;
        if (relType === "m.annotation") this._reactionsCache = null;
      }
    }
  }
  
  async fetchRelations(relType?: string, eventType?: string) {
    const fetched = await this.client.fetcher.fetchRelations(this.room.id, this.id, { relType, eventType });
    return new Relations(this, fetched, { relType, eventType });
  }
  
  get sender(): Member | { id: string } {
    const member = this.room.members.get(this.raw.sender);
    if (!member) {
      console.warn("could not find member " + this.raw.sender);
      return { id: this.raw.sender };
    }
    return member;
  }
  
  // should handle edits, e2ee, and legacy events
  get content(): any {
    if (this._contentCache) return this._contentCache;
    
    // @ts-ignore
    const edit = this.relationsIn?.findLast(i => i.relType === "m.replace");   
    const content = edit
      ? { ...edit.event.content["m.new_content"], "m.relates_to": this.raw.content["m.relates_to"] }
      : this.raw.content;
    
    this._contentCache = content;
    return content;
  }
  
  get unsigned(): any {
    return this.raw.unsigned;
  }
  
  get timestamp(): Date {
    return new Date(this.raw.origin_server_ts);
  }
  
  isState(): this is StateEvent {
    return typeof this.raw.state_key !== "undefined";
  }
  
  isLocal(): this is LocalEvent {
    return false;
  }
  
  async redact(reason?: string, txnId = "~" + Math.random().toString(36)) {
    const ev = new LocalEvent(this.room, { type: "m.room.redaction", content: { redacts: this.id }, redacts: this.id }, txnId);
    ev.flags.add("sending");
    this.room.events.live?._redact(ev);
    this.client.emit("redact", ev);
    this.client._transactions.set(txnId, ev);
    await this.client.fetcher.redactEvent(this.room.id, this.id, txnId, reason);
    return ev;
  }
  
  async edit(content: any, txnId?: string) {
    if (this.isState()) {
      return this.room.sendState(this.type, content, this.stateKey);
    }
    
    // @ts-ignore
    const edit = this.relationsIn?.findLast(i => i.relType === "m.replace");   
    
    return this.room.sendEvent(this.type, {
      "m.relates_to": {
        rel_type: "m.replace",
        event_id: edit?.id ?? this.id,
      },
      "m.new_content": content,
    }, txnId);
  }
  
  reply(type: string, content: any, txnId?: string) {
    if (this.isState()) throw "Cannot edit state events for now";
    return this.room.sendEvent(type, {
      ...content,
      "m.relates_to": {
        "m.in_reply_to": {
          event_id: this.id,
        },
        ...content["m.relates_to"],
      },
    }, txnId);
  }
  
  // TEMP: discard compat
  public flags = new Set<string>();
  
  private _reactionsCache: Map<string, Array<Event>> | null = null;
  get reactions() {
    if (this._reactionsCache) return this._reactionsCache;
    const reactions: Map<string, Array<Event>> = new Map();
    for (let i of this.relationsIn ?? []) {
      if (i.relType !== "m.annotation" || !i.key) continue;
      if (reactions.has(i.key)) {
        reactions.get(i.key)!.push(i.event);
      } else {
        reactions.set(i.key, [i.event]);
      }
    }
    this._reactionsCache = reactions.size ? reactions : null;
    return this._reactionsCache;
  }
}

export class StateEvent extends Event<RawStateEvent> {
  public stateKey: string;
  
  constructor(room: Room, raw: RawStateEvent) {
    super(room, raw);
    this.stateKey = raw.state_key;
  }
}

export class EphemeralEvent {  
  public client: Client;
  
  constructor(
    public room: Room,
    public raw: RawEphemeralEvent,
  ) {
    this.client = room.client;
  }
  
  get type(): string {
    return this.raw.type;
  }
  
  get content(): any {
    return this.raw.content;
  }  
}

export class LocalEvent extends Event {
  public status: "sending" | "errored" | "sent" = "sending";
  
  constructor(room: Room, raw: RawLocalEvent, txnId: string) {
    super(room, {
      event_id: txnId,
      sender: room.client.userId,
      origin_server_ts: Date.now(),
      ...raw,
    });
  }
  
  upgrade(raw: RawEvent) {
    useLessMemory(raw);
    this.raw = raw;
    this.id = raw.event_id;
    this.stateKey = raw.state_key;
  }
  
  isLocal(): this is LocalEvent {
    return this.status !== "sent";
  }
}
