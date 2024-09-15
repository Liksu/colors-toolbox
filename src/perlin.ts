export type PerlinMatrix = number[][]
export interface PerlinParams {
    // The width of the matrix
    width: number
    // The height of the matrix
    height: number
    // Whether to amplify the values to the boundaries, applicable only for matrix
    scale: boolean
    // Whether to generate the gradients from a single cell or from each cell 
    oneCell: boolean
}

export class Perlin {
    matrixWidth: number
    matrixHeight: number
    scale: boolean
    oneCell: boolean
    gradients!: { x: number, y: number }[][]

    constructor(config: Partial<PerlinParams>) {
        this.matrixWidth = config.width ?? 64
        this.matrixHeight = config.height ?? 64
        this.oneCell = config.oneCell ?? false
        this.scale = config.scale ?? true
        this.generateGradients()
    }

    /**
     * Fade function
     * 
     * @param {number} t
     * @returns {number}
     */
    static fade(t: number): number {
        return t * t * t * (t * (t * 6 - 15) + 10)
    }

    /**
     * Linear interpolation between a and b for t
     * 
     * @param {number} a
     * @param {number} b
     * @param {number} t
     * @returns {number}
     */
    static lerp(a: number, b: number, t: number): number {
        return a + t * (b - a)
    }

    /**
     * Generate a random vector
     * 
     * @returns {{x: number, y: number}}
     * @private
     */
    private static generateVector(): { x: number, y: number } {
        const angle = Math.random() * Math.PI * 2
        return { x: Math.cos(angle), y: Math.sin(angle) }
    }

    /**
     * Generate the gradients for each cell
     * 
     * @private
     */
    private generateGradients(): void {
        if (this.oneCell) {
            this.gradients = [
                [Perlin.generateVector(), Perlin.generateVector()],
                [Perlin.generateVector(), Perlin.generateVector()]
            ]
            return
        }
        
        // Add one additional cell to the width and height to calculate values in the center of each cell
        this.gradients = Array.from({ length: this.matrixWidth + 2 }, () =>
            Array.from({ length: this.matrixHeight + 2 }, () => {
                const angle = Math.random() * Math.PI * 2
                return { x: Math.cos(angle), y: Math.sin(angle) }
            })
        )
    }

    /**
     * Calculate the dot product between the gradient and the distance vector
     * 
     * @param {number} ix - The x index of the gradient
     * @param {number} iy - The y index of the gradient
     * @param {number} x - The x coordinate of the point
     * @param {number} y - The y coordinate of the point
     * @returns {number} - The dot product
     * @private
     */
    private dotGridGradient(ix: number, iy: number, x: number, y: number): number {
        const gradient = this.gradients[ix][iy]
        
        const dx = x - ix
        const dy = y - iy
        return (dx * gradient.x + dy * gradient.y)
    }

    /**
     * Calculate the Perlin noise
     * 
     * @param {number} x - The x coordinate of the point
     * @param {number} y - The y coordinate of the point
     * @returns {number} - The Perlin noise value
     * @private
     */
    private perlin(x: number, y: number): number {
        const x0 = Math.floor(x)
        const x1 = x0 + 1
        const y0 = Math.floor(y)
        const y1 = y0 + 1

        const n00 = this.dotGridGradient(x0, y0, x, y)
        const n10 = this.dotGridGradient(x1, y0, x, y)
        const n01 = this.dotGridGradient(x0, y1, x, y)
        const n11 = this.dotGridGradient(x1, y1, x, y)

        const u = Perlin.fade(x - x0)
        const v = Perlin.fade(y - y0)

        const nx0 = Perlin.lerp(n00, n10, u)
        const nx1 = Perlin.lerp(n01, n11, u)

        return Perlin.lerp(nx0, nx1, v)
    }

    /**
     * Calculate the Perlin noise value for the given coordinates
     * @param {number} x - The x coordinate of the point
     * @param {number} y - The y coordinate of the point
     * @returns {number} - The Perlin noise value
     * @private
     */
    private perlinValue(x: number, y: number): number {
        if (this.oneCell) {
            x = x / this.matrixWidth
            y = y / this.matrixHeight
        } else {
            x = x + 0.5
            y = y + 0.5
        }   

        return this.perlin(x, y)
    }

    /**
     * Calculate the Perlin noise value for the given coordinates and return it as a byte
     * 
     * @param {number} x - The x coordinate of the point
     * @param {number} y - The y coordinate of the point
     * @returns {number} - The Perlin noise value as a byte
     * @private
     */
    private perlinByte(x: number, y: number): number {
        const value = this.perlinValue(x, y)
        return Math.floor(256 * (value + 1) / 2) // Normalize properly between 0 and 255
    }

    /**
     * Get the Perlin noise matrix
     * 
     * @returns {PerlinMatrix}
     */
    public getMatrix(): PerlinMatrix {
        const valuesMatrix = Array.from({ length: this.matrixWidth }, (_, x) =>
            Array.from({ length: this.matrixHeight }, (_, y) => this.perlinByte(x, y))
        )
        
        if (!this.scale) return valuesMatrix
        
        const [min, max] = valuesMatrix.flat().reduce(([min, max], n) => [Math.min(min, n), Math.max(max, n)], [Infinity, -Infinity])

        return valuesMatrix.map(row =>
            row.map(value => Math.floor(255 * (value - min) / (max - min)))
        )
    }

    /**
     * Regenerate the gradients
     */
    public reset(): void {
        this.generateGradients()
    }
}
