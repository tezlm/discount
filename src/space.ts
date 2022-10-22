import Room from "./room";

export default class Space extends Room {
  // public rooms: Array<Room>;
  
  public async hierarchy(): Promise<Array<Room>> {
    throw "unimplemented!";
  }
}
