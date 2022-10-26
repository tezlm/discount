import type { RawEvent, RawStateEvent } from "./event.js";
export type { RawEvent, RawStateEvent } from "./event.js";

export interface Error {
  errcode: string,
  error: string,
}

export interface StrippedState {
  content: any,
  sender: string,
  state_key: string,
  type: string,
}

export interface AccountData {
  type: string,
  content: any,
}

interface Timeline {
  events: Array<RawEvent>,
  limited: boolean,
  prev_batch: string,
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
  name: string,
  avatar: string,
  [key: string]: any,
}

export interface Messages {
  start: string,
  end: string,
  chunk: Array<RawEvent>
  state: Array<RawStateEvent>
}
