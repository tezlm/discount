export interface Error {
  errcode: string,
  error: string,
}

export interface AccountData {
  type: string,
  content: any,
}

export interface RawEvent {
  event_id: string,
  type: string,
  sender: string,
  content: any,
  unsigned?: any,
  origin_server_ts: number,
  state_key?: string,
  redacts?: string,
}

export interface RawStateEvent extends RawEvent {
  state_key: string,
}

export interface RawEphemeralEvent {
  content: any,
  type: string,
}

interface Timeline {
  events: Array<RawEvent>,
  limited: boolean,
  prev_batch: string,
}

export interface StrippedState {
  content: any,
  sender: string,
  state_key: string,
  origin_server_ts: number,
  type: string,
}

export interface Sync {
  account_data?: { events: Array<AccountData> },
  device_lists?: { changed: Array<string>, left: Array<string> },
  device_one_time_keys_count?: { [algorithm: string]: number },
  device_unused_fallback_key_types?: Array<string>,
  next_batch: string,
  presence?: { events: Array<RawEvent> },
  rooms?: {
    invite?: {
      [id: string]: { invite_state: { events: Array<StrippedState> } },
    },
    join?: {
      [id: string]: {
        account_data?: { events: Array<AccountData> },
        ephemeral?: { events: Array<RawEvent> },
        state?: { events: Array<RawStateEvent> },
        summary?: { "m.heroes": Array<string>, "m.invited_member_count": number, "m.joined_member_count": number },
        timeline?: Timeline,
        unread_notifications?: { highlight_count: number, notification_count: number },
      },
    },
    knock?: {
      [id: string]: { knock_state: Array<StrippedState> },
    },
    leave?: {
      [id: string]: {
        account_data?: Array<AccountData>,
        state?: { events: Array<RawStateEvent> },
        timeline?: Timeline,
      },
    },
  },
  to_device?: { events: Array<{ content: any, sender: string, type: string}> },
}

interface EventFilter {
  limit?: number,
  not_senders?: Array<string>,
  not_types?: Array<string>,
  senders?: Array<string>,
  types?: Array<string>,
}

interface RoomEventFilter extends EventFilter {
  contains_url?: boolean,
  include_redundant_members?: boolean,
  lazy_load_members?: boolean,
  not_rooms?: Array<string>,
  rooms?: Array<string>,
}

interface RoomFilter {
  account_data?: RoomEventFilter,
  ephermeral?: RoomEventFilter,
  include_leave?: boolean,
  rooms?: Array<string>,
  not_rooms?: Array<string>,
  state?: RoomEventFilter,
  timeline?: RoomEventFilter,
}

export interface Filter {
  account_data?: EventFilter,
  event_fields?: Array<string>,
  event_format?: "client" | "federation",
  presence?: EventFilter,
  room?: RoomFilter,
}

export interface UserData {
  displayname: string,
  avatar_url: string,
  [key: string]: any,
}

export interface Messages {
  start: string,
  end: string,
  chunk: Array<RawEvent>,
  state: Array<RawStateEvent>,
}

export interface Context {
  start: string,
  end: string,
  event: RawEvent,
  events_before: Array<RawEvent>,
  events_after: Array<RawEvent>,
  state: Array<RawStateEvent>,
}

export interface Relations {
  chunk: Array<RawEvent>,
  next_batch: string,
  prev_batch: string,
}

export interface CreateRoomOptions {
  creation_content?: { [key: string]: any },
  initial_state?: Array<{ type: string, state_key: string, content: any }>,
  invite?: Array<string>,
  // invite_3pid?: no for now,
  is_direct?: boolean,
  name?: string,
  power_level_content_override?: object,
  preset?: "private_chat" | "public_chat" | "trusted_private_chat",
  room_alias_name?: string,
  room_version?: string,
  topic?: string,
  visibility?: "public" | "private",
}

export interface PublicRoom {
  avatar_url: string,
  canonical_alias: string,
  guest_can_join: boolean,
  join_rule: string,
  name: string,
  num_joined_members: number,
  room_id: string,
  room_type: string,
  topic: string,
  world_readable: boolean,
}

export interface PublicRooms {
  chunk: Array<PublicRoom>,
  next_batch: string,
  prev_batch: string,
  total_room_count_estimate: number,
}

interface HierarchyRoom {
  room_id:            string,
  room_type:          string,
  
  name:               string,
  topic:              string,
  avatar_url:         string,
  canonical_alias:    string,
  
  children_state:     Array<StrippedState>, // only of type m.space.child
  guest_can_join:     boolean,
  world_readable:     boolean,
  join_rule:          string,
  num_joined_members: number,
}

export interface Hierarchy {
  rooms: Array<HierarchyRoom>,
  next_batch?: string,
}
