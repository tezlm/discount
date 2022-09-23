import Room from "../../src/room.js";
import Client from "../../src/client.js";
const client = new Client({
    token: "no",
    baseUrl: "no",
});
export default new Room(client, "idk");
