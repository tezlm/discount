import type Room from "./room";
import type { StateEvent } from "./event";
// import User from "./user";

export type Membership = "join" | "knock" | "invite" | "leave" | "ban";

// export default class Member extends User {
export default class Member {
  public client = this.room.client;
  public id: string;
  public name: string;
  public avatar: string;
  
  constructor(
    public room: Room,
    public event: StateEvent
  ) {
    if (!event.stateKey) throw "event must have stateKey";
    this.room = room;
    this.event = event;
    this.id = event.stateKey;
    this.name = event.content.displayname;
    this.avatar = event.content.avatar_url;
  }
  
  get membership(): Membership {
    return this.event.content.membership ?? "leave";
  }
  
  get power(): number {
    // TODO: power should always be defined in room
    return (this.room.power as any)?.getUser(this.id) ?? 0;
  }
  
  async ban(reason: string) {
    this.client.fetcher.banMember(this.room.id, this.id, reason);
  }
  
  async kick(reason?: string) {
    this.client.fetcher.kickMember(this.room.id, this.id, reason);
  }
  
  async unban(reason: string) {
    this.client.fetcher.unbanMember(this.room.id, this.id, reason);
  }
  
  // TEMP: discard parity
  get userId(): string { return this.id }
}