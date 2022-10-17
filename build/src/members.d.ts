import type Room from "./room";
import { StateEvent } from "./event";
import Member, { Membership } from "./member";
export default class Members extends Map<string, Member> {
    room: Room;
    private request;
    private sortCache;
    client: import("./client").default;
    constructor(room: Room);
    _handle(event: StateEvent): void;
    fetch(): Promise<any>;
    with(membership: Membership): Array<Member>;
}
