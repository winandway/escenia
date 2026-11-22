# Encuentra la pantalla verde de un teléfono en una escena de bloques (formato «Tutorial en bloques»,
# docs/TUTORIAL-BLOQUES.md) y prepara las dos piezas para pegarle la captura real por cuatro esquinas:
#   1. las cuatro esquinas de la pantalla (arriba-izquierda, arriba-derecha, abajo-derecha, abajo-izquierda),
#      sacadas de rectas ajustadas a cada lado (las esquinas redondeadas y la isla de la cámara no las mueven);
#   2. «el frente»: la misma escena con el verde vuelto transparente (y sin el reflejo verde en los bordes), que
#      va ENCIMA de la captura. Así los dedos, la isla de la cámara y el marco del teléfono tapan la captura
#      como taparían una pantalla de verdad.
# Solo usa Pillow (el Python de la Mac no trae numpy ni OpenCV). Sin costo.
# Uso: python3 -I pantalla-verde.py <escena.png> <salida.json> <frente.png>
import json, sys
from PIL import Image, ImageFilter


def es_verde(r, g, b):
    return g > 120 and g - max(r, b) > 60


def ajustar_recta(puntos, vertical):
    # Mínimos cuadrados: si es vertical, x = m·y + c; si no, y = m·x + c.
    n = len(puntos)
    if n < 5:
        raise SystemExit("No hay bastante borde para ajustar una recta: ¿la pantalla es verde de verdad?")
    if vertical:
        us = [p[1] for p in puntos]; vs = [p[0] for p in puntos]
    else:
        us = [p[0] for p in puntos]; vs = [p[1] for p in puntos]
    mu = sum(us) / n; mv = sum(vs) / n
    suu = sum((u - mu) ** 2 for u in us) or 1e-9
    m = sum((u - mu) * (v - mv) for u, v in zip(us, vs)) / suu
    c = mv - m * mu
    # Un segundo pase sin los puntos que se alejan (dedos, isla de la cámara, esquinas redondeadas).
    res = [abs(v - (m * u + c)) for u, v in zip(us, vs)]
    corte = sorted(res)[int(len(res) * 0.7)] + 1.5
    keep = [(u, v) for u, v, r in zip(us, vs, res) if r <= corte]
    if len(keep) >= 5:
        us = [k[0] for k in keep]; vs = [k[1] for k in keep]; n = len(keep)
        mu = sum(us) / n; mv = sum(vs) / n
        suu = sum((u - mu) ** 2 for u in us) or 1e-9
        m = sum((u - mu) * (v - mv) for u, v in zip(us, vs)) / suu
        c = mv - m * mu
    return (m, c, vertical)


def cruce(h, v):
    # h: y = mh·x + ch ; v: x = mv·y + cv
    mh, ch, _ = h; mv, cv, _ = v
    y = (mh * cv + ch) / (1 - mh * mv)
    x = mv * y + cv
    return [round(x, 1), round(y, 1)]


def main():
    escena, salida, frente = sys.argv[1], sys.argv[2], sys.argv[3]
    im = Image.open(escena).convert("RGB")
    W, H = im.size
    px = im.load()
    # 1) La mancha verde más grande (por filas, en la imagen a la mitad para ir rápido).
    k = 2
    peq = im.resize((W // k, H // k), Image.BILINEAR)
    pp = peq.load(); w, h = peq.size
    filas = {}
    for y in range(h):
        xs = [x for x in range(w) if es_verde(*pp[x, y])]
        if len(xs) > 6:
            filas[y] = (min(xs), max(xs), len(xs))
    if not filas:
        raise SystemExit("No se encontró ninguna pantalla verde.")
    # Las filas seguidas con verde forman la pantalla; se queda el tramo más alto.
    ys = sorted(filas)
    tramos, actual = [], [ys[0]]
    for y in ys[1:]:
        if y - actual[-1] <= 2:
            actual.append(y)
        else:
            tramos.append(actual); actual = [y]
    tramos.append(actual)
    tramo = max(tramos, key=len)
    y0, y1 = tramo[0] * k, tramo[-1] * k
    x0 = min(filas[y][0] for y in tramo) * k; x1 = max(filas[y][1] for y in tramo) * k
    # 2) Puntos del borde en tamaño real, solo en el 15–85 % de cada lado (lejos de las esquinas redondeadas).
    def verde(x, y):
        return 0 <= x < W and 0 <= y < H and es_verde(*px[x, y])
    arriba, abajo, izq, der = [], [], [], []
    for x in range(int(x0 + (x1 - x0) * 0.15), int(x0 + (x1 - x0) * 0.85), 2):
        col = [y for y in range(max(0, y0 - 6), min(H, y1 + 7)) if verde(x, y)]
        if col:
            arriba.append((x, col[0] - 0.5)); abajo.append((x, col[-1] + 0.5))
    for y in range(int(y0 + (y1 - y0) * 0.15), int(y0 + (y1 - y0) * 0.85), 2):
        fila = [x for x in range(max(0, x0 - 6), min(W, x1 + 7)) if verde(x, y)]
        if fila:
            izq.append((fila[0] - 0.5, y)); der.append((fila[-1] + 0.5, y))
    ra = ajustar_recta(arriba, False); rb = ajustar_recta(abajo, False)
    ri = ajustar_recta(izq, True); rd = ajustar_recta(der, True)
    esquinas = [cruce(ra, ri), cruce(ra, rd), cruce(rb, rd), cruce(rb, ri)]
    # 3) El frente: el verde transparente (suave en el borde) y el reflejo verde quitado de lo que queda.
    alfa = Image.new("L", (W, H), 255)
    pa = alfa.load()
    bx0, bx1 = max(0, x0 - 12), min(W, x1 + 13)
    by0, by1 = max(0, y0 - 12), min(H, y1 + 13)
    limpio = im.copy(); pl = limpio.load()
    for y in range(by0, by1):
        for x in range(bx0, bx1):
            r, g, b = px[x, y]
            exceso = g - max(r, b)
            if exceso > 60 and g > 120:
                pa[x, y] = 0
            elif exceso > 25:
                pa[x, y] = int(255 * (60 - exceso) / 35)
                pl[x, y] = (r, max(r, b), b)
            elif exceso > 0:
                pl[x, y] = (r, max(r, b), b)
    alfa = alfa.filter(ImageFilter.GaussianBlur(0.6))
    limpio.putalpha(alfa)
    limpio.save(frente)
    ancho = ((esquinas[1][0] - esquinas[0][0]) + (esquinas[2][0] - esquinas[3][0])) / 2
    alto = ((esquinas[3][1] - esquinas[0][1]) + (esquinas[2][1] - esquinas[1][1])) / 2
    json.dump({"escena": [W, H], "esquinas": esquinas, "ancho": round(ancho, 1), "alto": round(alto, 1),
               "proporcion": round(alto / ancho, 3)}, open(salida, "w"), indent=2)
    print(f"pantalla: {esquinas} · {ancho:.0f}×{alto:.0f} px · alto/ancho {alto / ancho:.2f}")


main()
