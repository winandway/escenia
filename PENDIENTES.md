# Pendientes — Motor Escenia

## 👤 Esperando por Richard

- 👤 Activar un plan de pago de YaDominios Cloud y crear el sitio `escenia` conectado al repo público, rama `yapanel-build` (sin eso no hay base de datos ni panel en vivo).
- 👤 Pegar en YaDominios Cloud → sitio → Variables de entorno: `PANEL_CLAVE_HUELLA`, `ESTACION_SECRETO`, `ANTHROPIC_API_KEY` (la IA le pasa los valores con croquis cuando el sitio exista).
- 👤 Decir cuántas personas tiene Windoce contando contratistas (Remotion gratis ≤3; si no, licencia Automators $100/mes).
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
- [x] Publicar: repo público https://github.com/winandway/escenia + Action verde → rama `yapanel-build` lista (25 sep 2026). Falta que Richard cree el sitio en YaDominios Cloud (plan de pago).
- [ ] Fase 2: temática `MiniDocumental`, Shorts 9:16, miniaturas, biblioteca de recursos, cortes comerciales
- [ ] Fase 3: subida a YouTube (privado hasta la auditoría), `containsSyntheticMedia`, UTM, métricas
- [ ] Fase 4: radar (disparado desde la Mac, la plataforma no tiene cron)
