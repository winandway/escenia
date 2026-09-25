# Análisis a fondo — Motor Escenia (motor de videos Windoce)

> Hecho el 25 de septiembre de 2026, antes de escribir una sola línea de código.
> Cada dato sale de una fuente oficial leída ese día (URL al lado). Lo que es
> opinión nuestra va marcado **(opinión)**. Lo que no se pudo verificar va
> marcado **(sin verificar)**.

## 0. Veredicto en una línea

El proyecto **es viable y barato de operar** (menos de $1 por video), pero el
prompt original tenía **7 huecos que lo habrían tumbado**. Abajo están, con su
arreglo ya decidido.

---

## 1. Los 7 huecos y cómo se tapan

### Hueco 1 — Supabase gratis no aguanta los videos

- Supabase gratis: archivos de **50 MB máximo**, 1 GB total, se **duerme a los 7 días** sin uso. (https://supabase.com/docs/guides/storage/uploads/file-limits · https://supabase.com/pricing)
- Un MP4 de 3 min en 1080p pesa 60–200 MB **(opinión, depende del bitrate)**.
- **Decisión:** el panel, la base y los archivos chicos van en **YaDominios Cloud**
  (`env.DB` + `env.BUCKET`), que es además la regla de publicación. **Los MP4
  nunca suben a la nube**: se renderizan en la Mac y de la Mac van directo a
  YouTube. En la nube solo viven textos, audios (~3 MB), miniaturas y la
  biblioteca de memes/efectos. Así se elimina Supabase, su límite de 50 MB, su
  robot keep-alive y un servicio más que pagar.
- Requisito: la base de YaDominios Cloud **solo existe en plan de pago** (desde
  $1.99/mes). En el plan gratis `env.DB` no existe.

### Hueco 2 — Remotion no es gratis para un motor automático

- Gratis solo para empresas de **hasta 3 personas** (contratistas incluidos). (https://github.com/remotion-dev/remotion/blob/main/LICENSE.md)
- Todo código que llame a `renderMedia()` o `npx remotion render` cuenta como
  «automatización» → licencia **Automators: $0.01 por render, mínimo $100/mes**. (https://www.remotion.dev/docs/license/faq · https://www.remotion.pro/license)
- **Decisión:** si Windoce son 3 personas o menos, se usa gratis. Si son más,
  hay que comprar la licencia antes de producir en serio. **Esto lo decide
  Richard** (es dinero).

### Hueco 3 — Sin auditoría de la API, YouTube sube todo en PRIVADO

- «Videos subidos por proyectos de API no verificados creados después del 28 jul
  2020 quedan en privado». (https://developers.google.com/youtube/v3/docs/videos/insert)
- En modo «Testing», la conexión OAuth **vence cada 7 días**. (https://developers.google.com/identity/protocols/oauth2)
- **Decisión:** la solicitud de auditoría se manda **desde la Fase 1**
  (https://support.google.com/youtube/contact/yt_api_form), no en la Fase 3,
  porque tarda. Mientras tanto el motor sube en privado y Richard publica con un
  clic en Studio — que igual es lo que queremos: revisión final humana.
- Buena noticia: desde el 1 jun 2026 las subidas tienen **cupo propio de 100 al
  día**; la cuota ya no es problema. (https://developers.google.com/youtube/v3/determine_quota_cost)

### Hueco 4 — «Contenido no auténtico» castiga al CANAL ENTERO

- Desde el 15 jul 2025 YouTube desmonetiza lo «hecho con plantillas genéricas
  que da impresión de producción masiva» y las «historias de plantilla». La
  revisión es del **canal completo** y la sanción quita **toda** la monetización,
  con una frase que alcanza a «all or any of your accounts». (https://support.google.com/youtube/answer/1311392)
- **Decisiones:**
  1. **El piloto va en el canal de IA, NO en Caprichoso TV.** Arriesgar un canal
     monetizado de 19 años para probar un motor nuevo no tiene sentido. Caprichoso
     entra cuando el canal de IA lleve 15–20 videos sin problemas.
  2. **Candado en código:** el botón «Aprobar» queda bloqueado hasta que Richard
     escriba su opinión en el guion. Sin aporte humano, no hay video.
  3. **Candado de variedad:** el motor compara el guion nuevo con los últimos 10
     (estructura, gancho, plantilla visual) y avisa si se parece demasiado.
  4. La voz clonada propia **no hay que declararla** como sintética: YouTube lo
     excluye textualmente («cloning one's own voice to create voice overs»). Sí
     se declara si se genera una imagen realista de una persona real. El campo
     de la API es `status.containsSyntheticMedia`. (https://support.google.com/youtube/answer/14328491)

### Hueco 5 — Las biografías de músicos son una mina de Content ID

- Content ID reclama automáticamente audio de canciones y clips de TV; «no
  puede decidir uso legítimo» y dar crédito no protege. (https://support.google.com/youtube/answer/9783148)
- Pexels **no tiene fotos de artistas famosos**, y las fotos de prensa tienen dueño.
- **Decisión:** la temática `biografias` se construye en Fase 2 con reglas duras:
  cero música del artista (solo música de la biblioteca con licencia), fotos
  solo con licencia o dominio público, y las «entrevistas-archivo» **solo con
  material propio de Caprichoso TV**. Si no hay visual legal para un artista, el
  motor no lo propone. Este es el mayor riesgo de contenido del proyecto.

### Hueco 6 — Cortes comerciales de 30–40 s matan la retención

- **(opinión)** Un corte propio de 30–40 s en un video de 3 min es el 20 % del
  video, y compite con los anuncios de YouTube. La gente se va, y la retención
  es lo que más pesa para que YouTube recomiende.
- **Decisión:** spots de **10–20 s**, **uno solo** en videos de menos de 8 min, y
  dos solo en videos largos. Configurable por temática (ya está en
  `cortesComerciales`).
- Promoción pagada: la ayuda oficial habla de pagos de **terceros**; la
  autopromoción no parece encajar **(sin verificar)**. Se deja sin marcar y el
  spot lo dice en voz y en pantalla: «esto es de nuestra empresa».

### Hueco 7 — YaDominios Cloud no tiene cron, y el render no puede ir en la nube

- La plataforma **no dispara tareas programadas** (se ignoran en silencio), y un
  worker no puede renderizar video.
- **Decisión:** arquitectura de **dos piezas** (ver sección 2). El radar de la
  Fase 4 lo dispara la propia Mac (launchd) llamando a una ruta protegida.

---

## 2. Arquitectura corregida

```
┌──────────── NUBE: YaDominios Cloud (escenia.sitios.dev — propuesto) ────────────┐
│  Panel Next.js 16.3.6  ·  env.DB (temas, guiones, spots, métricas)               │
│  env.BUCKET (voces, miniaturas, biblioteca)  ·  Genera guion con Claude          │
│  Cola de trabajos: tabla `jobs` (pendiente → tomado → hecho/error)               │
└──────────────────────────────▲──────────────────────────────────────────────────┘
                               │  HTTPS + secreto (rutas /datos/estacion/*)
┌──────────────────────────────┴──── MAC de Richard: «Estación» ───────────────────┐
│  Proceso Node que pregunta cada 30 s si hay trabajo:                             │
│  voz ElevenLabs (with-timestamps) → visuales Pexels → render Remotion            │
│  → Shorts 9:16 → miniatura → (Fase 3) subida a YouTube en privado                │
│  Los MP4 se quedan en la Mac. Nunca suben a la nube.                             │
└──────────────────────────────────────────────────────────────────────────────────┘
```

Por qué así:

- La Mac hace lo pesado (render) y lo que no cabe en la nube (MP4 de cientos de MB).
- La nube hace lo que tiene que estar siempre disponible (panel, aprobar desde el celular).
- Si la Mac está apagada, los trabajos esperan en la cola. Nada se pierde.

**Rutas:** nada de `/api/` (choca con los estáticos en YaDominios). Todo va en `/datos/*`.

**Los temas y los prompts viven en la base, no en el código.** Doble motivo: es
el principio 4b del proyecto, y el repositorio tiene que ser **público** para
YaDominios Cloud — así la estrategia de contenido no queda expuesta en GitHub.

**Losupe se lee por su feed público**, no entrando a su base. Es otro proyecto.

---

## 3. Subtítulos palabra por palabra (detalle técnico que el prompt no traía)

- ElevenLabs `POST /v1/text-to-speech/{voice_id}/with-timestamps` devuelve el
  audio y el tiempo de **cada letra**. (https://elevenlabs.io/docs/api-reference/text-to-speech/convert-with-timestamps)
- Remotion necesita tiempos por **palabra** (`Caption[]`) para
  `createTikTokStyleCaptions()`. (https://www.remotion.dev/docs/captions/create-tiktok-style-captions)
- **Decisión:** convertidor propio letras → palabras, con su prueba automática.
  Es la pieza que hace que los subtítulos vayan sincronizados.

---

## 4. Costo por video (estimado)

| Pieza                                              | Costo                    | Fuente                                                   |
| -------------------------------------------------- | ------------------------ | -------------------------------------------------------- |
| Guion (Claude Sonnet 5, ~3 k entrada / 3 k salida) | ~$0.04                   | https://platform.claude.com/docs/en/about-claude/pricing |
| Voz 3 min (Multilingual v2, ~$0.10/min)            | ~$0.30                   | https://elevenlabs.io/pricing/api                        |
| 3 Shorts (reusan el audio)                         | $0                       | —                                                        |
| Pexels                                             | $0                       | https://www.pexels.com/license/                          |
| Render Remotion                                    | $0 (≤3 personas) o $0.01 | https://www.remotion.pro/license                         |
| **Total**                                          | **~$0.35 por video**     |                                                          |

Costos fijos al mes: YaDominios Cloud desde $1.99 · ElevenLabs Creator $22
(clon profesional) o Starter $6 (clon instantáneo) · Remotion $0 o $100.

**Candado de gasto:** `daily_budget_usd` en la base (por defecto $3/día). Cada
llamada a Claude o ElevenLabs se anota con su costo; si se pasa del tope, la
cola se detiene y el panel lo dice arriba. El plan gratis de ElevenLabs **no
sirve**: no permite uso comercial. (https://elevenlabs.io/docs/help-center/legal/can-i-publish-the-content-i-generate-on-the-platform)

---

## 5. Lo que cambia en las fases

| Fase | Antes (prompt)                 | Ahora                                                                                |
| ---- | ------------------------------ | ------------------------------------------------------------------------------------ |
| 1    | Supabase + render manual       | YaDominios Cloud + Estación en la Mac + cola; **se pide la auditoría de YouTube**    |
| 2    | Biografías y cortes de 30–40 s | Biografías con reglas anti-Content ID; cortes de 10–20 s                             |
| 3    | Subida pública                 | Subida en privado hasta que llegue la auditoría; `containsSyntheticMedia` automático |
| 4    | Cron                           | La Mac dispara el radar (la plataforma no tiene cron)                                |

Piloto: **solo el canal de IA** hasta tener 15–20 videos publicados sin avisos.

---

## 6. Lo que decide Richard (y nada más)

1. **Plan de pago de YaDominios Cloud** para este sitio (hace falta la base).
2. **Cuántas personas tiene Windoce**, contando contratistas → Remotion gratis o $100/mes.
3. **Plan de ElevenLabs:** Creator $22 (clon profesional, 30 min de audio, lo
   más parecido a su voz) o Starter $6 (clon instantáneo, 1–2 min de audio).
4. **El nombre del sitio:** propuesto `escenia.sitios.dev`.

## 7. Fuentes sin verificar (se comprueban al construir)

- Si `with-timestamps` acepta `eleven_v3` (si no, se usa `eleven_multilingual_v2`).
- Si la autopromoción obliga a marcar «promoción pagada».
- Calidad real del español con la voz de Richard: hay que escucharla.
