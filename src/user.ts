import type Client from "./client";
import { UserData } from "./api";

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