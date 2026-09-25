# Motor Escenia — motor de videos semiautomáticos de Windoce

- Análisis base y decisiones: [docs/ANALISIS.md](docs/ANALISIS.md). Léelo antes de tocar arquitectura.
- Candados y canario: [docs/CANDADOS.md](docs/CANDADOS.md).
- La Estación (la Mac): [docs/ESTACION.md](docs/ESTACION.md).
- Auditoría de la API de YouTube: [docs/AUDITORIA-YOUTUBE.md](docs/AUDITORIA-YOUTUBE.md).
- Contrato de YaDominios Cloud (sin red): [docs/CONTRATO-YADOMINIOS.md](docs/CONTRATO-YADOMINIOS.md).
- Pendientes: [PENDIENTES.md](PENDIENTES.md).

## Perímetro

- Carpeta: `/Users/windocellc/Motor-Escenia`. Nada fuera de aquí.
- Publicación: YaDominios Cloud, sitio `escenia.sitios.dev` (aprobado por Richard el 25 sep 2026), rama `yapanel-build`.
- Base y archivos: `env.DB` / `env.BUCKET` de ese sitio. **Sin Supabase.**
- Los MP4 se quedan en la Mac; nunca suben a la nube.
- Losupe es OTRO proyecto: solo se lee su feed público, jamás su base ni su repo.

## Reglas del motor

- Nada se publica sin aprobación de Richard; «Aprobar» exige su opinión escrita (≥ 40 letras).
- Piloto solo en el canal de IA; Caprichoso TV entra después (temáticas `activa: false`).
- Temas, prompts finos y spots viven en la base, no en el código (el repo es público).
- Rutas de backend en `/datos/*`, nunca `/api/*`.
- Tope de gasto diario en la base; modelos caros bloqueados en `compartido/modelos.ts`.

## Cómo se trabaja

- `npm run verify` antes de cualquier push (lo mismo corre en GitHub).
- Prueba visual: `npm run preview` (o el launch `panel-empaquetado`) sirve el `_worker.js` empaquetado en http://localhost:8787 con base local. Primera vez: `npx wrangler d1 execute escenia-local --local --file=schema.sql`.
- El `_worker.js` se arma con `scripts/empaquetar-worker.mjs` (reemplaza los `.wasm` de Next que no usamos). Comprobado localmente el 25 sep 2026.
