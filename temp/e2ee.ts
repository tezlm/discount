import type Client from "../src/client";
const Olm: any = {};

export class Device {
	private account: any;
	
	constructor(
		public client: Client,
		public id: string,
	) {
    this.account = new Olm.Account();
	}
	
  generateOneTimeKeys() {
    const maxKeys = this.account.max_number_of_one_time_keys();
    this.account.generate_one_time_keys(maxKeys);
    return JSON.parse(this.account.one_time_keys());
  }
}
