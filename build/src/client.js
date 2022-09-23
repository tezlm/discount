import Emitter from "./emitter.js";
import Fetcher from "./fetcher.js";
import Room from "./room.js";
import { Event, StateEvent } from "./event.js";
export default class Client extends Emitter {
    status = "stopped";
    fetcher;
    rooms = new Map();
    transactions = new Map();
    constructor(config) {
        super();
        this.fetcher = new Fetcher(config.token, config.baseUrl);
    }
    setStatus(status) {
        this.emit("status", status);
        this.status = status;
    }
    handleError(error, since) {
        console.log(error);
        if (error.errcode)
            throw new Error(error);
        this.retry(1000, since);
    }
    retry(timeout, since) {
        setTimeout(async () => {
            const sync = await this.fetcher.sync(since)
                .catch(() => this.retry(timeout * 2, since));
            if (!sync)
                return;
            this.handleSync(sync);
        }, timeout);
    }
    async sync(since) {
        const sync = await this.fetcher.sync(since)
            .catch((err) => this.handleError(err, since));
        if (!sync)
            return;
        this.handleSync(sync);
    }
    handleSync(sync) {
        if (sync.account_data) {
            for (let event of sync.account_data.events)
                this.emit("accountData", event);
        }
        if (sync.rooms) {
            const r = sync.rooms;
            for (let id in r.join ?? {}) {
                const data = r.join[id];
                if (data.state) {
                    if (this.rooms.has(id)) {
                        const room = this.rooms.get(id);
                        for (let raw of data.state.events) {
                            const state = new StateEvent(this, room, raw);
                            room.handleState(state);
                            this.emit("state", state);
                        }
                    }
                    else {
                        const room = new Room(this, id);
                        for (let raw of data.state.events) {
                            room.handleState(new StateEvent(this, room, raw), false);
                        }
                        this.rooms.set(id, room);
                        // this.emit("join", room);
                        this.emit("join", room.id, room.state, data.timeline?.prev_batch);
                    }
                }
                const room = this.rooms.get(id);
                if (!room)
                    return;
                if (data.timeline && this.status !== "starting") {
                    if (!room)
                        throw "how did we get here?";
                    for (let raw of data.timeline.events) {
                        const event = new Event(this, room, raw);
                        if (raw.type === "m.room.redaction") {
                            // this.emit("redact", event);
                            // this.emit("event", event);
                            this.emit("event", raw);
                        }
                        else {
                            // this.emit("event", event);
                            this.emit("event", raw);
                        }
                        if (raw.unsigned?.transaction_id) {
                            const txn = raw.unsigned.transaction_id;
                            this.transactions.get(txn)?.(event);
                            this.transactions.delete(txn);
                        }
                    }
                }
                for (let event of data.account_data?.events ?? [])
                    this.emit("roomAccountData", room.id, event);
                for (let event of data.ephemeral?.events ?? [])
                    this.emit("ephemeral", event, room);
                if (data.unread_notifications) {
                    const notifs = data.unread_notifications;
                    this.emit("notifications", room, { unread: notifs.notification_count, highlight: notifs.highlight_count });
                }
            }
            for (let id in r.leave ?? {}) {
                if (this.rooms.has(id)) {
                    this.emit("leave", this.rooms.get(id));
                    this.rooms.delete(id);
                }
            }
        }
        if (this.status === "starting") {
            this.setStatus("syncing");
            this.emit("ready");
        }
        else if (this.status === "reconnecting") {
            this.setStatus("syncing");
        }
        this.sync(sync.next_batch);
    }
    async transaction(id) {
        return new Promise((res) => {
            this.transactions.set(id, res);
        });
    }
    async start() {
        this.setStatus("starting");
        const filterId = await this.fetcher.postFilter("@bot:celery.eu.org", {
            room: { state: { lazy_load_members: true } },
        });
        this.fetcher.filter = filterId;
        this.sync();
    }
}
