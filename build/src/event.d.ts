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
    room: Room;
    protected raw: RawType;
    client: import("./client").default;
    constructor(room: Room, raw: RawType);
    get id(): string;
    get type(): string;
    get sender(): string;
    get content(): any;
    get unsigned(): any;
    get timestamp(): Date;
    isState(): this is StateEvent;
    redact(reason?: string): Promise<Event<RawEvent> | StateEvent>;
    get stateKey(): string | undefined;
    get eventId(): string;
    get roomId(): string;
}
export declare class StateEvent extends Event<RawStateEvent> {
    constructor(room: Room, raw: RawStateEvent);
    get stateKey(): string;
}
