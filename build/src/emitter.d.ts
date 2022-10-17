export default class Emitter {
    private listeners;
    on(event: string, call: Function): this;
    off(event: string, call: Function): this;
    once(event: string, call: Function): this;
    emit(event: string, ...params: Array<any>): this;
}
