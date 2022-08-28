// very basic matrix client
// yes a lot is copy pasted if i have time i will optimize

// bootleg event emitter, for use in browser
class Emitter {
	constructor() {
		this._listeners = new Map();
	}
	
	on(event, call) {
		this._listeners.set(call, event);
	}
	
	off(call) {
		this._listeners.delete(call);
	}

	once(event, call) {
		const wrapped = (...params) => { call(...params); this.off(wrapped) }
		this._listeners.set(wrapped, event);
	}
	
	emit(event, ...params) {
		for (let listener of this._listeners) {
			if (listener[1] === event) {
				listener[0](...params);
			}
		}
	}
}

// creates a custom `fetch()` function with homeserver and token prefilled
const makeFetcher = (homeserver, token, shutup) => async (path, { method = "GET", body = null, query = "" } = {}) => {
	const url = `${homeserver}/_matrix/client/r0/${path}${query ? "?" + query : ""}`;
	const opts = { method, headers: { authorization: "Bearer " + token } };
	if (body) opts.body = JSON.stringify(body);

	if (!shutup) {
		const color = ({ GET: '4', POST: '5' })[method] ?? '3'; // funny logging
		console.log(`\x1b[3${color}m${method}\x1b[0m ${url}`);
	}

	return fetch(url, opts).then(res => res.json());
}

// a member is a user who is in a room
export class Member {
	constructor(bot, id, room) {
		this._bot = bot;
		this._room = room;
		this.id = id;
	}
	
	get _memberEvent() {
		return this.room._state.find(i => i.type === "m.room.member" && i.state_key === this.id) ?? null;
	}

	get room() {
		return new Room(this._bot, this._room);
	}

	get membership() { return this._memberEvent?.content.membership }
	get avatar() { return this._memberEvent?.content.avatar_url }
	get name() { return this._memberEvent?.content.displayname }
	
	async kick(reason) {
		const body = { user_id: this.id };
		if (reason) body.reason = reason;
		await this._bot._fetch(`rooms/${this.room.id}/kick`, { method: "POST", body });
	}

	async ban(reason) {
		const body = { user_id: this.id };
		if (reason) body.reason = reason;
		await this._bot._fetch(`rooms/${this.room.id}/ban`, { method: "POST", body });
	}

	async unban(reason) {
		const body = { user_id: this.id };
		if (reason) body.reason = reason;
		await this._bot._fetch(`rooms/${this.room.id}/unban`, { method: "POST", body });
	}

	get power() {
		const event = this.room._state.find(i => i.type === "m.room.power_levels")
		if (!event) return 0;
		return event.content.users?.[this.id] ?? event.content.users_default ?? 0;
	}

	setPower(level) {
		const event = this.room._state.find(i => i.type === "m.room.power_levels");
		const content = event.content;
		if (!content.users) event.content.users = {};
		content.users[this.id] = level;
		this._bot._sendStateEvent(this.room.id, "m.room.power_levels", content);
	}
}

// why are these comments here, you already know what a room is
// todo: event filtering maybe? like `room.on("message", ...)` only fires when a message is sent in that room?
export class Room {
	constructor(bot, id) {
		this._bot = bot;
		this.id = id;
	}
	
	get _state() {
		return this._bot._rooms.get(this.id);
	}

	get name() { return this._state.find(i => i.type === "m.room.name")?.content.name ?? null }
	get topic() { return this._state.find(i => i.type === "m.room.topic")?.content.topic ?? null }
	get avatar() { return this._state.find(i => i.type === "m.room.avatar_url")?.content.avatar_url ?? null }
	get type() { return this._state.find(i => i.type === "m.room.create")?.content.type ?? null }
	
	send(body) {
		if (!body) throw new Error("missing body");
		this._bot._sendEvent(this.id, "m.room.message", { body });
	}

	async join() {
		await this._bot._fetch(`rooms/${this.id}/join`, { method: "POST" });
	}

	async leave() {
		await this._bot._fetch(`rooms/${this.id}/leave`, { method: "POST" });
	}

	async invite(who, reason = "") {
		const body = { user_id: who instanceof Member ? who.id : who };
		if (reason) body.reason = reason;
		await this._bot._fetch(`rooms/${this.id}/invite`, { method: "POST", body });
	}

	async kick(who, reason) {
		const body = { user_id: who instanceof Member ? who.id : who };
		if (reason) body.reason = reason;
		await this._bot._fetch(`rooms/${this.room.id}/kick`, { method: "POST", body });
	}

	async ban(who, reason) {
		const body = { user_id: who instanceof Member ? who.id : who };
		if (reason) body.reason = reason;
		await this._bot._fetch(`rooms/${this.room.id}/ban`, { method: "POST", body });
	}

	async unban(who, reason) {
		const body = { user_id: who instanceof Member ? who.id : who };
		if (reason) body.reason = reason;
		await this._bot._fetch(`rooms/${this.room.id}/unban`, { method: "POST", body });
	}
	
	member(who) {
		return new Member(this._bot, who instanceof Member ? who.id : who, this.id);
	}

	setName(name) {
		if (!name) throw new Error("missing name");
		this._bot._sendStateEvent(this.id, "m.room.name", { name });
	}

	setTopic(topic) {
		if (!topic) throw new Error("missing topic");
		this._bot._sendStateEvent(this.id, "m.room.topic", { topic });
	}
}

// a matrix event
export class Event {
	constructor(bot, room, event) {
		this._bot = bot;
		this._room = room;
		this._event = event;
	}

	get id() {
		return this._event.event_id;
	}

	get room() {
		return new Room(this._bot, this._room);
	}

	get type() {
		return this._event.type;
	}

	get author() {
		return new Member(this._bot, this._event.sender, this._room);
	}

	get content() {
		return this._event.content;
	}

	redact(reason) {
		const body = reason ? { reason } : {};
		this._bot._fetch(`rooms/${this._room}/redact/${this.id}/m${Math.random()}`, { method: "PUT", body });
	}
}

// specifically a message event
export class Message extends Event {
	get body() {
		return this.content.body;
	}

	reply(body) {
		if (!body) throw new Error("missing body");
				this._bot._sendEvent(this._room, "m.room.message", {
			body,
			"m.relates_to": { "m.in_reply_to": { event_id: this.id } },
		});
	}
}

export class Client extends Emitter {
	constructor(config) {
		if (!config.token) throw new Error("missing token");
		if (!config.timeout) config.timeout = 30000;
		if (!config.homeserver) {
			config.homeserver = "https://matrix.org";
		} else {
			config.homeserver = config.homeserver.replace(/^http:/, "https:").replace(/\/$/, "");
		}

		super();
		
		this.config = config;
		this.userId = config.userid;
		this._fetch = makeFetcher(config.homeserver, config.token, config.shutup);
		this._rooms = new Map();
	}

	_sendEvent(room, type, body) {
		return this._fetch(`rooms/${room}/send/${type}/m${Math.random()}`, { method: "PUT", body });
	}

	_sendStateEvent(room, type, body, key = "") {
		return this._fetch(`rooms/${room}/state/${type}/${key}`, { method: "PUT", body });
	}

	async _sync(since) {
		const query = `timeout=${this.config.timeout}${since ? "&since=" + since : ""}`;
		const sync = await this._fetch("sync", { query });
		if (sync.error) throw new Error(sync.error);
		if (!sync.rooms) return this._sync(sync.next_batch);
		const { rooms } = sync;

		for (let room in rooms.join ?? {}) {
			if (this._rooms.has(room)) {
				this._rooms.get(room).unshift(...rooms.join[room].state?.events ?? []);
			} else {
				this._rooms.set(room, rooms.join[room].state?.events ?? []);
			}

			for (let event of rooms.join[room].timeline?.events || []) {
				if (this.ready) {
					this.emit("event", new Event(this, room, event));
				}
				if (this.ready && event.type === "m.room.message") {
					this.emit("message", new Message(this, room, event));
				}
			}
		}

		for (let room in rooms.invite ?? {}) {
			this.emit("invite", new Room(this, room));
		}

		if (!this.ready) {
			this.emit("ready");
			this.ready = true;
		}
		this._sync(sync.next_batch);
	}

	async start() {
		if (!this.userId) {
			this.userId = await this._fetch("account/whoami").then(r => r.user_id);
		}
		this._sync();
	}
	
	get rooms() {
		return [...this._rooms.keys()].map(i => new Room(this, i));
	}
	
	async createRoom(options = {}) {
		const { room_id } = await this._fetch(`createRoom`, { method: "POST", body: options });
		return new Room(this, room_id);
	}
	
	async upload(data) {
		const url = `${this.config.homeserver}/_matrix/media/v3/upload`;
		const opts = {
			method: "POST",
			body: data,
			headers: { authorization: "Bearer " + this.config.token },
		};
		if (!this.config.shutup) console.log(`\x1b[32mPOST\x1b[0m ${url}`);
		return fetch(url, opts).then(res => res.json()).then(res => res.content_uri);
	}
}
