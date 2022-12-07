import type Client from "./client";
import type Room from "./room";

interface RoomCreateOptions {
  creationContent?: { [key: string]: any },
  initialState?: Array<{ type: string, stateKey: string, content: any }>,
  invite: Array<string>,
  isDirect?: boolean,
  isInDirectory?: boolean,
  name?: string,
  powerLevelOverrides?: any,
  preset?: "private_chat" | "public_chat" | "trusted_private_chat",
  roomAlias?: string,
  roomVersion?: string,
  topic?: string,
}

export default class Rooms extends Map<string, Room> {
  constructor(
    public client: Client,
  ) { super() }
  
  // hacky code go brrrr
  async create(options: RoomCreateOptions): Promise<Room> {
    let done: (room: Room) => void, room_id: string;
    const promise: Promise<Room> = new Promise((res) => done = res);
    const listener = (room: Room) => {
        if (room.id === room_id) {
          done(room);
          this.client.off("join", listener);
        }
    };

    this.client.on("join", listener);    
    
    ({ room_id } = await this.client.fetcher.createRoom({
      creation_content: options.creationContent,
      initial_state: options.initialState?.map(i => ({ type: i.type, state_key: i.stateKey, content: i.content })),
      invite: options.invite,
      is_direct: options.isDirect,
      name: options.name,
      power_level_content_override: options.powerLevelOverrides,
      preset: options.preset,
      room_alias_name: options.roomAlias,
      room_version: options.roomVersion,
      topic: options.topic,
      visibility: options.isInDirectory === true ? "public"
        : options.isInDirectory === false ? "private"
        : undefined,
    }));
    
    return promise;
  }
}
