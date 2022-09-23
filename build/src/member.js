import User from "./user";
export default class Member {
    client;
    room;
    event;
    constructor(client, room, event) {
        if (!event.stateKey)
            throw "event must have stateKey";
        this.client = client;
        this.room = room;
        this.event = event;
    }
    get user() {
        return new User(this.client, this.event.stateKey, this.event.content);
    }
    get membership() {
        return this.event.content.membership ?? "leave";
    }
}
