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
