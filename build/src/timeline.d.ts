import type Room from "./room";
import { Event } from "./event";
export default class Timeline extends Array {
    room: Room;
    batchPrev: string | null;
    batchNext: string | null;
    client: import("./client").default;
    constructor(room: Room, batchPrev: string | null, batchNext: string | null, events: Array<Event>);
    fetch(direction: "backwards" | "forwards"): Promise<void>;
}
