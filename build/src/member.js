// import User from "./user";
import { intern } from "./util";
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
        this.id = intern(event.stateKey);
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
    async ban(reason) {
        this.client.fetcher.banMember(this.room.id, this.id, reason);
    }
    async kick(reason) {
        this.client.fetcher.kickMember(this.room.id, this.id, reason);
    }
    async unban(reason) {
        this.client.fetcher.unbanMember(this.room.id, this.id, reason);
    }
    // TEMP: discard parity
    get userId() { return this.id; }
}
