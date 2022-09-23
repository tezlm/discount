import Emitter from "./emitter.js";
import Fetcher from "./fetcher.js";
import type * as api from "./api.js";
import Room from "./room.js";
import { Event, StateEvent } from "./event.js";
export interface ClientConfig {
    token: string;
    baseUrl: string;
}
export declare type ClientStatus = "stopped" | "starting" | "syncing" | "reconnecting";
interface ClientEvents {
    on(event: "status", listener: () => any): this;
    on(event: "ready", listener: () => any): this;
    on(event: "error", listener: (error: Error) => any): this;
    on(event: "event", listener: (event: Event) => any): this;
    on(event: "state", listener: (state: StateEvent) => any): this;
    on(event: "accountData", listener: (events: [api.AccountData], room: Room | null) => any): this;
    on(event: "notifications", listener: (events: {
        unread: number;
        highlight: number;
    }, room: Room) => any): this;
}
export default class Client extends Emitter implements ClientEvents {
    status: ClientStatus;
    fetcher: Fetcher;
    rooms: Map<string, Room>;
    private transactions;
    constructor(config: ClientConfig);
    private setStatus;
    private handleError;
    private retry;
    private sync;
    private handleSync;
    transaction(id: string): Promise<Event | StateEvent>;
    start(): Promise<void>;
}
export {};
