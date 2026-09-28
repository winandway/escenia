# Fotos reales de internet (Serper) — cómo se activa y cómo se comprueba

Escenia cuenta las biografías con **fotos reales de la persona** (decisión de
Richard, 28 sep 2026) y genera con IA solo lo que no existe en foto. Las fotos
salen de **Google Imágenes**, pero no por la API oficial de Google: esa API
(Custom Search JSON) está **cerrada a clientes nuevos** desde 2026 y se apaga el
1 de enero de 2027. Se usa **Serper** (https://serper.dev), un servicio que
devuelve los resultados de Google Imágenes por API: 2.500 búsquedas gratis sin
tarjeta y después prepago ($50 por 50.000; un video gasta entre 10 y 25).

## Paso 1 — Richard saca la clave (una sola vez)

1. **Qué es:** una clave que deja a la Estación pedirle a Google Imágenes fotos
   de la persona por época («Luis Miguel 1985», «Luis Miguel niño»).
2. **Quién:** Richard, porque la cuenta queda a su nombre.
3. **Qué pasa:** entra a https://serper.dev/signup, se registra con nombre, correo
   y una contraseña (sin tarjeta), y el panel (https://serper.dev/dashboard) muestra la clave: una
   tira de 40 letras y números. La copia y la pega en el chat de la sesión.
4. **Cómo se comprueba:** en el panel de Serper dice «2,500 credits».

## Paso 2 — La IA la carga en la Mac

1. **Quién:** la IA de la sesión.
2. **Qué pasa:** pone `SERPER_API_KEY=<clave>` en `estacion/.env` (y la copia
   en `estacion/.env.produccion`), reinicia la Estación con
   `launchctl kickstart -k gui/$(id -u)/com.windoce.escenia-estacion` y mira
   el arranque en `estacion/out/estacion.log`.
3. **Cómo se comprueba:** el arranque dice
   `Fotos reales de internet: sí (Google Imágenes vía Serper)`.

## Paso 3 — Se produce un video y se mira

- En el registro del trabajo aparece `fotos de referencia de X: N (…)` con
  fotos por década y una de niño si el guion tiene infancia.
- `out/t<id>/creditos.txt` lista cada foto como
  «Foto de internet (uso editorial): <página de origen>».
- Si Serper responde 401 la clave está mal; si responde 403 o 429 se
  acabaron los créditos (se recargan prepago en https://serper.dev/billing).
  En ambos casos el registro lo dice y las escenas siguen con Wikimedia o IA.

Candado: C-IMAGEN-3 en [CANDADOS.md](CANDADOS.md).
