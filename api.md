Documentation *will* change!

```ts

export interface ClientConfig {
  token: string,   // your access token
  baseUrl: string, // the homeserver's base url
  userId: string,  // your user id
}

export type ClientStatus = "stopped" | "starting" | "syncing" | "reconnecting"

type AccountData = { type: string, content: any }
type Notifications = { unread: number, highlight: number }

interface ClientEvents {
  on(event: "status", listener: () => any): this,                            // the client's status
  on(event: "ready", listener: () => any): this,                             // when the client is ready
  on(event: "error", listener: (error: Error) => any): this,                 // when the client has errored
  
 // events
  on(event: "event", listener: (event: Event) => any): this,                 // when a timeline event is received
  on(event: "state", listener: (state: StateEvent) => any): this,            // when a state event is received
  on(event: "ephemeral", listener: (edu: EphemeralEvent) => any): this,      // when an ephemeral event is received
  
  // membership
  on(event: "join", listener: (room: Room, prevBatch: string) => any): this, // when you join a room (is fired once for each joined room on startup)
  // on(event: "invite", listener: (room: Room) => any): this,               // when you're invited to a room (is fired once for each invite on startup)
  on(event: "leave", listener: (room: Room) => any): this,                   // when you leave a room
  
  // misc
  on(event: "accountData", listener: (event: AccountData) => any): this,     // when your account data changes
  on(event: "roomAccountData", listener: (event: AccountData, room: Room) => any): this, // when room-specific account data changes
  on(event: "notifications", listener: (notifs: Notifications, room: Room) => any): this, // when your notification count changes for a room
}

export class Client implements ClientEvents {
  status: ClientStatus           // the client's current status
  userId: string                 // the userid
  rooms: Map<string, Room>       // the join/invite rooms the client knows about, mapped by id
  accountData: new Map<string, AccountData> // your account data
  
  async start()                  // start synciing
}

export class Room {
  client: Client

  name: string | null                                      // a room's name, or null if there is none
  topic: string | null                                     // a room's topic, or null if there is none
  avatar: string | null                                    // a room's avatar, or null if there is none
  type: string | null                                      // a room's type, or null if there is none (from m.room.create)
  accountData: Map<String, AccountData>                    // the room-specific account data
  notifications: Notifications                             // the room's notification count

  members: Members                                         // this room's members
  // power:                                                // TODO
  events: Events                                           // TODO
      
  getState(type: string, key = ""): StateEvent | undefined // get a state event by type (and optionally stateKey) 
  getAllState(type: string): Array<StateEvent>             // get all state events of a type
  sendEvent(type: string, content: any)                    // send an event into the room
  sendstate(type: string, content: any, key = "")          // send/set a state event in the room
}

export type Membership = "join" | "knock" | "invite" | "leave" | "ban";

export class Member {
  client: Client
  room: Room             // the room this room member is in
  
  id: string             // user id
  name: string           // display name
  avatar: string         // avatar url (mxc)
  
  membership: Membership // this member's membership state
  power: number          // this member's power level
}

class Members {
  client: Client
  room: Room
  
  async fetch(): Promise<_>                   // fetch every member that is in this room
  
  with(membership: Membership): Array<Member> // get a list of members by their membership
                                              // members are sorted by power level first, name second
}

class Events extends Map {
  async fetch(id: string):   Promise<Event>    // fetch an event by id
  async context(id: string): Promise<Timeline> // fetch an event's context
  live: Timeline                               // the current timeline
}

class Timeline extends Array {
  async backwards(): Promise<number> // fetch and prepend older events, then return number of events added
  async forwards():  Promise<number> // fetch and append newer events, then return number of events added
}

interface Relation {
  event: Event,
  relType: string,
}

export class Event {
  client: Client
  room: Room                           // the room i was sent in
  
  relationsIn:  Array<Relation> | null // the events that i relate (point) to
  relationsOut: Array<Relation> | null // the events that relate (point) to me
  
  id: string                           // my event id
  type: string                         // my type
  sender: Member                       // who sent me
  content: any                         // my content (taking into account edits, encryption, etc...)
  unsigned: any                        // my unsigned content (eg. redaction reason, relation agregations)
  timestamp: Date                      // when i was sent
  isState: this is StateEvent          // whether i am a state event
  stateKey: string | undefined         // my state key if i am a state event

  raw: any                             // the raw event, straight from the source
}

export class StateEvent extends Event {
  stateKey: string                     // state events always have a state key!
}

export class EphemeralEvent {
  client: Client
  room: Room     // the room i was sent in
  
  type: string   // my type
  content: any   // my content
  
  raw: any       // the raw event, straight from the source
}
```
