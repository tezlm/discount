import type Client from "./client";

interface UserData {
  name: string,
  avatar: string,
  [key: string]: any,
}

export default class User {
  constructor(
    public client: Client,
    public id: string,
    private data: UserData
  ) {
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