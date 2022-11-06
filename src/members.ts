import type Room from "./room";
import { StateEvent } from "./event";
import Member, { Membership } from "./member";

export default class Members extends Map<string, Member> {
  private request: Promise<any> | null = null;
  private sortCache =  new Map();
  public client = this.room.client;
  
  constructor(public room: Room) {
    super();
  }
  
  _handle(event: StateEvent) {
    if (event.type !== "m.room.member") throw new Error("members cache got a non-m.room.member event");
    const id = event.stateKey;
    const member = new Member(this.room, event);
    this.set(id, member);
    
    this.sortCache.delete(event.content.membership);
    this.sortCache.delete(event.unsigned?.prev_content?.membership);
  }
  
  // TODO: implement a way to skip cache?
  async fetch(): Promise<Array<Member>>;
  async fetch(memberId: string): Promise<Member | null>;
  async fetch(memberId?: string): Promise<Member | null | Array<Member>> {
    if (memberId) {
      if (this.has(memberId)) return this.get(memberId) ?? null;
      const raw = await this.client.fetcher.fetchState(this.room.id, "m.room.member", memberId);
      const event = new StateEvent(this.room, raw);
      this.room.handleState(event);
      return this.get(memberId) ?? null;
    } else if (this.request) {
      return this.request;
    } else {
      this.request = this.client.fetcher.fetchMembers(this.room.id)
        .then(({ chunk }) => {
          for (let raw of chunk) {
            const event = new StateEvent(this.room, raw);
            this.room.handleState(event);
          }
          return [...this.values()];
        });
      return this.request;
    }
  }
  
  with(membership: Membership): Array<Member> {
    if (this.sortCache.has(membership)) return this.sortCache.get(membership);
    const members = [...this.values()]
        .filter(i => i.membership === membership)
        .sort((a, b) => (b.power - a.power) || (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));
    this.sortCache.set(membership, members);
    return members;
  }
}
