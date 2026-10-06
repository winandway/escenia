# Comerciales: el video publicitario de un cliente, con su material

> Richard, 5 de octubre de 2026: _«hay videos publicitarios que requieren subir una
> carpeta con varias imágenes para que las usen en la producción… por ejemplo, van a
> salir todos sus logos en la pantalla, moviéndose… ese material que un cliente nos
> manda por WhatsApp para que automáticamente le creemos un video»_. Y: _«acá vamos a
> utilizar el sistema de neón… con diagramas de neón y personas que se dibujen,
> efectos y cosas así… narrado con voz neuronal de nosotros»_.

El primer caso real: Andreea Blidar, diseñadora, dos gigs de Fiverr (logos y páginas
web), cada uno con su texto en inglés de un minuto, dieciséis logos en PNG sin fondo y
un PDF de diecinueve capturas de páginas.

## Cómo se usa (dos pasos en el panel)

1. **Imágenes** (menú Material): se escribe el nombre de una carpeta (el cliente o el
   trabajo) y se eligen los archivos, muchos de una vez: PNG, JPG, WEBP o PDF. Un PDF
   se parte solo en una imagen por página (y a cada página se le quita el marco oscuro
   de alrededor). El mismo nombre en la misma carpeta reemplaza al archivo anterior.
2. **Comerciales** (menú Videos): el nombre del video, el **texto que lee la voz** (tal
   como lo mandó el cliente, en español o en inglés), quién narra (la voz femenina o la
   de Richard), **las carpetas** de imágenes que se usan y, si hace falta, instrucciones
   («que pasen todos los logos cuando habla de sus trabajos»). Botón «Pedir el video».
   Después, en la lista, se ve cómo avanza y «Ver y descargar el video».

El formato es **Neón con personajes** siempre, pero en un comercial **no hay fotos de
internet ni personas dibujadas de la web**: en el video de un cliente solo sale lo
suyo. Las «personas» son sus imágenes: cada logo y cada captura entra cuando la voz
dice su frase. Lo demás son diagramas de neón (los pasos de su servicio, sus paquetes).

**Sin marca de canal, sin cierre de «suscríbete» y sin Shorts**: el video es del
cliente. Sale el video horizontal con su miniatura.

## Lo que pasa por dentro

```
panel /imagenes ──▶ almacén (BUCKET) + tabla `imagenes` (carpeta, nombre, tipo)
panel /comerciales ──▶ tabla `comerciales` (subida)
  Estación: ¿hay comercial? ──▶ baja las imágenes de sus carpetas a estacion/cache/imagenes/<carpeta>/
            un PDF → pdftoppm (una PNG por página) → cropdetect (sin el marco)
            le manda al panel la lista (nombre, medidas, si tiene fondo transparente)
  panel: la IA arma el plan ──▶ guion APROBADO (temática `comercial`) + trabajo «producir»
  Estación: toma el trabajo ──▶ voz (ElevenLabs, en el idioma del texto) ──▶ produce ──▶ sube el video
```

- **El plan** (`src/lib/plan-comercial.ts`): la narración se COPIA del texto del
  cliente, en escenas de 15 a 45 palabras. Cada escena es de imágenes (planos
  «imagen» con el `archivo` exacto de la lista, 2 a 5 por escena, y planos «dato»)
  o un diagrama de neón. Nunca «foto» ni «stock». Todo lo que se lee en pantalla va
  en el idioma del texto.
- **El plano «imagen»** (`compartido/guion.ts`): `archivo` es el nombre de la lista.
  En la Mac se busca por parecido (`buscarImagenPorNombre`: sin mayúsculas, tildes
  ni extensión); una que no está, no entra.
- **En pantalla** (`estacion/src/remotion/Planos.tsx`, `ImagenPlano`): un logo sin
  fondo flota en el centro con un halo del color de la luz; una captura va en una
  tarjeta con borde, apenas inclinada, y si es una página alta se recorre hacia
  arriba. Van encima del fondo de neón de la escena, con el título de la escena
  arriba, chico (`LaminaNeon` compacta).
- **La voz en inglés** (`textoParaLaVoz` en `compartido/pronunciacion.ts`): no se
  pasan las cifras a letras ni se quita la H; eso es del español.
- **Subir desde la Mac** (lo mismo que el panel, sin navegador):

  ```bash
  cd /Users/windocellc/Motor-Escenia/estacion && npx tsx src/subir-imagenes.ts "Logos Andreea" /ruta/a/*.png
  ```

  ```bash
  cd /Users/windocellc/Motor-Escenia/estacion && npx tsx src/pedir-comercial.ts --nombre "Andreea · logos" --texto /ruta/guion.txt --idioma en --voz femenina --carpetas "Logos Andreea,Capturas Andreea"
  ```

## Qué revisar antes de avisar

1. Que **todos los logos** del cliente salgan (en el registro de la Estación:
   «imágenes listas: N»; en los cuadros del video).
2. Que **ninguna imagen sea ajena**: en un comercial no puede haber una foto de
   internet. Si aparece una, es un fallo del filtro, no del plan.
3. Que el **texto en pantalla esté en el idioma del cliente** y sin errores.
4. Que no salga la marca del canal ni el cierre de «suscríbete».
5. El nombre del cliente y de sus productos bien escritos (la voz y los subtítulos
   salen del texto escrito, no de una transcripción: aquí no hay ese riesgo).

## Lo que falta

- Elegir el momento y el texto de la miniatura desde el panel (como en los demás).
- Una versión vertical (9:16) del comercial, para redes.
- Que Richard pueda ver el plan (qué imagen va en cada frase) y cambiar una antes de armar.

## Las piezas

| Qué                                                                 | Dónde                                                         |
| ------------------------------------------------------------------- | ------------------------------------------------------------- |
| Reglas de la biblioteca (extensiones, nombres, búsqueda por nombre) | `compartido/imagenes.ts`                                      |
| Reglas del pedido (texto, idioma, voz, carpetas)                    | `compartido/comerciales.ts`                                   |
| Biblioteca en la base                                               | `src/lib/imagenes.ts`, página `src/app/imagenes/`             |
| Comerciales en la base                                              | `src/lib/comerciales.ts`, página `src/app/comerciales/`       |
| Rutas de subida (sesión o secreto)                                  | `src/app/datos/imagenes/`, `src/app/datos/comerciales/`       |
| Rutas de la Estación                                                | `src/app/datos/estacion/imagenes/`, `…/estacion/comerciales/` |
| Lo que se le pide a la IA                                           | `src/lib/plan-comercial.ts`                                   |
| La Estación: bajar, partir PDF, plan                                | `estacion/src/comerciales.ts`                                 |
| Pruebas                                                             | `pruebas/comerciales.test.ts`                                 |
| Candados                                                            | C-IMAGENES-1 y C-COMERCIAL-1 en `docs/CANDADOS.md`            |
