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
  actualizado_en TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS comerciales_por_estado ON comerciales(estado, id);
