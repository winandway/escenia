// Recorta al sujeto de una foto (la persona, el trofeo) y deja el fondo
// transparente, con el mismo motor que usa Fotos de macOS para «levantar» un
// sujeto. Sirve para las portadas: el sujeto recortado va encima de un fondo
// diseñado, con borde blanco, como en las miniaturas que se llevan los clics.
// Uso: recortar <foto de entrada> <salida.png>
// Escribe una línea JSON: el tamaño del recorte, qué parte de la foto ocupa,
// cuánto de él es figura (`lleno`) y las caras que se ven EN EL RECORTE (de 0 a
// 1, desde arriba a la izquierda).
// Con las caras, la portada sabe a quién acercar y descarta fotos de grupo.
import AppKit
import CoreImage
import Foundation
import Vision

let argumentos = CommandLine.arguments
guard argumentos.count >= 3 else {
  fputs("uso: recortar <entrada> <salida.png>\n", stderr)
  exit(2)
}
let entrada = URL(fileURLWithPath: argumentos[1])
let salida = URL(fileURLWithPath: argumentos[2])
guard let imagen = CIImage(contentsOf: entrada, options: [.applyOrientationProperty: true]) else {
  fputs("no se pudo leer la imagen\n", stderr)
  exit(3)
}
let manejador = VNImageRequestHandler(ciImage: imagen)
let pedido = VNGenerateForegroundInstanceMaskRequest()
do {
  try manejador.perform([pedido])
  guard let resultado = pedido.results?.first else {
    fputs("no se encontró ningún sujeto en la foto\n", stderr)
    exit(4)
  }
  let recorte = try resultado.generateMaskedImage(
    ofInstances: resultado.allInstances, from: manejador, croppedToInstancesExtent: true)
  let listo = CIImage(cvPixelBuffer: recorte)
  guard let colores = CGColorSpace(name: CGColorSpace.sRGB) else { exit(5) }
  try CIContext().writePNGRepresentation(of: listo, to: salida, format: .RGBA8, colorSpace: colores)

  // Las caras, buscadas en el recorte ya puesto sobre gris (sin el fondo original).
  let gris = CIImage(color: CIColor(red: 0.5, green: 0.5, blue: 0.5)).cropped(to: listo.extent)
  let sobreGris = listo.composited(over: gris)
  let pedidoCaras = VNDetectFaceRectanglesRequest()
  try VNImageRequestHandler(ciImage: sobreGris).perform([pedidoCaras])
  let caras = (pedidoCaras.results ?? []).map { c -> [String: Double] in
    let r = c.boundingBox
    return [
      "x": Double(r.minX), "y": Double(1 - r.maxY), "ancho": Double(r.width), "alto": Double(r.height),
    ]
  }
  let cobertura =
    Double(listo.extent.width * listo.extent.height) / Double(imagen.extent.width * imagen.extent.height)
  // Qué parte del recorte es figura de verdad (lo demás quedó transparente). Cerca de 1 quiere
  // decir que no se quitó ningún fondo: el «sujeto» es el cuadro entero.
  var lleno = 1.0
  if let promedio = CIFilter(
    name: "CIAreaAverage",
    parameters: [kCIInputImageKey: listo, kCIInputExtentKey: CIVector(cgRect: listo.extent)])?.outputImage
  {
    var punto = [UInt8](repeating: 0, count: 4)
    CIContext().render(
      promedio, toBitmap: &punto, rowBytes: 4, bounds: CGRect(x: 0, y: 0, width: 1, height: 1),
      format: .RGBA8, colorSpace: nil)
    lleno = Double(punto[3]) / 255.0
  }
  let datos: [String: Any] = [
    "ancho": Int(listo.extent.width), "alto": Int(listo.extent.height),
    "cobertura": cobertura, "lleno": lleno, "caras": caras,
  ]
  let json = try JSONSerialization.data(withJSONObject: datos, options: [.sortedKeys])
  print(String(data: json, encoding: .utf8) ?? "{}")
} catch {
  fputs("\(error)\n", stderr)
  exit(6)
}
