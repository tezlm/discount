import { Event, Relation } from "./event"
import type * as api from "./api";

export default class Relations extends Array<Relation> {
  private nextBatch: string;
  private relType: string | undefined;
  private eventType: string | undefined;
  
  constructor(public event: Event, chunk: api.Relations, options: { relType?: string, eventType?: string }) {
    super();
    const { room } = this.event;
    for (let raw of chunk.chunk) {
      const event = new Event(room, raw);
      room.events._handleEvent(event);
    }
    for (let rel of this.event.relationsOut ?? []) this.push(rel);
    this.nextBatch = chunk.next_batch;
    this.relType = options.relType;
    this.eventType = options.eventType;
  }
  
  async next(): Promise<Array<Relation>> {
    const { room, client } = this.event;
    const chunk = await client.fetcher.fetchRelations(room.id, this.event.id, {
      relType: this.relType,
      eventType: this.eventType,
      from: this.nextBatch,
    });
    
    let count = 0;
    for (let raw of chunk.chunk) {
      const event = new Event(room, raw);
      room.events._handleEvent(event);
      count++;
    }
    
    const relations = this.event.relationsOut?.slice(-count) ?? [];
    for (let rel of relations) this.push(rel);
    return relations;
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
