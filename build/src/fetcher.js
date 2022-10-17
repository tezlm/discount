const encode = encodeURIComponent;
function stringifyQueryParams(query) {
    const str = Object.entries(query)
        .filter(([k, v]) => k && v)
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");
    if (!str)
        return "";
    return "?" + str;
}
export default class Fetcher {
    token;
    baseUrl;
    filter;
    constructor(token, baseUrl) {
        this.token = token;
        this.baseUrl = baseUrl;
    }
    async fetchUnauth(path, options) {
        const query = options.query ? stringifyQueryParams(options.query) : "";
        const res = await fetch(`${this.baseUrl}/_matrix${path}${query}`, {
            method: options.method ?? "GET",
            headers: options.headers,
            signal: options.abort?.signal,
            ...(options.body && {
                body: typeof options.body === "object" ? JSON.stringify(options.body) : options.body,
            }),
        });
        if (res.status < 200 || res.status >= 300)
            throw await res.json();
        return res.json();
    }
    async fetch(path, options) {
        const fetchOpts = {
            ...options,
            headers: { authorization: "Bearer " + this.token, ...options.headers },
        };
        return this.fetchUnauth(path, fetchOpts);
    }
    async fetchClient(path, options) {
        return this.fetch(`/client/v3${path}`, options);
    }
    async fetchMedia(path, options) {
        return this.fetch(`/media/v3${path}`, options);
    }
    // syncing
    async sync(since, abort) {
        const query = { since, filter: this.filter, timeout: "60000" };
        return this.fetchClient("/sync", { query, abort });
    }
    async postFilter(userId, filter) {
        const { filter_id } = await this.fetchClient(`/user/${encode(userId)}/filter`, { method: "POST", body: filter });
        return filter_id;
    }
    // content
    async fetchMessages(roomId, from, direction) {
        return this.fetchClient(`/rooms/${encode(roomId)}/messages?from=${encode(from)}&dir=${direction}&limit=200`, {});
    }
    // async fetchContext(roomId: string, eventId: string) {
    // return this.fetchClient(`/rooms/${encode(roomId)}/context/${encode(eventId)}?limit=200`, {});
    // }
    async fetchEvent(roomId, eventId) {
        return this.fetchClient(`/rooms/${encode(roomId)}/event/${encode(eventId)}`, {});
    }
    async fetchMembers(roomId) {
        return this.fetchClient(`/rooms/${encode(roomId)}/members`, {});
    }
    // async fetchUser(userId: string) {
    // return this.fetchClient(`/profile/${encode(userId)}`, {});
    // }
    async fetchState(roomId) {
        return this.fetchClient(`/rooms/${encode(roomId)}/state`, {});
    }
    // events
    async sendEvent(roomId, type, content, transaction) {
        return await this.fetchClient(`/rooms/${encode(roomId)}/send/${encode(type)}/${transaction}`, { method: "PUT", body: content });
    }
    async sendState(roomId, type, content, stateKey = "") {
        return await this.fetchClient(`/rooms/${encode(roomId)}/state/${encode(type)}/${stateKey}`, { method: "PUT", body: content });
    }
    // redact events
    async redactEvent(roomId, eventId, reason) {
        return await this.fetchClient(`/rooms/${encode(roomId)}/redact/${encode(eventId)}`, { method: "PUT", body: reason ? { reason } : null });
    }
    // membership
    async kickMember(roomId, userId, reason) {
        return await this.fetchClient(`/rooms/${encode(roomId)}/kick`, {
            method: "POST",
            body: {
                user_id: userId,
                ...(reason && { reason }),
            }
        });
    }
    async banMember(roomId, userId, reason) {
        return await this.fetchClient(`/rooms/${encode(roomId)}/ban`, {
            method: "POST",
            body: {
                user_id: userId,
                ...(reason && { reason }),
            }
        });
    }
    async unbanMember(roomId, userId, reason) {
        return await this.fetchClient(`/rooms/${encode(roomId)}/unban`, {
            method: "POST",
            body: {
                user_id: userId,
                ...(reason && { reason }),
            }
        });
    }
    async joinRoom(roomId) {
        return await this.fetchClient(`/rooms/${encode(roomId)}/join`, {
            method: "POST",
            body: {}
        });
    }
    async leaveRoom(roomId) {
        return await this.fetchClient(`/rooms/${encode(roomId)}/leave`, {
            method: "POST",
            body: {}
        });
    }
}
