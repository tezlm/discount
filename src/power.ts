import type Client from "./client";
import type Room from "./room";

interface RawPowerLevels {
  redact: number,
  invite: number,
  kick: number,
  ban: number,
  events_default: number,
  state_default: number,
  users_default: number,
  events: { [eventType: string]: number },
  users:  { [userId: string]: number },
}

export default class PowerLevels {
  public client: Client = this.room.client;
  public levels: Partial<RawPowerLevels>;
  
  constructor(public room: Room) {
    this.levels = room.getState("m.room.power_levels")?.content ?? { state_default: 50, users_default: 50 };
  }
  
  get me(): number { return this.forUser(this.client.userId) }
  
  get usersDefault():  number { return this.levels.users_default ?? 0 }
  get eventsDefault(): number { return this.levels.events_default ?? 0 }
  get stateDefault():  number { return this.levels.state_default ?? 50 }
  
  get redact(): number { return this.levels.redact ?? 50 }
  get invite(): number { return this.levels.invite ?? 0 }
  get ban():    number { return this.levels.ban ?? 50 }
  get kick():   number { return this.levels.kick ?? 50 }
  
  forEvent(eventType: string): number {
    return this.levels.events?.[eventType] ?? this.eventsDefault;
  }
  
  forState(eventType: string): number {
    return this.levels.events?.[eventType] ?? this.stateDefault;
  }
  
  forUser(userId: string): number {
    return this.levels.users?.[userId] ?? this.usersDefault;
  }
}
