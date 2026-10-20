// One zip per model in models.json: the bundled handler (index.mjs) and that model's weights (<model>.bin),
// checked against the manifest's sha256. Output: dist/<model>.zip and dist/SHA256SUMS.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { build } from "esbuild";

const require = createRequire(import.meta.url);
const models = JSON.parse(readFileSync("models.json", "utf8"));
rmSync("dist", { recursive: true, force: true });
const sums = [];
for (const [name, m] of Object.entries(models)) {
  const dir = `dist/${name}`;
  mkdirSync(dir, { recursive: true });
  await build({ entryPoints: ["src/handler.ts"], bundle: true, platform: "node", target: "node20", format: "esm", outfile: `${dir}/index.mjs`,
    banner: { js: "import { createRequire } from 'module'; const require = createRequire(import.meta.url);" }, external: ["aws-lambda"] });
  const weights = require.resolve(`maia3-web/weights/${m.weights}`);
  const sha = createHash("sha256").update(readFileSync(weights)).digest("hex");
  if (sha !== m.sha256) throw new Error(`${name}: weights sha256 ${sha}, expected ${m.sha256}`);
  cpSync(weights, `${dir}/${name}.bin`);
  execFileSync("zip", ["-qj", `../${name}.zip`, "index.mjs", `${name}.bin`], { cwd: dir });
  const zsha = createHash("sha256").update(readFileSync(`dist/${name}.zip`)).digest("hex");
  sums.push(`${zsha}  ${name}.zip`);
  console.log(`${name}.zip  ${(readFileSync(`dist/${name}.zip`).length / 1e6).toFixed(1)} MB  ${zsha}`);
}
writeFileSync("dist/SHA256SUMS", sums.join("\n") + "\n");
