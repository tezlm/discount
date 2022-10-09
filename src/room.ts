import type Client from "./client";
import type { StateEvent } from "./event";
import Members from "./members";
// import Events from "./events";

type JoinRule = "invite" | "public" | "knock" | "restricted" | "knock_restricted";

export default class Room {
  private state: Array<StateEvent> = [];
  private _cachePower: object | null = null;
  
  public name: string | null = null;
  public topic: string | null = null;
  public avatar: string | null = null;
  public type: string | null = null;
  public members: Members = new Members(this);
  // public events: Events = new Events(this, null as any); // temp. null timeline that will be replaced
  public accountData: Map<string, { type: string, content: any }> = new Map();
  public notifications = { unread: 0, highlight: 0 };
  
  constructor(
    public client: Client,
    public readonly id: string,
  ) {}
  
  getState(type: string, key = ""): StateEvent | undefined {
    return this.state.find(i => i.type === type && i.stateKey === key);
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
      case "m.room.power_levels": this._cachePower = null; break;
      case "m.room.member":       this.members._handle(event);
    }
    
    this.state.push(event);
  }
  
  // leave() {}
  // join() {}
  // invite(who: User | string) {}

  get power(): any {  
    if (this._cachePower) return this._cachePower;
    const power = this.getState("m.room.power_levels")?.content ?? { state_default: 50, users_default: 50 };
    this._cachePower = {
      ...power,
      me: power.users?.[this.client.userId] ?? power.users_default ?? 0,
      getBase:  (name: string) => power[name]  ?? power.state_default  ?? 50,
      getEvent: (name: string) => power.events?.[name] ?? power.events_default ?? 0,
      getState: (name: string) => power.state?.[name]  ?? power.state_default  ?? 50,
      getUser:  (id: string)   => power.users?.[id]    ?? power.users_default  ?? 0,
    }
    return this._cachePower;
  }
  
  async sendEvent(type: string, content: any) {
    const txn = Math.random().toString(36);
    this.client.fetcher.sendEvent(this.id, type, content, txn);
    return await this.client.transaction(txn);
  }
  
  async sendState(type: string, content: any, stateKey = "") {
    await this.client.fetcher.sendState(this.id, type, content, stateKey);
  }
  
  // TEMP: discard parity
  get tombstone() { return this.getState("m.room.tombstone")?.content }
  get roomId()    { return this.id }
  get readEvent() { return this.accountData?.get("m.fully_read")?.event_id ?? null }
  public joinRule: JoinRule = "invite";
}
