import Emitter from "./emitter";
import Fetcher from "./fetcher";
import Room from "./room";
import Invite from "./invite";
import Timeline from "./timeline";
import { Event, StateEvent, EphemeralEvent } from "./event.js";
export default class Client extends Emitter {
    status = "stopped";
    fetcher;
    userId;
    rooms = new Map();
    invites = new Map();
    accountData = new Map();
    transactions = new Map();
    abort = new AbortController();
    constructor(config) {
        super();
        this.userId = config.userId;
        this.fetcher = new Fetcher(config.token, config.baseUrl);
    }
    setStatus(status) {
        this.emit("status", status);
        this.status = status;
    }
    async handleError(error, since) {
        if (error.errcode)
            throw new Error(error);
        if (error.name === "AbortError")
            return;
        let timeout = 1000;
        while (true) {
            try {
                const sync = await this.fetcher.sync(since, this.abort);
                if (!sync)
                    continue;
                this.handleSync(sync);
                break;
            }
            catch (err) {
                if (error.errcode)
                    throw new Error(error);
                if (error.name === "AbortError")
                    return;
                await new Promise(res => setTimeout(res, timeout *= 2));
            }
        }
    }
    async sync(since) {
        const sync = await this.fetcher.sync(since, this.abort)
            .catch((err) => this.handleError(err, since));
        if (!sync)
            return;
        await this.handleSync(sync);
        if (this.status === "starting") {
            this.setStatus("syncing");
            this.emit("ready");
        }
        else if (this.status === "reconnecting") {
            this.setStatus("syncing");
        }
        this.sync(sync.next_batch);
    }
    async handleSync(sync) {
        if (sync.account_data) {
            for (let event of sync.account_data.events) {
                this.accountData.set(event.type, event.content);
                this.emit("accountData", event);
            }
        }
        if (sync.rooms) {
            const r = sync.rooms;
            for (let id in r.join ?? {}) {
                const data = r.join[id];
                if (data.state) {
                    if (this.rooms.has(id)) {
                        const room = this.rooms.get(id);
                        for (let raw of data.state.events) {
                            const state = new StateEvent(room, raw);
                            room.handleState(state);
                            this.emit("state", state);
                        }
                    }
                    else {
                        const room = new Room(this, id);
                        const timeline = new Timeline(room, data.timeline?.prev_batch ?? null, null);
                        room.events.live = timeline;
                        if (this.invites.has(id)) {
                            for (let raw of await this.fetcher.fetchState(id)) {
                                room.handleState(new StateEvent(room, raw), false);
                            }
                        }
                        else {
                            for (let raw of data.state.events) {
                                room.handleState(new StateEvent(room, raw), false);
                            }
                        }
                        this.invites.delete(id);
                        this.rooms.set(id, room);
                        // this.emit("join", room);
                        this.emit("join", room, data.timeline?.prev_batch);
                    }
                }
                const room = this.rooms.get(id);
                if (!room)
                    return;
                // if (data.timeline && this.status !== "starting") {
                if (data.timeline) {
                    if (!room)
                        throw "how did we get here?";
                    for (let raw of data.timeline.events) {
                        const event = new Event(room, raw);
                        if (raw.type === "m.room.redaction") {
                            // this.emit("redact", event);
                            // this.emit("event", event);
                            this.emit("event", event);
                            // this.emit("redact", event);
                        }
                        else {
                            // room.events.live._add(event);
                            // this.emit("event", event);
                            this.emit("event", event);
                        }
                        if (raw.unsigned?.transaction_id) {
                            const txn = raw.unsigned.transaction_id;
                            this.transactions.get(txn)?.(event);
                            this.transactions.delete(txn);
                        }
                    }
                }
                for (let event of data.account_data?.events ?? []) {
                    room.accountData.set(event.type, event.content);
                    this.emit("roomAccountData", room, event);
                }
                for (let event of data.ephemeral?.events ?? [])
                    this.emit("ephemeral", new EphemeralEvent(room, event));
                if (data.unread_notifications) {
                    const apiNotifs = data.unread_notifications;
                    const notifs = { unread: apiNotifs.notification_count, highlight: apiNotifs.highlight_count };
                    room.notifications = notifs;
                    this.emit("notifications", room, notifs);
                }
            }
            for (let id in r.invite ?? {}) {
                if (this.invites.has(id)) {
                    const invite = this.invites.get(id);
                    for (let ev of r.invite[id].invite_state.events)
                        invite?.handleState(ev);
                }
                else {
                    const invite = new Invite(this, id);
                    for (let ev of r.invite[id].invite_state.events)
                        invite.handleState(ev, false);
                    this.invites.set(id, invite);
                    this.emit("invite", invite);
                }
            }
            for (let id in r.leave ?? {}) {
                if (this.rooms.has(id)) {
                    const room = this.rooms.get(id);
                    this.rooms.delete(id);
                    this.emit("leave", room);
                }
                if (this.invites.has(id)) {
                    const invite = this.invites.get(id);
                    this.invites.delete(id);
                    this.emit("leave-invite", invite);
                }
            }
        }
    }
    async transaction(id) {
        return new Promise((res) => {
            this.transactions.set(id, res);
        });
    }
    async start() {
        this.setStatus("starting");
        if (!this.fetcher.filter) {
            const filterId = await this.fetcher.postFilter(this.userId, {
                room: {
                    state: { lazy_load_members: true },
                    timeline: { limit: 0 },
                },
            });
            this.fetcher.filter = filterId;
        }
        this.sync();
    }
    async stop() {
        this.abort.abort();
        this.setStatus("stopped");
    }
}
