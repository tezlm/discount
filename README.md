# discount.ts

A new in-development matrix library because I dont like matrix-js-sdk.

Don't use this library. It's mostly for personal use, and isn't very
good. I really don't recommend using it. For example:

- node support isn't planned - only deno, bun, and runtimes that can
natively use typescript will work.
- e2ee does not exist
- i only really use this for quick bots and testing
- features are missing, like media upload/download and typing
- this is *archived and unmaintained*.

## Example

```ts
import { Client } from "discount.ts";

// create a new client to connect to matrix
const client = new Client({
  baseUrl: "https://example.org", // your homeserver's url
  token: "supersecrettoken",      // the client's token
  userId: "@bot:example.org",     // the client's userId
});

// fires whenever a matrix event (eg. message or room name change) is received
client.on("event", (event) => {
  if (event.sender.id === client.userId) return; // don't handle messages from ourselves
  if (event.type !== "m.room.message") return;   // we only want to handle messages
  if (event.content.body === "!ping") {
    // respond to their message
    event.reply("m.room.message", {
      body: `Hello, ${event.sender.name}!`,
      msgtype: "m.text",
    });
  }
});

// automatically join rooms
client.on("invite", (invite) => {
  invite.join();
});

// fires when the client connects and syncs
client.on("ready", () => {
  console.log("ready!");
});

client.start(); // start client
```
