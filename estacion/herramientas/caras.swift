// Detector de caras con Vision (macOS). Uso: caras <imagen> [<imagen> ...]
// Imprime una línea por imagen: ruta<TAB>cx,cy,w,h;cx,cy,w,h (fracciones 0-1, origen arriba-izquierda)
import AppKit
import Foundation
import Vision

for ruta in CommandLine.arguments.dropFirst() {
  guard let imagen = NSImage(contentsOfFile: ruta),
    let cg = imagen.cgImage(forProposedRect: nil, context: nil, hints: nil)
  else {
    print("\(ruta)\t")
    continue
  }
  let peticion = VNDetectFaceRectanglesRequest()
  let manejador = VNImageRequestHandler(cgImage: cg, options: [:])
  try? manejador.perform([peticion])
  let caras = (peticion.results ?? []).map { r -> String in
    let b = r.boundingBox
    return String(format: "%.4f,%.4f,%.4f,%.4f", b.midX, 1 - b.midY, b.width, b.height)
  }
  print("\(ruta)\t\(caras.joined(separator: ";"))")
}
