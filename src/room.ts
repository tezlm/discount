import type Client from "./client.ts";
import { StateEvent, LocalEvent } from "./event.ts";
// import Emitter from "./emitter.ts";
import Members from "./members.ts";
import Events from "./events.ts";
import Power from "./power.ts";

type JoinRule = "invite" | "public" | "knock" | "restricted" | "knock_restricted";

export default class Room {
  public state: Array<StateEvent> = [];
  
  public name: string | null = null;
  public topic: string | null = null;
  public avatar: string | null = null;
  public type: string | null = null;
  public power: Power;
  public members: Members;
  public events: Events;
  public accountData: Map<string, any> = new Map();
  public notifications = { unread: 0, highlight: 0 };
  public summary = { joined: 0, invited: 0 };

    // TEMP: event.live may be null and discard needs to be able to mark as read, so this exists for now
  public TEMPlastEventId?: string;
  
  constructor(
    public client: Client,
    public readonly id: string,
  ) {
    this.power = new Power(this);
    this.members = new Members(this);
    this.events = new Events(this);
  }
  
  getState(type: string, stateKey = ""): StateEvent | undefined {
    return this.state.find(i => i.type === type && i.stateKey === stateKey);
  }
  
  getAllState(type: string): Array<StateEvent> {
    return this.state.filter(i => i.type === type);
  }
  
  handleState(event: StateEvent, check = true) {
    if (check) {
      const idx = this.state.findIndex(i => i.type === event.type && i.stateKey === event.stateKey);
      if (idx !== -1) this.state.splice(idx, 1);      
    }
    
    switch (event.type) {
      case "m.room.name":         this.name = event.content.name   ?? null; break;
      case "m.room.topic":        this.topic = event.content.topic ?? null; break;
      case "m.room.avatar":       this.avatar = event.content.url  ?? null; break;
      case "m.room.create":       this.type = event.content.type   ?? null; break;
      case "m.room.join_rules":   this.joinRule = event.content?.join_rule ?? "invite"; break;
      case "m.room.power_levels": this.power._setLevels(event.content); break;
      case "m.room.member":       this.members._handle(event); break;
    }
    
    this.state.push(event);
  }
  
  async fetchState(type: string, stateKey = "", skipCache = false): Promise<StateEvent> {
    const existing = this.getState(type, stateKey);
    if (!skipCache && existing) return existing;
    const event = new StateEvent(this, await this.client.fetcher.fetchState(this.id, type, stateKey));
    this.handleState(event);
    return event;
  }
  
  async sendEvent(type: string, content: any, txnId = "~" + Math.random().toString(36)) {
    const ev = new LocalEvent(this, { type, content }, txnId);
    ev.flags.add("sending");
    this.events.live?._add(ev);
    this.client.emit("event", ev);
    this.client._transactions.set(txnId, ev);
    await this.client.fetcher.sendEvent(this.id, type, content, txnId);
    return ev;
  }
  
  async sendState(type: string, content: any, stateKey = "") {
    await this.client.fetcher.sendState(this.id, type, content, stateKey);
  }
  
  async leave() {
    return this.client.fetcher.leaveRoom(this.id);
  }
  
  // invite(who: User | string) {}
  
  // TEMP: discard parity
  get tombstone() { return this.getState("m.room.tombstone")?.content }
  get roomId()    { return this.id }
  get readEvent() { return this.accountData?.get("m.fully_read")?.event_id ?? null }
  public joinRule: JoinRule = "invite";
}
