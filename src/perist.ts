import type * as IdbT from "idb";
import type * as Sqlite3T from "better-sqlite3";

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
  abstract put<Db extends keyof Types & string>(db: Db, key: string, val: Types[Db]): Promise<void>;
  abstract putAll<Db extends keyof Types & string>(db: Db, values: Map<string, any>): Promise<void>;
  abstract get<Db extends keyof Types & string>(db: Db, key: string): Promise<Types[Db]>;
  abstract getAll<Db extends keyof Types & string>(db: Db): Promise<Map<string, any>>;
}

export class IDBPersister<Types extends Record<string, any>> extends Persister<Types> {
  private db: IdbT.IDBPDatabase | null = null;
  
  async open(databaseName: string, version = 1) {
    const { openDB } = await import("idb");
    this.db = await openDB(databaseName, version, {
      upgrade(db) {
        db.createObjectStore("todo: get keys of Types");
      }
    });
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
