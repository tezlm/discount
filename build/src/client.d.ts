import Emitter from "./emitter";
import Fetcher from "./fetcher";
import type * as api from "./api";
import Room from "./room";
import Invite from "./invite";
import { Event, StateEvent, EphemeralEvent } from "./event.js";
export interface ClientConfig {
    token: string;
    baseUrl: string;
    userId: string;
}
export declare type ClientStatus = "stopped" | "starting" | "syncing" | "reconnecting";
interface ClientEvents {
    on(event: "status", listener: () => any): this;
    on(event: "ready", listener: () => any): this;
    on(event: "error", listener: (error: Error) => any): this;
    on(event: "event", listener: (event: Event) => any): this;
    on(event: "state", listener: (state: StateEvent) => any): this;
    on(event: "ephemeral", listener: (edu: EphemeralEvent) => any): this;
    on(event: "join", listener: (room: Room, prevPatch: string) => any): this;
    on(event: "invite", listener: (room: Invite) => any): this;
    on(event: "leave", listener: (room: Room) => any): this;
    on(event: "leave-invite", listener: (room: Invite) => any): this;
    on(event: "accountData", listener: (event: api.AccountData) => any): this;
    on(event: "roomAccountData", listener: (event: api.AccountData, room: Room) => any): this;
    on(event: "notifications", listener: (events: {
        unread: number;
        highlight: number;
    }, room: Room) => any): this;
}
export default class Client extends Emitter implements ClientEvents {
    status: ClientStatus;
    fetcher: Fetcher;
    userId: string;
    rooms: Map<string, Room>;
    invites: Map<string, Invite>;
    accountData: Map<string, any>;
    private transactions;
    private abort;
    constructor(config: ClientConfig);
    private setStatus;
    private handleError;
    private sync;
    private handleSync;
    transaction(id: string): Promise<Event | StateEvent>;
    start(): Promise<void>;
    stop(): Promise<void>;
}
export {};
