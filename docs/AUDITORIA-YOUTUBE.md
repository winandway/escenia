# Auditoría de la API de YouTube — se pide desde la Fase 1

**Por qué ahora:** todo video subido por la API desde un proyecto de Google
Cloud sin auditar queda **en privado** (regla de YouTube para proyectos creados
después del 28 de julio de 2020). La auditoría tarda semanas, así que se pide
antes de que exista la Fase 3.

Fuente: https://developers.google.com/youtube/v3/docs/videos/insert  
Formulario: https://support.google.com/youtube/contact/yt_api_form

## Qué hace Richard (10 minutos)

1. Crear un proyecto en Google Cloud llamado `Escenia` y activar «YouTube Data API v3».
2. En «Pantalla de consentimiento OAuth»: tipo Externo, nombre «Escenia», correo de soporte, dominio `escenia.sitios.dev`.
3. Llenar el formulario de auditoría con el texto de abajo.

## Texto para el formulario (copiar tal cual)

```
Nombre de la aplicación: Escenia
Empresa: Windoce LLC (Novi, Michigan, EE. UU.)
Sitio: https://escenia.sitios.dev

Qué hace: Escenia es una herramienta interna de Windoce LLC para producir y
publicar videos en nuestros propios canales de YouTube. Un editor humano
escribe el tema, revisa y aprueba cada guion, agrega su opinión y revisa el
video terminado antes de subirlo. La aplicación NO es pública, NO tiene
usuarios externos y NO sube contenido en nombre de terceros.

Uso de la API: videos.insert (subir el video ya aprobado, con título,
descripción y etiquetas), thumbnails.set (miniatura), videos.update (marcar
contenido alterado o sintético cuando aplique). Un solo usuario, ~1 a 3
subidas por día.

Cumplimiento: cada video pasa por aprobación humana; se declara el contenido
sintético cuando corresponde; no se usa contenido de terceros sin licencia.
```

## Después de enviarlo

Google responde por correo. Mientras llega, la Fase 3 sube en **privado** y
Richard publica con un clic desde YouTube Studio (que además es la revisión
final humana que queremos).
