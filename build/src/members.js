import { StateEvent } from "./event";
import Member from "./member";
export default class Members extends Map {
    room;
    request = null;
    sortCache = new Map();
    client = this.room.client;
    constructor(room) {
        super();
        this.room = room;
    }
    _handle(event) {
        if (event.type !== "m.room.member")
            throw "not m.room.member";
        const id = event.stateKey;
        const member = new Member(this.client, this.room, event);
        this.set(id, member);
        this.sortCache.delete(event.content.membership);
        this.sortCache.delete(event.unsigned?.prev_content?.membership);
    }
    async fetch() {
        if (this.request)
            return this.request;
        this.request = this.client.fetcher.fetchMembers(this.room.id)
            .then(({ chunk }) => {
            for (let raw of chunk) {
                let event = new StateEvent(this.client, this.room, raw);
                this.room.handleState(event);
            }
        });
        return this.request;
    }
    with(membership) {
        if (this.sortCache.has(membership))
            return this.sortCache.get(membership);
        const cmp = (a, b) => a > b ? 1 : a < b ? -1 : 0;
        const members = [...this.values()]
            .filter(i => i.membership === membership)
            .sort((a, b) => cmp(b.power, a.power) || cmp(a.name, b.name));
        this.sortCache.set(membership, members);
        return members;
    }
}
