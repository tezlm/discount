import type Client from "./client";
import type * as api from "./api";

class PublicRoom {
  public id: string;
  public type: string;
  
  public avatar: string;
  public alias: string;
  public name: string;
  public topic: string;
  
  public joinRule: string;
  public guestJoinable: boolean;
  public isWorldReadable: boolean;
  public memberCount: number;
  
  constructor(public client: Client, data: api.PublicRoom) {
    this.id = data.room_id;
    this.type = data.room_type;
    this.avatar = data.avatar_url;
    this.alias = data.canonical_alias;
    this.name = data.name;
    this.topic = data.topic;
    this.joinRule = data.join_rule;
    this.guestJoinable = data.guest_can_join;
    this.isWorldReadable = data.world_readable;
    this.memberCount = data.num_joined_members;
  }
  
  async join() {
    
  }
}

export default class Rooms extends Array<PublicRoom> {
  private nextBatch: string;
  public server: string | undefined;
  public totalCount: number;
  
  constructor(public client: Client, chunk: api.PublicRooms, server?: string) {
    super();
    this.totalCount = chunk.total_room_count_estimate;
    this.nextBatch = chunk.next_batch;
    this.server = server;
    
    for (let raw of chunk.chunk) {
      this.push(new PublicRoom(client, raw));
    }    
  }
  
  async next(): Promise<Array<PublicRoom>> {
    const chunk = await this.client.fetcher.fetchPublicRooms({
      since: this.nextBatch,
      server: this.server,
    });
    
    this.totalCount = chunk.total_room_count_estimate;
    this.nextBatch = chunk.next_batch;
    
    const arr = [];
    for (let raw of chunk.chunk) {
      arr.push(new PublicRoom(this.client, raw));
    }
    
    this.push(...arr);
    
    return arr;
  }
  
  async *[Symbol.asyncIterator]() {
    for (let item of this) yield item;
    let fetched;
    do {
      fetched = await this.next();
      for (let item of fetched) yield item;
    } while(fetched.length);
  }
  
  async all() {
    while ((await this.next()).length);
    return this;
  }
}
