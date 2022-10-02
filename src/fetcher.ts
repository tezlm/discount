import type * as api from "./api.js"

interface FetchOptions {
  method?: string,
  query?: { [name: string]: string | undefined },
  headers?: { [name: string]: string },
  body?: any,
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
    const fetchOpts: FetchOptions = {
      method: options.method ?? "GET",
      headers: options.headers,
    };
    
    if (options.body) {
      if (typeof options.body === "object") {
        fetchOpts.body = JSON.stringify(options.body);
      } else {
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
  async sync(since?: string): Promise<api.Sync> {
    const query = { since, filter: this.filter, timeout: "60000" };
    return this.fetchClient("/sync", { query });
  }
  
  async postFilter(userId: string, filter: Partial<api.Filter>): Promise<string> {
    const { filter_id } = await this.fetchClient(`/user/${encode(userId)}/filter`, { method: "POST", body: filter });
    return filter_id;
  }
  
  // content
  // fetchMessages(roomId, startId, direction) {
  //   return this.fetch("GET", `/rooms/${encode(roomId)}/messages?from=${encode(startId)}&dir=${direction}&limit=200`);
  // }

  // fetchContext(roomId, eventId) {
  //   return this.fetch("GET", `/rooms/${encode(roomId)}/context/${encode(eventId)}?limit=200`);
  // }
  
  // fetchEvent(roomId, eventId) {
  //   return this.fetch("GET", `/rooms/${encode(roomId)}/event/${encode(eventId)}`);
  // }
  
  async fetchMembers(roomId: string): Promise<{ chunk: Array<api.RawStateEvent> }> {
    return await this.fetchClient(`/rooms/${encode(roomId)}/members`, {});
  }
  
  // fetchUser(userId) {
  //   return this.fetch("GET", `/profile/${encode(userId)}`);
  // }  
  
  // events
  async sendEvent(roomId: string, type: string, content: any, transaction: string): Promise<{ event_id: string }> {
    return await this.fetchClient(`/rooms/${encode(roomId)}/send/${encode(type)}/${transaction}`, { method: "PUT", body: content });
  }
  
  async sendState(roomId: string, type: string, content: any, stateKey: string = ""): Promise<object> {
    return await this.fetchClient(`/rooms/${encode(roomId)}/send/${encode(type)}/${stateKey}`, { method: "PUT", body: content });
  }
  
  async redact(roomId: string, eventId: string, transaction: string, reason?: string): Promise<object> {
    return await this.fetchClient(`/rooms/${encode(roomId)}/redact/${encode(eventId)}/${transaction}`, { method: "PUT", body: reason ? { reason } : undefined });
  }
}
