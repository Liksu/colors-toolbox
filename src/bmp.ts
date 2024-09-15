import { PerlinRGB } from '@/features/perlin-rgb'

function createBMP(width: number, height: number, pixelData: Uint8Array): ArrayBuffer {
    const fileHeaderSize = 14
    const dibHeaderSize = 40
    const bitsPerPixel = 24 // For RGB format
    const paddingPerRow = (4 - (width * 3) % 4) % 4 // BMP row padding to align to 4-byte boundaries
    const pixelDataSize = (width * 3 + paddingPerRow) * height // 3 bytes per pixel (RGB)
    const fileSize = fileHeaderSize + dibHeaderSize + pixelDataSize

    const buffer = new ArrayBuffer(fileSize)
    const view = new DataView(buffer)

    let offset = 0

    // BMP file header
    view.setUint8(offset, 0x42) // 'B'
    view.setUint8(offset + 1, 0x4D) // 'M'
    view.setUint32(offset + 2, fileSize, true) // File size
    view.setUint32(offset + 6, 0, true) // Reserved
    view.setUint32(offset + 10, fileHeaderSize + dibHeaderSize, true) // Pixel data offset

    offset += fileHeaderSize

    // DIB header
    view.setUint32(offset, dibHeaderSize, true) // DIB header size
    view.setInt32(offset + 4, width, true) // Width
    view.setInt32(offset + 8, height, true) // Height
    view.setUint16(offset + 12, 1, true) // Number of color planes
    view.setUint16(offset + 14, bitsPerPixel, true) // Bits per pixel
    view.setUint32(offset + 16, 0, true) // Compression (none)
    view.setUint32(offset + 20, pixelDataSize, true) // Image size
    view.setInt32(offset + 24, 0, true) // Horizontal resolution
    view.setInt32(offset + 28, 0, true) // Vertical resolution
    view.setUint32(offset + 32, 0, true) // Number of colors
    view.setUint32(offset + 36, 0, true) // Important colors

    offset += dibHeaderSize

    // Pixel data (BMP format is bottom-up, so we write rows in reverse)
    for (let y = height - 1; y >= 0; y--) {
        for (let x = 0; x < width; x++) {
            const pixelIndex = (y * width + x) * 3
            view.setUint8(offset++, pixelData[pixelIndex + 2]) // Blue
            view.setUint8(offset++, pixelData[pixelIndex + 1]) // Green
            view.setUint8(offset++, pixelData[pixelIndex]) // Red
        }
        // Add padding bytes at the end of the row if needed
        for (let p = 0; p < paddingPerRow; p++) {
            view.setUint8(offset++, 0)
        }
    }

    return buffer
}

function base64ArrayBuffer(arrayBuffer: ArrayBuffer): string {
    const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    const bytes = new Uint8Array(arrayBuffer)
    let base64 = ''
    let byteRemainder = bytes.length % 3
    let mainLength = bytes.length - byteRemainder

    for (let i = 0; i < mainLength; i += 3) {
        let chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
        base64 += base64Chars[(chunk & 16515072) >> 18]
        base64 += base64Chars[(chunk & 258048) >> 12]
        base64 += base64Chars[(chunk & 4032) >> 6]
        base64 += base64Chars[chunk & 63]
    }

    if (byteRemainder === 1) {
        let chunk = bytes[mainLength]
        base64 += base64Chars[(chunk & 252) >> 2]
        base64 += base64Chars[(chunk & 3) << 4]
        base64 += '=='
    } else if (byteRemainder === 2) {
        let chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]
        base64 += base64Chars[(chunk & 64512) >> 10]
        base64 += base64Chars[(chunk & 1008) >> 4]
        base64 += base64Chars[(chunk & 15) << 2]
        base64 += '='
    }

    return base64
}

type GetOnlyMethods<T> = T extends `get${infer Method}` ? Method extends Capitalize<Method> ? T : never : never
type GetMethods<T> = { [Key in keyof T as T[Key] extends Function ? GetOnlyMethods<Key> : never]: T[Key] }
type PerlinRGBMethods = keyof GetMethods<PerlinRGB>
export type PerlinColorGetter = (matrix: PerlinRGB, x: number, y: number) => number[]

export function getBMPBase64(matrix: PerlinRGB): string {
    const width = matrix.matrixWidth
    const height = matrix.matrixHeight
    const pixelData = new Uint8Array(width * height * 3)

    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const pixelIndex = (y * width + x) * 3
            const color = matrix.getPixel(x, y)
            pixelData[pixelIndex] = color[0] // Red
            pixelData[pixelIndex + 1] = color[1] ?? color[0] // Green
            pixelData[pixelIndex + 2] = color[2] ?? color[0] // Blue
        }
    }

    const bmpArrayBuffer = createBMP(width, height, pixelData)
    return base64ArrayBuffer(bmpArrayBuffer)
}

export function getBMPDataURL(matrix: PerlinRGB): string {
    return `data:image/bmp;base64,${getBMPBase64(matrix)}`
}
