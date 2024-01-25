import type SharpType from 'sharp'
import { round } from '@minko-fe/lodash-pro'
import path from 'node:path'
import { SharpOperator } from '@/operator/SharpOperator'
import { Log } from '@/utils/Log'
import { AbsCompressor, type CommonOptions, type CompressinOptions, type CompressorMethod } from '../AbsCompressor'

interface SharpCompressionOptions extends CompressinOptions {
  /**
   * @description
   * use the lowest number of colours needed to achieve given quality, sets palette to true
   * @default 100
   */
  quality: number
  /**
   * @description
   * zlib compression level, 0 (fastest, largest) to 9 (slowest, smallest)
   * @default 9
   */
  compressionLevel: number
  /**
   * @description output size
   * @example 1
   * @default 1
   */
  size: number
  /**
   * @description output format
   * @example 'png'
   * @default ''
   */
  format: string
}

class Sharp extends AbsCompressor<SharpCompressionOptions> {
  name: CompressorMethod = 'sharp'
  option: SharpCompressionOptions
  operator: SharpOperator

  public static DEFAULT_CONFIG = {
    exts: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'tiff', 'avif'],
    maxLimit: 20 * 1024 * 1024, // 20MB
  }

  constructor(public commonOptions: CommonOptions) {
    super(commonOptions, {
      exts: Sharp.DEFAULT_CONFIG.exts,
      sizeLimit: Sharp.DEFAULT_CONFIG.maxLimit,
    })
    this.option = {
      compressionLevel: 9,
      quality: 100,
      size: 1,
      format: '',
      keep: 0,
    }

    this.operator = new SharpOperator()
  }

  validate(): Promise<boolean> {
    try {
      const usable = new SharpOperator().detectUsable()
      return Promise.resolve(usable)
    } catch {
      return Promise.resolve(false)
    }
  }

  compress(
    filePaths: string[],
    option: SharpCompressionOptions,
  ): Promise<
    {
      filePath: string
      originSize?: number
      compressedSize?: number
      outputPath?: string
      error?: any
    }[]
  > {
    this.option = option
    const res = Promise.all(filePaths.map((filePath) => this.sharp_compress(filePath)))
    return res
  }

  async sharp_compress(filePath: string) {
    try {
      await this.tryCompressable(filePath)
      const res = await this._streamSharp(filePath)
      return {
        filePath,
        ...res,
      }
    } catch (e) {
      Log.info(`Sharp Compress Error: ${JSON.stringify(e)}`)
      return {
        error: e,
        filePath,
      }
    }
  }

  private async _streamSharp(
    filePath: string,
  ): Promise<{ originSize: number; compressedSize: number; outputPath: string }> {
    const { format, compressionLevel, quality, size } = this.option!
    const ext = !format ? path.extname(filePath).slice(1) : format

    this.operator.use([
      {
        name: 'compress',
        hooks: {
          'on:input': (sharp) => {
            sharp.metadata().then(({ width, height }) => {
              sharp
                .toFormat(ext as keyof SharpType.FormatEnum, {
                  quality,
                  compressionLevel,
                })
                .resize({
                  width: round(width! * size),
                  height: round(height! * size),
                  fit: 'contain',
                })
            })
            return sharp
          },
          'on:genOutputPath': (filePath) => {
            return this.getOutputPath(filePath, ext, size)
          },
          'on:output': () => {
            this.trashFile(filePath)
          },
        },
      },
    ])

    const result = await this.operator.run(filePath)
    if (result) {
      return {
        compressedSize: result.outputSize,
        originSize: result.inputSize,
        outputPath: result.outputPath,
      }
    } else {
      return Promise.reject('compress failed')
    }
  }

  private _loadSharp(): typeof SharpType {
    const _sharp = require('sharp')
    return _sharp
  }
}

export { Sharp }
