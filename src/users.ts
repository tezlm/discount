import type Client from "./client";
import User from "./user";

export default class Users extends Map<string, User | null> {
  constructor(
    public client: Client,
  ) { super() }
  
  async fetch(userId: string, skipCache = false): Promise<User | null> {
    if (!skipCache && this.has(userId)) return this.get(userId) ?? null;
    const user = await this.client.fetcher.fetchUser(userId)
      .then(data => new User(this.client, userId, data))
      .catch(_ => null);
    this.set(userId, user);
    return user;
  }
}
