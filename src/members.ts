import type Client from "./client";
import type Room from "./room";
import { StateEvent } from "./event";
import Member, { Membership } from "./member";

export default class Members extends Map<string, Member> {
  private requests = new Map<string, Promise<any>>;
  private sortCache =  new Map<string, Array<Member>>();
  public client: Client;
  
  constructor(public room: Room) {
    super();
    this.client = room.client;
  }
  
  _handle(event: StateEvent) {
    if (event.type !== "m.room.member") throw new Error("members cache got a non-m.room.member event");
    const id = event.stateKey;
    const member = new Member(this.room, event);
    this.set(id, member);
    
    this.sortCache.delete(event.content.membership);
    this.sortCache.delete(event.unsigned?.prev_content?.membership);
  }
  
  async fetch(memberId: string, skipCache = false): Promise<Member | null> {
    if (this.has(memberId) && !skipCache) return this.get(memberId) ?? null;
    if (this.requests.has(memberId)) return this.requests.get(memberId);
    const promise = this.room.fetchState("m.room.member", memberId, skipCache);
    this.requests.set(memberId, promise);
    await promise;
    return this.get(memberId) ?? null;
  }
  
  async fetchAll(membership: Membership | "all" = "all", skipCache = false): Promise<Array<Member>> {
    if (this.sortCache.has(membership) && !skipCache) return this.sortCache.get(membership)!;
    if (this.requests.has(membership)) return this.requests.get(membership);
    const req = this.client.fetcher
      .fetchMembers(this.room.id, membership === "all" ? null : membership)
      .then(({ chunk }) => {
        for (let raw of chunk) {
          const event = new StateEvent(this.room, raw);
          this.room.handleState(event);
        }
        return [...this.values()];
      });
    this.requests.set(membership, req);
    if (membership === "all") return req;
    return req.then(() => this.with(membership));
  }
  
  with(membership: Membership): Array<Member> {
    if (this.sortCache.has(membership)) return this.sortCache.get(membership)!;
    const members = [...this.values()]
        .filter(i => i.membership === membership)
        .sort((a, b) => (b.power - a.power) || (a.name > b.name ? 1 : a.name < b.name ? -1 : 0));
    this.sortCache.set(membership, members);
    return members;
  }
}
