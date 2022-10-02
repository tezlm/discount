import { readdir } from "fs/promises";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const dir = join(dirname(fileURLToPath(import.meta.url)), "units");
let pass = 0, fail = 0;

for (let file of (await readdir(dir)).sort()) {
  console.log(`test \x1b[1m${file}\x1b[0m`);
  const mod = await import(join(dir, file));
  mod.test(tester);
  console.log("");
}

console.log(`finished with ${pass} \x1b[32mpass\x1b[0m and ${fail} \x1b[31mfail\x1b[0m`);

function tester(description: string, run: () => any) {
  try {
    run();
    console.log(`  \x1b[32mpass\x1b[0m ${description}`);
    pass++;
  } catch {
    console.log(`  \x1b[31mfail\x1b[0m ${description}`);
    fail++;
  }
}
