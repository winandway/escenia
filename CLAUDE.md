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
- Ritmo del video (cambios de imagen por frase, sonido en cada corte, pausas de la voz) y biblioteca de sonidos: [docs/RITMO.md](docs/RITMO.md).
- **Los formatos y sus nombres** (Documental, Cómic, Neón, Neón con personajes, Presentador) y qué dice YouTube de las caras reales: [docs/FORMATOS.md](docs/FORMATOS.md).
- Formato Presentador (Richard grabado, encima de los gráficos): [docs/PRESENTADOR.md](docs/PRESENTADOR.md).
- Comerciales (el video publicitario de un cliente con sus logos y capturas) y la biblioteca de Imágenes: [docs/COMERCIALES.md](docs/COMERCIALES.md).
- Estilos de video (clásico, ilustrado con las personas dibujadas, y neón con diagramas): [docs/ESTILOS.md](docs/ESTILOS.md).
- Portadas de impacto (la miniatura llamativa del video largo y la de cada Short; salen solas): [docs/PORTADA.md](docs/PORTADA.md).
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
- Las imágenes de los clientes (menú «Imágenes») viven en `env.BUCKET` bajo `imagenes/` y la Estación las baja a `estacion/cache/imagenes/`.
- Las grabaciones que Richard sube desde el panel (menú «Grabaciones») viven en `env.BUCKET` bajo `grabaciones/` y la Estación las baja a `estacion/cache/grabaciones/`.
- Los MP4 se quedan en la Mac; nunca suben a la nube. La Estación corre siempre en la Mac como LaunchAgent `com.windoce.escenia-estacion` (ver docs/ESTACION.md).
- Losupe es OTRO proyecto: solo se lee su feed público, jamás su base ni su repo.

## Reglas del motor

- **El formato de todos los videos es el del skill `formato-escenia`** (`.claude/skills/formato-escenia/SKILL.md`): una imagen nueva cada 3 segundos, lo que se nombra se muestra, sonido en cada corte, música del género. Lo pidió Richard el 2 oct 2026 al ver el video de Prince Royce. Antes de hacer, rehacer o revisar un video, se invoca ese skill.

- **Cada temática tiene su estilo** ([docs/ESTILOS.md](docs/ESTILOS.md)): tecnología y noticias de IA van **ilustradas** (las personas dibujadas), «Así funciona» va en **neón** (diagramas), y las biografías siguen en el clásico. El diagrama del guion NO lleva campos opcionales: la IA admite 24 en total (C-ESTILOS-1).

- **Antes de hacer un video se confirma el formato por su nombre** (Documental, Cómic, Neón, Neón con personajes, y si va con Presentador). Lo pidió Richard el 5 oct 2026. Si ya lo dijo, no se pregunta.

- **El tema de cada video se acuerda primero con Richard.** No se crea un guion, un borrador ni un video «de muestra» en el panel con un tema que él no eligió. Un tema vale si es información importante, que la gente quiera compartir, y si dentro se puede vender un producto suyo. Lo que él dice «para poner un ejemplo» es un ejemplo de la forma, no un tema. Para probar una función se usa material sintético en la Mac y, si pasa por el panel, se saca de sus listas al terminar. (Dictado el 5 oct 2026 al leer el guion 9.)

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
