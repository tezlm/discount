import type { RawEvent, RawStateEvent } from "./event.js";
export type { RawEvent, RawStateEvent } from "./event.js";

export interface Error {
  errcode: string,
  error: string,
}

interface StrippedState {
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
  events: [RawEvent],
  limited: boolean,
  prev_batch: string,
}

export interface Sync {
  account_data?: { events: [AccountData] },
  device_lists?: { changed: [string], left: [string] },
  device_one_time_keys_count?: { [algorithm: string]: number },
  device_unused_fallback_key_types?: [string],
  next_batch: string,
  presence?: { events: [RawEvent] },
  rooms?: {
    invite?: {
      [id: string]: { invite_state: [StrippedState] },
    },
    join?: {
      [id: string]: {
        account_data?: { events: [AccountData] },
        ephemeral?: { events: [RawEvent] },
        state?: { events: [RawStateEvent] },
        summary?: { "m.heroes": [string], "m.invited_member_count": number, "m.joined_member_count": number },
        timeline?: Timeline,
        unread_notifications?: { highlight_count: number, notification_count: number },
      },
    },
    knock?: {
      [id: string]: { knock_state: [StrippedState] },
    },
    leave?: {
      [id: string]: {
        account_data?: [AccountData],
        state?: { events: [RawStateEvent] },
        timeline?: Timeline,
      },
    },
  },
  to_device?: { events: [{ content: any, sender: string, type: string}] },
}

interface EventFilter {
  limit?: number,
  not_senders?: [string],
  not_types?: [string],
  senders?: [string],
  types?: [string],
}

interface RoomEventFilter extends EventFilter {
  contains_url?: boolean,
  include_redundant_members?: boolean,
  lazy_load_members?: boolean,
  not_rooms?: [string],
  rooms?: [string],
}

interface RoomFilter {
  account_data?: RoomEventFilter,
  ephermeral?: RoomEventFilter,
  include_leave?: boolean,
  rooms?: [string],
  not_rooms?: [string],
  state?: RoomEventFilter,
  timeline?: RoomEventFilter,
}

export interface Filter {
  account_data?: EventFilter,
  event_fields?: [string],
  event_format?: "client" | "federation",
  presence?: EventFilter,
  room?: RoomFilter,
}

export interface Messages {
  start: string,
  end: string,
  chunk: Array<RawEvent>
  state: Array<RawStateEvent>
}
