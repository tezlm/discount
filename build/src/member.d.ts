import type Room from "./room";
import type { StateEvent } from "./event";
export declare type Membership = "join" | "knock" | "invite" | "leave" | "ban";
export default class Member {
    room: Room;
    event: StateEvent;
    client: import("./client").default;
    id: string;
    name: string;
    avatar: string;
    constructor(room: Room, event: StateEvent);
    get membership(): Membership;
    get power(): number;
    ban(reason: string): Promise<void>;
    kick(reason?: string): Promise<void>;
    unban(reason: string): Promise<void>;
    get userId(): string;
}
