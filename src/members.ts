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
    if (event.type !== "m.room.member") throw "not m.room.member";
    const id = event.stateKey;
    const member = new Member(this.room, event);
    this.set(id, member);
    
    this.sortCache.delete(event.content.membership);
    this.sortCache.delete(event.unsigned?.prev_content?.membership);
  }
  
  async fetch() {
    if (this.request) return this.request;
    this.request = this.client.fetcher.fetchMembers(this.room.id)
      .then(({ chunk }) => {
        for (let raw of chunk) {
          let event = new StateEvent(this.room, raw);
          this.room.handleState(event);
        }
      });
    return this.request;
  }
  
  with(membership: Membership): Array<Member> {
    if (this.sortCache.has(membership)) return this.sortCache.get(membership);
    const cmp = (a: any, b: any) => a > b ? 1 : a < b ? -1 : 0;
    const members = [...this.values()]
        .filter(i => i.membership === membership)
        .sort((a, b) => cmp(b.power, a.power) || cmp(a.name, b.name));
    this.sortCache.set(membership, members);
    return members;
  }
}
