// Quita el fondo de una foto con el reconocimiento de la propia Mac (Vision, sin costo): deja a la
// persona (o el objeto principal) en un PNG con transparencia. Sirve aunque el fondo sea el «tablero
// de cuadritos» dibujado de las fotos que dicen ser transparentes y no lo son.
// Uso: swift quitar-fondo.swift entrada.jpg salida.png
import AppKit
import CoreImage
import Vision

let argumentos = CommandLine.arguments
guard argumentos.count == 3 else {
  FileHandle.standardError.write("Uso: swift quitar-fondo.swift entrada salida.png\n".data(using: .utf8)!)
  exit(2)
}
let entrada = URL(fileURLWithPath: argumentos[1])
let salida = URL(fileURLWithPath: argumentos[2])
guard let imagen = CIImage(contentsOf: entrada) else {
  FileHandle.standardError.write("No pude abrir la imagen.\n".data(using: .utf8)!)
  exit(1)
}
let pedido = VNGenerateForegroundInstanceMaskRequest()
let manejador = VNImageRequestHandler(ciImage: imagen)
do {
  try manejador.perform([pedido])
} catch {
  FileHandle.standardError.write("Vision falló: \(error)\n".data(using: .utf8)!)
  exit(1)
}
guard let resultado = pedido.results?.first, !resultado.allInstances.isEmpty else {
  FileHandle.standardError.write("No encontré a nadie en la foto.\n".data(using: .utf8)!)
  exit(3)
}
let recortado = try resultado.generateMaskedImage(
  ofInstances: resultado.allInstances, from: manejador, croppedToInstancesExtent: false)
let ci = CIImage(cvPixelBuffer: recortado)
let contexto = CIContext()
guard let cg = contexto.createCGImage(ci, from: ci.extent) else { exit(1) }
let rep = NSBitmapImageRep(cgImage: cg)
guard let png = rep.representation(using: .png, properties: [:]) else { exit(1) }
try png.write(to: salida)
print("\(Int(ci.extent.width))x\(Int(ci.extent.height)) · \(resultado.allInstances.count) figura(s)")
