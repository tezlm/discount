import type Client from "./client";
import { UserData } from "./api";

export default class User {
  public name = this.data.name;
  public avatar = this.data.avatar;
  
  constructor(
    public client: Client,
    public id: string,
    private data: UserData
  ) {}  
}