# Noticias de Losupe para los videos cortos

> Pedido por Richard el 1 de octubre de 2026. Cada día saca de losupe.com el
> texto para grabar noticias cortas en sus dos canales (Full Código y
> Caprichoso TV), y en el video dice que la noticia salió de losupe.com. Pidió
> **no construir nada en Escenia por ahora**: solo el texto para llevarle a la
> sesión de Losupe.

Losupe es otro proyecto. Desde aquí no se toca: Escenia solo lee su contenido
público. Lo que hay que cambiar allá viaja como un prompt que Richard pega en
la sesión de Losupe.

## Qué se vio el 1 de octubre de 2026

- La sección «Tecnología e IA» de la portada no tenía noticias del día: las
  últimas eran del 24, del 9 y del 8 de septiembre, y dos eran efemérides.
  Faltaban el evento de OpenAI del 29 de septiembre y el almuerzo de
  «superinteligencia» en la Casa Blanca de ese mismo día.
- En «Ventas y motivación» había una nota de un contrato de fútbol americano.
- El bloque «Guion para tu video» de la nota de República Dominicana (internet
  móvil) duraba 2 minutos 45 segundos, con los párrafos pegados, «según
  Wikipedia» tres veces y cifras imposibles de decir en voz alta.

## El prompt para la sesión de Losupe

```
INICIO DEL PROMPT

CONTEXTO
Soy Richard, de Windoce. Además de losupe.com tengo dos canales de YouTube, y cada día saco de Losupe el texto para grabar noticias cortas:
- Full Código (@FullCodigo): tecnología, inteligencia artificial y desarrollo, «sin rodeos».
- Caprichoso TV: artistas, música latina y farándula.
El público es el hispano de Estados Unidos (Miami, Nueva York, California) y América Latina. En cada video digo que la noticia salió de losupe.com. Eso es lo que le da nombre al sitio, así que el guion de cada nota tiene que poder leerse en voz alta tal cual.

No rompas nada de lo que ya funciona: las secciones, el diseño y el ritmo de publicación se quedan. Son dos ajustes.

AJUSTE 1 — QUÉ NOTICIAS SE PUBLICAN CADA DÍA
1. Todos los días, noticias NUEVAS (de las últimas 24 a 48 horas) en las dos secciones que alimentan los canales: al menos 3 en «Tecnología e IA» y al menos 3 en «Artistas y tendencias». Hoy la portada de «Tecnología e IA» muestra notas del 24, del 9 y del 8 de septiembre, y dos son efemérides («Hace 30 años…», «Hace 60 años…»).
2. Tecnología e IA: lanzamientos de inteligencia artificial (OpenAI, Anthropic, Google, Meta, Microsoft, Nvidia, xAI), herramientas para programar y para negocios, seguridad y regulación de la IA, y el dinero y el poder detrás de la tecnología. Dos ejemplos de esta semana que debían estar y no están: el evento de desarrolladores de OpenAI del martes 29 de septiembre de 2026, con el modelo que la empresa canceló un día antes; y el almuerzo de «superinteligencia» en la Casa Blanca de ese mismo martes, con la lista de invitados que publicó el presidente (lo vi en una publicación de La FM; confírmalo con fuentes antes de escribir).
3. Artistas y tendencias: música latina y sus artistas (lanzamientos, giras, premios, listas, polémicas, demandas), con preferencia por lo que pasa en Estados Unidos o le importa al latino de allá.
4. Las efemérides y las notas atemporales pueden seguir, pero no cuentan para el mínimo diario.
5. Cada noticia en su sección: un contrato de fútbol americano no va en «Ventas y motivación».
6. Economía, Ventas y motivación y Cripto siguen como están.
7. Como siempre: cada dato con su fuente real, enlazada en la nota; nada inventado; lo que no se pudo confirmar, no va.

AJUSTE 2 — EL BLOQUE «GUION PARA TU VIDEO»
Hoy el guion sale demasiado largo. Ejemplo: la nota «República Dominicana: entre los países con el internet móvil más rápido de América Latina» trae un guion de 2 minutos 45 segundos. Para un Short necesito un minuto. Además tiene estos defectos, que se corrigen para TODAS las notas, no solo para esa:
- Los párrafos salen pegados, sin espacio después del punto («por segundo.Este avance»).
- Dice «según Wikipedia» y «esto lo explica Wikipedia» tres veces. Wikipedia no se nombra en voz alta: se nombra la fuente original (Ookla, INDOTEL, la Unión Internacional de Telecomunicaciones, la CEPAL), una sola vez cada una.
- Cifras imposibles de decir («cuarenta y cinco punto veinticinco megabits»). Se redondea: «45 megabits».
- Historia y contexto que no caben en un minuto (1991, 1995, los cables submarinos, el NAP del Caribe).

Cómo tiene que quedar:
1. Dos versiones por nota, cada una con su botón «Copiar guion» y su duración a la vista:
   - «1 minuto», la principal, la que se ve primero: entre 120 y 140 palabras.
   - «2 minutos»: entre 240 y 270 palabras.
2. La versión de 1 minuto, en este orden:
   a) Gancho: la primera frase es el dato más sorprendente de la noticia, en 15 palabras o menos. Sin saludo y sin «hoy te cuento».
   b) Los hechos: máximo 3, los que sostienen el titular.
   c) Por qué importa: una frase que diga qué cambia para quien escucha.
   d) Cierre fijo, solo, en su propia línea: «La nota completa está en losupe.com».
3. La versión de 2 minutos es la misma, con un bloque más de contexto entre b) y c). Mismo gancho y mismo cierre.
4. Escrito para el oído: frases de 18 palabras o menos; una idea por frase; sin paréntesis, sin siglas sin explicar y sin enlaces; español neutro, sin regionalismos.
5. Los números van en cifras y redondeados (45, 91%, 2026): se leen mejor en el teleprompter y mi programa de videos los convierte solo para la voz. En la versión de 1 minuto, máximo 4 cifras sin contar el año.
6. Cada párrafo separado por una línea en blanco.
7. Solo datos que estén en la nota. El guion no agrega ningún dato que la nota no diga.
8. Encima del guion, un «Título para el video» de 60 letras o menos, con el gancho.

Ejemplo de la FORMA que busco, con los datos de la nota de República Dominicana (es un modelo de ritmo y largo, no un texto para copiar):

República Dominicana tiene uno de los internet móvil más rápidos de América Latina.

El promedio es de 45 megabits por segundo, según las mediciones de Ookla. Y la fibra óptica para casas y empresas llega hasta 1 gigabit.

No es casualidad. El regulador, INDOTEL, subió el mínimo: para llamarse banda ancha, un servicio fijo tiene que dar al menos 30 megabits de bajada.

En 2024 ya tenía internet el 91% de los dominicanos, según la Unión Internacional de Telecomunicaciones. La mayoría entra por el celular.

Y viene más: el gobierno trabaja con Google para convertir al país en el centro digital del Caribe.

Si vives allá o tienes familia allá, esto se nota en cada videollamada.

La nota completa está en losupe.com

ALCANCE
- Vale para todas las notas nuevas, de todas las secciones.
- Vuelve a generar el guion de las notas de «Tecnología e IA» y «Artistas y tendencias» de los últimos 14 días.
- Deja una prueba automática que falle si un guion de 1 minuto pasa de 140 palabras, si contiene la palabra «Wikipedia», si le falta el cierre o si hay un punto pegado a la letra siguiente. Compruébala en rojo.
- No hace falta conectar Losupe con ningún otro programa: yo copio el guion con el botón.

AL TERMINAR
Dime cuántas noticias nuevas quedaron hoy en cada una de las dos secciones y pégame el guion de 1 minuto de la nota de República Dominicana, para ver cómo quedó.

FINAL DEL PROMPT PARA la IA de la sesión de Losupe
```

## Qué queda del lado de Escenia

Nada por ahora (lo pidió Richard). Cuando Losupe tenga el guion de 1 minuto,
Richard lo copia y lo pega como contexto en «Nuevo video» (temática «Noticia de
Losupe en video» para Full Código). Si más adelante quiere que Escenia lea esos
guiones sola, se hace desde aquí leyendo el contenido público de Losupe, sin
tocar su base ni su repositorio.
