-- Esquema de Motor Escenia. YaDominios Cloud lo corre en CADA publicación:
-- todo es idempotente (IF NOT EXISTS / INSERT OR IGNORE). Nunca DROP aquí.

CREATE TABLE IF NOT EXISTS productos (
  id TEXT PRIMARY KEY,               -- slug: qrbott, tintora…
  nombre TEXT NOT NULL,
  url TEXT NOT NULL,
  descripcion_corta TEXT NOT NULL,
  activo INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS temas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tematica_id TEXT NOT NULL,
  titulo TEXT NOT NULL,
  contexto TEXT NOT NULL DEFAULT '',  -- texto de la fuente pegado a mano (dato, no opinión)
  fuente TEXT NOT NULL DEFAULT 'manual',
  url_fuente TEXT NOT NULL DEFAULT '',
  puntaje REAL NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'nuevo' CHECK (estado IN ('nuevo','elegido','descartado')),
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS guiones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tema_id INTEGER NOT NULL REFERENCES temas(id),
  tematica_id TEXT NOT NULL,
  producto_id TEXT REFERENCES productos(id),
  version INTEGER NOT NULL DEFAULT 1,
  titulo TEXT NOT NULL,
  contenido TEXT NOT NULL,           -- JSON validado por compartido/guion.ts
  estructura TEXT NOT NULL DEFAULT '',
  opinion_richard TEXT NOT NULL DEFAULT '',
  notas_richard TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'borrador' CHECK (estado IN ('borrador','aprobado','rechazado')),
  modelo TEXT NOT NULL DEFAULT '',
  costo_usd REAL NOT NULL DEFAULT 0,
  aviso_parecido TEXT NOT NULL DEFAULT '',
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS guiones_estado ON guiones(estado, creado_en);

-- Cola de trabajo que toma la Estación (la Mac).
CREATE TABLE IF NOT EXISTS trabajos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guion_id INTEGER NOT NULL REFERENCES guiones(id),
  tipo TEXT NOT NULL DEFAULT 'producir',
  estado TEXT NOT NULL DEFAULT 'pendiente' CHECK (estado IN ('pendiente','tomado','hecho','error','cancelado')),
  paso TEXT NOT NULL DEFAULT '',
  progreso INTEGER NOT NULL DEFAULT 0,
  intentos INTEGER NOT NULL DEFAULT 0,
  error TEXT NOT NULL DEFAULT '',
  tomado_en TEXT,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS trabajos_estado ON trabajos(estado, creado_en);

CREATE TABLE IF NOT EXISTS archivos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guion_id INTEGER NOT NULL REFERENCES guiones(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('voz','subtitulos','miniatura','imagen','clip','screen')),
  clave TEXT NOT NULL,               -- ruta dentro del almacén (BUCKET)
  meta TEXT NOT NULL DEFAULT '{}',
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Los MP4 NO suben a la nube: aquí solo queda dónde están en la Mac.
CREATE TABLE IF NOT EXISTS renders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guion_id INTEGER NOT NULL REFERENCES guiones(id),
  formato TEXT NOT NULL CHECK (formato IN ('16x9','9x16')),
  ruta_local TEXT NOT NULL,
  bytes INTEGER NOT NULL DEFAULT 0,
  duracion_seg REAL NOT NULL DEFAULT 0,
  voz_de_prueba INTEGER NOT NULL DEFAULT 0,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Cada centavo que se gasta en IA queda anotado (candado de presupuesto).
CREATE TABLE IF NOT EXISTS gastos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL DEFAULT (date('now')),
  servicio TEXT NOT NULL,
  detalle TEXT NOT NULL DEFAULT '',
  costo_usd REAL NOT NULL,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS gastos_fecha ON gastos(fecha);

CREATE TABLE IF NOT EXISTS ajustes (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sesiones (
  id TEXT PRIMARY KEY,               -- hash SHA-256 del token; el token solo vive en la cookie
  creada_en TEXT NOT NULL DEFAULT (datetime('now')),
  expira_en TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS intentos_entrada (
  ip TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS intentos_ip ON intentos_entrada(ip, creado_en);

-- Última vez que la Estación dio señales de vida (canario).
CREATE TABLE IF NOT EXISTS estacion_latido (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  visto_en TEXT NOT NULL,
  version TEXT NOT NULL DEFAULT ''
);

INSERT OR IGNORE INTO ajustes (clave, valor) VALUES
  ('presupuesto_diario_usd', '3'),
  ('modelo_guion', 'claude-sonnet-5'),
  ('instrucciones_extra', '');

INSERT OR IGNORE INTO productos (id, nombre, url, descripcion_corta) VALUES
  ('qrbott', 'QRBOTT', 'https://qrbott.com', 'Tienda online con IA (ShowBot) y punto de venta para tiendas y supermercados.'),
  ('tintora', 'Tintora POS', 'https://tintorapos.com', 'Punto de venta en la nube para tintorerías y lavanderías: QR por prenda, SMS, funciona sin internet, demo sin registro y prueba de 14 días.'),
  ('beellon', 'Beellon', 'https://beellon.com', 'Plataforma creativa con IA: chat, imágenes, flyers y video.'),
  ('blisor', 'Blisor', 'https://blisor.com', 'Generador de aplicaciones web con IA.'),
  ('yadominios', 'YaDominios', 'https://yadominios.com', 'Dominios, hosting en la nube y panel para revender (YaPanel).'),
  ('aliramoney', 'Aliramoney', 'https://aliramoney.com', 'Comprar y vender cripto con tarjeta en EE.UU., sin custodia.'),
  ('tokiia', 'Tokiia', 'https://tokiia.com', 'Billetera cripto en Polygon con intercambio P2P.'),
  ('mercatren', 'Mercatren', 'https://mercatren.com', 'Marketplace: compra en EE.UU. y recíbelo donde estés.'),
  ('losupe', 'Losupe', 'https://losupe.com', 'Revista digital bilingüe automática (ES/EN) con robot redactor propio.');

-- Videos terminados guardados en el almacén del sitio (plan Galaxia, 20 GB),
-- para verlos y descargarlos desde el panel. La Mac conserva su copia.
CREATE TABLE IF NOT EXISTS videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guion_id INTEGER NOT NULL REFERENCES guiones(id),
  formato TEXT NOT NULL CHECK (formato IN ('16x9','9x16')),
  clave TEXT NOT NULL UNIQUE,
  bytes INTEGER NOT NULL DEFAULT 0,
  duracion_seg REAL NOT NULL DEFAULT 0,
  voz_de_prueba INTEGER NOT NULL DEFAULT 0,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS videos_guion ON videos(guion_id, id);

-- Calendario de publicaciones: cuándo sale cada video en cada canal y plataforma.
-- guion_id vacío = video hecho fuera de Escenia. fecha y hora van en el reloj de
-- Richard (zona de las reglas). hora vacía = todavía falta ponerla.
CREATE TABLE IF NOT EXISTS calendario (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guion_id INTEGER REFERENCES guiones(id),
  pieza TEXT NOT NULL CHECK (pieza IN ('largo','short')),
  indice INTEGER NOT NULL DEFAULT 0,
  titulo TEXT NOT NULL,
  canal TEXT NOT NULL CHECK (canal IN ('canal-ia','caprichoso-tv')),
  plataforma TEXT NOT NULL DEFAULT 'youtube' CHECK (plataforma IN ('youtube','facebook','instagram','tiktok')),
  fecha TEXT NOT NULL DEFAULT '',
  hora TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'agendado' CHECK (estado IN ('agendado','programado','publicado','descartado')),
  nota TEXT NOT NULL DEFAULT '',
  enlace TEXT NOT NULL DEFAULT '',     -- el video ya subido; de ahí sale la miniatura
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS calendario_fecha ON calendario(fecha, hora);
-- Candado C-CALENDARIO-1: la base misma impide dos PLANES a la misma hora.
-- Lo ya programado en la plataforma y lo ya publicado son hechos: se anotan tal como están.
DROP INDEX IF EXISTS calendario_hueco;
DROP INDEX IF EXISTS calendario_hueco_2;
CREATE UNIQUE INDEX IF NOT EXISTS calendario_hueco_3 ON calendario(canal, plataforma, fecha, hora)
  WHERE hora != '' AND estado = 'agendado';
-- Cada pieza de un guion va una sola vez por plataforma (moverla la cambia, no la duplica).
CREATE UNIQUE INDEX IF NOT EXISTS calendario_pieza ON calendario(guion_id, pieza, indice, plataforma)
  WHERE guion_id IS NOT NULL;

-- Biblioteca de sonidos de Richard (C-SONIDOS-1): la música y los efectos que
-- sube desde el panel. El archivo vive en el almacén; la Estación los baja a la
-- Mac antes de producir. «Quitar» solo apaga `activo`: nada se borra.
CREATE TABLE IF NOT EXISTS sonidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL CHECK (tipo IN ('musica','efecto')),
  nombre TEXT NOT NULL,
  genero TEXT NOT NULL DEFAULT '',   -- música: bachata, salsa, beat…
  uso TEXT NOT NULL DEFAULT '',      -- efecto: corte, transicion, golpe, titulo, cierre
  origen TEXT NOT NULL,              -- de dónde salió (propia, con licencia, libre)
  archivo TEXT NOT NULL DEFAULT '',  -- el nombre con que la guarda la Estación
  clave TEXT NOT NULL,               -- dónde está en el almacén
  bytes INTEGER NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS sonidos_activos ON sonidos(activo, tipo, id);

-- Grabaciones (formato Presentador): un video de Richard hablando, subido desde el panel.
-- La Estación lo baja, lo transcribe y pide el plan; ahí nace su guion (ya aprobado: son
-- sus propias palabras) y su trabajo, y lo demás es la producción de siempre.
CREATE TABLE IF NOT EXISTS grabaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tema TEXT NOT NULL DEFAULT '',
  formato TEXT NOT NULL DEFAULT 'neon',  -- se valida en el código (ESTILOS_VIDEO): los formatos crecen y un CHECK no se puede cambiar
  canal TEXT NOT NULL DEFAULT 'canal-ia' CHECK (canal IN ('canal-ia','caprichoso-tv')),
  archivo TEXT NOT NULL DEFAULT '',     -- el nombre que tenía en la computadora de Richard
  clave TEXT NOT NULL,                  -- dónde está en el almacén (BUCKET)
  bytes INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'subiendo' CHECK (estado IN ('subiendo','subida','tomada','planeada','error','quitada')),
  paso TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  guion_id INTEGER REFERENCES guiones(id),
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
-- (En vivo el índice viejo `grabaciones_estado` quedó en `grabaciones_v1`: ver scripts/migrar-grabaciones-formato.ts.)
CREATE INDEX IF NOT EXISTS grabaciones_por_estado ON grabaciones(estado, id);

-- Biblioteca de imágenes (C-IMAGENES-1): logos, capturas y PDF que manda un cliente, por carpetas.
CREATE TABLE IF NOT EXISTS imagenes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  carpeta TEXT NOT NULL,                -- la carpeta que eligió Richard (el cliente o el trabajo)
  nombre TEXT NOT NULL,                 -- el nombre del archivo tal como lo subió
  clave TEXT NOT NULL,                  -- dónde está en el almacén (BUCKET)
  tipo TEXT NOT NULL DEFAULT 'imagen',  -- imagen | pdf (se valida en el código)
  bytes INTEGER NOT NULL DEFAULT 0,
  activo INTEGER NOT NULL DEFAULT 1,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS imagenes_carpeta ON imagenes(carpeta, activo, id);

-- Comerciales (C-COMERCIAL-1): un video publicitario con el material de un cliente. La Estación
-- lo atiende como una grabación: pide el plan, nace su guion (aprobado) y su trabajo.
CREATE TABLE IF NOT EXISTS comerciales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  narracion TEXT NOT NULL,              -- el texto que lee la voz, tal cual
  idioma TEXT NOT NULL DEFAULT 'es',
  voz TEXT NOT NULL DEFAULT 'femenina',
  instrucciones TEXT NOT NULL DEFAULT '',
  carpetas TEXT NOT NULL DEFAULT '[]',  -- JSON: las carpetas de imágenes que se usan
  formato TEXT NOT NULL DEFAULT 'mixto',
  estado TEXT NOT NULL DEFAULT 'subida' CHECK (estado IN ('subida','tomada','planeada','error','quitada')),
  paso TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  guion_id INTEGER REFERENCES guiones(id),
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now')),
  -- C-COMERCIAL-3 (8 nov 2026): 1 = el plan espera a que Richard lo vea y toque «Armar el video».
  -- `imagenes`: la lista (JSON) que mandó la Mac con el plan, para poder cambiar una imagen.
  -- En la base en vivo se agregaron con ALTER TABLE una sola vez (ver C-COMERCIAL-3).
  revisar INTEGER NOT NULL DEFAULT 0,
  imagenes TEXT NOT NULL DEFAULT '[]',
  -- C-COMERCIAL-4 (8 nov 2026): la miniatura que Richard eligió en el panel (JSON: archivo, titulo,
  -- frase, estado pedida|tomada|hecha|error). Vacía = la automática. En vivo: ALTER TABLE una vez.
  portada TEXT NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS comerciales_por_estado ON comerciales(estado, id);

-- Publicidad en Short (docs/PUBLICIDAD.md): el anuncio vertical de un producto con las fotos del
-- cliente, una voz del banco y un avatar que habla. La Estación lo toma, pide el plan, lo arma y
-- sube el video (publicidades/<id>/anuncio-<t>.mp4).
CREATE TABLE IF NOT EXISTS publicidades (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  narracion TEXT NOT NULL,
  idioma TEXT NOT NULL DEFAULT 'es',
  voz TEXT NOT NULL DEFAULT 'venezolana',
  carpetas TEXT NOT NULL DEFAULT '[]',
  avatar TEXT NOT NULL DEFAULT '',
  instrucciones TEXT NOT NULL DEFAULT '',
  estado TEXT NOT NULL DEFAULT 'subida' CHECK (estado IN ('subida','tomada','lista','error','quitada')),
  paso TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  plan TEXT NOT NULL DEFAULT '',
  video TEXT NOT NULL DEFAULT '',
  duracion_seg REAL NOT NULL DEFAULT 0,
  costo_usd REAL NOT NULL DEFAULT 0,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS publicidades_por_estado ON publicidades(estado, id);

-- El Director (docs/DIRECTOR.md): la conversación con la IA que arma los anuncios. Cada encargo es
-- una conversación; lo que la IA propone queda como una tarjeta con su precio, y SOLO el botón de
-- Richard la aprueba (C-DIRECTOR-1): la IA no puede gastar ni pedir un video por su cuenta.
CREATE TABLE IF NOT EXISTS director_encargos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL DEFAULT 'Encargo nuevo',
  carpeta TEXT NOT NULL DEFAULT '',          -- la carpeta de Imágenes donde caen las fotos del chat
  estado TEXT NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto','archivado')),
  costo_usd REAL NOT NULL DEFAULT 0,         -- lo que lleva gastado la IA de la conversación
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS director_encargos_por_estado ON director_encargos(estado, actualizado_en);

CREATE TABLE IF NOT EXISTS director_propuestas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  encargo_id INTEGER NOT NULL REFERENCES director_encargos(id),
  datos TEXT NOT NULL,                       -- JSON: el pedido del anuncio, ya validado
  precio_usd REAL NOT NULL,
  estado TEXT NOT NULL DEFAULT 'propuesta' CHECK (estado IN ('propuesta','aprobada','reemplazada')),
  publicidad_id INTEGER REFERENCES publicidades(id),
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS director_propuestas_por_encargo ON director_propuestas(encargo_id, id);

CREATE TABLE IF NOT EXISTS director_mensajes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  encargo_id INTEGER NOT NULL REFERENCES director_encargos(id),
  rol TEXT NOT NULL CHECK (rol IN ('richard','director','aviso')),
  texto TEXT NOT NULL DEFAULT '',
  propuesta_id INTEGER REFERENCES director_propuestas(id),
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS director_mensajes_por_encargo ON director_mensajes(encargo_id, id);

-- Los videos que se suben en el chat del Director (por partes, como las grabaciones). La Mac los «mira»:
-- saca su duración y unas hojas con un cuadro cada pocos segundos y su hora, para que la IA vea qué pasa
-- y cuándo (C-DIRECTOR-3).
CREATE TABLE IF NOT EXISTS director_videos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  encargo_id INTEGER NOT NULL REFERENCES director_encargos(id),
  nombre TEXT NOT NULL,
  clave TEXT NOT NULL,
  bytes INTEGER NOT NULL DEFAULT 0,
  estado TEXT NOT NULL DEFAULT 'subiendo' CHECK (estado IN ('subiendo','subido','mirando','listo','error')),
  duracion_seg REAL NOT NULL DEFAULT 0,
  con_sonido INTEGER NOT NULL DEFAULT 0,
  vertical INTEGER NOT NULL DEFAULT 1,
  hojas INTEGER NOT NULL DEFAULT 0,          -- cuántas hojas de cuadros hay (director/videos/<id>/hoja-N.jpg)
  segundos_por_cuadro REAL NOT NULL DEFAULT 0,
  error TEXT NOT NULL DEFAULT '',
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS director_videos_por_estado ON director_videos(estado, id);
CREATE INDEX IF NOT EXISTS director_videos_por_encargo ON director_videos(encargo_id, id);

-- Lo que la Mac arma de una propuesta aprobada que no es un anuncio de fotos: la prueba en vivo y la
-- locución. Una sola fila por propuesta (UNIQUE): un doble clic no pide dos videos (C-DIRECTOR-1).
CREATE TABLE IF NOT EXISTS director_trabajos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  propuesta_id INTEGER NOT NULL UNIQUE REFERENCES director_propuestas(id),
  encargo_id INTEGER NOT NULL REFERENCES director_encargos(id),
  tipo TEXT NOT NULL CHECK (tipo IN ('demostracion','locucion')),
  datos TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'subida' CHECK (estado IN ('subida','tomada','lista','error')),
  paso TEXT NOT NULL DEFAULT '',
  error TEXT NOT NULL DEFAULT '',
  video TEXT NOT NULL DEFAULT '',            -- director/trabajos/<id>/video-<t>.mp4
  duracion_seg REAL NOT NULL DEFAULT 0,
  costo_usd REAL NOT NULL DEFAULT 0,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS director_trabajos_por_estado ON director_trabajos(estado, id);

-- La app de iPhone (docs/APP-IPHONE.md, C-APP-IOS-1). Entra con la contraseña del panel y recibe un
-- token propio (viaja en «Authorization: Bearer», no en cookie); aquí solo queda su huella. «demo» es la
-- cuenta del revisor de Apple: solo ve sus propios encargos y aprobar no gasta (muestra un ejemplo).
CREATE TABLE IF NOT EXISTS app_sesiones (
  id TEXT PRIMARY KEY,                       -- huella SHA-256 del token
  tipo TEXT NOT NULL CHECK (tipo IN ('richard','demo')),
  creada_en TEXT NOT NULL DEFAULT (datetime('now')),
  expira_en TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS app_encargos_demo (
  encargo_id INTEGER PRIMARY KEY REFERENCES director_encargos(id),
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS app_demo_resultados (
  propuesta_id INTEGER PRIMARY KEY REFERENCES director_propuestas(id),
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Los iPhone que reciben avisos (docs/APP-IPHONE.md, C-APP-IOS-4): la dirección de avisos de Apple de
-- cada teléfono con la app abierta en la cuenta de Richard, y su idioma. La Mac los avisa al entregar.
CREATE TABLE IF NOT EXISTS app_avisos (
  token TEXT PRIMARY KEY,
  cuenta TEXT NOT NULL CHECK (cuenta IN ('richard','demo')),
  idioma TEXT NOT NULL DEFAULT 'en' CHECK (idioma IN ('en','es')),
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Los casos de ayuda (docs/AYUDA.md, C-AYUDA-1): la persona escribe desde la página de soporte o desde la
-- app, sin cuenta, y sigue su caso como un chat con su enlace secreto (`codigo`, no se adivina ni se
-- indexa). El gerente de correo de Richard los lee y los contesta por /datos/gerente/* (C-GERENTE-1).
-- `aviso_token`: la dirección de avisos del iPhone que abrió el caso; la Mac le avisa cada respuesta.
CREATE TABLE IF NOT EXISTS ayuda_casos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  codigo TEXT NOT NULL UNIQUE,
  origen TEXT NOT NULL CHECK (origen IN ('web','app')),
  nombre TEXT NOT NULL,
  correo TEXT NOT NULL,
  idioma TEXT NOT NULL DEFAULT 'en' CHECK (idioma IN ('en','es')),
  asunto TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'abierto' CHECK (estado IN ('abierto','respondido','cerrado')),
  aviso_token TEXT NOT NULL DEFAULT '',
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ayuda_casos_por_estado ON ayuda_casos(estado, actualizado_en);
-- Cada mensaje del chat. Las respuestas de soporte con iPhone quedan con aviso 'pendiente' hasta que la Mac
-- lo manda ('enviado') o Apple lo rechaza ('fallo').
CREATE TABLE IF NOT EXISTS ayuda_mensajes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caso_id INTEGER NOT NULL REFERENCES ayuda_casos(id),
  de TEXT NOT NULL CHECK (de IN ('cliente','soporte')),
  texto TEXT NOT NULL,
  plantilla TEXT NOT NULL DEFAULT '',
  aviso TEXT NOT NULL DEFAULT '' CHECK (aviso IN ('','pendiente','enviado','fallo')),
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ayuda_mensajes_por_caso ON ayuda_mensajes(caso_id, id);
CREATE INDEX IF NOT EXISTS ayuda_mensajes_por_aviso ON ayuda_mensajes(aviso);
-- Límite de pedidos por llave y ventana (abrir casos, escribir, la puerta del gerente).
CREATE TABLE IF NOT EXISTS limites (
  llave TEXT NOT NULL,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS limites_por_llave ON limites(llave, creado_en);
-- Las capturas que la persona adjunta a un mensaje de su caso (C-AYUDA-2): hasta 3 por mensaje, 10 MB cada una,
-- en env.BUCKET bajo ayuda/<caso>/. Se suben primero (mensaje_id vacío) y se pegan al mensaje al mandarlo, así
-- una subida que falla no se lleva el texto. Se ven con un enlace firmado que vale 30 días.
CREATE TABLE IF NOT EXISTS ayuda_adjuntos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caso_id INTEGER NOT NULL REFERENCES ayuda_casos(id),
  mensaje_id INTEGER REFERENCES ayuda_mensajes(id),
  clave TEXT NOT NULL,
  nombre TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('image/jpeg','image/png','image/webp','image/heic')),
  bytes INTEGER NOT NULL,
  creado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS ayuda_adjuntos_por_mensaje ON ayuda_adjuntos(mensaje_id);
CREATE INDEX IF NOT EXISTS ayuda_adjuntos_por_caso ON ayuda_adjuntos(caso_id, mensaje_id);
-- Podcast IA (docs/PODCAST.md, C-PODCAST-1): la ficha de cada invitado (la historia que cedió su protagonista
-- por escrito) y cada conversación del estudio. El invitado solo sabe lo que dice su ficha. Las fichas no se
-- borran: se archivan. `segundos` queda vacío mientras la conversación está abierta; abierta cuenta como 10
-- minutos para el tope del día (ajuste podcast_minutos_dia).
-- Desde el 7 nov 2026: `avatar` es quién sale en el estudio (compartido/podcast-avatares.ts), `origen` dice si la
-- historia es de ficción (la escribimos nosotros; no pide permiso) o real (con el permiso por escrito de su
-- protagonista) y `tipo` es el formato: «historia» o «entrevista_ia» (el invitado es la propia IA; sin historia). Se validan en el código, no con un CHECK (el catálogo va a crecer). En una base que ya existía
-- estas columnas NO se agregan aquí (este archivo corre en cada publicación y un ALTER TABLE fallaría la segunda
-- vez): las agrega el panel la primera vez que las necesita (asegurarColumnasDeLaFicha en src/lib/podcast.ts) o
-- scripts/migrar-podcast-fichas.ts.
CREATE TABLE IF NOT EXISTS podcast_fichas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  etiqueta TEXT NOT NULL DEFAULT 'Invitado especial',
  tema TEXT NOT NULL DEFAULT '',
  personalidad TEXT NOT NULL DEFAULT '',
  voz TEXT NOT NULL DEFAULT 'neutra' CHECK (voz IN ('neutra','femenina','venezolana','paisa')),
  avatar TEXT NOT NULL DEFAULT 'robot',
  origen TEXT NOT NULL DEFAULT 'ficcion',
  tipo TEXT NOT NULL DEFAULT 'historia',
  historia TEXT NOT NULL DEFAULT '',
  primer_mensaje TEXT NOT NULL DEFAULT '',
  ejemplo INTEGER NOT NULL DEFAULT 0,
  permiso INTEGER NOT NULL DEFAULT 0,
  archivada INTEGER NOT NULL DEFAULT 0,
  creado_en TEXT NOT NULL DEFAULT (datetime('now')),
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS podcast_conversaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  ficha_id INTEGER NOT NULL REFERENCES podcast_fichas(id),
  fecha TEXT NOT NULL DEFAULT (date('now')),
  inicio TEXT NOT NULL DEFAULT (datetime('now')),
  fin TEXT,
  segundos INTEGER
);
INSERT OR IGNORE INTO ajustes (clave, valor) VALUES ('podcast_minutos_dia', '60');
-- La historia de EJEMPLO del piloto (ficticia, sin personas reales) mientras llega una real. Entra una sola
-- vez: si ya existe una ficha de ejemplo (aunque esté archivada), no se vuelve a crear. Va con la voz paisa. Este
-- INSERT solo nombra columnas que existían antes del 7 nov 2026: así schema.sql no se cae en una base vieja que
-- todavía no tiene avatar, origen ni tipo (un INSERT con una columna que no existe falla aunque no inserte nada).
-- En la base en vivo la de ejemplo tiene la robot de coleta (UPDATE de esa fila, 7 nov 2026).
INSERT INTO podcast_fichas (nombre, etiqueta, tema, personalidad, voz, historia, primer_mensaje, ejemplo, permiso)
SELECT
  'Alma (ejemplo)',
  'Invitada especial',
  'Del pan a escondidas a su propia panadería',
  'Tímida, cálida y sincera. Habla despacio, se ríe bajito cuando se pone nerviosa y le cuesta hablar de sí misma, pero se emociona cuando habla del pan.',
  'paisa',
  'HISTORIA DE EJEMPLO, FICTICIA: no es de una persona real y no se publica.' || char(10) ||
  'Soy Alma. Crecí en un pueblo pequeño, en una casa con un horno de leña que era de mi abuela. A los once años ya amasaba con ella los domingos.' || char(10) ||
  'A los diecinueve me fui a la ciudad a estudiar contabilidad. El dinero no alcanzaba, así que empecé a hornear pan en la madrugada, de tres a seis, en la cocina del cuarto que alquilaba, y lo vendía a los vecinos antes de ir a clase.' || char(10) ||
  'Me daba mucha vergüenza ofrecerlo. Durante meses dejé las bolsas colgadas en las puertas con una nota y el precio, para no tener que tocar el timbre.' || char(10) ||
  'Un invierno se me quemaron dos hornadas seguidas y pensé en dejarlo. Una vecina mayor me dejó una nota: «el pan de ayer me recordó a mi mamá». Esa nota la tengo todavía.' || char(10) ||
  'Terminé la carrera, pero nunca trabajé de contadora. Con lo que ahorré en cuatro años alquilé un local muy pequeño y abrí una panadería con un solo horno. Hoy somos tres personas trabajando.' || char(10) ||
  'Sigo sin poder hablar en público y nunca he salido en una foto de la panadería. Por eso preferí contar mi historia así.',
  'Hola, Richard. Gracias por invitarme… perdona, estoy un poco nerviosa.',
  1,
  0
WHERE NOT EXISTS (SELECT 1 FROM podcast_fichas WHERE ejemplo = 1);
