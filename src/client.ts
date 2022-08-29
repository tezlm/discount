import Emitter from "./emitter.js";
import Fetcher from "./fetcher.js";
import type * as api from "./api.js"

import Room from "./room.js";
import { Event, StateEvent } from "./event.js";

export interface ClientConfig {
  token: string,
  baseUrl: string,
}

export type ClientStatus = "stopped" | "starting" | "syncing" | "reconnecting";

interface ClientEvents {
  on(event: "status", listener: () => any): this,
  on(event: "ready", listener: () => any): this,
  on(event: "error", listener: (error: Error) => any): this,
  
  // events
  on(event: "event", listener: (event: Event) => any): this,
  on(event: "state", listener: (state: StateEvent) => any): this,
  // on(event: "ephermeral", listener: () => any): this,
  
  // room members
  // on(event: "join", listener: (member: Member) => any): this,
  // on(event: "invite", listener: (member: Member) => any): this,
  // on(event: "leave", listener: (member: Member) => any): this,
  // on(event: "member", listener: (member: Member) => any): this,
}

export default class Client extends Emitter implements ClientEvents {
  public status: ClientStatus = "stopped";
  public fetcher: Fetcher;
  public rooms = new Map<string, Room>();
  
  constructor(config: ClientConfig) {
    super();
    this.fetcher = new Fetcher(config.token, config.baseUrl);
  }
  
  private setStatus(status: ClientStatus) {
    this.emit("status", status);
    this.status = status;
  }
  
  private handleError(error: any, since? : string) {
    console.log(error);
    if (error.errcode) return;
    this.retry(1000, since);
  }
  
  private retry(timeout: number, since?: string) {
    setTimeout(async () => {
      const sync = await this.fetcher.sync(since)
        .catch(() => this.retry(timeout * 2, since));
      if (!sync) return;
      this.handleSync(sync);
    }, timeout);
  }
    
  private async sync(since?: string) {
    const sync = await this.fetcher.sync(since)
      .catch((err) => this.handleError(err, since));
    if (!sync) return;
    this.handleSync(sync);
  }
  
  private handleSync(sync: api.Sync) {
    if (sync.rooms) {
      const r = sync.rooms;
      for (let id in r.join ?? {}) {
        if (r.join[id].state) {
          if (this.rooms.has(id)) {
            const room = this.rooms.get(id);
            for (let raw of r.join[id].state.events) {
              const state = new StateEvent(this, room!, raw);
              room!.handleState(state);
              this.emit("state", state);
            }
          } else {
            const room = new Room(this, id);
            for (let raw of r.join[id].state.events) {
              room.handleState(new StateEvent(this, room, raw), false);
            }
            this.rooms.set(id, room);
          }
        }
        
        if (r.join[id].timeline && this.status !== "starting") {
          const room = this.rooms.get(id);
          if (!room) throw "how did we get here?";
          for (let raw of r.join[id].timeline.events) {
            const event = new Event(this, room!, raw);
            this.emit("event", event);
          }
        }
      }
    }
    
    if (this.status === "starting") {
      this.setStatus("syncing");
      this.emit("ready");
    } else if (this.status === "reconnecting") {
      this.setStatus("syncing");
    }
    
    this.sync(sync.next_batch);
  }
  
  async start() {
    this.setStatus("starting");
    this.sync();
    // this.fetcher.filter.post();
  }
}
