# Cambia lo que dice un renglón de una captura de app SIN rehacerla: deja la primera palabra (la etiqueta,
# p. ej. «Moto:») tal cual, pinta el resto con el fondo del renglón y escribe encima el texto nuevo con la letra
# de la app (Montserrat), a la misma altura de mayúscula, en la misma línea de base y del mismo color.
# Nació con C-MARCA-1 (22 nov 2026): las capturas de prueba de Divoox traían la marca vetada en la tarjeta
# del conductor. La caja del renglón sale de `swift cajas-texto.swift <captura>` (Vision de la Mac, gratis).
# Uso: python3 -I cambiar-renglon.py <entrada.png> <salida.png> <x0> <y0> <x1> <y1> "<texto nuevo>"
import sys
from collections import Counter
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FUENTE = Path(__file__).resolve().parent.parent / "recursos" / "fuentes" / "Montserrat_400Regular.ttf"
HUECO_PALABRA = 9  # columnas vacías seguidas que separan dos palabras a este tamaño


def segmentos(columnas: list[bool]) -> list[tuple[int, int]]:
    """Tramos de columnas con tinta, separados por huecos de al menos HUECO_PALABRA columnas."""
    tramos, inicio, vacias = [], None, 0
    for i, hay in enumerate(columnas):
        if hay:
            if inicio is None:
                inicio = i
            vacias, fin = 0, i
        elif inicio is not None:
            vacias += 1
            if vacias >= HUECO_PALABRA:
                tramos.append((inicio, fin))
                inicio, vacias = None, 0
    if inicio is not None:
        tramos.append((inicio, fin))
    return tramos


def main() -> None:
    entrada, salida = sys.argv[1], sys.argv[2]
    x0, y0, x1, y1 = (int(v) for v in sys.argv[3:7])
    nuevo = sys.argv[7]
    im = Image.open(entrada).convert("RGB")
    px = im.load()
    caja = [(x, y) for y in range(y0, y1) for x in range(x0, x1)]
    fondo = Counter(px[p] for p in caja).most_common(1)[0][0]
    tinta = lambda c: sum(abs(a - b) for a, b in zip(c, fondo)) > 60  # noqa: E731
    columnas = [any(tinta(px[x, y]) for y in range(y0, y1)) for x in range(x0, x1)]
    tramos = segmentos(columnas)
    if len(tramos) < 2:
        raise SystemExit(f"No encontré dos palabras en el renglón (tramos: {tramos}).")
    color = Counter(px[p] for p in caja if tinta(px[p])).most_common(1)[0][0]
    # La segunda palabra marca dónde empieza lo que se cambia, su altura de mayúscula y su línea de base.
    sx0, sx1 = tramos[1][0] + x0, tramos[1][1] + x0
    filas = [y for y in range(y0, y1) if any(tinta(px[x, y]) for x in range(sx0, sx1 + 1))]
    arriba, base = min(filas), max(filas)
    alto_mayus = base - arriba + 1
    prueba = ImageFont.truetype(str(FUENTE), 200)
    bh = prueba.getbbox("H", anchor="ls")
    tam = round(200 * alto_mayus / (bh[3] - bh[1]))
    fuente = ImageFont.truetype(str(FUENTE), tam)
    fin_tinta = max(t[1] for t in tramos) + x0
    d = ImageDraw.Draw(im)
    d.rectangle((sx0 - 2, y0 - 2, fin_tinta + 4, y1 + 2), fill=fondo)
    d.text((sx0, base + 1), nuevo, font=fuente, fill=color, anchor="ls")
    im.save(salida)
    print(f"{Path(entrada).name}: «{nuevo}» desde x={sx0}, base y={base}, letra {tam} px, color {color}, fondo {fondo}")


if __name__ == "__main__":
    main()
