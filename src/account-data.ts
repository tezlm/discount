import type Client from "./client.ts";

export default class AccountData extends Map<string, any> {
  constructor(public client: Client) {
    super();
  }
  
  async put(key: string, data: any) {
    return this.client.fetcher.setAccountData(this.client.userId, key, data);
  }
}
