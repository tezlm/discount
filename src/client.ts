import Emitter from "./emitter";
import Fetcher from "./fetcher";
import type * as api from "./api"
import Room from "./room";
import Events from "./events";
import Timeline from "./timeline";
import { Event, StateEvent, EphemeralEvent } from "./event.js";

export interface ClientConfig {
  token: string,
  baseUrl: string,
  userId: string,
}

export type ClientStatus = "stopped" | "starting" | "syncing" | "reconnecting";

interface ClientEvents {
  on(event: "status", listener: () => any): this,
  on(event: "ready", listener: () => any): this,
  on(event: "error", listener: (error: Error) => any): this,
  
  // events
  on(event: "event", listener: (event: Event) => any): this,
  on(event: "state", listener: (state: StateEvent) => any): this,
  on(event: "ephemeral", listener: (edu: EphemeralEvent) => any): this,
  
  // membership
  on(event: "join", listener: (room: Room, prevPatch: string) => any): this,
  // on(event: "invite", listener: (room: Room) => any): this,
  on(event: "leave", listener: (room: Room) => any): this,
  
  // misc
  // on(event: "accountData", listener: (events: [api.AccountData], room: Room | null) => any): this,
  on(event: "accountData", listener: (event: api.AccountData) => any): this,
  on(event: "roomAccountData", listener: (event: api.AccountData, room: Room) => any): this,
  on(event: "notifications", listener: (events: { unread: number, highlight: number }, room: Room) => any): this,
}

export default class Client extends Emitter implements ClientEvents {
  public status: ClientStatus = "stopped";
  public fetcher: Fetcher;
  public userId: string;
  public rooms = new Map<string, Room>();
  public accountData = new Map<string, any>();
  private transactions = new Map<string, Function>();
  
  constructor(config: ClientConfig) {
    super();
    this.userId = config.userId;
    this.fetcher = new Fetcher(config.token, config.baseUrl);
  }
  
  private setStatus(status: ClientStatus) {
    this.emit("status", status);
    this.status = status;
  }
  
  private handleError(error: any, since? : string) {
    console.log(error);
    if (error.errcode) throw new Error(error);
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
    if (sync.account_data) {
        for (let event of sync.account_data.events) {
          this.accountData.set(event.type, event.content);
          this.emit("accountData", event);
        }
    }
    
    if (sync.rooms) {
      const r = sync.rooms;
      for (let id in r.join ?? {}) {
        const data = r.join![id];
        if (data.state) {
          if (this.rooms.has(id)) {
            const room = this.rooms.get(id);
            for (let raw of data.state.events) {
              const state = new StateEvent(room!, raw);
              room!.handleState(state);
              this.emit("state", state);
            }
          } else {            
            // hacky code™
            const room = new Room(this, id);
            // const timeline = new Timeline(room.events, data.timeline?.prev_batch ?? null, null);
            // (room.events as any).live = timeline;

            for (let raw of data.state.events) {
              room.handleState(new StateEvent(room, raw), false);
            }
                        
            this.rooms.set(id, room);
            // this.emit("join", room);
            this.emit("join", room, data.timeline?.prev_batch);
          }
        }

        const room = this.rooms.get(id);
        if (!room) return;
        
        // if (data.timeline && this.status !== "starting") {
        if (data.timeline) {
          if (!room) throw "how did we get here?";
          for (let raw of data.timeline.events) {
            const event = new Event(room!, raw);
            if (raw.type === "m.room.redaction") {              
              // this.emit("redact", event);
              // this.emit("event", event);
              this.emit("event", event);
            } else {
              // room.events.live._add(event);
              // this.emit("event", event);
              this.emit("event", event);
            }
            if (raw.unsigned?.transaction_id) {
              const txn = raw.unsigned.transaction_id;
              this.transactions.get(txn)?.(event);
              this.transactions.delete(txn);
            }
          }
        }
        
        for (let event of data.account_data?.events ?? []) {
          room.accountData.set(event.type, event.content);
          this.emit("roomAccountData", room, event);
        }
      
        for (let event of data.ephemeral?.events ?? []) this.emit("ephemeral", new EphemeralEvent(room, event));
      
        if (data.unread_notifications) {
          const apiNotifs = data.unread_notifications;
          const notifs = { unread: apiNotifs.notification_count, highlight: apiNotifs.highlight_count };
          room.notifications = notifs;
          this.emit("notifications", room, notifs);
        }
      }
     
     for (let id in r.leave ?? {}) {
        if (this.rooms.has(id)) {
          this.emit("leave", this.rooms.get(id));
          this.rooms.delete(id);
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
  
  public async transaction(id: string): Promise<Event | StateEvent> {
    return new Promise((res) => {
      this.transactions.set(id, res);
    });
  }
  
  public async start() {
    this.setStatus("starting");
    const filterId = await this.fetcher.postFilter(this.userId, {
      room: {
        state: { lazy_load_members: true },
        timeline: { limit: 0 },
      },
    });
    this.fetcher.filter = filterId;
    this.sync();
  }
}
