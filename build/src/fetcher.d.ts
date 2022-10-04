import type * as api from "./api.js";
interface FetchOptions {
    method?: string;
    query?: {
        [name: string]: string | undefined;
    };
    headers?: {
        [name: string]: string;
    };
    body?: any;
}
export default class Fetcher {
    private token;
    private baseUrl;
    filter?: string;
    constructor(token: string, baseUrl: string);
    fetchUnauth(path: string, options: FetchOptions): Promise<any>;
    fetch(path: string, options: FetchOptions): Promise<any>;
    fetchClient(path: string, options: FetchOptions): Promise<any>;
    fetchMedia(path: string, options: FetchOptions): Promise<any>;
    sync(since?: string): Promise<api.Sync>;
    postFilter(userId: string, filter: Partial<api.Filter>): Promise<string>;
    fetchMessages(roomId: string, from: string, direction: "b" | "f"): Promise<api.Messages>;
    fetchEvent(roomId: string, eventId: string): Promise<api.RawEvent>;
    fetchMembers(roomId: string): Promise<{
        chunk: Array<api.RawStateEvent>;
    }>;
    sendEvent(roomId: string, type: string, content: any, transaction: string): Promise<{
        event_id: string;
    }>;
    sendState(roomId: string, type: string, content: any, stateKey?: string): Promise<object>;
    redact(roomId: string, eventId: string, transaction: string, reason?: string): Promise<object>;
}
export {};
