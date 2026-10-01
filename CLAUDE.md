# Motor Escenia — motor de videos semiautomáticos de Windoce

- Análisis base y decisiones: [docs/ANALISIS.md](docs/ANALISIS.md). Léelo antes de tocar arquitectura.
- Candados y canario: [docs/CANDADOS.md](docs/CANDADOS.md).
- La Estación (la Mac): [docs/ESTACION.md](docs/ESTACION.md).
- Auditoría de la API de YouTube: [docs/AUDITORIA-YOUTUBE.md](docs/AUDITORIA-YOUTUBE.md).
- Contrato de YaDominios Cloud (sin red): [docs/CONTRATO-YADOMINIOS.md](docs/CONTRATO-YADOMINIOS.md).
- Fotos reales de internet (Serper): [docs/FOTOS-INTERNET.md](docs/FOTOS-INTERNET.md).
- Avatar parlante (plan): [docs/AVATAR.md](docs/AVATAR.md).
- Calendario de publicaciones: [docs/CALENDARIO.md](docs/CALENDARIO.md).
- Bajar un video de YouTube: [docs/DESCARGAR-VIDEOS.md](docs/DESCARGAR-VIDEOS.md).
- App instalable en el teléfono: [docs/APP.md](docs/APP.md).
- La marca de cada canal en el video (Full Código) y el separador de canales: [docs/MARCA.md](docs/MARCA.md).
- Temas propuestos y sus fuentes: [docs/TEMAS-PROPUESTOS.md](docs/TEMAS-PROPUESTOS.md).
- Estrategia de temas (dónde el clic es más caro): [docs/ESTRATEGIA-TEMAS.md](docs/ESTRATEGIA-TEMAS.md).
- Noticias de Losupe para los videos cortos (el prompt para la sesión de Losupe): [docs/NOTICIAS-LOSUPE.md](docs/NOTICIAS-LOSUPE.md).
- Pendientes: [PENDIENTES.md](PENDIENTES.md).

## Perímetro

- Carpeta: `/Users/windocellc/Motor-Escenia`. Nada fuera de aquí.
- Publicación: YaDominios Cloud, sitio `escenia` → https://escenia.sitios.dev, **en vivo desde el 25 sep 2026**, conectado a `winandway/escenia` rama `yapanel-build`. Cuenta de YaDominios: torplanet1@gmail.com, plan Galaxia (de pago; no pasar a «sistema»). Variables y secretos SOLO se cargan en el panel (tarjeta del sitio → Variables de entorno).
- El token de la base (para consultarla desde fuera por HTTP) vive en `estacion/.env` como `YAPANEL_DB_TOKEN`, fuera de git. El panel publicado NO lo usa: habla con `env.DB` directo.
- Base y archivos: `env.DB` / `env.BUCKET` de ese sitio. **Sin Supabase.**
- Los MP4 se quedan en la Mac; nunca suben a la nube. La Estación corre siempre en la Mac como LaunchAgent `com.windoce.escenia-estacion` (ver docs/ESTACION.md).
- Losupe es OTRO proyecto: solo se lee su feed público, jamás su base ni su repo.

## Reglas del motor

- Windoce es una sola persona (Richard). Remotion se usa con la licencia gratis (≤3 personas); no volver a preguntarlo.

- Nada se publica sin aprobación de Richard; «Aprobar» exige su opinión escrita (≥ 40 letras).
- Dos canales: **Full Código** (@FullCodigo, tecnología e IA; id interno `canal-ia`, con marca propia en el video) y **Caprichoso TV** (biografías). Richard sube y programa los videos él mismo.
- `scripts/aprobar-remoto.ts` aprueba un guion desde la Mac (con opinión escrita, igual que el panel): solo cuando Richard lo ordena de forma explícita.
- Temas, prompts finos y spots viven en la base, no en el código (el repo es público).
- Rutas de backend en `/datos/*`, nunca `/api/*`.
- Tope de gasto diario en la base; modelos caros bloqueados en `compartido/modelos.ts`.

## Cómo se trabaja

- `npm run verify` antes de cualquier push (lo mismo corre en GitHub).
- Prueba visual: `npm run preview` (o el launch `panel-empaquetado`) sirve el `_worker.js` empaquetado en http://localhost:8787 con base local. Primera vez: `npx wrangler d1 execute escenia-local --local --file=schema.sql`.
- El `_worker.js` se arma con `scripts/empaquetar-worker.mjs` (reemplaza los `.wasm` de Next que no usamos). Comprobado localmente el 25 sep 2026.
