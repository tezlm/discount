declare type tester = (description: string, run: () => any) => undefined;
export declare function test(test: tester): void;
export {};
