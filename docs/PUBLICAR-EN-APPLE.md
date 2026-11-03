# Publicar la app de Escenia en Apple (receta de este proyecto)

> Escrita el 31 de octubre de 2026, cuando se publicó la primera versión. Sirve para que otra sesión, sin
> memoria, la vuelva a hacer sola. La app en sí: [APP-IPHONE.md](APP-IPHONE.md). La receta madre (Divoox)
> está en el proyecto Tumbite; aquí va lo propio de Escenia y lo que cambió.

## Datos fijos

| Qué                                  | Valor                                                                             |
| ------------------------------------ | --------------------------------------------------------------------------------- |
| App en App Store Connect             | «Escenia: AI Video Ads», número `6829275493`                                      |
| Identificador (Bundle ID)            | `com.windoce.escenia` (portal: `6DGG7K5SLY`)                                      |
| Proyecto de Expo                     | `@windoce-llc/escenia` (`63919fcd-54ff-48bd-800c-9d9110b71cd8`)                   |
| Equipo de Apple                      | Windoce LLC, `7KM9P6R682`                                                         |
| Llave de la API de App Store Connect | `~/.config/motor-escenia/apple-asc/` (copiada de la de la cuenta)                 |
| Llave de avisos (APNs)               | `~/.config/motor-escenia/apple-apns/` (la usa la Mac para avisar al iPhone)       |
| Token de Expo                        | `~/.config/motor-escenia/expo-token`                                              |
| Contraseña del revisor de Apple      | `~/.config/motor-escenia/revisor-apple` (solo letras y números)                   |
| Certificado y perfil de firma        | Los que guarda Expo para esta app (certificado `88666LUM6K`, perfil `RUNFCKKDKW`) |

Nada de esto entra al repositorio.

## Los guiones (`scripts/tiendas/`, desde la raíz)

| Guion                       | Qué hace                                                                            |
| --------------------------- | ----------------------------------------------------------------------------------- |
| `asc.mjs`                   | La conexión con la API de App Store Connect (la usan todos).                        |
| `compilar-ios-mac.mjs`      | Compila en la Mac y envía, sin gastar compilaciones de Expo (el camino de hoy).     |
| `compilar-ios.mjs`          | Compila en la nube de Expo y envía. **Gasta compilaciones de Expo** (ver abajo).    |
| `estado-ios.mjs`            | La verdad de Apple: cada subida (`COMPLETE`/`FAILED`) y cada compilación (`VALID`). |
| `fichas-app-store.mjs`      | Ficha en inglés y español, categoría, edad, revisor, derechos de contenido.         |
| `precio-disponibilidad.mjs` | Gratis y en todos los países.                                                       |
| `capturas-app-store.mjs`    | Sube `docs/capturas/app-iphone/<en                                                  | es>/*.png` (1320×2868). |
| `testflight.mjs`            | Grupo interno con Richard y grupo «Prueba pública» con enlace abierto.              |
| `enviar-revision-ios.mjs`   | Adjunta la compilación a la versión y la manda a revisión.                          |
| `clave-revisor.ts`          | Crea (o cambia con `--nueva`) la contraseña del revisor y carga su huella.          |

## Cómo se compila HOY: en la Mac, con un comando

La cuenta gratuita de Expo de Windoce se quedó sin compilaciones del mes (las usaron las apps de Divoox),
así que se compila en la Mac, gratis:

```bash
cd /Users/windocellc/Motor-Escenia && node scripts/tiendas/compilar-ios-mac.mjs
```

El guion baja de Expo el certificado de esta app (el mismo que usa la nube), crea por la API su propio
perfil de la App Store con avisos («Escenia App Store (avisos)», el de Expo no los trae),
los pone en un llavero aparte con su propia contraseña (así la firma no abre ninguna ventana pidiendo la
contraseña de la Mac), regenera el proyecto nativo con el complemento de escenas, pone el número de
compilación siguiente al último de Apple, compila, exporta el IPA y lo envía con `eas submit` (enviar NO
gasta compilaciones). Al final deja la lista de llaveros como estaba y borra el llavero aparte. Después:
`node scripts/tiendas/estado-ios.mjs` hasta ver la compilación `VALID`.

Cuando Expo tenga compilaciones otra vez (el mes nuevo o un plan pago), `compilar-ios.mjs` lo hace en la nube.

## Trampas que ya costaron horas aquí

1. **iOS 27 cierra la app al abrir** si no adopta escenas: el complemento `movil/plugins/escenas-ios.js`
   (C-APP-IOS-3). La compilación 1 tenía ese fallo y quedó retirada.
2. **El certificado del llavero de la Mac es de otro proyecto** («Apple Distribution: Windoce LLC»): la
   compilación local de Expo lo agarra por el nombre y falla al firmar, y usarlo abre una ventana de macOS
   que pide la contraseña de la Mac (la firma se queda esperando). Por eso el guion usa el certificado de
   Expo en un llavero aparte. No se borra ningún certificado: los usan otras apps de la cuenta. (Quedó un
   perfil «Escenia App Store (Mac)» de ese intento; no se usa.)
3. **Firma automática de Xcode con la llave**: pide un perfil de desarrollo y el equipo no tiene iPhones
   registrados; y la subida directa de Xcode se queda colgada en «Auth wants us to retry». No se usa.
4. **El teclado del simulador está en español**: el guion de una contraseña se volvía apóstrofo. Por eso la
   del revisor es solo letras y números.
5. Las de la receta madre siguen valiendo: textos de permiso sin `false` (error 90683), la llave en
   `eas.json` solo durante el envío, y la verdad está en `buildUploads`, no en lo que dice Expo.

## Dónde va hoy (31 oct 2026)

- Compilación 3 (con escenas) `VALID`; la 1 retirada. Ficha, precio, disponibilidad, nueve capturas y
  «Privacidad de la app» publicadas. Versión 1.0 enviada el 31 oct 2026 y **RECHAZADA el 3 nov 2026 por las pautas 4.3 (spam) y 4.2.6**, el mismo minuto que casi todas las apps de la cuenta. No reenviar: ver planes/tiendas/TUTORIAL-RECHAZO-APPLE.md (carpeta privada, fuera de git).
- Privacidad publicada (desde el Chrome de Richard): «Fotos o vídeos» y «Otro contenido del usuario»,
  ambos para funcionalidad de la app, vinculados a la cuenta y sin seguimiento.
- Compilación 6 (1 nov 2026: la 5 más el correo de soporte nuevo en la pantalla de entrar) `VALID`, en el
  grupo interno y en la «Prueba pública», con su revisión de prueba **APPROVED**. La de la 3 también quedó
  aprobada, así que el enlace público ya abre para cualquier iPhone.
- Compilación 7 (1 nov 2026: la 6 más la Ayuda, con «Contactar a soporte» en la pantalla de entrar, «Ayuda» en el
  menú de tres puntos y el chat de cada caso; docs/AYUDA.md) `VALID`, en los dos grupos, con su revisión de prueba
  **APPROVED** el mismo día.
- Compilación 8 (1 nov 2026: la 7 más «Adjuntar capturas» en el chat de cada caso de ayuda, C-AYUDA-2) `VALID`, en
  los dos grupos, con su revisión de prueba **APPROVED** el mismo día. Es la que trae hoy el enlace público.
- TestFlight interno: go@windoce.com invitado. Enlace público: https://testflight.apple.com/join/zW3q14aJ
- Correo de soporte (C-SOPORTE-1): soporte+escenia@windoce.com en la descripción, las notas del revisor y los
  comentarios de TestFlight, cambiado por la API el 1 nov 2026 con la versión en revisión (Apple lo dejó).

## Lo que hace Richard (no hay API)

- **Privacidad de la app** en App Store Connect: se llena desde su Chrome (la sesión ya abierta). Lo que la
  app usa de verdad: contenido del usuario (fotos, videos, mensajes) para la funcionalidad de la app,
  vinculado a la cuenta, sin seguimiento; nada de ubicación, contactos ni identificadores de publicidad.
- Instalar **TestFlight** en su iPhone y abrir el enlace público (o la invitación interna si su iPhone usa
  el Apple ID go@windoce.com).
