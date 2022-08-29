export default class Cache<V> extends Map<string, V> {
  private _fetch;
  
  constructor(fetch: (key: string) => V) {
    super();
    this._fetch = fetch;
  }
  
  async fetch(key: string) {
    if (this.has(key)) return this.get(key);
    const val = await this._fetch(key);
    this.set(key, val);
    return val;
  }  
}