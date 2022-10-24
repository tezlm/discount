// FIXME: this can leak memory by assigning listeners without unassigning later
// possibly look into WeakRef, WeakMap, or FinalizationRegistry to prevent this?

export default class Emitter {
  private listeners = new Set<[Function, string]>();
	
	on(event: string, call: Function) {
		this.listeners.add([call, event]);
    return this;
	}
	
	off(event: string, call: Function) {
		this.listeners.delete([call, event]);
    return this;
	}

	once(event: string, call: Function) {
		const wrapped = (...params: Array<any>) => { call(...params); this.listeners.delete([wrapped, event]) }
		this.listeners.add([wrapped, event]);
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
