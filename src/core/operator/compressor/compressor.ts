import { toString } from 'lodash-es'
import { type Commander } from '~/core/commander'
import { i18n } from '~/i18n'
import { Channel } from '~/utils/channel'
import logger from '~/utils/logger'
import { Operator, type OperatorOptions, type OperatorResult } from '../operator'

export abstract class Compressor extends Operator {
  public inputPath: string = ''
  public commander: Commander | null = null
  public outputPath: string = ''
  public inputBuffer: Buffer | null = null

  abstract core(
    filePath: string,
  ): Promise<{ inputSize: number; outputSize: number; outputPath: string; inputBuffer: Buffer }>

  async compressImage(filePath: string) {
    const result = {
      filePath,
    }
    try {
      await this.checkLimit(filePath)
      const res = await this.core(filePath)

      return {
        ...result,
        ...res,
      }
    } catch (e) {
      Channel.debug(`core ${i18n.t('core.compress_error')}: ${toString(e)}`)

      logger.error(e)

      return {
        error: e,
        ...result,
      }
    }
  }

  async run<T extends OperatorOptions>(image: ImageType, option: T | undefined): Promise<OperatorResult> {
    this.image = image
    this.option = this.mergeOption(option)

    this.inputPath = image.path

    const r = await this.compressImage(this.inputPath)

    return this.resolveResult(r)
  }
}
