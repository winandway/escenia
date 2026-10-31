# Publicar la app de Escenia en Apple (receta de este proyecto)

> Escrita el 31 de octubre de 2026, cuando se publicó la primera versión. Sirve para que otra sesión, sin
> memoria, la vuelva a hacer sola. La app en sí: [APP-IPHONE.md](APP-IPHONE.md). La receta madre (Divoox)
> está en el proyecto Tumbite; aquí va lo propio de Escenia y lo que cambió.

## Datos fijos

| Qué                                  | Valor                                                                                   |
| ------------------------------------ | --------------------------------------------------------------------------------------- |
| App en App Store Connect             | «Escenia: AI Video Ads», número `6829275493`                                            |
| Identificador (Bundle ID)            | `com.windoce.escenia` (portal: `6DGG7K5SLY`)                                            |
| Proyecto de Expo                     | `@windoce-llc/escenia` (`63919fcd-54ff-48bd-800c-9d9110b71cd8`)                         |
| Equipo de Apple                      | Windoce LLC, `7KM9P6R682`                                                               |
| Llave de la API de App Store Connect | `~/.config/motor-escenia/apple-asc/` (copiada de la de la cuenta)                       |
| Llave de avisos (APNs)               | `~/.config/motor-escenia/apple-apns/` (todavía no se usa)                               |
| Token de Expo                        | `~/.config/motor-escenia/expo-token`                                                    |
| Contraseña del revisor de Apple      | `~/.config/motor-escenia/revisor-apple` (solo letras y números)                         |
| Perfil de firma de la Mac            | «Escenia App Store (Mac)», con el certificado de distribución que ya está en el llavero |

Nada de esto entra al repositorio.

## Los guiones (`scripts/tiendas/`, desde la raíz)

| Guion                       | Qué hace                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------- |
| `asc.mjs`                   | La conexión con la API de App Store Connect (la usan todos).                        |
| `compilar-ios.mjs`          | Compila en la nube de Expo y envía. **Gasta compilaciones de Expo** (ver abajo).    |
| `estado-ios.mjs`            | La verdad de Apple: cada subida (`COMPLETE`/`FAILED`) y cada compilación (`VALID`). |
| `fichas-app-store.mjs`      | Ficha en inglés y español, categoría, edad, revisor, derechos de contenido.         |
| `precio-disponibilidad.mjs` | Gratis y en todos los países.                                                       |
| `capturas-app-store.mjs`    | Sube `docs/capturas/app-iphone/<en                                                  | es>/*.png` (1320×2868). |
| `testflight.mjs`            | Grupo interno con Richard y grupo «Prueba pública» con enlace abierto.              |
| `enviar-revision-ios.mjs`   | Adjunta la compilación a la versión y la manda a revisión.                          |
| `clave-revisor.ts`          | Crea (o cambia con `--nueva`) la contraseña del revisor y carga su huella.          |

## Cómo se compila HOY: en la Mac, firmado a mano

La cuenta gratuita de Expo de Windoce se quedó sin compilaciones del mes (las usaron las apps de Divoox),
y las dos salidas automáticas de Xcode se trabaron. Lo que funcionó:

1. `cd movil && npx expo prebuild --platform ios --clean` (aplica el complemento de escenas).
2. Subir el número de compilación en `movil/ios/Escenia/Info.plist` (`CFBundleVersion`): uno más que el
   último que muestre `estado-ios.mjs`.
3. Compilar firmado a mano con el perfil de la Mac:
   `xcodebuild -workspace movil/ios/Escenia.xcworkspace -scheme Escenia -configuration Release
-destination generic/platform=iOS -archivePath <carpeta>/Escenia.xcarchive archive
DEVELOPMENT_TEAM=7KM9P6R682 CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY="Apple Distribution"
PROVISIONING_PROFILE_SPECIFIER="Escenia App Store (Mac)"`
4. Exportar el IPA con `xcodebuild -exportArchive` y un ExportOptions con `method` app-store-connect,
   `destination` export, `signingStyle` manual y el perfil de arriba.
5. Enviarlo con Expo (enviar NO gasta compilaciones): la llave en `movil/eas.json` solo durante el envío
   (como hace `compilar-ios.mjs`) y `npx eas-cli submit --platform ios --path <IPA> --non-interactive`.
6. `node scripts/tiendas/estado-ios.mjs` hasta ver la compilación `VALID`.

Cuando Expo tenga compilaciones otra vez (el mes nuevo o un plan pago), `compilar-ios.mjs` hace todo de una.

## Trampas que ya costaron horas aquí

1. **iOS 27 cierra la app al abrir** si no adopta escenas: el complemento `movil/plugins/escenas-ios.js`
   (C-APP-IOS-3). La compilación 1 tenía ese fallo y quedó retirada.
2. **Dos certificados con el mismo nombre** («Apple Distribution: Windoce LLC»): el del llavero de la Mac
   (de otro proyecto) y el que guarda Expo. Por eso la compilación local de Expo falla al firmar y se usa
   el perfil propio de la Mac. No se borra ninguno: los usan otras apps de la cuenta.
3. **Firma automática de Xcode con la llave**: pide un perfil de desarrollo y el equipo no tiene iPhones
   registrados; y la subida directa de Xcode se queda colgada en «Auth wants us to retry». No se usa.
4. **El teclado del simulador está en español**: el guion de una contraseña se volvía apóstrofo. Por eso la
   del revisor es solo letras y números.
5. Las de la receta madre siguen valiendo: textos de permiso sin `false` (error 90683), la llave en
   `eas.json` solo durante el envío, y la verdad está en `buildUploads`, no en lo que dice Expo.

## Lo que hace Richard (no hay API)

- **Privacidad de la app** en App Store Connect: se llena desde su Chrome (la sesión ya abierta). Lo que la
  app usa de verdad: contenido del usuario (fotos, videos, mensajes) para la funcionalidad de la app,
  vinculado a la cuenta, sin seguimiento; nada de ubicación, contactos ni identificadores de publicidad.
- Instalar **TestFlight** en su iPhone y abrir el enlace público (o la invitación interna si su iPhone usa
  el Apple ID go@windoce.com).
