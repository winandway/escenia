// Deja en out-deploy/ lo que YaDominios Cloud publica: UN solo _worker.js,
// los estáticos, yadominios.json y schema.sql.
// Corre después de `opennextjs-cloudflare build` y `wrangler deploy --dry-run --outdir=.dist-worker`.
//
// Next mete dos módulos .wasm (para generar imágenes OG) que este panel no
// usa. Un _worker.js con `import ... from "./x.wasm"` deja de ser un bundle
// único, así que esos imports se reemplazan por un módulo wasm vacío válido.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { gzipSync } from "node:zlib";

const ORIGEN = ".dist-worker/worker.js";
const SALIDA = "out-deploy";
const TOPE_GZIP = 10 * 1024 * 1024;

if (!existsSync(ORIGEN)) {
  console.error(
    `No existe ${ORIGEN}. Corre primero opennextjs-cloudflare build y wrangler deploy --dry-run.`,
  );
  process.exit(1);
}

let codigo = readFileSync(ORIGEN, "utf8");
const WASM_VACIO = "new WebAssembly.Module(new Uint8Array([0,97,115,109,1,0,0,0]))";
let reemplazos = 0;
codigo = codigo.replace(/import\s+(\w+)\s+from\s*"\.\/[^"]+\.wasm"\s*;?/g, (_, nombre) => {
  reemplazos++;
  return `const ${nombre}=${WASM_VACIO};`;
});
if (/from\s*"[^"]+\.wasm"/.test(codigo)) {
  console.error("Quedó un import .wasm sin reemplazar; el _worker.js no sería un bundle único.");
  process.exit(1);
}

rmSync(SALIDA, { recursive: true, force: true });
mkdirSync(SALIDA, { recursive: true });
writeFileSync(`${SALIDA}/_worker.js`, codigo);
if (existsSync(".open-next/assets")) cpSync(".open-next/assets", SALIDA, { recursive: true });
for (const f of ["yadominios.json", "schema.sql"]) cpSync(f, `${SALIDA}/${f}`);
// La plataforma no lee wrangler.jsonc para bindings, pero sí compatibility_*: yadominios.json ya lo trae.

const gzip = gzipSync(codigo).length;
console.log(
  `_worker.js: ${(codigo.length / 1_048_576).toFixed(1)} MB crudo · ${(gzip / 1_048_576).toFixed(2)} MB gzip · ${reemplazos} import(s) wasm reemplazados`,
);
if (gzip > TOPE_GZIP) {
  console.error(`Pasa del tope de ${TOPE_GZIP / 1_048_576} MB gzip.`);
  process.exit(1);
}
