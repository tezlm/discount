import type Client from "./client";
import type Room from "./room";
import type { StateEvent } from "./event";
import User from "./user";
export declare type Membership = "join" | "knock" | "invite" | "leave" | "ban";
export default class Member {
    client: Client;
    room: Room;
    private event;
    constructor(client: Client, room: Room, event: StateEvent);
    get user(): User;
    get membership(): Membership;
}
