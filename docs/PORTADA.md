# Portada de impacto: la miniatura que se lleva el clic

> Pedida por Richard el 2 de octubre de 2026: _«dame una miniatura para Prince
> Royce, una miniatura que sea llamativa, algo que la gente dé clic cuando la
> vea»_.

La miniatura automática (la que arma cada producción) pone el título sobre una
foto. Sirve de respaldo, pero no compite en YouTube. La **portada de impacto**
se arma aparte, a mano, con una idea por video, y reemplaza a la automática en
el panel.

## La receta (tres cosas que se leen en un segundo y en chiquito)

1. **La cara**, recortada de su foto, grande, a la derecha, con borde blanco.
2. **Una cifra enorme** en amarillo, con lo que cuenta debajo («15 NOMINACIONES»).
3. **El remate** en una caja roja inclinada («CERO PREMIOS»), con la palabra
   del golpe en amarillo.

Opcional: arriba, una etiqueta con el nombre; abajo a la izquierda, un objeto
dentro de un disco claro, con la señal de prohibido si va tachado (el trofeo).

Reglas: máximo cinco o seis palabras en total; nada de frases; la cifra y el
remate tienen que ser **datos que el video cuenta** (no se promete lo que no
está). Fondo de un solo color fuerte con rayos, que no pelee con la cara.

## Cómo se hace

Desde `estacion/`, con un trabajo ya producido (usa las fotos que ese video ya
tiene en `cache/public/t<trabajo>/fotos/`):

```bash
cd /Users/windocellc/Motor-Escenia/estacion && npx tsx src/portada.ts 27 --foto web-b0f0de3fdf0554ad.jpg --etiqueta "PRINCE ROYCE" --cifra 15 --linea NOMINACIONES --remate "*CERO* PREMIOS" --objeto web-3ca740db57aa9151.jpg --tachado --mostrar 0.62 --acercar 1.2
```

Eso la deja en `out/t27/portada.png` para mirarla. Cuando ya está bien, el
mismo comando con `--guion 8` al final la sube al panel como la miniatura de
ese guion.

| Opción                      | Para qué                                                                                   |
| --------------------------- | ------------------------------------------------------------------------------------------ |
| `--foto`                    | La foto de la persona (se recorta sola, sin fondo)                                         |
| `--etiqueta`                | El nombre, arriba, en chico                                                                |
| `--cifra` y `--linea`       | El número enorme y lo que cuenta                                                           |
| `--remate`                  | La caja roja. La palabra entre asteriscos sale en amarillo                                 |
| `--objeto` y `--tachado`    | Un objeto en un disco claro, con la señal de prohibido                                     |
| `--mostrar 0.62`            | Enseña solo la parte de arriba del objeto (la base de aquel trofeo traía la placa de otro) |
| `--acercar 1.2`             | Agranda a la persona (la cara gana tamaño; el cuerpo se sale por abajo)                    |
| `--color`, `--color-oscuro` | El fondo (por defecto, rojo sobre casi negro)                                              |
| `--acento`                  | El color de la cifra (por defecto, amarillo)                                               |
| `--guion 8`                 | La sube al panel                                                                           |

## Cómo se recorta a la persona

`estacion/herramientas/recortar.swift` usa el recorte de sujeto que trae macOS
(el mismo de «copiar sujeto» en Fotos). No gasta, no sale de la Mac. Se compila
solo la primera vez (`estacion/bin/recortar`, fuera del repositorio).

## Qué revisar antes de subirla

- La foto es de quien dice la etiqueta, **confirmado por su fuente** (regla
  C-IMAGEN-6): la IA no reconoce a nadie por la cara.
- El objeto no trae el nombre de otra persona ni el logo de otra empresa.
- Se lee en chiquito (así se ve en el celular): si una palabra no se lee, sobra.

## Dónde la encuentra Richard

En el panel, en la página del guion, debajo del video: la imagen y el botón
**Descargar miniatura**. Siempre muestra la más nueva. En el calendario también
sale como la imagen del video mientras no tenga enlace de YouTube.

Las piezas: `estacion/src/remotion/Portada.tsx` (el dibujo),
`estacion/src/portada.ts` (la herramienta) y `esquemaPortada` en
`estacion/src/remotion/props.ts`.
