// import type { RawStateEvent } from "./api";
import { Event, StateEvent } from "./event";
function getRelations(event) {
    const cont = event.content["m.relates_to"];
    const relations = [];
    if (cont["m.in_reply_to"]) {
        relations.push({
            relType: "m.in_reply_to",
            eventId: cont["m.in_reply_to"].event_id,
            fallback: cont.is_falling_back
        });
    }
    if (cont.rel_type) {
        relations.push({
            relType: cont.rel_type,
            eventId: cont.event_id,
            key: cont.key,
            fallback: false,
        });
    }
    return relations;
}
export default class Timeline extends Array {
    room;
    batchPrev;
    batchNext;
    client = this.room.client;
    events = this.room.events;
    constructor(room, batchPrev, batchNext) {
        super();
        this.room = room;
        this.batchPrev = batchPrev;
        this.batchNext = batchNext;
    }
    async fetch(direction) {
        let res;
        if (direction === "backwards") {
            if (!this.batchPrev)
                return 0;
            res = await this.client.fetcher.fetchMessages(this.room.id, this.batchPrev, "b");
            this.batchNext = res.end;
        }
        else {
            if (!this.batchNext)
                return 0;
            res = await this.client.fetcher.fetchMessages(this.room.id, this.batchNext, "f");
            this.batchPrev = res.end;
        }
        for (let raw of res.state) {
            this.room.handleState(new StateEvent(this.room, raw));
        }
        for (let raw of res.chunk) {
            if (raw.unsigned?.redacted_because)
                continue;
            if (raw.type === "m.room.redaction")
                continue;
            this._add(new Event(this.room, raw), direction === "backwards");
        }
    }
    // merge(other: Timeline): boolean {
    // }
    _add(event, toBeginning = false) {
        const relQueue = this.events._queuedRelations;
        // queue outgoing relations
        for (let { eventId, relType, key, fallback } of getRelations(event)) {
            const rel = { event, relType, key, fallback };
            if (this.events.has(eventId)) {
                this.events.get(eventId).parseRelation(rel, toBeginning);
            }
            else if (relQueue.has(eventId)) {
                relQueue.get(eventId)[toBeginning ? "unshift" : "push"](rel);
            }
            else {
                relQueue.set(eventId, [rel]);
            }
        }
        // parse incoming relations
        if (relQueue.has(event.id)) {
            for (let rel of relQueue.get(event.id)) {
                event.parseRelation(rel);
            }
        }
        // TODO: transaction/local echo events
        // this.events.set(event.id, event);
        // this[toBeginning ? "unshift" : "push"](event);
        // TEMP: discard doesn't like having m.reaction events in the timeline
        this.events.set(event.id, event);
        if (event.type !== "m.room.reaction")
            this[toBeginning ? "unshift" : "push"](event);
    }
    _redact(redaction) {
        const redactedId = redaction.raw.redacts ?? redaction.content.redacts;
        const redactedEvent = this.events.get(redactedId);
        const idx = this.lastIndexOf(redactedEvent);
        if (idx !== -1)
            this.splice(idx, 1);
        this.events.delete(redactedId);
    }
}
