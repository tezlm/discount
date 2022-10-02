export class Event {
    client;
    room;
    raw;
    relations = [];
    // private cacheContent: any = {};
    constructor(client, room, raw) {
        this.client = client;
        this.room = room;
        this.raw = raw;
    }
    get id() {
        return this.raw.event_id;
    }
    get eventId() {
        return this.raw.event_id;
    }
    get type() {
        return this.raw.type;
    }
    get sender() {
        return this.raw.sender;
    }
    get content() {
        return this.raw.content;
    }
    get unsigned() {
        return this.raw.unsigned;
    }
    get timestamp() {
        return new Date(this.raw.origin_server_ts);
    }
    isState() {
        return !!this.raw.state_key;
    }
    async redact(reason) {
        const txn = Math.random().toString(36);
        this.client.fetcher.redact(this.room.id, this.id, txn, reason);
        return await this.client.transaction(txn);
    }
    // edit(content: any) {}
    // reply(type: string, content: any) {}
    get stateKey() {
        return this.raw.state_key;
    }
}
export class StateEvent extends Event {
    constructor(client, room, raw) {
        super(client, room, raw);
    }
    get stateKey() {
        return this.raw.state_key;
    }
}
