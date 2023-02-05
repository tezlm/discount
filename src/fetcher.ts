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
    .filter(([_, v]) => v)
    .map(([k, v]) => `${encode(k)}=${encode(v!)}`)
    .join("&");
  if (!str) return "";
  return "?" + str;
}

function log(path: string, options: FetchOptions) {
  const method = options.method ?? "GET";
	console.log(`\x1b[3${getColor(method)}m${`[${method}]`.padEnd(9)}\x1b[0m ${path}`);
  
  function getColor(method: string) {
    switch (method.toUpperCase()) {
      case "GET":    return '4'; // blue
      case "POST":   return '2'; // green
      case "PUT":    return '3'; // yellow
      case "DELETE": return '1'; // red
      default:       return '5'; // purple (patch, head, options, etc)
    }
  }
}

export default class Fetcher {
  public filter?: string;
  
  constructor(
    private token: string,
    private baseUrl: string,
  ) {}
  
  // fetching utility functions
  async fetchUnauth(path: string, options: FetchOptions): Promise<any> {
    const query = options.query ? stringifyQueryParams(options.query) : "";
    
    // debugging
    if (false) log(`${this.baseUrl}/_matrix${path}${query}`, options);
    
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
  
  // authentication
  // TODO: other ways of authentication, oidc
  // async login(userId: string, password: string, deviceName: string = Math.random().toString(36).slice(2)) {
  //   return this.fetchUnauth("/login", {
  //     method: "POST",
  //     body: {
  //       type: "m.login.password",
  //       identifier: {
  //         type: "m.id.user",
  //         user: userId,
  //       },
  //       password: password,
  //       initial_device_display_name: deviceName,
  //     },
  //   });
  // }
  
  logout() {
    return this.fetchClient("/logout", { method: "POST" });
  }
   
  // syncing
  async sync(since?: string, abort?: AbortController, timeout?: number): Promise<api.Sync> {
    const query = { since, filter: this.filter, timeout: timeout?.toString() ?? "60000" };
    return this.fetchClient("/sync", { query, abort });
  }
  
  async postFilter(userId: string, filter: Partial<api.Filter>): Promise<string> {
    const { filter_id } = await this.fetchClient(`/user/${encode(userId)}/filter`, { method: "POST", body: filter });
    return filter_id;
  }
  
  // content
  async fetchUser(userId: string): Promise<api.UserData> {
    return this.fetchClient(`/profile/${encode(userId)}`, {});
  }
  
  async fetchMessages(roomId: string, options: { from?: string, direction?: "b" | "f", limit?: number } = {}): Promise<api.Messages> {
    return this.fetchClient(`/rooms/${encode(roomId)}/messages`, {
      query: {
        from: options.from,
        dir: options.direction ?? "b",
        limit: (options.limit ?? 100).toString(),
      }
    });
  }

  async fetchContext(roomId: string, eventId: string, limit = 100): Promise<api.Context> {
    return this.fetchClient(`/rooms/${encode(roomId)}/context/${encode(eventId)}`, {
      query: {
        limit: limit.toString(),
        
        // it just feels wrong to dump json into the url path
        filter: '{"lazy_load_members":true}',
      },
    });
  }
  
  async fetchEvent(roomId: string, eventId: string): Promise<api.RawEvent> {
    return this.fetchClient(`/rooms/${encode(roomId)}/event/${encode(eventId)}`, {});
  }
  
  async fetchRelations(roomId: string, eventId: string, options: { relType?: string, eventType?: string, from?: string, to?: string, limit?: number, dir?: "f" | "b" } = {}): Promise<api.Relations> {
    const { eventType, relType } = options;
    if (eventType && !relType) throw new Error("cannot have a eventType without relType");
    let path = `/rooms/${encode(roomId)}/relations/${encode(eventId)}`;
    if (relType) path += "/" + relType;
    if (eventType) path += "/" + eventType;
    return this.fetchClient(path, {
      query: {
        from: options.from,
        to: options.to,
        limit: (options.limit ?? 50).toString(),
        // limit: (options.limit ?? 5).toString(),
        dir: options.dir ?? "f",
      }
    });
  }
  
  async fetchMembers(roomId: string, membership: "join" | "leave" | "invite" | "knock" | "ban" | null = null): Promise<{ chunk: Array<api.RawStateEvent> }> {
    if (membership) {
      return this.fetchClient(`/rooms/${encode(roomId)}/members`, { query: { membership }});
    } else {
      return this.fetchClient(`/rooms/${encode(roomId)}/members`, { query: { not_membership: "leave" }});
    }
  }
  
  async fetchState(roomId: string): Promise<Array<api.RawStateEvent>>;
  async fetchState(roomId: string, type?: string, stateKey?: string): Promise<api.RawStateEvent>;
  async fetchState(roomId: string, type?: string, stateKey = ""): Promise<api.RawStateEvent | Array<api.RawStateEvent>> {
    if (type) {
      return this.fetchClient(`/rooms/${encode(roomId)}/state/${type}/${stateKey}`, {});
    } else {
      return this.fetchClient(`/rooms/${encode(roomId)}/state`, {});
    }
  }

  async fetchHierarchy(roomId: string, options: { from?: string, limit?: string, depth?: number, suggested?: boolean } = {}): Promise<api.Hierarchy> {
    return this.fetch(`/client/v1/rooms/${encode(roomId)}/hierarchy`, {
      query: {
        from: options.from,
        limit: (options.limit ?? 50).toString(),
        max_depth: (options.depth ?? 10).toString(),
        suggested_only: (options.suggested ?? false).toString(),
      }
    });
  }
  
  // events
  async sendEvent(roomId: string, type: string, content: any, txnId: string): Promise<{ event_id: string }> {
    return this.fetchClient(`/rooms/${encode(roomId)}/send/${encode(type)}/${txnId}`, { method: "PUT", body: content });
  }
  
  async sendState(roomId: string, type: string, content: any, stateKey: string = ""): Promise<object> {
    return this.fetchClient(`/rooms/${encode(roomId)}/state/${encode(type)}/${stateKey}`, { method: "PUT", body: content });
  }
  
  // redact events
  async redactEvent(roomId: string, eventId: string, txnId: string, reason?: string): Promise<object> {
    return this.fetchClient(`/rooms/${encode(roomId)}/redact/${encode(eventId)}/${encode(txnId)}`, { method: "PUT", body: reason ? { reason } : null });
  }
  
  // membership
  async kickMember(roomId: string, userId: string, reason?: string) {
    return this.fetchClient(`/rooms/${encode(roomId)}/kick`, {
      method: "POST",
      body: {
        user_id: userId,
       ...(reason && { reason }),
      }
    });
  }
  
  async banMember(roomId: string, userId: string, reason?: string) {
    return this.fetchClient(`/rooms/${encode(roomId)}/ban`, {
      method: "POST",
      body: {
        user_id: userId,
       ...(reason && { reason }),
      }
    });
  }
  
  async unbanMember(roomId: string, userId: string, reason?: string) {
    return this.fetchClient(`/rooms/${encode(roomId)}/unban`, {
      method: "POST",
      body: {
        user_id: userId,
       ...(reason && { reason }),
      }
    });
  }
  
  async joinRoom(roomId: string) {
    return this.fetchClient(`/rooms/${encode(roomId)}/join`, {
      method: "POST",
      body: {}
    });
  }
  
  async leaveRoom(roomId: string) {
    return this.fetchClient(`/rooms/${encode(roomId)}/leave`, {
      method: "POST",
      body: {}
    });
  }
  
  async createRoom(options: api.CreateRoomOptions): Promise<{ room_id: string }> {
    return this.fetchClient(`/createRoom`, {
      method: "POST",
      body: options
    });
  }
  
  async fetchPublicRooms(options: { since?: string, server?: string, limit?: number }): Promise<api.PublicRooms> {
    return this.fetchClient(`/publicRooms`, {
      query: { ...options, limit: (options.limit ?? 50).toString() }
    });
  }
  
  async setAccountData(userId: string, key: string, data: any) {
    return this.fetchClient(`/user/${encode(userId)}/account_data/${encode(key)}`, {
      method: "PUT",
      body: data,
    });
  }
}
