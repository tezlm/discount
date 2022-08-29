import type Client from "./client";
import type { StateEvent } from "./event";

export default class Room {
  constructor(
    public client: Client,
    public id: string,
    private state: Array<StateEvent>,
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
  // async sendEvent(type: string, content: any) {}
  // async sendState(type: string, content: any, stateKey = "") {}
  // async setName(name)
  // async setTopic(name)
  // async setAvatar(avatar)
}
