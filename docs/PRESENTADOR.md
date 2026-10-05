# Formato Presentador: Richard en cámara, con los gráficos detrás

> Richard, 5 de octubre de 2026: _«quiero grabar un video donde yo hago una
> presentación y luego lo subo. Usted le quita el fondo… pone la cabeza mía un
> poquito pequeña en una esquina… y a medida que yo voy hablando, los gráficos y
> todo lo que yo digo, usted lo hace y me lo pone de fondo»_. Y: _«hacer un zoom
> completo donde salgo yo, cara completa, y cuando se aleje, sale en mi fondo lo
> que estoy hablando»_.

Por qué importa (más allá del gusto): ver [FORMATOS.md](FORMATOS.md), la parte
de YouTube. Un video con el dueño del canal a la vista es lo que la política de
monetización protege por escrito.

## Qué hace hoy (primera versión, en la Mac)

De una grabación de Richard hablando y un **plan** (qué va detrás de él en cada
tramo), arma el video largo y sus Shorts:

1. **Saca su voz** y la empareja de volumen. No le toca el ritmo: la imagen
   tiene que seguir calzando con la boca.
2. **La transcribe** con el tiempo de cada palabra (ElevenLabs Scribe v2, 22
   centavos por HORA de audio; diez minutos son unos 4 centavos). Con eso, los
   subtítulos y cada imagen entran cuando él dice la palabra.
3. **Le quita el fondo** si se grabó con croma verde o azul (lo detecta solo,
   mirando las esquinas de arriba), y recorta el video a su figura. Si no hay
   croma (fondo negro, el estudio de la mesa), la grabación va en una
   **ventana** redondeada.
4. **Lo monta** encima de los gráficos, con dos sitios y un movimiento suave
   entre ellos:
   - **En grande**: al arrancar el video (los primeros tres segundos y medio son
     su cara y su voz), un momento al empezar cada tema, y toda la opinión. Lo
     de atrás se oscurece.
   - **En la esquina**: el resto del tiempo. En horizontal va abajo a la
     derecha, y los diagramas y las figuras se corren a la izquierda para no
     quedar detrás de él. En vertical (Shorts) él ocupa la franja de abajo y los
     gráficos van arriba, en una «pantalla».
5. Los subtítulos nunca le tapan la cara: van a su lado, sobre su cabeza o, si
   está en grande, sobre su pecho.

Detrás de él puede ir cualquiera de los tres formatos: Neón, Cómic o Documental.

## Cómo se usa hoy

```bash
cd /Users/windocellc/Motor-Escenia/estacion && npx tsx src/presentador.ts /ruta/de/la/grabacion.mp4 /ruta/del/plan.json --estilo neon
```

- `--estilo`: `neon`, `ilustrado` (Cómic) o `clasico` (Documental).
- `--canal caprichoso-tv` para Caprichoso TV (sin decirlo, Full Código).
- `--similitud 0.18` si quedan restos de verde alrededor (más alto = borra más;
  por defecto 0.14). `--sin-croma` para forzar la ventana.

El **plan** es un guion en el formato de siempre. La `narracion` de cada escena
es lo que él dijo en ese tramo (copiado de la transcripción, en orden), y los
`planos` o el `diagrama` dicen qué va detrás y con qué frase entra cada cosa.
Ejemplos: `estacion/ejemplos/guion-neon.json` y `guion-ilustrado.json`.

El video queda en `estacion/out/p-<nombre de la grabación>/`. Todavía no sube
al panel.

## Cómo grabar para que salga bien

- **Horizontal**, cámara fija, a la altura de los ojos, de la cintura para arriba.
- **Fondo verde parejo**: sin arrugas ni sombras, bien iluminado. Las dos
  esquinas de arriba tienen que verse verdes (por ahí detecta el croma).
- **Nada verde encima**: ni ropa, ni reflejos en lentes. Separado del fondo un
  metro o más, para que el verde no le rebote en la piel.
- **Luz de frente** en la cara, pareja.
- Hablar de corrido. Si se equivoca, repetir la frase completa: después se corta.
- Dejar un segundo de silencio al empezar y al terminar.
- El fondo **negro** no sirve para quitar el fondo (el pelo y la ropa oscura se
  borrarían): esas grabaciones van en ventana.

## Lo que falta para que sea «grabo, subo y sale» (en orden)

1. **Una grabación de prueba de Richard** (30 a 60 segundos, con su croma), para
   ajustar el borrado del verde con imagen real. Hasta hoy solo se probó con un
   muñeco dibujado sobre verde.
2. **Que la IA arme el plan sola** a partir de la transcripción (parte lo que él
   dijo en escenas y decide qué va detrás). Necesita saldo en la cuenta de
   Anthropic.
3. **Subir la grabación desde el panel** (por partes, porque pesa cientos de
   megas) y que la Estación la tome sola, como un trabajo más.
4. **Cortar pausas y frases repetidas** antes de armar.
5. Quitar el fondo **sin croma** (el estudio de la mesa), con el recorte de
   personas de macOS, cuadro por cuadro.
6. El formato **Pizarra** (fotos recortadas con flechas) para las historias de música.

## Las piezas

| Qué                                            | Dónde                                   |
| ---------------------------------------------- | --------------------------------------- |
| Tiempos de escenas, momentos en grande/esquina | `compartido/presentador.ts`             |
| Transcripción                                  | `estacion/src/transcribir.ts`           |
| Croma, recorte, ventana, voz                   | `estacion/src/croma.ts`                 |
| La herramienta                                 | `estacion/src/presentador.ts`           |
| El dibujo de la capa                           | `estacion/src/remotion/Presentador.tsx` |
| Pruebas                                        | `pruebas/presentador.test.ts`           |
| Candado                                        | C-PRESENTADOR-1 en `docs/CANDADOS.md`   |
