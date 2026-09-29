# Pendientes — Motor Escenia

## 👤 Esperando por Richard

- 👤 Escribir la opinión (40 letras) y Aprobar el guion 4 (https://escenia.sitios.dev/guiones/4) → se produce solo con las 25 imágenes.
- 👤 (Opcional, si las imágenes con referencia no convencen) Clave de API de OpenAI con saldo prepago (https://platform.openai.com/api-keys) → imágenes con el generador de ChatGPT (gpt-image, calidad baja), que sí conoce las caras de los famosos.
- 👤 Ponerle la hora a los 3 Shorts de Luis Miguel en https://escenia.sitios.dev/calendario (ya están cargados el 1 y 2 de octubre, falta la hora que tienen en YouTube Studio) → el calendario cuida esos huecos.
- 👤 Agendar lo que está en «Por agendar» (un toque por video, o «Agendar los N») y quitar de la lista lo que ya salió.
- 👤 Entrenar más la voz en ElevenLabs (más muestras y volver a entrenar) → mejor dicción y ritmo.
- [x] Guion 5 (Luis Miguel) reproducido con fotos reales de Serper y referencias por época (trabajo 20, 28 sep 2026): 5 referencias reales (niño, 1975, 1985, 1995, 2025), imágenes con IA sin fallos, 3 Shorts, miniatura y textos de YouTube (Luis Miguel: la madre desaparecida y el padre) en https://escenia.sitios.dev/guiones/5 → se produce solo (largo, Shorts, miniatura, textos).
- 👤 Poner nombre y @ del canal de IA en Ajustes (Caprichoso TV ya está) → salen en el cierre de los Shorts.
- 👤 Seguir generando las pistas de docs/MUSICA.md en Suno (ya hay 4 de salsa en /Users/windocellc/Motor-Escenia/music-cortinas-libre-de-copy/) → cada temática tendrá su música; sin pista que encaje, el video sale con la «neutral» o sin música.
- 👤 Pedir la auditoría de la API de YouTube con el texto de docs/AUDITORIA-YOUTUBE.md.

## Fila (lo hace la IA)

- [ ] Aviso de seguridad moderado en una herramienta de desarrollo (undici, dentro de wrangler; visto el 29 sep 2026 con `npm audit`). No afecta al panel publicado. Subir wrangler a la versión que lo corrige y comprobar que el empaquetado sigue igual (C-EMPAQUE-1).

- [x] Análisis a fondo con fuentes oficiales → docs/ANALISIS.md
- [x] Fase 1: blindaje (tipos estrictos, lint + seguridad, vitest con cobertura, gitleaks, husky, CI)
- [x] Fase 1: panel Next.js 16.3.6 + esquema + cola de trabajos + candados
- [x] Fase 1: Estación (voz con tiempos, subtítulos por palabra, clips Pexels, render Remotion 16:9)
- [x] Fase 1: prueba de punta a punta en local (panel empaquetado + Estación) — 25 sep 2026
- [x] Fase 1: texto de la auditoría de YouTube → docs/AUDITORIA-YOUTUBE.md
- [x] Publicar: repo público https://github.com/winandway/escenia + Action verde → rama `yapanel-build` → sitio EN VIVO en https://escenia.sitios.dev (25 sep 2026, plan Galaxia). Base con las 9 fichas de producto y los ajustes por defecto, comprobada por HTTP.
- [x] Licencia de Remotion: Windoce es 1 persona (Richard, 25 sep 2026) → licencia gratis, no hay nada que pagar.
- [x] Variables del panel cargadas por Richard (26 sep 2026): canario en verde, Estación conectada al panel en vivo, prueba de humo ok.
- [x] Calendario de publicaciones en el panel (29 sep 2026, C-CALENDARIO-1): agenda con un toque, no deja dos videos a la misma hora ni demasiado juntos, por canal y plataforma.
- [x] Clave de Serper recibida y puesta en la Mac (28 sep 2026): fotos reales de Google Imágenes activas (probada: 10 resultados para «Luis Miguel niño»).
- [x] Clave de Pexels recibida y puesta en la Mac (26 sep 2026): los videos salen con clips reales.
- [x] Los videos terminados se ven y descargan dentro del panel (26 sep 2026).
- [x] Plantilla v2 «profesional» (26 sep 2026): clips en todas las escenas con búsquedas de reserva, fundidos con whoosh, rótulos con pop, frases grandes animadas, riser en el título, campana en el cierre; marca de voz de prueba discreta (3 s).
- [x] Estación instalada como LaunchAgent en la Mac (arranca sola al iniciar sesión y se reinicia si se cae).
- [x] Fase 2 (parte): biografías producibles con fotos libres de Wikimedia Commons + plantilla MiniDocumental (26 sep 2026). Publicar en Caprichoso sigue cerrado.
- [x] Ruta `/datos/estacion/guiones` para crear guiones desde fuera con el secreto (la usará el radar).
- [x] Varias imágenes con IA por escena, una por frase narrada (~5 por minuto), con fundido — pedido por Richard el 26 sep 2026.
- [x] Clave de fal.ai recibida (26 sep 2026): imágenes con IA activas en la Mac; biografía de Celia Cruz producida con ellas (guion #3, trabajo #7).
- [x] Voz pareja entre escenas, números en letras y H muda sin aspirar (27 sep 2026, C-VOZ-2 y C-VOZ-3).
- [x] Imágenes con IA fotográficas y a partir de una foto libre de la persona (27 sep 2026, C-IMAGEN-2); segunda vuelta: ropa y peinado distintos por cuadro y foto de referencia por época.
- [x] Clon profesional de la voz de Richard listo y puesto en la Mac (26 sep 2026, modelo Flash v2.5): todo video con «Mi voz» sale con su voz.
- [x] Voz real: clave de ElevenLabs probada y puesta en la Mac; guion #3 producido con voz de catálogo «Brian» (trabajo #8, 26 sep 2026) mientras entrena el clon.
- [x] Música de fondo e interludios musicales (26 sep 2026): pista elegida por estilo desde `musica-local`, volumen normalizado, 12 % bajo la voz y 50 % en interludios y cola final; la IA escribe el estilo y mete 1 o 2 interludios; editables en el panel. Candado C-MUSICA-1. Falta que Richard genere las pistas (👤).
- [x] Voz femenina por video (26 sep 2026): selector «Quién narra» al crear y editar el guion; `ELEVENLABS_VOICE_ID_FEMENINA` en la Mac (voz «Sarah»); candado C-VOZ-1.
- [x] Fase 2 (parte): titulares con golpe, recortes de periódico y tarjetas de red social dibujados en la plantilla; imágenes con IA listas (falta la clave de fal.ai) — 26 sep 2026
- [ ] Fase 2: capturas de pantalla reales del software (visual «pantalla» con `url`: grabar la página con Playwright) — pedido por Richard el 26 sep 2026
- [ ] Fase 2: biblioteca de recursos con licencia por archivo (el pack de sonidos de Richard entra ahí; memes/música con derechos solo con su confirmación por video)
- [x] Shorts 9:16 automáticos por cada video largo (27 sep 2026, C-SHORTS-1): 3 a 5 trozos con título y cierre «ver video completo».
- [x] Ritmo de lectura parejo (27 sep 2026, C-VOZ-4).
- [x] Miniatura automática del largo y cierre de los Shorts con miniatura + buscador + canal (28 sep 2026, C-CIERRE-1).
- [ ] Fase 2: biblioteca de recursos, cortes comerciales
- [ ] ⏸ EN PAUSA (29 sep 2026, lo pidió Richard: primero otras cosas) Avatar parlante de Richard. Plan completo y guardado en docs/AVATAR.md (precios verificados el 29 sep 2026). Para retomarlo: foto en /Users/windocellc/Motor-Escenia/avatar/richard.jpg + su visto bueno a la prueba de 20 s ($1.12).
- [x] Fase 3 (parte): textos de YouTube automáticos al terminar cada video: título, títulos de shorts, descripción y 30 palabras clave, con copiar (27 sep 2026, C-PUBLICACION-1).
- [ ] Fase 3: subida a YouTube (privado hasta la auditoría), `containsSyntheticMedia`, UTM, métricas
- [ ] Fase 4: radar (disparado desde la Mac, la plataforma no tiene cron)
