import type Client from "./client";
interface UserData {
    name: string;
    avatar: string;
}
export default class User {
    client: Client;
    id: string;
    private data;
    constructor(client: Client, id: string, data: UserData);
    get name(): string;
    get avatar(): string;
}
export {};
