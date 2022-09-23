import type Client from "./client";
import type { StateEvent } from "./event";
export default class Room {
    client: Client;
    id: string;
    private state;
    constructor(client: Client, id: string);
    getState(type: string, key?: string): StateEvent | undefined;
    handleState(event: StateEvent, check?: boolean): void;
    get type(): string;
    get name(): string;
    get topic(): string;
    get avatar(): string;
    sendEvent(type: string, content: any): Promise<StateEvent | import("./event").Event<import("./event").RawEvent>>;
    sendState(type: string, content: any, stateKey?: string): Promise<void>;
}
