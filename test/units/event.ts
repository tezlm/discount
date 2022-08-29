import { deepStrictEqual as equal } from "assert";
import { makeEvent } from "../mocks/events.js";

type tester = (description: string, run: () => any) => undefined;

export function test(test: tester) {  
  const event = makeEvent({ body: "ayo" }, { type: "org.example.custom.type", origin_server_ts: 12345, event_id: "$foobar" });
  test("get type",      () => equal(event.type, "org.example.custom.type"));
  test("get content",   () => equal(event.content, { body: "ayo" }));
  test("get timestamp", () => equal(event.timestamp, new Date(12345)));
  test("get id",        () => equal(event.id, "$foobar"));
  // test("get content", () => equal(event.content, { body: "ayo" }));
}
