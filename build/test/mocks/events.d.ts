import { Event, StateEvent, RawStateEvent, RawEvent } from "../../src/event.js";
export declare function makeEvent(content: any, data?: Partial<RawEvent>): Event;
export declare function makeStateEvent(content: any, data?: Partial<RawStateEvent>): StateEvent;
export declare const events: Event<RawEvent>[];
export declare const stateEvents: StateEvent[];
