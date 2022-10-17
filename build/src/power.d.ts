import type Client from "./client";
import type Room from "./room";
interface RawPowerLevels {
    redact: number;
    invite: number;
    kick: number;
    ban: number;
    events_default: number;
    state_default: number;
    users_default: number;
    events: {
        [eventType: string]: number;
    };
    users: {
        [userId: string]: number;
    };
}
export default class PowerLevels {
    room: Room;
    client: Client;
    levels: Partial<RawPowerLevels>;
    constructor(room: Room);
    get me(): number;
    get redact(): number;
    get invite(): number;
    get ban(): number;
    get kick(): number;
    forEvent(eventType: string): number;
    forState(eventType: string): number;
    forUser(userId: string): number;
}
export {};
