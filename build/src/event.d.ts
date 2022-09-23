import type Client from "./client";
import type Room from "./room";
export interface RawEvent {
    event_id: string;
    type: string;
    sender: string;
    content: any;
    unsigned: any;
    origin_server_ts: number;
    state_key?: string;
}
export interface RawStateEvent extends RawEvent {
    state_key: string;
}
export declare class Event<RawType extends RawEvent = RawEvent> {
    client: Client;
    room: Room;
    protected raw: RawType;
    constructor(client: Client, room: Room, raw: RawType);
    get id(): string;
    get type(): string;
    get sender(): string;
    get content(): any;
    get unsigned(): any;
    get timestamp(): Date;
    isState(): this is StateEvent;
    redact(reason?: string): Promise<StateEvent | Event<RawEvent>>;
    get stateKey(): string | undefined;
}
export declare class StateEvent extends Event<RawStateEvent> {
    constructor(client: Client, room: Room, raw: RawStateEvent);
    get stateKey(): string;
}
