export default class Emitter {
    listeners = new Set();
    on(event, call) {
        this.listeners.add([call, event]);
        return this;
    }
    off(event, call) {
        this.listeners.delete([call, event]);
        return this;
    }
    once(event, call) {
        const wrapped = (...params) => { call(...params); this.listeners.delete([wrapped, event]); };
        this.listeners.add([wrapped, event]);
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
