export default class User {
    client;
    id;
    data;
    constructor(client, id, data) {
        this.client = client;
        this.id = id;
        this.data = data;
    }
    get name() {
        return this.data.name;
    }
    get avatar() {
        return this.data.avatar;
    }
}
