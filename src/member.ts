import type Client from "./client.ts";
import type Room from "./room.ts";
import type { StateEvent } from "./event.ts";
// import User from "./user.ts";
import { intern } from "./util.ts";

export type Membership = "join" | "knock" | "invite" | "leave" | "ban";

// export default class Member extends User {
export default class Member {
  public client: Client;
  public id: string;
  public name: string;
  public avatar: string;
  
  constructor(
    public room: Room,
    public event: StateEvent
  ) {
    if (!event.stateKey) throw new Error("event must have stateKey");
    this.client = room.client;
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
    return this.room.power.forUser(this.id);
  }
  
  async setPower(power?: number) {
    return this.room.power.patch({ users: { [this.id]: power }});
  }
  
  async ban(reason?: string) {
    this.client.fetcher.banMember(this.room.id, this.id, reason);
  }
  
  async kick(reason?: string) {
    this.client.fetcher.kickMember(this.room.id, this.id, reason);
  }
  
  async unban(reason?: string) {
    this.client.fetcher.unbanMember(this.room.id, this.id, reason);
  }
  
  // TEMP: discard parity
  get userId(): string { return this.id }
}