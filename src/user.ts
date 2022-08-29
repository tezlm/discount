import type Client from "./client";

interface UserData {
  name: string,
  avatar: string,
}

export default class User {
  public client;
  public id;
  private data;
  
  constructor(client: Client, id: string, data: UserData) {
    this.client = client;
    this.id = id;
    this.data = data;
  }
  
  get name(): string {
    return this.data.name;
  }

  get avatar(): string {
    return this.data.avatar;
  }
}