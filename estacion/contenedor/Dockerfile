# El taller en la nube (PENDIENTES: «Taller en la nube»; propuesta en planes/TALLER-NUBE.md, carpeta privada).
# La Estación en Linux: Node, ffmpeg, poppler (los PDF) y lo que pide el Chrome de Remotion.
# Se arma desde la raíz del proyecto:
#   docker build -f estacion/contenedor/Dockerfile -t escenia-estacion .
# Las piezas que hoy usan herramientas solo de macOS (sips, el recorte de personas con Vision)
# todavía no corren aquí: ver «Lo que falta» en planes/TALLER-NUBE.md.
FROM public.ecr.aws/docker/library/node:24-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg poppler-utils ca-certificates fonts-noto-color-emoji \
      libnss3 libdbus-1-3 libatk1.0-0 libgbm-dev libasound2 libxrandr2 libxkbcommon-dev \
      libxfixes3 libxcomposite1 libxdamage1 libatk-bridge2.0-0 libpango-1.0-0 libcairo2 libcups2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/estacion
COPY estacion/package.json estacion/package-lock.json ./
RUN npm ci --no-audit --no-fund
# `compartido/` importa zod y demás desde la raíz: se le da la misma carpeta de paquetes.
RUN ln -s /app/estacion/node_modules /app/node_modules
# El Chrome sin pantalla que usa Remotion para dibujar cada cuadro, ya bajado en la imagen.
RUN npx remotion browser ensure

COPY compartido /app/compartido
COPY estacion/src ./src
COPY estacion/recursos ./recursos
COPY estacion/remotion.config.ts estacion/tsconfig.json ./

EXPOSE 8080
# En la nube arranca el servidor del taller (src/taller.ts); en una máquina propia, la Estación:
#   docker run … escenia-estacion npx tsx src/estacion.ts
CMD ["npx", "tsx", "src/taller.ts"]
