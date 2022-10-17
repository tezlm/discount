import { intern } from "./util";
export class Event {
    room;
    client = this.room.client;
    raw;
    relationsIn = null; // events pointing to me
    relationsOut = null; // events i pont to
    _contentCache = null;
    id;
    type;
    stateKey;
    // TEMP: discard compat
    flags = new Set();
    reactions = null; // move to getter?
    constructor(room, raw) {
        this.room = room;
        raw.type = intern(raw.type);
        raw.sender = intern(raw.sender);
        raw.event_id = intern(raw.event_id);
        if (raw.state_key)
            raw.state_key = intern(raw.state_key);
        if (raw.type === "m.room.membership") {
            const content = raw.content;
            content.displayname && (content.displayname = intern(content.displayname));
            content.avatar_url && (content.avatar_url = intern(content.avatar_url));
            content.membership && (content.membership = intern(content.membership));
        }
        this.id = intern(raw.event_id);
        this.type = intern(raw.type);
        if (raw.state_key)
            this.stateKey = intern(raw.state_key);
        this.raw = raw;
    }
    parseRelation(relation, toBeginning = false) {
        const { event, relType } = relation;
        if (relType === "m.replace") {
            if (event.raw.sender !== this.raw.sender)
                return;
            this._contentCache = null;
            this.flags.add("edited");
        }
        if (event.relationsOut === null) {
            event.relationsOut = [relation];
        }
        else {
            event.relationsOut[toBeginning ? "unshift" : "push"](relation);
        }
        if (this.relationsIn === null) {
            this.relationsIn = [relation];
        }
        else {
            this.relationsIn[toBeginning ? "unshift" : "push"](relation);
        }
    }
    get sender() {
        const member = this.room.members.get(this.raw.sender);
        if (!member)
            throw "could not find member " + this.raw.sender;
        return member;
    }
    // should handle edits, e2ee, and legacy events
    get content() {
        if (this._contentCache)
            return this._contentCache;
        const edit = this.relationsIn?.findLast(i => i.relType === "m.replace");
        const content = edit
            ? { ...edit.event.content["m.new_content"], "m.relates_to": this.raw.content["m.relates_to"] }
            : this.raw.content;
        this._contentCache = content;
        return content;
    }
    get unsigned() {
        return this.raw.unsigned;
    }
    get timestamp() {
        return new Date(this.raw.origin_server_ts);
    }
    isState() {
        return typeof this.raw.state_key !== "undefined";
    }
    // isLocalEcho(): boolean {
    //   return this.id[0] === "~";
    // }
    async redact(reason) {
        const txn = Math.random().toString(36);
        this.client.fetcher.redactEvent(this.room.id, this.id, reason);
        return await this.client.transaction(txn);
    }
    // edit(content: any) {}
    // reply(type: string, content: any) {}
    // TEMP: discard compat
    get eventId() { return this.raw.event_id; }
    get roomId() { return this.room.id; }
    get date() { return this.timestamp; }
}
export class StateEvent extends Event {
    stateKey;
    constructor(room, raw) {
        super(room, raw);
        this.stateKey = intern(raw.state_key);
    }
}
export class EphemeralEvent {
    room;
    raw;
    client = this.room.client;
    constructor(room, raw) {
        this.room = room;
        this.raw = raw;
    }
    get type() {
        return this.raw.type;
    }
    get content() {
        return this.raw.content;
    }
}
