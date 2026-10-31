# La app de iPhone de Escenia: el Director en el bolsillo

> Pedida por Richard el 31 de octubre de 2026: «la idea es convertirla en una aplicación… probarla como
> app directamente en Apple… enfocarnos en los videos del avatar que va hablando y mostrando imágenes,
> como el de Maggie». Cómo se publica en Apple: [PUBLICAR-EN-APPLE.md](PUBLICAR-EN-APPLE.md).

## Qué es

La misma conversación del menú **Director** del panel ([DIRECTOR.md](DIRECTOR.md)), en una app nativa
de iPhone llamada **Escenia: AI Video Ads** (en el teléfono sale como «Escenia»):

1. **Entrar** con la contraseña del panel (con su ojito). La app recibe un token propio; la contraseña no
   se guarda en el teléfono.
2. **Tus proyectos**: la lista de encargos, «Proyecto nuevo», y en el menú de tres puntos «Archivar» y
   «Cerrar sesión».
3. **El chat**, al estilo de ChatGPT: sin mensajes, cuatro sugerencias (la primera, **«Anuncio con
   Maggie»**); abajo, la barra con «+» (fotos o video de la galería o la cámara; los videos suben por
   partes y se ven como miniaturas con su avance) y la flecha para mandar. El Director pide lo que falta
   (logo, fotos del producto) antes de la tarjeta (C-DIRECTOR-4). La **tarjeta** trae el precio arriba,
   «lo que sale en el video» (la foto de la presentadora, el logo o «sin logo», las fotos del producto),
   el texto y la voz. «Aprobar» pide confirmación con el precio. «Cambiar algo» lleva a la barra.
4. **El video terminado** aparece en la misma tarjeta: se ve ahí, se **guarda en Fotos** o se **comparte**.

Inglés primero (para EE. UU.) y español con el selector estilo Amazon. El Director contesta en el idioma
en que se le escribe. Lo escrito en el chat se guarda solo y vuelve si se cierra la app.

**Maggie** es la presentadora de la casa: sus cinco fotos de frente (blazer y blusa mostaza) están en la
carpeta **Maggie** de Imágenes, y el Director la usa cuando se pide una persona que hable y no se trae
otra, con la voz venezolana (en inglés, la femenina).

## Los avisos al iPhone (desde el 31 oct 2026)

Cuando la Mac entrega un video (del Director o un anuncio), cada iPhone con la app abierta en la cuenta
de Richard recibe «Tu video está listo» con el nombre del proyecto, en su idioma. Al tocarlo se abre ese
chat, aunque la app estuviera cerrada. La app pide el permiso al entrar; sin permiso funciona igual.

- La app guarda la dirección de avisos de su iPhone en `POST /datos/app/avisos` (tabla `app_avisos`) y la
  quita al cerrar sesión. La cuenta de demostración no recibe avisos.
- La Mac (`estacion/src/avisos.ts`) pide a quién avisar en `/datos/estacion/avisos` y firma directo con la
  llave de avisos de Apple de `~/.config/motor-escenia/apple-apns`: la llave nunca sube a la nube. Si
  Apple dice que una dirección ya no sirve, se borra.
- Los datos del aviso van en `body` (ahí los lee la app de Expo en un aviso remoto).

## La cuenta del revisor de Apple (demostración)

Apple exige una cuenta para revisar la app. Es una segunda contraseña (su texto vive solo en
`~/.config/motor-escenia/revisor-apple`; en la base, su huella en el ajuste `app_demo_huella`; se crea
o se vuelve a cargar con `scripts/tiendas/clave-revisor.ts`). Esa cuenta:

- Solo ve **sus propios** proyectos: nunca los de Richard ni los de sus clientes.
- Su Director solo ve la carpeta de su proyecto y la de Maggie (ni las ve en la lista ni puede mirarlas).
- **Aprobar no gasta**: la tarjeta queda aprobada y la app muestra un video de ejemplo público (el de la
  tarjeta de saldo de QRBott con Maggie, en `public/muestras/`). No se crea ningún anuncio ni trabajo.
- Tiene tope: 40 mensajes al Director por día y 15 proyectos abiertos.
- No entra a nada que gaste (anuncios, grabaciones, comerciales…): esas rutas le contestan 403.

## Cómo funciona por dentro

- **Panel** (`src/lib/app-sesion.ts`, `src/lib/app-encargo.ts`, rutas `src/app/datos/app/*`):
  `POST /datos/app/entrar` (mismo límite de intentos que el panel), `/datos/app/salir`,
  `/datos/app/encargos` (lista y nuevo), `/datos/app/encargos/<id>` (el proyecto entero en un viaje),
  `…/archivar`, `/datos/app/propuestas/<id>/aprobar`, `/datos/app/trabajos/<id>/otra-vez`.
  El chat y las subidas usan las mismas rutas del Director del panel: `puedeSubir` acepta el token de la
  app, y cada ruta comprueba que la cuenta pueda tocar ese encargo.
- **Tablas** (`schema.sql`): `app_sesiones`, `app_encargos_demo`, `app_demo_resultados`.
- **Páginas públicas** que pide Apple: `/privacy`, `/es/privacy`, `/support`, `/es/support`.
- **La app** (`movil/`, Expo SDK 57, expo-router): `app/` (pantallas), `src/` (conexión, idioma,
  borrador, subidas, tarjeta, video). La parte pura (`src/logica.ts`, `src/textos.ts`) la prueban las
  pruebas de la raíz.
- **Arranque con escenas** (`movil/plugins/escenas-ios.js`): iOS 27 cierra al abrir toda app que no las
  adopte; la plantilla de Expo 57 todavía no las trae. Se quita al pasar a Expo 58.

## Candados

C-APP-IOS-1 (la cuenta del revisor), C-APP-IOS-2 (textos, idiomas y permisos de la app) y C-APP-IOS-3
(arranque con escenas), en [CANDADOS.md](CANDADOS.md). Pruebas: `pruebas/app-iphone.test.ts` y
`pruebas/app-iphone-logica.test.ts`.

## Lo que sigue

- Cuentas de clientes con su propio saldo prepagado (hoy la app entra con la contraseña del panel).
- La versión de Android con la misma app.
