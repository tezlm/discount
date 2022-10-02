import { Event, StateEvent } from "../../src/event.js";
import room from "./room.js";
import Client from "../../src/client.js";
const client = new Client({
    token: "no",
    baseUrl: "no",
    userId: "no",
});
let i = 0;
export function makeEvent(content, data = {}) {
    return new Event(client, room, {
        event_id: `$event${i++}`,
        sender: "@user:example.org",
        unsigned: {},
        origin_server_ts: 0,
        type: "m.room.message",
        content,
        ...data
    });
}
export function makeStateEvent(content, data = {}) {
    return new StateEvent(client, room, {
        event_id: `$event${i++}`,
        sender: "@user:example.org",
        unsigned: {},
        origin_server_ts: 0,
        type: "m.room.message",
        content,
        state_key: data.state_key || "",
        ...data
    });
}
export const events = [
    makeEvent({ body: "foo" }),
    makeEvent({ body: "bar" }),
    makeEvent({ body: "baz" }),
    makeEvent({ body: "qux" }),
];
export const stateEvents = [
    makeStateEvent({ name: "test room" }, { type: "m.room.name", state_key: "" }),
    makeStateEvent({ topic: "a topic for the test room" }, { type: "m.room.topic", state_key: "" }),
    makeStateEvent({ url: "mxc avatar url" }, { type: "m.room.avatar", state_key: "" }),
];
