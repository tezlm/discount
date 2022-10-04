// import type { RawStateEvent } from "./api";
import { StateEvent } from "./event";
export default class Timeline extends Array {
    room;
    batchPrev;
    batchNext;
    client = this.room.client;
    // private relations = new Map<string, Array<Event>>();
    constructor(room, batchPrev, batchNext, events) {
        super();
        this.room = room;
        this.batchPrev = batchPrev;
        this.batchNext = batchNext;
        this.push(...events);
    }
    async fetch(direction) {
        if (direction === "backwards") {
            if (!this.batchPrev)
                return;
            const res = await this.client.fetcher.fetchMessages(this.room.id, this.batchPrev, "b");
            this.batchPrev = res.end;
            for (let raw of res.state) {
                this.room.handleState(new StateEvent(this.room, raw));
            }
            for (let raw of res.chunk) {
                if (raw.unsigned?.redacted_because)
                    continue;
                // raw.type === "m.room.redaction"
            }
        }
        else {
            // if (!this.batchNext) return;
            // const res = await this.client.fetcher.fetchMessages(this.room.id, this.batchNext, "f");
            // this.batchNext = res.start;
            // for (let raw of res.state) {
            //   this.room.handleState(new StateEvent(this.client, this.room, raw));
            // }
        }
    }
}
