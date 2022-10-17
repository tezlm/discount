import type Room from "./room";
import type Member from "./member";
export interface RawEvent {
    event_id: string;
    type: string;
    sender: string;
    content: any;
    unsigned: any;
    origin_server_ts: number;
    state_key?: string;
    redacts?: string;
}
export interface RawStateEvent extends RawEvent {
    state_key: string;
}
export interface RawEphemeralEvent {
    content: any;
    type: string;
}
export interface Relation {
    event: Event;
    relType: string;
    key?: string;
    fallback: boolean;
}
export declare class Event<RawType extends RawEvent = RawEvent> {
    room: Room;
    client: import("./client").default;
    raw: RawType;
    relationsIn: Array<Relation> | null;
    relationsOut: Array<Relation> | null;
    private _contentCache;
    id: string;
    type: string;
    stateKey: string | undefined;
    flags: Set<unknown>;
    reactions: null;
    constructor(room: Room, raw: RawType);
    parseRelation(relation: Relation, toBeginning?: boolean): void;
    get sender(): Member;
    get content(): any;
    get unsigned(): any;
    get timestamp(): Date;
    isState(): this is StateEvent;
    redact(reason?: string): Promise<Event<RawEvent> | StateEvent>;
    get eventId(): string;
    get roomId(): string;
    get date(): Date;
}
export declare class StateEvent extends Event<RawStateEvent> {
    stateKey: string;
    constructor(room: Room, raw: RawStateEvent);
}
export declare class EphemeralEvent {
    room: Room;
    raw: RawEphemeralEvent;
    client: import("./client").default;
    constructor(room: Room, raw: RawEphemeralEvent);
    get type(): string;
    get content(): any;
}
