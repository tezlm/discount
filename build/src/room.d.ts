import type Client from "./client";
import type { StateEvent } from "./event";
import Members from "./members";
import Events from "./events";
declare type JoinRule = "invite" | "public" | "knock" | "restricted" | "knock_restricted";
export default class Room {
    client: Client;
    readonly id: string;
    private state;
    private _cachePower;
    name: string | null;
    topic: string | null;
    avatar: string | null;
    type: string | null;
    members: Members;
    events: Events;
    accountData: Map<string, any>;
    notifications: {
        unread: number;
        highlight: number;
    };
    constructor(client: Client, id: string);
    getState(type: string, key?: string): StateEvent | undefined;
    getAllState(type: string): Array<StateEvent>;
    handleState(event: StateEvent, check?: boolean): void;
    get power(): any;
    sendEvent(type: string, content: any): Promise<import("./event").Event<import("./event").RawEvent> | StateEvent>;
    sendState(type: string, content: any, stateKey?: string): Promise<void>;
    get tombstone(): any;
    get roomId(): string;
    get readEvent(): any;
    joinRule: JoinRule;
}
export {};
