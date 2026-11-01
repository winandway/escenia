# Casos de ayuda y la puerta del gerente de correo

> Pedido del gerente de correo de Richard (1 nov 2026), por orden de Richard: un plan de soporte en todas las
> apps, con una puerta para que el gerente conteste los casos. Mismo contrato que Divoox.
> Candados: C-AYUDA-1 y C-GERENTE-1 (docs/CANDADOS.md).

## Qué ve la persona

- **En la web:** la página de soporte (inglés y español) trae el formulario «Abre un caso de soporte» (nombre,
  correo, asunto y mensaje). Al mandar, recibe su número (ESC-1001, ESC-1002…) y se abre su conversación en la
  página del caso, con su enlace secreto. El navegador recuerda sus casos y los lista en «Tus casos».
- **En la app de iPhone:** «Contactar a soporte» abajo en la pantalla de entrar (sin cuenta) y «Ayuda» en el menú
  de tres puntos de «Tus proyectos». Mismo formulario, mismo chat. Al abrir el caso, la app pide permiso de avisos;
  con permiso, cada respuesta de soporte llega como aviso al iPhone y al tocarlo se abre el chat.
- **Docs:** la guía pública «Pide ayuda: tus casos de soporte» (`/docs/help/support-cases` y `/es/docs/...`), con
  capturas reales en `docs/capturas/ayuda-*.png` (copia servida en `public/capturas/`).
- Todos los formularios guardan lo escrito mientras se escribe y lo devuelven al volver (regla global).

## Cómo está hecho

| Pieza                            | Dónde                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Tablas                           | `ayuda_casos`, `ayuda_mensajes`, `limites` en `schema.sql`                                                    |
| Lógica                           | `src/lib/ayuda.ts`                                                                                            |
| Rutas de la persona (sin cuenta) | `POST/GET /datos/ayuda/casos`, `GET /datos/ayuda/casos/<codigo>`, `POST /datos/ayuda/casos/<codigo>/mensajes` |
| Puerta del gerente               | `GET /datos/gerente/tickets`, `POST /datos/gerente/tickets/<id>/responder`                                    |
| Avisos al iPhone                 | `GET/POST /datos/estacion/ayuda` + `vigilarAvisosDeAyuda()` en `estacion/src/avisos.ts` (cada 15 s)           |
| Web                              | `src/app/legal/FormularioAyuda.tsx`, `ChatDelCaso.tsx`, `MisCasosWeb.tsx`, páginas `support/case/[codigo]`    |
| App                              | `movil/app/ayuda/index.tsx`, `movil/app/ayuda/[codigo].tsx`, `movil/src/casos.ts`                             |
| Docs                             | `src/app/docs/` (guías en `guias.ts`) y `src/app/es/docs/`; mapa del sitio en `src/app/sitemap.ts`            |
| Canario                          | piezas `ayuda` (avisos atascados más de 10 min con la Mac encendida) y `correo` en `/datos/salud`             |

Límites: abrir casos 5 por hora por conexión; escribir 20 cada 10 minutos; leer 60 por minuto; la puerta del
gerente 30 por minuto (cuentan también los intentos con el secreto malo). El formulario web lleva un campo trampa
para robots.

## El contrato con el gerente

1. `GET https://escenia.sitios.dev/datos/gerente/tickets?estado=abiertos` (o `estado=todos`) →
   `{tickets:[{id, numero, app:"escenia", cliente_nombre, idioma, asunto, estado, creado, mensajes:[{de, fecha, texto}]}]}`.
   «Abiertos» son los que esperan respuesta: los nuevos y los que la persona volvió a escribir. Sin correo.
2. `POST https://escenia.sitios.dev/datos/gerente/tickets/<id>/responder` con `{texto, plantilla?: "P1".."P9", cerrar?: boolean}` →
   `{ok, numero, plantilla, aviso, correo, correo_motivo?}`.
3. «Authorization: Bearer <secreto>», comparación de huellas en tiempo constante, 401 si falta o está mal.

**Diferencias con Divoox (dichas al gerente):**

- **El secreto:** vive en `~/.config/gerente-correo/soporte-escenia` (carpeta 700, archivo 600). En el sitio no va
  como variable del panel sino su **huella SHA-256 en la base** (ajuste `gerente_huella`), cargada desde la Mac con
  el token de la base. Así no hizo falta entrar al panel. Si algún día se pone `GERENTE_SECRETO` en las variables
  del sitio, esa manda sobre la huella.
- **El aviso:** la llave de avisos de Apple nunca sube a la nube, así que el aviso lo manda la Mac. `aviso:"ok"` =
  quedó en cola con la Mac encendida (sale en menos de 15 segundos); `"error"` = la Mac está apagada (sale cuando
  vuelva); `"sin_app"` = el caso no tiene iPhone con permiso de avisos.
- **El correo:** la plataforma solo deja mandar desde un dominio **conectado al sitio**, y Escenia todavía no tiene
  ninguno (solo escenia.sitios.dev). Mientras tanto `correo:"error"` con `correo_motivo` = «Escenia todavía no tiene
  un dominio conectado para mandar correos», y el canario muestra el correo apagado (no en rojo). La persona ve la
  respuesta en su chat y en la app. Si el gerente quiere que también le llegue por correo, que la mande él desde
  el buzón de soporte.

## Para encender el correo (cuando haya dominio)

1. Conectar un dominio al sitio `escenia` en YaDominios Cloud (lo hace YaDominios en un paso cuando Richard lo
   pide) y activar «Correos desde tu dominio» en ese dominio.
2. Desde la Mac, cargar en la base el dominio y el token del sitio (el mismo `YAPANEL_DB_TOKEN` de `estacion/.env`):
   ajustes `correo_dominio` (por ejemplo `escenia.windoce.com`) y `correo_token`. El remitente queda
   `support@<dominio>` con respuesta a `soporte+escenia@windoce.com`.
3. Comprobar con un envío a una dirección que no existe: debe volver `rebote_permanente` y no `from_ajeno`.

## Cómo se comprueba que sigue funcionando

- `npx vitest run pruebas/ayuda.test.ts` (comprobado en rojo el 1 nov 2026: secreto, sin correo, cola de avisos,
  rutas públicas).
- En vivo: `GET /datos/gerente/tickets` sin secreto → 401; con el secreto del archivo → 200 con `tickets`.
- `/datos/salud` → piezas `ayuda: ok` y `correo: apagado` (o `ok` cuando haya dominio).
