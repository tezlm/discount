import Emitter from "./emitter";
import Fetcher from "./fetcher";
import type * as api from "./api";

import Users from "./users";
import Room from "./room";
import Invite from "./invite";
import Timeline from "./timeline";
import { Event, StateEvent, EphemeralEvent, LocalEvent } from "./event";

import Persister, { MemoryPersister } from "./persist";

interface StatePersist {
  accountData: { type: string, value: any },
  room: {
    roomId: string,
    state: Array<api.RawStateEvent>,
    accountData: Array<{ type: string, value: any }>,
    notifications: { unread: 0, highlight: 0 },
    // timeline: Array<api.RawEvent>
  },
  // user: { id: string, data: api.UserData },
  batchToken: string,
}

export interface ClientConfig {
  token: string,
  baseUrl: string,
  userId: string,
  persister?: Persister<StatePersist>,
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
  on(event: "invite", listener: (room: Invite) => any): this,
  on(event: "leave", listener: (room: Room) => any): this,
  on(event: "leave-invite", listener: (room: Invite) => any): this, // temporary for rejecting/uninviting
  // i want to replace special case "invite" with a room or room-compatible class
  // so that i can use standard events (state/leave/roomAccountData) with it
  // maybe have a base room -> joined room/invited room/left room?
  
  // misc
  // TODO: event when a remote echo fails to send
  on(event: "remoteEcho", listener: (echo: LocalEvent, txnId: string) => any): this,
  on(event: "accountData", listener: (event: api.AccountData) => any): this,
  on(event: "roomAccountData", listener: (event: api.AccountData, room: Room) => any): this,
  on(event: "notifications", listener: (events: { unread: number, highlight: number }, room: Room) => any): this,
}

export default class Client extends Emitter implements ClientEvents {
  public status: ClientStatus = "stopped";
  public fetcher: Fetcher;
  public userId: string;
  public users = new Users(this);
  public rooms = new Map<string, Room>();
  public invites = new Map<string, Invite>();
  public accountData = new Map<string, any>();
  public _transactions = new Map<string, LocalEvent>();
  private abort = new AbortController();
  private persister: Persister<StatePersist> = new MemoryPersister();
  
  constructor(config: ClientConfig) {
    super();
    this.userId = config.userId;
    this.fetcher = new Fetcher(config.token, config.baseUrl);
    if (config.persister) this.persister = config.persister;
  }
  
  private setStatus(status: ClientStatus) {
    this.emit("status", status);
    this.status = status;
  }  
  
  private async handleError(error: any, since? : string) {
    if (error.errcode) throw new Error(error);
    if (error.name === "AbortError") return this.setStatus("stopped");
    
    this.setStatus("reconnecting");
    
    while(true) {
      try {
        const sync = await this.fetcher.sync(since, this.abort, 1);
        if (!sync) continue;
        this.handleSync(sync);
        this.setStatus("syncing");
        this.sync(sync.next_batch);
        break;
      } catch(err) {
        if (error.errcode) throw new Error(error);
        if (error.name === "AbortError") return this.setStatus("stopped");
        
        await new Promise(res => setTimeout(res, 1000));
      }
    }
  }
  
  private async sync(since?: string) {
    const sync = await this.fetcher.sync(since, this.abort)
      .catch((err) => this.handleError(err, since));
    if (!sync) return;
    await this.handleSync(sync);

    if (this.status === "starting") {
      this.setStatus("syncing");
      this.emit("ready");
    }
    
    this.sync(sync.next_batch);
  }
  
  private async handleSync(sync: api.Sync) {
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
            const room = new Room(this, id);
            // TODO: handle next_batch
            const timeline = new Timeline(room, data.timeline?.prev_batch ?? null, null);
            room.events.live = timeline;

            if (this.invites.has(id)) {
              for (let raw of await this.fetcher.fetchState(id)) {
                room.handleState(new StateEvent(room, raw), false);
              }
            } else {
              for (let raw of data.state.events) {
                room.handleState(new StateEvent(room, raw), false);
              }
            }
            
            this.invites.delete(id);
            this.rooms.set(id, room);
            this.emit("join", room);
          }
        }

        const room = this.rooms.get(id);
        if (!room) return;
        
        if (data.timeline) {
          for (let raw of data.timeline.events) {
            const txnId = raw.unsigned?.transaction_id;
            const txn = this._transactions.get(txnId);
            if (txn) {
              txn.upgrade(raw);
              txn.flags.delete("sending");
              txn.room.events.delete(txnId);
              txn.room.events.set(txn.id, txn);
              this._transactions.delete(txnId);
              this.emit("remoteEcho", txn, txnId);
            } else {
              const event = new Event(room!, raw);
              if (raw.type === "m.room.redaction") {
                room.events.live?._redact(event);
                this.emit("redact", event);
              } else {
                room.events.live?._add(event);
                this.emit("event", event);
              }
              // dendrite doesn't send room.state if the state event exists in timeline
              if ((typeof event.stateKey ===  "string") && room.getState(event.type, event.stateKey)?.id !== event.id) {
                const state = new StateEvent(room, raw as any);
                room.handleState(state);
                this.emit("state", state);
              }
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
     

      for (let id in r.invite ?? {}) {
        if (this.invites.has(id)) {
          const invite = this.invites.get(id);
          for (let ev of r.invite![id].invite_state.events) invite?.handleState(ev);
        } else {
          const invite = new Invite(this, id);
          for (let ev of r.invite![id].invite_state.events) invite.handleState(ev, false);
          this.invites.set(id, invite);
          this.emit("invite", invite);
        }
      }
      
      for (let id in r.leave ?? {}) {
        if (this.rooms.has(id)) {
          const room = this.rooms.get(id);
          this.rooms.delete(id);
          this.emit("leave", room);
        }
        if (this.invites.has(id)) {
          // TODO: merge with normal `leave` and make Invites Rooms
          const invite = this.invites.get(id);
          this.invites.delete(id);
          this.emit("leave-invite", invite);
        }
      }
    }
  }
  
  public async start() {
    this.setStatus("starting");
    await this.persister.open("persister", ["accountData"], 1);
    if (!this.fetcher.filter) {
      const filterId = await this.fetcher.postFilter(this.userId, {
        room: {
          state: { lazy_load_members: true },
          timeline: { limit: 2 },
        },
        presence: {
          types: [],
        },
      });
      this.fetcher.filter = filterId;
    }
    this.sync();
  }
  
  public async stop() {
    this.abort.abort();
    this.setStatus("stopped");
  }
  
  // public async searchRooms(searchTerm: string, options?: { server?: string, limit?: number }) {
  //   return new Paginatable extends Array();
  //   p.next(): Paginatable,
  //   p.prev(): Paginatable,
  // }
  
  // public async searchUsers(searchTerm: string, options?: { limit?: number }): Promise<[]> {
    
  // }
}
