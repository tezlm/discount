// FIXME: this can leak memory by assigning listeners without unassigning later
// possibly look into WeakRef, WeakMap, or FinalizationRegistry to prevent this?
type A<E, T extends keyof E> = [E[T], T];

export default class Emitter<Events extends { [name: string]: (...args: any[]) => void }> {
  private listeners = new Set<A<Events, keyof Events>>();
	
	public on<T extends keyof Events>(event: T, call: Events[T]): this {
		this.listeners.add([call, event]);
    return this;
	}
	
	public off<T extends keyof Events>(event: T, call: Events[T]): this {
		this.listeners.delete([call, event]);
    return this;
	}

	public once<T extends keyof Events>(event: T, call: Events[T]): this {
		const wrapped = ((...params: Parameters<Events[T]>): void => {
			call(...params);
			this.listeners.delete([wrapped, event]);
		}) as any as Events[T];
		
		this.listeners.add([wrapped, event]);
    return this;
	}
	
	// TODO: make the necessary changes to let this be protected instead of public
	// protected emit<T extends keyof Events>(event: T, ...params: Parameters<Events[T]>): this {
	public emit<T extends keyof Events>(event: T, ...params: Parameters<Events[T]>): this {
		for (let listener of this.listeners) {
			if (listener[1] === event) {
				listener[0](...params);
			}
		}
    return this;
	}
}
