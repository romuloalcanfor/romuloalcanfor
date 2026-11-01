// Gera a máscara da pessoa na foto usando o Vision do macOS (roda só local).
// Uso: swift scripts/segment.swift assets/rosto-original.jpg assets/rosto-mask-full.png
import AppKit
import CoreImage
import Vision

let args = CommandLine.arguments
guard args.count == 3, let image = NSImage(contentsOfFile: args[1]),
      let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("uso: swift segment.swift <foto> <saida.png>")
    exit(1)
}

let request = VNGeneratePersonSegmentationRequest()
request.qualityLevel = .accurate
request.outputPixelFormat = kCVPixelFormatType_OneComponent8
try VNImageRequestHandler(cgImage: cg).perform([request])

guard let buffer = request.results?.first?.pixelBuffer else {
    print("nenhuma pessoa encontrada")
    exit(1)
}

// A máscara sai menor que a foto, então escala para o tamanho original.
var mask = CIImage(cvPixelBuffer: buffer)
mask = mask.transformed(by: CGAffineTransform(
    scaleX: CGFloat(cg.width) / mask.extent.width,
    y: CGFloat(cg.height) / mask.extent.height))

let ctx = CIContext()
let out = URL(fileURLWithPath: args[2])
try ctx.writePNGRepresentation(of: mask, to: out, format: .L8,
                               colorSpace: CGColorSpaceCreateDeviceGray())
print("máscara salva em \(args[2])")
