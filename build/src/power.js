export default class PowerLevels {
    room;
    client = this.room.client;
    levels;
    constructor(room) {
        this.room = room;
        this.levels = room.getState("m.room.power_levels")?.content ?? {};
    }
    get me() { return this.forUser(this.client.userId); }
    get redact() { return this.levels.redact ?? 50; }
    get invite() { return this.levels.invite ?? 0; }
    get ban() { return this.levels.ban ?? 50; }
    get kick() { return this.levels.kick ?? 50; }
    forEvent(eventType) {
        return this.levels.events?.[eventType] ?? this.levels.events_default ?? 0;
    }
    forState(eventType) {
        return this.levels.events?.[eventType] ?? this.levels.state_default ?? 50;
    }
    forUser(userId) {
        return this.levels.users?.[userId] ?? this.levels.users_default ?? 0;
    }
}
