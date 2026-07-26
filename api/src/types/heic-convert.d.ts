// `heic-convert` ships no type declarations of its own.
declare module 'heic-convert' {
  export interface HeicConvertOptions {
    buffer: Buffer
    format: 'JPEG' | 'PNG'
    quality?: number
  }

  export default function convert (options: HeicConvertOptions): Promise<Buffer>
}
