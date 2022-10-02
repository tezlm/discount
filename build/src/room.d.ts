import type Client from "./client";
import type { StateEvent } from "./event";
import Members from "./members";
declare type JoinRule = "invite" | "public" | "knock" | "restricted" | "knock_restricted";
export default class Room {
    client: Client;
    id: string;
    private state;
    private _cachePower;
    name: string | null;
    topic: string | null;
    avatar: string | null;
    type: string | null;
    joinRule: JoinRule;
    members: Members;
    accountData: Map<String, any>;
    notifications: {
        unread: number;
        highlight: number;
    };
    constructor(client: Client, id: string);
    getState(type: string, key?: string): StateEvent | undefined;
    getAllState(type: string): Array<StateEvent>;
    handleState(event: StateEvent, check?: boolean): void;
    get power(): object | null;
    sendEvent(type: string, content: any): Promise<StateEvent | import("./event").Event<import("./event").RawEvent>>;
    sendState(type: string, content: any, stateKey?: string): Promise<void>;
    get tombstone(): any;
    get roomId(): string;
    get readEvent(): any;
}
export {};
