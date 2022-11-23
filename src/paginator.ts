/*
export interface Chunk<T> {
  chunk: Array<T>,
  next_batch: string,
}

export default abstract class Paginator<T> extends Array<T> {
  private nextBatch: string | undefined;
  
  constructor(chunk: Chunk) {
    super();
    this.nextBatch = chunk.next_batch;
    for (let item of chunk.chunk) this.push(item);
  }
  
  abstract next(): Promise<Array<T>>;
  
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
*/
