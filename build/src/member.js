// export default class Member extends User {
export default class Member {
    room;
    event;
    client = this.room.client;
    id;
    name;
    avatar;
    constructor(room, event) {
        this.room = room;
        this.event = event;
        if (!event.stateKey)
            throw "event must have stateKey";
        this.room = room;
        this.event = event;
        this.id = event.stateKey;
        this.name = event.content.displayname;
        this.avatar = event.content.avatar_url;
    }
    get membership() {
        return this.event.content.membership ?? "leave";
    }
    get power() {
        // TODO: power should always be defined in room
        return this.room.power?.getUser(this.id) ?? 0;
    }
    // ban(reason: string) {}
    // kick(reason: string) {}
    // unban(reason: string) {}
    // TEMP: discard parity
    get userId() { return this.id; }
}
