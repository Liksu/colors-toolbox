import { Perlin, PerlinMatrix } from '@/features/perlin'
import { ColorHelpers, Gradient, HexColor, InputColorsPalette } from '@/features/color-helpers'

export type MatrixType = 'rgb' | 'rgba' | 'monochrome' | 'gradient'

const typeRanges: Record<MatrixType, number> = {
    monochrome: 1,
    rgb: 3,
    rgba: 4,
    gradient: 1,
} as const

interface PerlinRGBParams {
    width: number
    height: number
    type?: MatrixType
    scale?: boolean
    gradient?: InputColorsPalette
    blend?: {
        background: HexColor
        opacity: number
    }
}

export class PerlinRGB {
    matrixWidth: number
    matrixHeight: number
    type: MatrixType
    scale: boolean
    hasBlend: boolean
    background?: number[]
    opacity?: number

    gradient?: Gradient
    data: PerlinMatrix[]

    constructor({ width, height, type = 'rgb', scale = true, gradient, blend }: PerlinRGBParams) {
        this.matrixWidth = width
        this.matrixHeight = height
        this.type = type
        this.scale = scale
        this.hasBlend = blend?.opacity != null && blend?.background != null
        this.background = ColorHelpers.hexToRGBa(blend?.background ?? '#FFFFFF')
        this.opacity = blend?.opacity ?? 1
        
        this.data = Array.from({ length: typeRanges[type] }, () => new Perlin({
            width,
            height,
            oneCell: true,
            scale
        }).getMatrix())
        
        if (type === 'gradient') {
            if (!gradient) gradient = ['#0057B7', '#FFDD00']
            this.gradient = ColorHelpers.getGradient(gradient, 256, true)
        }
    }
    
    normalizePixel(value: number[]): number[] {
        const [r, g, b, a] = value
        return [r, g ?? r, b ?? r, a]
    }

    blendPixel(foregroundColor: number[], backgroundColor: number[], opacity: number): number[] {
        const [r, g, b, a] = foregroundColor
        return [r, g, b]
            .map((channel, index) =>
                Math.round(channel * opacity + backgroundColor[index] * (1 - opacity))
            )
            .concat((a ?? 1) * opacity)
    }

    getPixel(x: number, y: number) {
        const length = typeRanges[this.type]
        let value = Array.from({ length }, (_, i) => this.data[i][x][y])
        
        if (this.gradient && this.type === 'gradient') {
            const color = this.gradient[value[0]].rgb
            value = [color.r, color.g, color.b].map(c => Math.floor(c * 255))
        }
        
        if (this.hasBlend) {
            value = this.blendPixel(this.normalizePixel(value), this.background!, this.opacity!)
        }
        
        return value
    }

    getMono(x: number, y: number) {
        const [m] = this.getPixel(x, y)
        return `rgb(${m}, ${m}, ${m})`
    }

    getRGB(x: number, y: number) {
        const [r, g, b] = this.normalizePixel(this.getPixel(x, y))
        return `rgb(${r}, ${g}, ${b})`
    }

    getRGBA(x: number, y: number, alpha?: number) {
        const [r, g, b, a] = this.normalizePixel(this.getPixel(x, y))
        return `rgba(${r}, ${g}, ${b}, ${alpha ?? (a / 255) ?? 1})`
    }
}