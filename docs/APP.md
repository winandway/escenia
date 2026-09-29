# Escenia instalada en el teléfono

Pedido por Richard el 29 sep 2026: tener el panel como una app en el teléfono.
El panel es ahora una **app instalable** (lo que en inglés se llama PWA): se
instala desde el navegador, queda con su ícono y abre a pantalla completa, sin
la barra del navegador. No pasa por la tienda de Apple ni de Google.

## Cómo se instala

**iPhone (Safari):**

1. Abre https://escenia.sitios.dev en Safari y entra con tu contraseña.
2. Toca el botón Compartir (el cuadro con la flecha hacia arriba).
3. Elige «Agregar a inicio» y después «Agregar».

**Android (Chrome):**

1. Abre https://escenia.sitios.dev en Chrome y entra con tu contraseña.
2. Entra a «Ajustes» del panel y toca «Instalar Escenia».
3. Si el botón no sale: los tres puntos de Chrome → «Instalar app».

**Computadora (Chrome o Edge):** el mismo botón «Instalar Escenia» en Ajustes.

Al mantener el dedo sobre el ícono (Android) salen los atajos: Calendario,
Nuevo video y Estación.

## Abre en el calendario

En el teléfono lo que más se usa es el calendario, así que la app instalada
abre ahí. Las instalaciones nuevas lo traen en el manifiesto. Las que ya
estaban instaladas abren en la portada y la app las lleva al calendario sola,
una vez por apertura: tocar «Guiones» después se queda en Guiones.

## El menú y la franja de arriba del teléfono

La app instalada ocupa toda la pantalla, también la franja de la hora y la
cámara. El cuerpo de la página lleva el margen de esa franja
(`env(safe-area-inset-*)` en `src/app/globals.css`). El 29 sep 2026 faltaba y
el menú quedaba tapado por la hora en el iPhone de Richard.

## Qué hace sin internet

Muestra una pantalla propia, «Sin conexión», en vez del error del navegador.
Lo que estabas escribiendo sigue guardado en el teléfono y vuelve cuando
regresa la conexión. **El panel no funciona sin internet**: los guiones y el
calendario viven en la nube y siempre se piden frescos.

## Cómo está hecho

| Pieza                     | Dónde                                                                               |
| ------------------------- | ----------------------------------------------------------------------------------- |
| Manifiesto                | `src/app/manifest.ts`                                                               |
| Íconos                    | `public/iconos/`, `src/app/apple-icon.png` (se arman con `node scripts/iconos.mjs`) |
| Servicio (sin conexión)   | `public/sw.js`                                                                      |
| Pantalla «Sin conexión»   | `src/app/sin-conexion/page.tsx`                                                     |
| Encendido del servicio    | `src/app/_app/RegistrarApp.tsx`                                                     |
| Botón de instalar         | `src/app/_app/InstalarApp.tsx` (en Ajustes)                                         |
| Rutas abiertas sin sesión | `RUTAS_DE_LA_APP` en `src/proxy.ts`                                                 |

El servicio **no guarda pantallas ni datos del panel** en el teléfono. Solo
guarda la pantalla «Sin conexión» y los archivos fijos que la visten.

## Cómo se comprueba

```bash
cd /Users/windocellc/Motor-Escenia && node scripts/probar-app.mjs https://escenia.sitios.dev
```

Abre un navegador de teléfono de verdad, sin ventana, y revisa: servicio
encendido, manifiesto, íconos, memoria del teléfono, y que sin internet salga
«Sin conexión» con su diseño. También `npx vitest run pruebas/app-instalable.test.ts`
y la prueba de humo (`node scripts/humo.mjs https://escenia.sitios.dev`).

**Ojo:** el navegador integrado de la app de escritorio de Claude no deja
encender servicios de este tipo; ahí siempre sale un aviso en la consola. La
comprobación válida es la del guion de arriba.
