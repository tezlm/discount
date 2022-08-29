interface FetchOptions {
  method?: string,
  query?: { [name: string]: string },
  headers?: { [name: string]: string },
  body?: any,
}

function stringifyQueryParams(query: { [name: string]: string }) {
  return "?" + Object.keys(query)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
    .join("&");
}

export default class Fetcher {
  constructor(
    private token: string,
    private baseUrl: string,
  ) {}
  
  async fetchUnauth(path: string, options: FetchOptions): Promise<any> {
    const query = options.query ? stringifyQueryParams(options.query) : "";
    const fetchOpts = {
      method: options.method ?? "GET",
      headers: options.headers,
    }
    return fetch(`${this.baseUrl}/_matrix${path}${query}`, fetchOpts)
      .then(res => res.json());
  }
  
  async fetch(path: string, options: FetchOptions): Promise<any> {
    const query = options.query ? stringifyQueryParams(options.query) : "";
    const fetchOpts = {
      method: options.method ?? "GET",
      headers: { authorization: "Bearer " + this.token },
    }
    return fetch(`${this.baseUrl}/_matrix${path}${query}`, fetchOpts)
      .then(res => res.json());
  }
  
  async fetchClient(path: string, options: FetchOptions): Promise<any> {
    return this.fetch(`/client/v3${path}`, options);
  }

  async fetchMedia(path: string, options: FetchOptions): Promise<any> {
    return this.fetch(`/media/v3${path}`, options);
  }
}
