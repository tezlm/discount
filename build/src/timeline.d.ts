import type Room from "./room";
import { Event } from "./event";
export default class Timeline extends Array {
    room: Room;
    private batchPrev;
    private batchNext;
    client: import("./client").default;
    private events;
    constructor(room: Room, batchPrev: string | null, batchNext: string | null);
    fetch(direction: "backwards" | "forwards"): Promise<0 | undefined>;
    _add(event: Event, toBeginning?: boolean): void;
    _redact(redaction: Event): void;
}
