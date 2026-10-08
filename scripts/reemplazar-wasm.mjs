// Reemplaza los `import X from "./x.wasm"` que Next deja en el worker (los módulos de imágenes OG,
// que este panel no usa) por un módulo wasm vacío válido, para que el _worker.js sea un bundle único.
// Ojo: con --minify los nombres pueden llevar `$` (`import Y$ from"./x.wasm"`); el 8 oct 2026 Next
// 16.4 los sacó así y `\w+` no los atrapaba, y el deploy se quedó parado (C-DEPLOY-1).
const WASM_VACIO = "new WebAssembly.Module(new Uint8Array([0,97,115,109,1,0,0,0]))";

export function reemplazarWasm(codigo) {
  let reemplazos = 0;
  const salida = codigo.replace(/import\s+([\w$]+)\s+from\s*"\.\/[^"]+\.wasm"\s*;?/g, (_, nombre) => {
    reemplazos++;
    return `const ${nombre}=${WASM_VACIO};`;
  });
  const quedan = /from\s*"[^"]+\.wasm"/.test(salida);
  return { codigo: salida, reemplazos, quedan };
}
