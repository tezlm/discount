import type Client from "./client";
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

export class Event<RawType extends RawEvent = RawEvent> {  
  constructor(
    public client: Client,
    public room: Room,
    protected raw: RawType,
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
  
  // redact(reason: string) {}
  // edit(content: any) {}
}

export class StateEvent extends Event<RawStateEvent> {  
  constructor(client: Client, room: Room, raw: RawStateEvent) {
    super(client, room, raw);
  }
  
  get stateKey(): string {
    return this.raw.state_key;
  }
}
