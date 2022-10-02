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
    get id() {
        return this.event.stateKey;
    }
    get membership() {
        return this.event.content.membership ?? "leave";
    }
    get power() {
        // TODO: power should always be defined in room
        return this.room.power?.getUser(this.id) ?? 0;
    }
}
