import type * as IdbT from "idb";
import type * as Sqlite3T from "better-sqlite3"; // TODO: sqlite3 persister

export default abstract class Database<Types extends Record<string, any>> {
  abstract open<Table extends keyof Types & string>(keys: Array<Table>, version: number): Promise<void>;
  abstract close(): Promise<void>;
  abstract clear(): Promise<void>;
  abstract get<Table extends keyof Types & string>(db: Table, key: string): Promise<Types[Table]>;
  abstract getAll<Table extends keyof Types & string>(db: Table): Promise<Map<string, Types[Table]>>;
  abstract put<Table extends keyof Types & string>(db: Table, key: string, val: Types[Table]): Promise<void>;
  abstract putAll<Table extends keyof Types & string>(db: Table, values: Map<string, any>): Promise<void>;
  abstract delete<Table extends keyof Types & string>(db: Table, key: string): Promise<void>;
  abstract deleteAll<Table extends keyof Types & string>(db: Table): Promise<void>;
}

export class MemoryDB<Types extends Record<string, any>> extends Database<Types> {
  private map = new Map();
  
  async open<Table extends keyof Types & string>(keys: Array<Table>, _version: number): Promise<void> {
    for (let key of keys) {
      this.map.set(key, new Map<Table, Types[Table]>());
    }
  }
  
  async close() {
    // nothing to see here
  }
  
  async clear() {
    this.map.clear();
  }
  
  async get<Table extends keyof Types & string>(db: Table, key: string): Promise<Types[Table]> {
    return this.map.get(db).get(key);
  }
  
  async getAll<Table extends keyof Types & string>(db: Table): Promise<Map<string, Types[Table]>> {
    return this.map.get(db);
  }
  
  async put<Table extends keyof Types & string>(db: Table, key: string, val: Types[Table]) {
    this.map.get(db).set(key, val);
  }
  
  async putAll<Table extends keyof Types & string>(db: Table, values: Map<string, Types[Table]>) {
    const map = this.map.get(db);
    for (let [key, val] of values) {
      map.set(key, val);
    }
  }

  async delete<Table extends keyof Types & string>(db: Table, key: string) {
    this.map.get(db).delete(key);
  }
  
  async deleteAll<Table extends keyof Types & string>(db: Table) {
    this.map.get(db).clear();
  }
}

// "indexed database database"
export class IdbDB<Types extends Record<string, any>> extends Database<Types> {
  private db: IdbT.IDBPDatabase | null = null;
  private keys: Array<string> = [];
  
  constructor(private databaseName: string) {
    super();
  }
  
  async open(keys: Array<string>, version = 1) {
    const { openDB } = await import("idb");
    this.keys = keys;
    this.db = await openDB(this.databaseName, version, {
      upgrade(db) {
        for (let key of keys) {
          db.createObjectStore(key);
        }
      }
    });
  }
  
  async close() {
    if (!this.db) throw new Error("you must .open the database first");
    this.db?.close();
    this.db = null;
  }
  
  async clear() {
    if (!this.db) throw new Error("you must .open the database first");
    const { db, keys } = this;
    await Promise.all(keys.map(key => db.clear(key)));
  }
  
  async get<Table extends keyof Types & string>(db: Table, key: string): Promise<Types[Table]> {
    if (!this.db) throw new Error("you must .open the database first");
    return this.db.get(db, key);
  }
  
  async getAll<Table extends keyof Types & string>(db: Table): Promise<Map<string, Types[Table]>> {
    if (!this.db) throw new Error("you must .open the database first");
    const [keys, vals] = await Promise.all([this.db.getAllKeys(db), this.db.getAll(db)]);
    return new Map(keys.map((k, i) => [k as string, vals[i]]));
  }
  
  async put<Table extends keyof Types & string>(db: Table, key: string, val: Types[Table]) {
    if (!this.db) throw new Error("you must .open the database first");
    this.db.put(db, val, key);
  }
  
  async putAll<Table extends keyof Types & string>(db: Table, values: Map<string, Types[Table]>) {
    if (!this.db) throw new Error("you must .open the database first");
    const tx = this.db.transaction(db, "readwrite");
    const store = tx.objectStore(db);
    for (let [key, val] of values) {
      await store.put(val, key);
    }
    await tx.done;
  }
  
  async delete<Table extends keyof Types & string>(db: Table, key: string) {
    if (!this.db) throw new Error("you must .open the database first");
    this.db.delete(db, key);
  }
  
  async deleteAll<Table extends keyof Types & string>(db: Table) {
    if (!this.db) throw new Error("you must .open the database first");
    this.db.clear(db);
  }
}

/* TODO: sqlite3 persister backend for nodejs
export class Sqlite3DB<Types extends Record<string, any>> extends Database<Types> {
  private db?: Sqlite3T.Database;

  constructor(private path: string) {
    super();
  }  

  async open(databaseName: string, keys: Array<string>, version = 1) {
    const { default: Database } = await import("better-sqlite3");
    this.db = new Database(databaseName, {});
    const sql = this.db.prepare("CREATE TABLE ? (key STRING PRIMARY KEY, value STRING)");
    for (let key of keys) sql.run(key);
  }
  
  async get<Table extends keyof Types & string>(table: Table, key: string): Promise<Types[Table]> {
  }
}
*/