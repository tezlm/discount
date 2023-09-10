import type Client from "./client.ts";
import { UserData } from "./api.ts";

export default class User {
  public name: string;
  public avatar: string;
  
  constructor(
    public client: Client,
    public id: string,
    public data: UserData
  ) {
    this.name = data.displayname;
    this.avatar = data.avatar_url;
  }
}