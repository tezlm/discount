import type Client from "./client";
import type Room from "./room";
import type { StateEvent } from "./event";
export declare type Membership = "join" | "knock" | "invite" | "leave" | "ban";
export default class Member {
    client: Client;
    room: Room;
    event: StateEvent;
    id: string;
    name: string;
    avatar: string;
    constructor(client: Client, room: Room, event: StateEvent);
    get membership(): Membership;
    get power(): number;
    get userId(): string;
}
