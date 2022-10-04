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
        const fetchOpts = {
            method: options.method ?? "GET",
            headers: options.headers,
        };
        if (options.body) {
            if (typeof options.body === "object") {
                fetchOpts.body = JSON.stringify(options.body);
            }
            else {
                fetchOpts.body = options.body;
            }
        }
        // if (true) {
        // const color = ({ GET: '4', POST: '2', DELETE: '1', PUT: '3' })[fetchOpts.method as string] ?? '5';
        // console.log(`\x1b[3${color}m${fetchOpts.method}\x1b[0m ${this.baseUrl}/_matrix${path}${query}`);
        // }
        return fetch(`${this.baseUrl}/_matrix${path}${query}`, fetchOpts)
            .then(res => res.json());
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
    async sync(since) {
        const query = { since, filter: this.filter, timeout: "60000" };
        return this.fetchClient("/sync", { query });
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
    // events
    async sendEvent(roomId, type, content, transaction) {
        return await this.fetchClient(`/rooms/${encode(roomId)}/send/${encode(type)}/${transaction}`, { method: "PUT", body: content });
    }
    async sendState(roomId, type, content, stateKey = "") {
        return await this.fetchClient(`/rooms/${encode(roomId)}/send/${encode(type)}/${stateKey}`, { method: "PUT", body: content });
    }
    async redact(roomId, eventId, transaction, reason) {
        return await this.fetchClient(`/rooms/${encode(roomId)}/redact/${encode(eventId)}/${transaction}`, { method: "PUT", body: reason ? { reason } : undefined });
    }
}
