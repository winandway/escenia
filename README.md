# Motor Escenia

Motor de videos semiautomáticos de Windoce: escribes un tema, la IA propone el
guion, tú lo apruebas con tu opinión, y la Estación (tu Mac) arma el video con
tu voz clonada, subtítulos palabra por palabra y clips de fondo. Nada se
publica sin tu aprobación.

- Panel: https://escenia.sitios.dev (YaDominios Cloud)
- Análisis y decisiones: [docs/ANALISIS.md](docs/ANALISIS.md)
- La Estación (la Mac): [docs/ESTACION.md](docs/ESTACION.md)
- Candados: [docs/CANDADOS.md](docs/CANDADOS.md)
- Auditoría de YouTube: [docs/AUDITORIA-YOUTUBE.md](docs/AUDITORIA-YOUTUBE.md)

## Carpetas

```
src/            panel Next.js 16 (corre en YaDominios Cloud como _worker.js)
compartido/     lo que usan panel y Estación: formato del guion, subtítulos, modelos, temáticas
estacion/       proceso de la Mac: voz, clips, render Remotion
schema.sql      tablas (se ejecuta en cada publicación)
pruebas/        pruebas automáticas (vitest)
docs/           documentación
```

## Desarrollo local

```bash
cd /Users/windocellc/Motor-Escenia && npm run preview
```

Compila el panel y lo sirve en http://localhost:8787 con base y almacén locales
(`.dev.vars`). La primera vez: `npx wrangler d1 execute escenia-local --local --file=schema.sql`.

`npm run verify` corre tipos, lint, pruebas con cobertura, build, auditoría de
dependencias y escaneo de secretos. Es lo mismo que corre GitHub en cada push.

© 2026 escenia.sitios.dev | All rights reserved. Developed by [Windoce LLC](https://windoce.com)
