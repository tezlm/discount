export default class Emitter {
    listeners = new Map();
    on(event, call) {
        this.listeners.set(call, event);
        return this;
    }
    off(call) {
        this.listeners.delete(call);
        return this;
    }
    once(event, call) {
        const wrapped = (...params) => { call(...params); this.off(wrapped); };
        this.listeners.set(wrapped, event);
        return this;
    }
    emit(event, ...params) {
        for (let listener of this.listeners) {
            if (listener[1] === event) {
                listener[0](...params);
            }
        }
        return this;
    }
}
