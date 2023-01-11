import Emitter from "./emitter";
import Fetcher from "./fetcher";
import type * as api from "./api";

import Users from "./users";
import Rooms from "./rooms";
import Room from "./room";
import Space from "./space";
import Invite from "./invite";
import Timeline from "./timeline";
import { Event, StateEvent, EphemeralEvent, LocalEvent } from "./event";

import Database, { MemoryDB } from "./persist";

interface StatePersist {
  options: any,
  accountData: any,
  rooms: {
    state: Array<api.RawStateEvent>,
    accountData: Array<{ type: string, content: any }>,
    TEMPlastEventId: string,
    notifications: { unread: number, highlight: number },
    summary: { joined: number, invited: number },
  },
  invites: {
    state: Array<api.RawStateEvent>,
  },
  users: {
    name: string,
    avatar: string,
    [key: string]: any,
  },
}

export interface ClientConfig {
  token: string,
  baseUrl: string,
  userId: string,
  persister?: Database<StatePersist>,
}

export type ClientStatus = "stopped" | "starting" | "syncing" | "reconnecting";

type ClientEvents = {
  status: (status: string) => void,
  ready:  () => void,
  error:  (error: Error) => void,
  
  // events
  event:     (event: Event) => void,
  redact:    (event: Event) => void,
  state:     (state: StateEvent) => void,
  ephemeral: (edu: EphemeralEvent) => void,
  
  // membership
  join:           (room: Room) => void,
  invite:         (room: Invite) => void,
  leave:          (room: Room) => void,
  inviteLeave:    (room: Invite) => void, // temporary => void,
  // i want to replace special case "invite" with a room or room-compatible class
  // so that i can use standard events (state/leave/roomAccountData) with it
  // maybe have a base room -> joined room/invited room/left room?
  
  // misc
  // TODO: event when a remote echo fails to send
  remoteEcho:      (echo: LocalEvent, txnId: string) => void,
  accountData:     (event: api.AccountData) => void,
  roomAccountData: (room: Room, event: api.AccountData) => void,
  notifications:   (room: Room, notifs: { unread: number, highlight: number }) => void,
  summary:         (room: Room, summary: { joined: number, invited: number }) => void,
}

export default class Client extends Emitter<ClientEvents> {
  public status: ClientStatus = "stopped";
  public fetcher: Fetcher;
  public userId: string;
  public users = new Users(this);
  public rooms = new Rooms(this);
  public invites = new Map<string, Invite>();
  public accountData = new Map<string, any>();
  public _transactions = new Map<string, LocalEvent>();
  private abort = new AbortController();
  private persister: Database<StatePersist> = new MemoryDB();
  
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
        const sync = await this.fetcher.sync(since, this.abort, 0);
        if (!sync) continue;
        if (await this.handleSync(sync)) await this.save(sync);
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
    if (await this.handleSync(sync)) await this.save(sync);

    if (this.status === "starting") {
      this.setStatus("syncing");
      this.emit("ready");
    }
    
    this.sync(sync.next_batch);
  }
  
  private async handleSync(sync: api.Sync): Promise<boolean> {
    let dirty = false;
    
    if (sync.account_data) {
        dirty = true;
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
          dirty = true;
          if (this.rooms.has(id)) {
            const room = this.rooms.get(id);
            for (let raw of data.state.events) {
              const state = new StateEvent(room!, raw);
              room!.handleState(state);
              this.emit("state", state);
            }
          } else {
            const { type } = data.state.events.find(i => i.type === "m.room.create")?.content;
            const room = type === "m.space" ? new Space(this, id) : new Room(this, id);
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
        if (!room) throw new Error("tried to access room that doesn't exist");
        
        if (data.timeline) {
          dirty = true;
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
                room.events.live?._redact(event); this.emit("redact", event);
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
          dirty = true;
          room.accountData.set(event.type, event.content);
          this.emit("roomAccountData", room, event);
        }
      
        for (let event of data.ephemeral?.events ?? []) this.emit("ephemeral", new EphemeralEvent(room, event));
      
        if (data.unread_notifications) {
          dirty = true;
          const apiNotifs = data.unread_notifications;
          const notifs = { unread: apiNotifs.notification_count, highlight: apiNotifs.highlight_count };
          room.notifications = notifs;
          this.emit("notifications", room, notifs);
        }

        if (data.summary) {
          dirty = true;
          const apisum = data.summary;
          const summary = { joined: apisum["m.joined_member_count"], invited: apisum["m.invited_member_count"] };
          room.summary = summary;
          this.emit("summary", room, summary);
        }
      }

      for (let id in r.invite ?? {}) {
        dirty = true;
        if (this.invites.has(id)) {
          const invite = this.invites.get(id)!;
          for (let ev of r.invite![id].invite_state.events) invite.handleState(ev);
        } else {
          const invite = new Invite(this, id);
          for (let ev of r.invite![id].invite_state.events) invite.handleState(ev, false);
          this.invites.set(id, invite);
          this.emit("invite", invite);
        }
      }
      
      for (let id in r.leave ?? {}) {
        dirty = true;
        if (this.rooms.has(id)) {
          const room = this.rooms.get(id)!;
          this.rooms.delete(id);
          this.emit("leave", room);
        }
        if (this.invites.has(id)) {
          // TODO: merge with normal `leave` and make Invites Rooms
          const invite = this.invites.get(id)!;
          this.invites.delete(id);
          this.emit("inviteLeave", invite);
        }
      }
    }
    
    return dirty;
  }
  
  // TODO: optimize sync: only persist exactly what changed
  // private async save(sync: api.Sync, deltas: Array<Room | Invite | accountdata>) {
  // FIXME: transactional saves: sometimes saved sync can be deleted
  private async save(sync: api.Sync) {
    const roomData = new Map();
    const inviteData = new Map();
    
    for (let [id, room] of this.rooms) {
      roomData.set(id, {
        state: room.state.map(i => i.raw),
        accountData: [...room.accountData].map(([type, content]) => ({ type, content })),
        TEMPlastEventId: room.events.live?.at(-1)?.id ?? room.TEMPlastEventId,
        notifications: room.notifications,
        summary: room.summary,
      });
    }
    
    for (let [id, invite] of this.invites) {
      inviteData.set(id, {
        state: invite.state,
      });
    }
    
    await Promise.all([
      this.persister.deleteAll("accountData"),
      this.persister.deleteAll("rooms"),
      this.persister.deleteAll("invites"),
    ]);
    await Promise.all([
      this.persister.putAll("rooms", roomData),
      this.persister.putAll("invites", inviteData),
      this.persister.putAll("accountData", this.accountData),
      this.persister.put("options", "sync", sync),
    ]);
  }
  
  public async start() {
    this.setStatus("starting");
    
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

    await this.persister.open(["options", "accountData", "rooms", "invites", "users"], 1);
    const savedSync: api.Sync = await this.persister.get("options", "sync");
    if (savedSync) {
      const [accountData, rooms, invites] = await Promise.all([
        this.persister.getAll("accountData"),
        this.persister.getAll("rooms"),
        this.persister.getAll("invites"),
      ]);
      
      for (let [type, content] of accountData) {
        this.accountData.set(type, content);
        this.emit("accountData", { type, content });
      }
      
      for (let [roomId, data] of rooms) {
        const { type } = data.state.find(i => i.type === "m.room.create")?.content;
        const room = type === "m.space" ? new Space(this, roomId) : new Room(this, roomId);
        for (let raw of data.state) room.handleState(new StateEvent(room, raw), false);
        this.rooms.set(roomId, room);
        this.emit("join", room);
        
        const savedTimeline = savedSync.rooms?.join?.[roomId]?.timeline;
        if (savedTimeline) {
          const timeline = new Timeline(room, savedTimeline.prev_batch ?? null, null);
          room.events.live = timeline;
          for (let raw of savedTimeline.events) {
            if (raw.unsigned?.redacted_because) continue;
            if (raw.type === "m.room.redaction") continue;
            
            const event = new Event(room!, raw);
            timeline._add(event);
            this.emit("event", event);
            
            // dendrite doesn't send room.state if the state event exists in timeline
            if ((typeof event.stateKey ===  "string") && room.getState(event.type, event.stateKey)?.id !== event.id) {
              const state = new StateEvent(room, raw as any);
              room.handleState(state);
              this.emit("state", state);
            }
          }
        }
        
        for (let { type, content } of data.accountData) {
          room.accountData.set(type, content);
          this.emit("roomAccountData", room, { type, content });
        }
        
        room.TEMPlastEventId = data.TEMPlastEventId;
        room.notifications = data.notifications;
        room.summary = data.summary;
        this.emit("notifications", room, data.notifications);
        this.emit("summary", room, data.summary);
      }
      for (let [roomId, data] of invites) {
        const invite = new Invite(this, roomId);
        for (let raw of data.state) invite.handleState(raw, false);
        this.invites.set(roomId, invite);
        this.emit("invite", invite);
      }
      this.setStatus("syncing");
      this.emit("ready");
      this.sync(savedSync.next_batch);
    } else {
      this.sync();
    }
  }
  
  public async stop() {
    this.abort.abort();
    this.persister.close();
    this.setStatus("stopped");
  }
  
  // how to do this? should i use a static function for login?
  public async login() {
    throw new Error("unimplemented");
  }
  
  public async logout() {
    this.abort.abort();
    await this.persister.clear();
    await this.persister.close();
    await this.fetcher.logout();
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
