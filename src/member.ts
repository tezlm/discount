import type Client from "./client";
import type Room from "./room";
import type { StateEvent } from "./event";
import User from "./user";

export type Membership = "join" | "knock" | "invite" | "leave" | "ban";

export default class Member {
  public client;
  public room;
  private event;
  
  constructor(client: Client, room: Room, event: StateEvent) {
    if (!event.stateKey) throw "event must have stateKey";
    this.client = client;
    this.room = room;
    this.event = event;
  }
  
  get user(): User {
    return new User(this.client, this.event.stateKey!, this.event.content);
  }
  
  get membership(): Membership {
    return this.event.content.membership ?? "leave";
  }
  
  // ban(reason: string) {}
  // kick(reason: string) {}
  // unban(reason: string) {}
}