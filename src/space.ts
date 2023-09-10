import Room from "./room.ts";
import * as api from "./api.ts";

class HierarchyRoom {
  id:              string;
  type:            string;
  
  name:            string;
  topic:           string;
  avatar:          string;
  alias:           string;
  
  childrenState:   Array<api.StrippedState>; // only of type m.space.child
  isGuestJoinable: boolean;
  isWorldReadable: boolean;
  joinRule:        string;
  memberCount:     number;

  isSuggested:     boolean;

  constructor(public parent: Space, raw: api.HierarchyRoom) {
    this.id = raw.room_id;
    this.type = raw.room_type;
    
    this.name = raw.name;
    this.topic = raw.topic;
    this.avatar = raw.avatar_url;
    this.alias = raw.canonical_alias;
    
    this.childrenState = raw.children_state;
    this.isGuestJoinable = raw.guest_can_join;
    this.isWorldReadable = raw.world_readable;
    this.joinRule = raw.join_rule;
    this.memberCount = raw.num_joined_members;
    
    this.isSuggested = false;
  }

  async join() {
    throw "unimplemented";
  }
  
  async suggest(suggest?: boolean) {
    throw "unimplemented";
  }
}

class HierarchyPaginator extends Array<HierarchyRoom> {
  private nextBatch: string | undefined | null;
  
  constructor(public room: Room) {
    super();
  }
  
  async next(): Promise<Array<HierarchyRoom>> {
    if (this.nextBatch === null) return [];
    
    const { room } = this;
    const chunk = await room.client.fetcher.fetchHierarchy(room.id, {
      from: this.nextBatch,
    });

    for (let raw of chunk.rooms) this.push(new HierarchyRoom(room, raw));
    
    this.nextBatch = chunk.next_batch ?? null;
    return this.slice(-chunk.rooms.length);
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

export default class Space extends Room {
  // TODO: have a list of rooms you're in that the space has
  // how do i keep this list updated while remaining performant?
  // public rooms: Array<Room> = [];
  
  public async hierarchy(): Promise<HierarchyPaginator> {
    const paginator = new HierarchyPaginator(this);
    await paginator.next();
    return paginator;
  }
}
