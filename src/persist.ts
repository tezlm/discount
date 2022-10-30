import type * as IdbT from "idb";
import type * as Sqlite3T from "better-sqlite3"; // TODO: sqlite3 persister

/*
easy to save
- last save token
- room state
- account data

difficult
- timeline/last batch

currently all code expects the room to have an `events.live` live
timeline, which itself requires a last batch token which i won't get
*/

export default abstract class Persister<Types extends Record<string, any>> {
  abstract open<Db extends keyof Types & string>(databaseName: string, keys: Array<Db>, version: number): Promise<void>;
  abstract close(): Promise<void>;
  abstract put<Db extends keyof Types & string>(db: Db, key: string, val: Types[Db]): Promise<void>;
  abstract putAll<Db extends keyof Types & string>(db: Db, values: Map<string, any>): Promise<void>;
  abstract get<Db extends keyof Types & string>(db: Db, key: string): Promise<Types[Db]>;
  abstract getAll<Db extends keyof Types & string>(db: Db): Promise<Map<string, any>>;
}

export class MemoryPersister<Types extends Record<string, any>> extends Persister<Types> {
  private map = new Map();
  
  async open<Db extends keyof Types & string>(_name: string, keys: Array<Db>, _version: number): Promise<void> {
    for (let key of keys) {
      this.map.set(key, new Map<Db, Types[Db]>());
    }
  }
  
  async close() {
    this.map.clear();
  }
  
  async put<Db extends keyof Types & string>(db: Db, key: string, val: Types[Db]) {
    this.map.get(db).set(key, val);
  }
  
  async putAll<Db extends keyof Types & string>(db: Db, values: Map<string, Types[Db]>) {
    const map = this.map.get(db);
    for (let [key, val] of values) {
      map.set(key, val);
    }
  }
  
  async get<Db extends keyof Types & string>(db: Db, key: string): Promise<Types[Db]> {
    return this.map.get(db).get(key);
  }
  
  async getAll<Db extends keyof Types & string>(db: Db): Promise<Map<string, any>> {
    return this.map.get(db);
  }
}

export class IDBPersister<Types extends Record<string, any>> extends Persister<Types> {
  private db: IdbT.IDBPDatabase | null = null;
  
  async open(databaseName: string, keys: Array<string>, version = 1) {
    const { openDB } = await import("idb");
    this.db = await openDB(databaseName, version, {
      upgrade(db) {
        for (let key of keys) {
          db.createObjectStore(key);
        }
      }
    });
  }
  
  async close() {
    throw "TODO!";
  }
  
  async put<Db extends keyof Types & string>(db: Db, key: string, val: Types[Db]) {
    if (!this.db) throw "you must .open the database first";
    this.db.put(db, val, key);
  }
  
  async putAll<Db extends keyof Types & string>(db: Db, values: Map<string, Types[Db]>) {
    if (!this.db) throw "you must .open the database first";
    const tx = this.db.transaction(db, "readwrite");
    const store = tx.objectStore(db);
    for (let [key, val] of values) {
      await store.put(val, key);
    }
    await tx.done;
  }
  
  async get<Db extends keyof Types & string>(db: Db, key: string): Promise<Types[Db]> {
    if (!this.db) throw "you must .open the database first";
    return this.db.get(db, key);
  }
  
  async getAll<Db extends keyof Types & string>(db: Db): Promise<Map<string, any>> {
    if (!this.db) throw "you must .open the database first";
    const [keys, vals] = await Promise.all([this.db.getAllKeys(db), this.db.getAll(db)]);
    return new Map(keys.map((k, i) => [k as string, vals[i]]));
  }
}
