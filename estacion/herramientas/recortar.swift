// Recorta al sujeto de una foto (la persona, el trofeo) y deja el fondo
// transparente, con el mismo motor que usa Fotos de macOS para «levantar» un
// sujeto. Sirve para las portadas: el sujeto recortado va encima de un fondo
// diseñado, con borde blanco, como en las miniaturas que se llevan los clics.
// Uso: recortar <foto de entrada> <salida.png>   → escribe «ancho alto» del recorte
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
  print("\(Int(listo.extent.width)) \(Int(listo.extent.height))")
} catch {
  fputs("\(error)\n", stderr)
  exit(6)
}
