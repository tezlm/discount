export default class Emitter {
  private listeners = new Map();
	
	on(event: string, call: Function) {
		this.listeners.set(call, event);
    return this;
	}
	
	off(call: Function) {
		this.listeners.delete(call);
    return this;
	}

	once(event: string, call: Function) {
		const wrapped = (...params: Array<any>) => { call(...params); this.off(wrapped) }
		this.listeners.set(wrapped, event);
    return this;
	}
	
	emit(event: string, ...params: Array<any>) {
		for (let listener of this.listeners) {
			if (listener[1] === event) {
				listener[0](...params);
			}
		}
    return this;
	}
}
