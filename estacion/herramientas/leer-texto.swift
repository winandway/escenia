// Lee el texto de una o varias imágenes con el reconocimiento de la propia Mac (Vision, sin costo) y lo imprime:
// una línea «== archivo» y debajo cada renglón leído. Sirve para revisar capturas antes de usarlas en un video
// (por ejemplo, que ninguna pantalla de Divoox Driver diga «repartidor»).
// Uso: swift leer-texto.swift imagen1.png [imagen2.png …]
import AppKit
import Vision

for ruta in CommandLine.arguments.dropFirst() {
  print("== \(URL(fileURLWithPath: ruta).lastPathComponent)")
  guard let imagen = NSImage(contentsOfFile: ruta),
    let cg = imagen.cgImage(forProposedRect: nil, context: nil, hints: nil)
  else {
    print("(no se pudo abrir)")
    continue
  }
  let pedido = VNRecognizeTextRequest()
  pedido.recognitionLevel = .accurate
  pedido.recognitionLanguages = ["es-ES", "en-US"]
  pedido.usesLanguageCorrection = false
  do {
    try VNImageRequestHandler(cgImage: cg).perform([pedido])
  } catch {
    print("(Vision falló: \(error))")
    continue
  }
  for r in pedido.results ?? [] {
    if let t = r.topCandidates(1).first { print(t.string) }
  }
}
