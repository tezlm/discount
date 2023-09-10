import type Client from "./client.ts";
import type * as api from "./api.ts";

export default class Invite {
  public state: Array<api.StrippedState> = [];
  public name: string | null = null;
  public topic: string | null = null;
  public avatar: string | null = null;
  public type: string | null = null;
  
  constructor(
    public client: Client,
    public readonly id: string,
  ) {}
  
  handleState(event: api.StrippedState, check = true) {
    if (check) {
      const idx = this.state.findIndex(i => i.type === event.type && i.state_key === event.state_key);
      if (idx !== -1) this.state.splice(idx, 1);
    }
    
    switch (event.type) {
      case "m.room.name":         this.name = event.content.name   ?? null; break;
      case "m.room.topic":        this.topic = event.content.topic ?? null; break;
      case "m.room.avatar":       this.avatar = event.content.url  ?? null; break;
      case "m.room.create":       this.type = event.content.type   ?? null; break;
    }
    
    this.state.push(event);
  }
  
  // TODO: get state
  // getState(type: string, key = ""): StateEvent | undefined {
    // return this.state.find(i => i.type === type && i.stateKey === key);
  // }
  
  // getAllState(type: string): Array<StateEvent> {
    // return this.state.filter(i => i.type === type);
  // }
  
  async join() {
    await this.client.fetcher.joinRoom(this.id);
  }
  
  async leave() {
    await this.client.fetcher.leaveRoom(this.id);
  }
}
