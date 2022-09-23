import type Client from "./client";
import type { StateEvent } from "./event";

export default class Room {
  private state: Array<StateEvent> = [];
  
  constructor(
    public client: Client,
    public id: string,
  ) {}
  
  getState(type: string, key = ""): StateEvent | undefined {
    return this.state.find(i => i.type === type && i.stateKey === key);
  }
  
  handleState(event: StateEvent, check = true) {
    if (check) {
      const idx = this.state.findIndex(i => i.type === event.type && i.stateKey === event.stateKey);
      if (idx !== -1) this.state.splice(idx, 1);      
    }
    this.state.push(event);
  }
  
  get type(): string {
    return this.getState("m.room.create")?.content.type;
  }
    
  get name(): string {
    return this.getState("m.room.name")?.content.name;
  }
  
  get topic(): string {
    return this.getState("m.room.topic")?.content.topic;
  }
  
  get avatar(): string {
    return this.getState("m.room.avatar")?.content.url;
  }
  
  // leave() {}
  // join() {}
  // invite(who: User | string) {}
  // members: Cache<Member>
  
  async sendEvent(type: string, content: any) {
    const txn = Math.random().toString(36);
    this.client.fetcher.sendEvent(this.id, type, content, txn);
    return await this.client.transaction(txn);
  }
  
  async sendState(type: string, content: any, stateKey = "") {
    await this.client.fetcher.sendState(this.id, type, content, stateKey);
  }
}
