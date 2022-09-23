import type Client from "../src/client";
export declare class Device {
    client: Client;
    id: string;
    private account;
    constructor(client: Client, id: string);
    generateOneTimeKeys(): any;
}
