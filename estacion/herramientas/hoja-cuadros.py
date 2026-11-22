# Hoja de contacto: junta cuadros en una sola imagen con su segundo escrito y las líneas de la zona segura
# (x 60–940, y 180–1490 sobre 1080×1920). La usa el formato «Tutorial en bloques» (estacion/src/tutorial-bloques.ts).
# Uso: python3 -I scripts/hoja.py <salida.png> <cuadro1.png> <cuadro2.png> …   (o un .mp4 y una lista de segundos:
#      python3 -I scripts/hoja.py <salida.png> --video <video.mp4> 0,1.5,3,…)
import os, subprocess, sys, tempfile
from PIL import Image, ImageDraw

salida = sys.argv[1]
if sys.argv[2] == "--video":
    video, segs = sys.argv[3], [float(x) for x in sys.argv[4].split(",")]
    tmp = tempfile.mkdtemp(dir=os.path.dirname(os.path.abspath(salida)))
    rutas = []
    for s in segs:
        r = os.path.join(tmp, f"c-{s:06.2f}.png")
        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(s), "-i", video, "-frames:v", "1", r], check=True)
        rutas.append((f"{s:.2f} s", r))
else:
    rutas = [(f"{int(p[-8:-4]) / 30:.2f} s", p) for p in sys.argv[2:]]
W, H = 270, 480
cols = 6
filas = (len(rutas) + cols - 1) // cols
hoja = Image.new("RGB", (cols * (W + 8) + 8, filas * (H + 34) + 8), (40, 40, 44))
d = ImageDraw.Draw(hoja)
for k, (rot, p) in enumerate(rutas):
    im = Image.open(p).convert("RGB").resize((W, H), Image.LANCZOS)
    x, y = 8 + (k % cols) * (W + 8), 8 + (k // cols) * (H + 34)
    hoja.paste(im, (x, y))
    e = W / 1080
    d.rectangle([x + 60 * e, y + 180 * e, x + 940 * e, y + 1490 * e], outline=(0, 255, 120))
    d.text((x + 4, y + H + 6), rot, fill=(255, 255, 255))
hoja.save(salida)
print(salida, hoja.size)
