export default class Cache extends Map {
    _fetch;
    constructor(fetch) {
        super();
        this._fetch = fetch;
    }
    async fetch(key) {
        if (this.has(key))
            return this.get(key);
        const val = await this._fetch(key);
        this.set(key, val);
        return val;
    }
}
