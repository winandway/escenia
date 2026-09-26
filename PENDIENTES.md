# Pendientes — Motor Escenia

## 👤 Esperando por Richard

- 👤 Elegir plan de ElevenLabs (Creator $22 con clon profesional, o Starter $6 con clon instantáneo) y pasar API key + voice_id.
- 👤 Pasar PEXELS_API_KEY (gratis en https://www.pexels.com/api/) para clips de fondo; sin ella salen fondos de color.
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
- [x] Estación instalada como LaunchAgent en la Mac (arranca sola al iniciar sesión y se reinicia si se cae).
- [ ] Fase 2: temática `MiniDocumental`, Shorts 9:16, miniaturas, biblioteca de recursos, cortes comerciales
- [ ] Fase 3: subida a YouTube (privado hasta la auditoría), `containsSyntheticMedia`, UTM, métricas
- [ ] Fase 4: radar (disparado desde la Mac, la plataforma no tiene cron)
