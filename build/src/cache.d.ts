export default class Cache<V> extends Map<string, V> {
    private _fetch;
    constructor(fetch: (key: string) => V);
    fetch(key: string): Promise<V | undefined>;
}
