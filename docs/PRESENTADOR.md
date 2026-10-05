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

## Cómo lo usa Richard: «grabo, subo y sale» (desde el 5 oct 2026)

En el panel, menú **Grabaciones**:

1. Elige su video (MP4 o MOV, hasta 4 GB), escribe en una frase de qué habla,
   elige **qué va detrás** (Neón, Cómic o Documental) y el canal.
2. Toca **«Subir y armar el video»**. El archivo sube por trozos de 8 MB con una
   barra de avance. Si se corta el internet, la subida queda **en pausa** y con
   «Seguir subiendo» continúa desde donde iba. No hay que cerrar la pestaña
   mientras sube.
3. La Mac la toma sola (en menos de un minuto si está encendida), y en la misma
   página se va viendo: bajando, transcribiendo, armando el plan, armando el
   video con su porcentaje.
4. Cuando dice **«Video listo»**, el botón lleva a la página del guion, donde
   están el video horizontal, los verticales, sus miniaturas y los textos de
   YouTube, igual que cualquier otro video.
5. **«Probar en Cómic / Neón / Documental»** vuelve a armar el MISMO video con
   otro diseño detrás, sin subirlo otra vez. Así se comparan. Cada prueba es un
   guion aparte.
6. **«Quitar de la lista»** (en los tres puntos) no borra nada: el archivo, el
   guion y los videos se conservan.

Lo que pasa por dentro:

```
panel /grabaciones ──(trozos de 8 MB)──▶ almacén (BUCKET)  +  fila en `grabaciones` (subida)
        Estación: ¿hay grabación? ──▶ la baja a estacion/cache/grabaciones/g<id>/
                  saca la voz ─▶ transcribe ─▶ le manda el texto al panel
        panel: la IA arma el plan ─▶ guion APROBADO + trabajo «producir» (planeada)
        Estación: toma el trabajo ─▶ quita el croma ─▶ produce ─▶ sube videos, textos y miniaturas
```

- **El guion nace aprobado.** La regla del panel («nada se produce sin la
  opinión escrita de Richard») existe para lo que escribe la IA. Aquí la
  narración es lo que él mismo dijo, en cámara, y subir la grabación es la orden
  de armarla. En el lugar de la opinión queda una nota que lo dice; no se le
  inventa una opinión. Publicar en YouTube lo sigue haciendo él.
- **El tema de cada video lo decide Richard antes de grabar.** La IA no propone
  ni escribe lo que él dice: copia su transcripción y decide qué va detrás.
- Los guiones de grabaciones usan las temáticas `presentador` (Full Código) y
  `presentador-tv` (Caprichoso TV), que no aparecen en «Nuevo video».
- Una grabación de menos de 30 palabras (unos 15 segundos) no alcanza para un
  video: se le dice en la página, con el botón «Intentar otra vez».
- Subir desde la Mac un archivo que ya está ahí (lo mismo, sin navegador):

  ```bash
  cd /Users/windocellc/Motor-Escenia/estacion && npx tsx src/subir-grabacion.ts /ruta/del/video.mp4 --tema "de qué habla" --formato neon
  ```

- Una prueba técnica que pase por el panel en vivo se sube con un tema que
  empiece por «Prueba técnica» y al terminar se saca de las listas de Richard:

  ```bash
  cd /Users/windocellc/Motor-Escenia && estacion/node_modules/.bin/tsx scripts/retirar-prueba-remota.ts 1
  ```

## Qué hace el motor con la grabación

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

## La herramienta de la Mac (para probar sin pasar por el panel)

```bash
cd /Users/windocellc/Motor-Escenia/estacion && npx tsx src/presentador.ts /ruta/de/la/grabacion.mp4 --estilo neon --tema "de qué va el video"
```

Sin más, hace todo: transcribe, le pide el **plan** a la IA del panel, quita el
fondo y arma el video.

- `--estilo`: `neon`, `ilustrado` (Cómic) o `clasico` (Documental).
- `--tema "…"`: de qué va, en una frase (ayuda a la IA a titular). Opcional.
- `--solo-plan`: se detiene después de armar el plan, para leerlo o corregirlo.
  El plan queda en `estacion/out/p-<nombre>/plan.json`. Para armar el video con
  ese plan ya revisado, se corre lo mismo pasándole el archivo después de la grabación.
- `--canal caprichoso-tv` para Caprichoso TV (sin decirlo, Full Código).
- `--similitud 0.18` si quedan restos de verde alrededor (más alto = borra más;
  por defecto 0.14). `--sin-croma` para forzar la ventana.

**El plan** es un guion en el formato de siempre. La `narracion` de cada escena
es lo que él dijo en ese tramo, **copiado** de la transcripción y en orden (la
IA no escribe lo que él dice), y los `planos` o el `diagrama` dicen qué va
detrás y con qué frase entra cada cosa. Lo arma `generarPlan`
(`src/lib/generador.ts`, con las reglas de `src/lib/plan-grabacion.ts`) y
cuesta unos 3 centavos. Ejemplos escritos a mano:
`estacion/ejemplos/guion-neon.json` y `guion-ilustrado.json`.

Con esta herramienta el video queda en `estacion/out/p-<nombre de la grabación>/`
y no sube al panel (para eso está «Grabaciones»).

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

## Lo que falta (en orden)

1. **Una grabación de prueba de Richard** (30 a 60 segundos, con su croma), para
   ajustar el borrado del verde con imagen real. Hasta hoy solo se probó con un
   muñeco dibujado sobre verde.
2. ~~Que la IA arme el plan sola~~ — hecho el 5 oct 2026.
3. ~~Subir la grabación desde el panel y que la Estación la tome sola~~ — hecho
   el 5 oct 2026 (candado C-GRABACIONES-1).
4. **Cortar pausas y frases repetidas** antes de armar.
5. Quitar el fondo **sin croma** (el estudio de la mesa), con el recorte de
   personas de macOS, cuadro por cuadro.
6. El formato **Pizarra** (fotos recortadas con flechas) para las historias de música.
7. Corregir el plan (un diagrama, una foto) desde el panel antes de armar.

## Las piezas

| Qué                                            | Dónde                                                                                          |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Tiempos de escenas, momentos en grande/esquina | `compartido/presentador.ts`                                                                    |
| Transcripción                                  | `estacion/src/transcribir.ts`                                                                  |
| Croma, recorte, ventana, voz                   | `estacion/src/croma.ts`                                                                        |
| La herramienta de la Mac                       | `estacion/src/presentador.ts`                                                                  |
| Reglas de la subida (tamaños, avisos)          | `compartido/grabaciones.ts`                                                                    |
| Grabaciones en la base (fila, plan, versiones) | `src/lib/grabaciones.ts`                                                                       |
| Subida desde el navegador                      | `src/app/grabaciones/`                                                                         |
| Rutas de subida (sesión o secreto)             | `src/app/datos/grabaciones/`                                                                   |
| Rutas de la Estación                           | `src/app/datos/estacion/grabaciones/`                                                          |
| La Estación: bajar, transcribir, montar        | `estacion/src/grabaciones.ts`                                                                  |
| Subir desde la Mac                             | `estacion/src/subir-grabacion.ts`                                                              |
| El dibujo de la capa                           | `estacion/src/remotion/Presentador.tsx`                                                        |
| Pruebas                                        | `pruebas/presentador.test.ts`, `pruebas/grabaciones.test.ts`, `pruebas/permiso-subida.test.ts` |
| Candados                                       | C-PRESENTADOR-1 y C-GRABACIONES-1 en `docs/CANDADOS.md`                                        |
