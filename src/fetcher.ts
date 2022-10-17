import type * as api from "./api.js"

interface FetchOptions {
  method?: string,
  query?: { [name: string]: string | undefined },
  headers?: { [name: string]: string },
  body?: any,
  abort?: AbortController,
}

const encode = encodeURIComponent;

function stringifyQueryParams(query: { [name: string]: string | undefined }): string {
  const str = Object.entries(query)
    .filter(([k, v]) => k && v)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v!)}`)
    .join("&");
  if (!str) return "";
  return "?" + str;
}

export default class Fetcher {
  public filter?: string;
  
  constructor(
    private token: string,
    private baseUrl: string,
  ) {}
  
  async fetchUnauth(path: string, options: FetchOptions): Promise<any> {
    const query = options.query ? stringifyQueryParams(options.query) : "";
    
    const res = await fetch(`${this.baseUrl}/_matrix${path}${query}`, {
      method: options.method ?? "GET",
      headers: options.headers,
      signal: options.abort?.signal,
      ...(options.body && {
        body: typeof options.body === "object" ? JSON.stringify(options.body) : options.body,
      }),
    });
    if (res.status < 200 || res.status >= 300) throw await res.json();
    return res.json();
  }
  
  async fetch(path: string, options: FetchOptions): Promise<any> {
    const fetchOpts = {
      ...options,
      headers: { authorization: "Bearer " + this.token, ...options.headers },
    };
    return this.fetchUnauth(path, fetchOpts);
  }
  
  async fetchClient(path: string, options: FetchOptions): Promise<any> {
    return this.fetch(`/client/v3${path}`, options);
  }

  async fetchMedia(path: string, options: FetchOptions): Promise<any> {
    return this.fetch(`/media/v3${path}`, options);
  }
  
  // syncing
  async sync(since?: string, abort?: AbortController): Promise<api.Sync> {
    const query = { since, filter: this.filter, timeout: "60000" };
    return this.fetchClient("/sync", { query, abort });
  }
  
  async postFilter(userId: string, filter: Partial<api.Filter>): Promise<string> {
    const { filter_id } = await this.fetchClient(`/user/${encode(userId)}/filter`, { method: "POST", body: filter });
    return filter_id;
  }
  
  // content
  async fetchMessages(roomId: string, from: string, direction: "b" | "f"): Promise<api.Messages> {
    return this.fetchClient(`/rooms/${encode(roomId)}/messages?from=${encode(from)}&dir=${direction}&limit=200`, {});
  }

  // async fetchContext(roomId: string, eventId: string) {
    // return this.fetchClient(`/rooms/${encode(roomId)}/context/${encode(eventId)}?limit=200`, {});
  // }
  
  async fetchEvent(roomId: string, eventId: string): Promise<api.RawEvent> {
    return this.fetchClient(`/rooms/${encode(roomId)}/event/${encode(eventId)}`, {});
  }
  
  async fetchMembers(roomId: string): Promise<{ chunk: Array<api.RawStateEvent> }> {
    return this.fetchClient(`/rooms/${encode(roomId)}/members`, {});
  }
  
  // async fetchUser(userId: string) {
    // return this.fetchClient(`/profile/${encode(userId)}`, {});
  // }
  
  async fetchState(roomId: string): Promise<Array<api.RawStateEvent>> {
    return this.fetchClient(`/rooms/${encode(roomId)}/state`, {});
  }
  
  // events
  async sendEvent(roomId: string, type: string, content: any, transaction: string): Promise<{ event_id: string }> {
    return await this.fetchClient(`/rooms/${encode(roomId)}/send/${encode(type)}/${transaction}`, { method: "PUT", body: content });
  }
  
  async sendState(roomId: string, type: string, content: any, stateKey: string = ""): Promise<object> {
    return await this.fetchClient(`/rooms/${encode(roomId)}/state/${encode(type)}/${stateKey}`, { method: "PUT", body: content });
  }
  
  // redact events
  async redactEvent(roomId: string, eventId: string, reason?: string): Promise<object> {
    return await this.fetchClient(`/rooms/${encode(roomId)}/redact/${encode(eventId)}`, { method: "PUT", body: reason ? { reason } : null });
  }
  
  // membership
  async kickMember(roomId: string, userId: string, reason?: string) {
    return await this.fetchClient(`/rooms/${encode(roomId)}/kick`, {
      method: "POST",
      body: {
        user_id: userId,
       ...(reason && { reason }),
      }
    });
  }
  
  async banMember(roomId: string, userId: string, reason?: string) {
    return await this.fetchClient(`/rooms/${encode(roomId)}/ban`, {
      method: "POST",
      body: {
        user_id: userId,
       ...(reason && { reason }),
      }
    });
  }
  
  async unbanMember(roomId: string, userId: string, reason?: string) {
    return await this.fetchClient(`/rooms/${encode(roomId)}/unban`, {
      method: "POST",
      body: {
        user_id: userId,
       ...(reason && { reason }),
      }
    });
  }
  
  async joinRoom(roomId: string) {
    return await this.fetchClient(`/rooms/${encode(roomId)}/join`, {
      method: "POST",
      body: {}
    });
  }
  
  async leaveRoom(roomId: string) {
    return await this.fetchClient(`/rooms/${encode(roomId)}/leave`, {
      method: "POST",
      body: {}
    });
  }
}
