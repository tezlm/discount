import Room from "./room";

export default class Space extends Room {
  public async hierarchy(): Promise<Array<Room>> {
    throw "unimplemented!";
  }
}