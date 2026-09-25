# Motor Escenia — motor de videos semiautomáticos de Windoce

- Análisis base y decisiones: [docs/ANALISIS.md](docs/ANALISIS.md). Léelo antes de tocar arquitectura.
- Pendientes: [PENDIENTES.md](PENDIENTES.md).

## Perímetro
- Carpeta: `/Users/windocellc/Motor-Escenia`. Nada fuera de aquí.
- Publicación: YaDominios Cloud (sitio propuesto `escenia.sitios.dev`, pendiente de aprobar).
- Base y archivos: `env.DB` / `env.BUCKET` de ese sitio. **Sin Supabase.**
- Los MP4 se quedan en la Mac; nunca suben a la nube.
- Losupe es OTRO proyecto: solo se lee su feed público, jamás su base ni su repo.

## Reglas del motor
- Nada se publica sin aprobación de Richard; «Aprobar» exige su opinión escrita.
- Piloto solo en el canal de IA; Caprichoso TV entra después.
- Temas, prompts y spots viven en la base, no en el código (el repo es público).
- Rutas de backend en `/datos/*`, nunca `/api/*`.
- Tope de gasto diario en la base; modelos caros bloqueados en código.
