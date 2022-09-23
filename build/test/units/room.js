import { deepStrictEqual as equal } from "assert";
import room from "../mocks/room.js";
import { stateEvents } from "../mocks/events.js";
export function test(test) {
    for (let ev of stateEvents)
        room.handleState(ev, false);
    test("get name", () => equal(room.name, "test room"));
    test("get topic", () => equal(room.topic, "a topic for the test room"));
    test("get avatar", () => equal(room.avatar, "mxc avatar url"));
}
