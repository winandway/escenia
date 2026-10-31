// Lint de la app de iPhone (la raíz del proyecto no la revisa: tiene su propio entorno).
const { defineConfig } = require("eslint/config");
const expoConfig = require("eslint-config-expo/flat");

module.exports = defineConfig([expoConfig, { ignores: ["dist/*", "ios/*", "android/*", ".expo/*"] }]);
