# Pendientes — Motor Escenia

## 👤 Esperando por Richard

- 👤 Elegir plan de ElevenLabs (Creator $22 con clon profesional, o Starter $6 con clon instantáneo) y pasar API key + voice_id.
- 👤 Pedir la auditoría de la API de YouTube con el texto de docs/AUDITORIA-YOUTUBE.md.

## Fila (lo hace la IA)

- [x] Análisis a fondo con fuentes oficiales → docs/ANALISIS.md
- [x] Fase 1: blindaje (tipos estrictos, lint + seguridad, vitest con cobertura, gitleaks, husky, CI)
- [x] Fase 1: panel Next.js 16.3.6 + esquema + cola de trabajos + candados
- [x] Fase 1: Estación (voz con tiempos, subtítulos por palabra, clips Pexels, render Remotion 16:9)
- [x] Fase 1: prueba de punta a punta en local (panel empaquetado + Estación) — 25 sep 2026
- [x] Fase 1: texto de la auditoría de YouTube → docs/AUDITORIA-YOUTUBE.md
- [x] Publicar: repo público https://github.com/winandway/escenia + Action verde → rama `yapanel-build` → sitio EN VIVO en https://escenia.sitios.dev (25 sep 2026, plan Galaxia). Base con las 9 fichas de producto y los ajustes por defecto, comprobada por HTTP.
- [x] Licencia de Remotion: Windoce es 1 persona (Richard, 25 sep 2026) → licencia gratis, no hay nada que pagar.
- [x] Variables del panel cargadas por Richard (26 sep 2026): canario en verde, Estación conectada al panel en vivo, prueba de humo ok.
- [x] Clave de Pexels recibida y puesta en la Mac (26 sep 2026): los videos salen con clips reales.
- [x] Los videos terminados se ven y descargan dentro del panel (26 sep 2026).
- [x] Plantilla v2 «profesional» (26 sep 2026): clips en todas las escenas con búsquedas de reserva, fundidos con whoosh, rótulos con pop, frases grandes animadas, riser en el título, campana en el cierre; marca de voz de prueba discreta (3 s).
- [x] Estación instalada como LaunchAgent en la Mac (arranca sola al iniciar sesión y se reinicia si se cae).
- [x] Fase 2 (parte): biografías producibles con fotos libres de Wikimedia Commons + plantilla MiniDocumental (26 sep 2026). Publicar en Caprichoso sigue cerrado.
- [x] Ruta `/datos/estacion/guiones` para crear guiones desde fuera con el secreto (la usará el radar).
- [x] Clave de fal.ai recibida (26 sep 2026): imágenes con IA activas en la Mac; biografía de Celia Cruz producida con ellas (guion #3, trabajo #7).
- [x] Fase 2 (parte): titulares con golpe, recortes de periódico y tarjetas de red social dibujados en la plantilla; imágenes con IA listas (falta la clave de fal.ai) — 26 sep 2026
- [ ] Fase 2: capturas de pantalla reales del software (visual «pantalla» con `url`: grabar la página con Playwright) — pedido por Richard el 26 sep 2026
- [ ] Fase 2: biblioteca de recursos con licencia por archivo (el pack de sonidos de Richard entra ahí; memes/música con derechos solo con su confirmación por video)
- [ ] Fase 2: temática `MiniDocumental`, Shorts 9:16, miniaturas, biblioteca de recursos, cortes comerciales
- [ ] Fase 3: subida a YouTube (privado hasta la auditoría), `containsSyntheticMedia`, UTM, métricas
- [ ] Fase 4: radar (disparado desde la Mac, la plataforma no tiene cron)
