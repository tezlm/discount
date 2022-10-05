import type Room from "./room";

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

export class Event<RawType extends RawEvent = RawEvent> {  
  public client = this.room.client;
  // public relationsIn: Array<Event> = [];
  // public relationsOut: Array<Event> = [];
  // private cacheContent: any = {};
  
  constructor(
    public room: Room,
    public raw: RawType,
  ) {}  
  
  get id(): string {
    return this.raw.event_id;
  }  
  
  get type(): string {
    return this.raw.type;
  }
  
  get sender(): string {
    return this.raw.sender;
  }
  
  get content(): any {
    return this.raw.content;
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
