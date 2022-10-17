// import Emitter from "./emitter";
import Members from "./members";
import Events from "./events";
export default class Room {
    client;
    id;
    state = [];
    _cachePower = null;
    name = null;
    topic = null;
    avatar = null;
    type = null;
    members = new Members(this);
    events = new Events(this);
    accountData = new Map();
    notifications = { unread: 0, highlight: 0 };
    constructor(client, id) {
        this.client = client;
        this.id = id;
    }
    getState(type, key = "") {
        return this.state.find(i => i.type === type && i.stateKey === key);
    }
    getAllState(type) {
        return this.state.filter(i => i.type === type);
    }
    handleState(event, check = true) {
        if (check) {
            const idx = this.state.findIndex(i => i.type === event.type && i.stateKey === event.stateKey);
            if (idx !== -1)
                this.state.splice(idx, 1);
        }
        switch (event.type) {
            case "m.room.name":
                this.name = event.content.name ?? null;
                break;
            case "m.room.topic":
                this.topic = event.content.topic ?? null;
                break;
            case "m.room.avatar":
                this.avatar = event.content.url ?? null;
                break;
            case "m.room.create":
                this.type = event.content.type ?? null;
                break;
            case "m.room.join_rules":
                this.joinRule = event.content?.join_rule ?? "invite";
                break;
            case "m.room.power_levels":
                this._cachePower = null;
                break;
            case "m.room.member": this.members._handle(event);
        }
        this.state.push(event);
    }
    // leave() {}
    // join() {}
    // invite(who: User | string) {}
    get power() {
        if (this._cachePower)
            return this._cachePower;
        const power = this.getState("m.room.power_levels")?.content ?? { state_default: 50, users_default: 50 };
        this._cachePower = {
            ...power,
            me: power.users?.[this.client.userId] ?? power.users_default ?? 0,
            getEvent: (name) => power.events?.[name] ?? power.events_default ?? 0,
            getState: (name) => power.state?.[name] ?? power.state_default ?? 50,
            getUser: (id) => power.users?.[id] ?? power.users_default ?? 0,
        };
        return this._cachePower;
    }
    async sendEvent(type, content) {
        const txn = Math.random().toString(36);
        this.client.fetcher.sendEvent(this.id, type, content, txn);
        return await this.client.transaction(txn);
    }
    async sendState(type, content, stateKey = "") {
        await this.client.fetcher.sendState(this.id, type, content, stateKey);
    }
    // TEMP: discard parity
    get tombstone() { return this.getState("m.room.tombstone")?.content; }
    get roomId() { return this.id; }
    get readEvent() { return this.accountData?.get("m.fully_read")?.event_id ?? null; }
    joinRule = "invite";
}
