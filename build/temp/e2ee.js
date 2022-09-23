const Olm = {};
export class Device {
    client;
    id;
    account;
    constructor(client, id) {
        this.client = client;
        this.id = id;
        this.account = new Olm.Account();
    }
    generateOneTimeKeys() {
        const maxKeys = this.account.max_number_of_one_time_keys();
        this.account.generate_one_time_keys(maxKeys);
        return JSON.parse(this.account.one_time_keys());
    }
}
