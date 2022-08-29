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
    
  	if (true) {
  		const color = ({ GET: '4', POST: '5' })[fetchOpts.method as string] ?? '3';
  		console.log(`\x1b[3${color}m${fetchOpts.method}\x1b[0m ${this.baseUrl}/_matrix${path}${query}`);
  	}
    
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
  
  async sync(since?: string): Promise<api.Sync> {
    const query = { since, filter: this.filter, timeout: "30000" };
    return this.fetchClient("/sync", { query });
  }
  
  async postFilter(userId: string, filter: api.Filter): Promise<{filter_id: string}> {
    return this.fetchClient(`/user/${encode(userId)}/filter`, { method: "POST", body: filter });
  }
  
  async getFilter(userId: string, filterId: string): Promise<api.Filter> {
    return this.fetchClient(`/user/${encode(userId)}/filter/${encode(filterId)}`, {});
  }
}
