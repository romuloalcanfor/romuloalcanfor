// Acha a linha do maxilar (orelha a orelha, passando pelo queixo) com o Vision
// e salva os pontos em pixels da foto, origem no canto de cima. Roda só local.
// Uso: swift scripts/jaw.swift assets/rosto-original.jpg assets/jaw.json
import AppKit
import Vision

let args = CommandLine.arguments
guard args.count == 3, let image = NSImage(contentsOfFile: args[1]),
      let cg = image.cgImage(forProposedRect: nil, context: nil, hints: nil) else {
    print("uso: swift jaw.swift <foto> <saida.json>")
    exit(1)
}

let request = VNDetectFaceLandmarksRequest()
try VNImageRequestHandler(cgImage: cg).perform([request])

guard let face = request.results?.first, let contour = face.landmarks?.faceContour else {
    print("nenhum rosto encontrado")
    exit(1)
}

let size = CGSize(width: cg.width, height: cg.height)
let points = contour.pointsInImage(imageSize: size).map { [Double($0.x), Double(size.height - $0.y)] }
let data = try JSONSerialization.data(withJSONObject: points)
try data.write(to: URL(fileURLWithPath: args[2]))
print("\(points.count) pontos salvos em \(args[2])")
