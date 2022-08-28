type tester = (description: string, run: () => any) => undefined;

export function test(test: tester) {
  test("pass1", () => {});
  test("pass2", () => {});
  test("fail", () => {throw "no"});
  test("pass3", () => {});
}
