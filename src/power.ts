import type Client from "./client";
import type Room from "./room";

interface RawPowerLevels {
  redact?: number,
  invite?: number,
  kick?: number,
  ban?: number,
  events_default?: number,
  state_default?: number,
  users_default?: number,
  events?: { [eventType: string]: number },
  users?:  { [userId: string]: number },
}

function merge(obj1: any, obj2: any): any {
  const merged: any = { ...obj1, ...obj2 };
  for (let key in merged) {
    if (typeof merged[key] === "object" && merged[key]) {
      merged[key] = merge(obj1[key], obj2[key]);
    }
  }
  return merged;
}

export default class PowerLevels {
  public client: Client = this.room.client;
  public levels: RawPowerLevels = {};
  
  public me: number = 0;
  
  public usersDefault:  number = 0;
  public eventsDefault: number = 50;
  public stateDefault:  number = 50;
  
  public redact: number = 50;
  public invite: number = 0;
  public ban:    number = 50;
  public kick:   number = 50;
  
  constructor(public room: Room) {
    this._setLevels(room.getState("m.room.power_levels")?.content);
  }
  
  _getDefault() {
    const creator = this.room.getState("m.room.create")?.raw.sender as string;
    return { state_default: 0, events_default: 0, users: { [creator]: 100 } };
  }
  
  _setLevels(levels: RawPowerLevels) {
    this.levels = levels ?? this._getDefault();
    
    this.me = this.forUser(this.client.userId);
  
    this.usersDefault = this.levels.users_default ?? 0;
    this.eventsDefault = this.levels.events_default ?? 0;
    this.stateDefault = this.levels.state_default ?? 50;
  
    this.redact = this.levels.redact ?? 50;
    this.invite = this.levels.invite ?? 0;
    this.ban = this.levels.ban ?? 50;
    this.kick = this.levels.kick ?? 50;
  }
  
  forEvent(eventType: string): number {
    return this.levels.events?.[eventType] ?? this.eventsDefault;
  }
  
  forState(eventType: string): number {
    return this.levels.events?.[eventType] ?? this.stateDefault;
  }
  
  forUser(userId: string): number {
    return this.levels.users?.[userId] ?? this.usersDefault;
  }
  
  async put(levels: RawPowerLevels) {
    return this.room.sendState("m.room.power_levels", levels);
  }
  
  async patch(levels: RawPowerLevels) {
    return this.room.sendState("m.room.power_levels", merge(this.levels, levels));
  }
}
