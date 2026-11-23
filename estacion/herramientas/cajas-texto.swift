import AppKit
import Vision
// Lee los renglones de una captura con Vision de la Mac (gratis) e imprime la caja de cada uno:
// «x0 y0 x1 y1<TAB>texto» en píxeles, con el origen arriba a la izquierda. Sirve con cambiar-renglon.py.
// Uso: swift cajas-texto.swift captura.png
let ruta = CommandLine.arguments[1]
let im = NSImage(contentsOfFile: ruta)!
let cg = im.cgImage(forProposedRect: nil, context: nil, hints: nil)!
let W = Double(cg.width), H = Double(cg.height)
let p = VNRecognizeTextRequest(); p.recognitionLevel = .accurate; p.usesLanguageCorrection = false
p.recognitionLanguages = ["es-ES","en-US"]
try! VNImageRequestHandler(cgImage: cg).perform([p])
for r in p.results ?? [] {
  guard let t = r.topCandidates(1).first else { continue }
  let b = r.boundingBox
  print(String(format: "%.0f %.0f %.0f %.0f\t%@", b.minX*W, (1-b.maxY)*H, b.maxX*W, (1-b.minY)*H, t.string))
}
print("tam \(cg.width) \(cg.height)")
