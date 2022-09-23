export default class Room {
    client;
    id;
    state = [];
    constructor(client, id) {
        this.client = client;
        this.id = id;
    }
    getState(type, key = "") {
        return this.state.find(i => i.type === type && i.stateKey === key);
    }
    handleState(event, check = true) {
        if (check) {
            const idx = this.state.findIndex(i => i.type === event.type && i.stateKey === event.stateKey);
            if (idx !== -1)
                this.state.splice(idx, 1);
        }
        this.state.push(event);
    }
    get type() {
        return this.getState("m.room.create")?.content.type;
    }
    get name() {
        return this.getState("m.room.name")?.content.name;
    }
    get topic() {
        return this.getState("m.room.topic")?.content.topic;
    }
    get avatar() {
        return this.getState("m.room.avatar")?.content.url;
    }
    // leave() {}
    // join() {}
    // invite(who: User | string) {}
    // members: Cache<Member>
    async sendEvent(type, content) {
        const txn = Math.random().toString(36);
        this.client.fetcher.sendEvent(this.id, type, content, txn);
        return await this.client.transaction(txn);
    }
    async sendState(type, content, stateKey = "") {
        await this.client.fetcher.sendState(this.id, type, content, stateKey);
    }
}
