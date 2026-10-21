// Dónde está la cara en una foto (Vision, sin costo): imprime el recuadro de la cara más grande en
// fracciones de la foto, con el origen ARRIBA a la izquierda: {"x":…,"y":…,"ancho":…,"alto":…}.
// Uso: swift cara.swift foto.png
import AppKit
import Vision

guard CommandLine.arguments.count == 2,
  let imagen = CIImage(contentsOf: URL(fileURLWithPath: CommandLine.arguments[1]))
else {
  FileHandle.standardError.write("Uso: swift cara.swift foto.png\n".data(using: .utf8)!)
  exit(2)
}
let pedido = VNDetectFaceRectanglesRequest()
try VNImageRequestHandler(ciImage: imagen).perform([pedido])
guard let cara = pedido.results?.max(by: { $0.boundingBox.width < $1.boundingBox.width }) else {
  print("null")
  exit(0)
}
let c = cara.boundingBox  // origen abajo a la izquierda
print("{\"x\":\(c.minX),\"y\":\(1 - c.maxY),\"ancho\":\(c.width),\"alto\":\(c.height)}")
