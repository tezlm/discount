import type Client from "./client";
import { UserData } from "./api";

export default class User {
  public name = this.data.displayname;
  public avatar = this.data.avatar_url;
  
  constructor(
    public client: Client,
    public id: string,
    public data: UserData
  ) {}
}