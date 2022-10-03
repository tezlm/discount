import type Client from "./client";
import type Room from "./room";

// function parseRelations(relations: any): Array<{ type: string, eventId: string, key?: string }> {

  
// const skip = ["m.in_reply_to", "net.maunium.reply"];
// function getRelation(content) {
//   const relation = content["m.relates_to"];
//   if (!relation) return null;
//   // if (relation.rel_type && !skip.includes(relation.rel_type)) {
//   if (relation.rel_type) {
//     return relation;
//   } else {
//     const type = Object.keys(relation)?.[0];
//     // if (!type || skip.includes(type)) return null;
//     if (!type) return null;
//     return { rel_type: type, ...relation[type] };
//   }
// }
  
/*
{
  "m.relates_to": {
    "rel_type": "m.type",
    "event_id": "$eventid"
  }
}

{
  "m.relates_to": {
    "m.type": {
      "event_id": "$eventid"
    }
  }
}

{
  "m.relations": [
    { "rel_type": "m.type", "event_id": "$eventid" }
  ]
}
*/
  
  // return []
// }

export interface RawEvent {
  event_id: string,
  type: string,
  sender: string,
  content: any,
  unsigned: any,
  origin_server_ts: number,
  state_key?: string,
}

export interface RawStateEvent extends RawEvent {
  state_key: string,
}

export class Event<RawType extends RawEvent = RawEvent> {  
  // public relationsIn: Array<Event> = [];
  // public relationsOut: Array<Event> = [];
  // private cacheContent: any = {};
  
  constructor(
    public client: Client,
    public room: Room,
    protected raw: RawType,
  ) {}  
  
  get id(): string {
    return this.raw.event_id;
  }  
  
  get type(): string {
    return this.raw.type;
  }
  
  get sender(): string {
    return this.raw.sender;
  }
  
  get content(): any {
    return this.raw.content;
  }
  
  get unsigned(): any {
    return this.raw.unsigned;
  }
  
  get timestamp(): Date {
    return new Date(this.raw.origin_server_ts);
  }
  
  isState(): this is StateEvent {
    return !!this.raw.state_key;
  }
  
  async redact(reason?: string) {
    const txn = Math.random().toString(36);
    this.client.fetcher.redact(this.room.id, this.id, txn, reason);
    return await this.client.transaction(txn);
  }
  
  // edit(content: any) {}
  // reply(type: string, content: any) {}
  
  get stateKey(): string | undefined {
    return this.raw.state_key;
  }
  
  // TEMP: discard compat
  get eventId(): string { return this.raw.event_id }
  get roomId(): string { return this.room.id }
}

export class StateEvent extends Event<RawStateEvent> {  
  constructor(client: Client, room: Room, raw: RawStateEvent) {
    super(client, room, raw);
  }
  
  get stateKey(): string {
    return this.raw.state_key;
  }
}
