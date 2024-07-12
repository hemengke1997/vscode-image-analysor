import { toNumber } from '@minko-fe/lodash-pro'
import fs from 'fs-extra'
import pMap from 'p-map'
import { type SharpNS } from '~/@types/global'
import { i18n } from '~/i18n'
import { SharpOperator } from '..'
import { Commander } from '../commander'
import { DEFAULT_CONFIG } from '../config/common'
import { Operator, type OperatorOptions, type OperatorResult, SkipError } from './operator'

export type FormatConverterOptions = {
  /**
   * @description 输出的图片格式
   * @example 'png'
   * @default ''
   */
  format: string
  /**
   * @description ico图标兼容尺寸
   * @default
   * ```
   * [16, 32]
   * ```
   */
  icoSize: number[]
} & OperatorOptions

type ConvertorRuntime = {
  ext: string
  filePath: string
  option: FormatConverterOptions
  isLast: boolean
}

export class FormatConverter extends Operator {
  public inputPath: string = ''
  public commander: Commander | null = null
  public outputPath: string = ''
  public inputBuffer: Buffer = Buffer.from('')

  public extensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'tiff', 'avif', 'heif', 'svg']

  public limit = {
    from: [...this.extensions],
    to: [...this.extensions, 'ico'],
  }

  constructor(public option: FormatConverterOptions) {
    super()
  }

  async run<FormatConverterOptions>(
    filePath: string,
    option: FormatConverterOptions | undefined,
  ): Promise<OperatorResult> {
    this.option = this.mergeOption(option)

    this.inputPath = filePath
    this.commander = new Commander(this.inputPath, this.undo.bind(this))

    const r = await this.convertImage(filePath)

    return this.resolveResult(r)
  }

  async convertImage(filePath: string) {
    const result = {
      id: this.inputPath,
      filePath,
    }
    try {
      await this.checkLimit(filePath)
      const res = await this.core(filePath)
      return {
        ...result,
        ...res,
      }
    } catch (error) {
      return { ...result, error: error || i18n.t('core.compress_fail_reason_unknown') }
    }
  }

  private _createConverter(size?: number) {
    const converter: SharpOperator<ConvertorRuntime> = new SharpOperator({
      plugins: [
        {
          name: 'format-converter',
          hooks: {
            'on:configuration': async (ctx) => {
              if (ctx.runtime.ext === 'gif') {
                return {
                  animated: true,
                  limitInputPixels: false,
                }
              }
            },
            'before:run': async (ctx) => {
              let { ext } = ctx.runtime
              if (this._isIco(ext)) {
                // resize
                ctx.sharp = await this._resizeIco(ctx.sharp, { size: size! })
                // convert to png first, then encode to ico
                ext = 'png'
              }
              ctx.sharp.toFormat(ext as keyof SharpNS.FormatEnum).timeout({ seconds: 20 })
            },
            'after:run': async ({ runtime: { filePath, isLast } }) => {
              if (!this.option.keepOriginal) {
                isLast && (await this.trashFile(filePath))
              }
            },
            'on:generate-output-path': ({ runtime: { ext, filePath } }) => {
              return this.getOutputPath(filePath, {
                ext,
                size: 1,
                fileSuffix: '',
              })
            },
          },
        },
      ],
    })

    return converter
  }

  async core(
    filePath: string,
  ): Promise<{ inputSize: number; outputSize: number; outputPath: string; inputBuffer: Buffer }> {
    const { format } = this.option!

    const originExt = this.getFileExt(filePath)
    const ext = !format ? originExt : format

    // 保留原格式，跳过
    if (originExt === ext) {
      return Promise.reject(new SkipError())
    }

    const inputBuffer = await fs.readFile(filePath)
    const inputSize = await this.getFileSize(filePath)
    let outputPath = ''
    let converters: SharpOperator<ConvertorRuntime>[] | SharpOperator<ConvertorRuntime>

    try {
      if (this._isIco(ext)) {
        if (!this.option.icoSize) {
          this.option.icoSize = DEFAULT_CONFIG.conversion.icoSize
        }
        converters = this.option.icoSize
          .map((size) => toNumber(size))
          .sort((a, b) => b - a)
          .map((size) => this._createConverter(size)) as SharpOperator<ConvertorRuntime>[]
        const len = converters.length
        const res = await pMap(
          converters.map(
            (converter, index) => () =>
              converter.run(
                {
                  ext,
                  filePath,
                  option: this.option,
                  input: filePath,
                  isLast: index === len - 1,
                },
                {
                  dryRun: true,
                },
              ),
          ),
          (task) => task(),
          {
            concurrency: 1,
          },
        )
        const icoBuffer = this._encodeIco(res.map((r) => r.buffer))
        // write ico file
        outputPath = res[0].outputPath
        await fs.writeFile(outputPath, icoBuffer)
      } else {
        converters = this._createConverter()
        const res = await converters.run({
          ext,
          filePath,
          option: this.option,
          input: filePath,
          isLast: true,
        })
        outputPath = res.outputPath
      }

      const outputSize = await this.getFileSize(outputPath)
      return {
        inputBuffer,
        inputSize,
        outputSize,
        outputPath,
      }
    } catch (e) {
      return Promise.reject(e)
    } finally {
      // @ts-expect-error
      converters = null
    }
  }

  private _isIco(ext: string) {
    return ext === 'ico'
  }

  /**
   * @description encode ico
   */
  private _encodeIco(bufferList: Buffer[]) {
    // ico-endec only support cjs
    const icoEndec = require('ico-endec')
    return icoEndec.encode(bufferList) as Buffer
  }

  /**
   * @description resize ico
   */
  private async _resizeIco(
    image: SharpNS.Sharp,
    { size, resizeOptions }: { size: number; resizeOptions?: SharpNS.ResizeOptions },
  ) {
    return image.clone().resize({
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      ...resizeOptions,
      width: size,
      height: size,
    })
  }
}
