import Emitter from "./emitter.js";
import Fetcher from "./fetcher.js";

export interface ClientConfig {
  token: string,
  baseUrl: string,
}

export enum ClientStatus {
  Stopped = "stopped",
  Starting = "starting",
  Syncing = "syncing",
  Reconnecting = "reconnecting",
}

interface ClientEvents {
  on(event: "status", listener: () => any): this,
  on(event: "ready", listener: () => any): this,
  on(event: "error", listener: (error: Error) => any): this,
  
  // events
  // on(event: "event", listener: (Event) => any): this,
  // on(event: "state", listener: () => any): this,
  // on(event: "ephermeral", listener: () => any): this,
  
  // room members
  // on(event: "join", listener: (member: Member) => any): this,
  // on(event: "invite", listener: (member: Member) => any): this,
  // on(event: "leave", listener: (member: Member) => any): this,
  // on(event: "member", listener: (member: Member) => any): this,
}

export default class Client extends Emitter implements ClientEvents {
  public status = ClientStatus.Stopped;
  public fetcher: Fetcher;
  
  constructor(config: ClientConfig) {
    super();
    this.fetcher = new Fetcher(config.token, config.baseUrl);
  }
  
  private setStatus(status: ClientStatus) {
    this.emit("status", status);
    this.status = status;
  }
  
  private async sync(since?: string) {
    const sync = await this.fetcher.fetchClient("/sync", { query: since ? { since } : undefined });
    if (sync.error) { throw "error" }
    
    if (this.status === ClientStatus.Starting) {
      this.setStatus(ClientStatus.Syncing);
      this.emit("ready");
    } else if (this.status === ClientStatus.Reconnecting) {
      this.setStatus(ClientStatus.Syncing);
    }
    
    this.sync(sync.since);
  }
  
  async start() {
    this.setStatus(ClientStatus.Starting);
    this.sync();
  }
}
