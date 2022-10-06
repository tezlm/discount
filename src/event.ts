import type Room from "./room";
import type Member from "./member";

export interface RawEvent {
  event_id: string,
  type: string,
  sender: string,
  content: any,
  unsigned: any,
  origin_server_ts: number,
  state_key?: string,
}

export interface RawStateEvent extends RawEvent {
  state_key: string,
}

export interface RawEphemeralEvent {
  content: any,
  type: string,
}

export interface Relation {
  event: Event,
  relType: string,
}

export class Event<RawType extends RawEvent = RawEvent> {  
  public client = this.room.client;
  public relationsIn:  Array<Relation> | null = null; // events pointing to me
  public relationsOut: Array<Relation> | null = null; // events i pont to
  private _contentCache: any = null;
  
  // TEMP: discard compat
  public flags = new Set();
  public reactions = null; // move to getter?
  
  constructor(
    public room: Room,
    public raw: RawType,
  ) {}
  
  parseRelation(event: Event, relType: string) {
    this._handleRelation(event, relType);
  }
  
  _handleRelation(event: Event, relType: string) {
    if (relType === "m.replace") {
      if (event.raw.sender !== this.raw.sender) return;
      this._contentCache = null;
      this.flags.add("edited");
    }
    
    if (event.relationsOut === null) {
      event.relationsOut = [{ event: this, relType }];
    } else {
      event.relationsOut.push({ event: this, relType });
    }
    
    if (this.relationsIn === null) {
      this.relationsIn = [{ event, relType }];
    } else {
      this.relationsIn.push({ event, relType });
    }
  }
    
  get id(): string {
    return this.raw.event_id;
  }  
  
  get type(): string {
    return this.raw.type;
  }
  
  get sender(): Member {
    const member = this.room.members.get(this.raw.sender);
    if (!member) throw "could not find member";
    return member;
  }
  
  // should handle edits, e2ee, and legacy events
  get content(): any {
    if (this._contentCache) return this._contentCache;
    
    const edit = this.relationsIn?.find(i => i.relType === "m.replace");   
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
    return !!this.raw.state_key;
  }
  
  async redact(reason?: string) {
    const txn = Math.random().toString(36);
    this.client.fetcher.redact(this.room.id, this.id, txn, reason);
    return await this.client.transaction(txn);
  }
  
  // edit(content: any) {}
  // reply(type: string, content: any) {}
  
  get stateKey(): string | undefined {
    return this.raw.state_key;
  }
  
  // TEMP: discard compat
  get eventId(): string { return this.raw.event_id }
  get roomId(): string { return this.room.id }  
  get date(): Date { return this.timestamp }  
}

export class StateEvent extends Event<RawStateEvent> {  
  constructor(room: Room, raw: RawStateEvent) {
    super(room, raw);
  }
  
  get stateKey(): string {
    return this.raw.state_key;
  }
}

export class EphemeralEvent {  
  public client = this.room.client;
  
  constructor(
    public room: Room,
    public raw: RawEphemeralEvent,
  ) {}  
  
  get type(): string {
    return this.raw.type;
  }
  
  get content(): string {
    return this.raw.content;
  }
}
