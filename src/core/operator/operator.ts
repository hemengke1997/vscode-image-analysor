import { isArray, isString, mergeWith, toString } from '@minko-fe/lodash-pro'
import fs from 'fs-extra'
import path from 'node:path'
import { i18n } from '~/i18n'
import { VscodeMessageCenter } from '~/message'
import { CmdToVscode } from '~/message/cmd'
import { generateOutputPath } from '~/utils'
import { Channel } from '~/utils/channel'
import { type Commander } from '../commander'
import { Config } from '../config'

export type OperatorOptions = {
  /**
   * @description whether keep original image file
   * @default false
   */
  keepOriginal?: boolean
}

type NativeOperatorResult = {
  /**
   * 操作id
   */
  id: string
  /**
   * 输入的文件路径
   */
  filePath: string
  /**
   * 输入文件的Buffer
   */
  inputBuffer?: Buffer | null
  /**
   * 输入文件的体积
   */
  inputSize?: number
  /**
   * 输出文件的体积
   */
  outputSize?: number
  /**
   * 输出文件路径
   */
  outputPath?: string
  /**
   * 错误
   */
  error?: any
}

export type OperatorResult = NativeOperatorResult & {
  /**
   * 是否跳过了操作
   */
  isSkiped?: boolean
  /**
   * 图片类型是否被限制支持
   */
  isLimited?: boolean
}

export abstract class Operator {
  /**
   * 原文件路径 (同时作为操作id)
   */
  abstract inputPath: string
  /**
   * 原文件内容 (buffer)，用于撤销
   */
  abstract inputBuffer: Buffer | null
  /**
   * 操作之后的文件输出路径
   */
  abstract outputPath: string
  /**
   * 操作命令
   */
  public abstract commander: Commander | null

  /**
   * 支持的文件扩展类型
   */
  public extensions: string[] = []

  /**
   * 对图片的一些限制
   * from: 支持接收的图片格式
   * to: 支持输出的图片格式
   * size: 图片大小限制
   */
  public limit: {
    /**
     * 支持接收的图片格式
     */
    from: string[]
    /**
     * 支持输出的图片格式
     */
    to: string[]
    /**
     * 图片大小限制
     */
    size?: number
  } = {
    from: [],
    to: [],
  }

  public abstract option: OperatorOptions

  /**
   * 执行操作
   */
  abstract run<T extends OperatorOptions>(filePath: string, option: T | undefined): Promise<OperatorResult>

  /**
   * 撤销操作
   */
  async undo() {
    if (this.outputPath) {
      // 如果保留了原文件，则删除新增的文件即可
      if (this.option.keepOriginal) {
        // 删除新增的文件
        if (fs.existsSync(this.outputPath)) {
          await this.trashFile(this.outputPath, { useTrash: false })
        } else {
          throw new Error(i18n.t('core.file_not_exist'))
        }
      } else if (this.inputBuffer) {
        // 如果没有保留原文件，判断新增文件与原文件路径是否一致
        // 路径一致，则直接覆盖文件
        // 否则需要删除新增文件
        if (this.inputPath !== this.outputPath) {
          if (fs.existsSync(this.outputPath)) {
            await this.trashFile(this.outputPath, { useTrash: false })
          } else {
            throw new Error(i18n.t('core.file_not_exist'))
          }
        }

        await fs.writeFile(this.inputPath, this.inputBuffer)
      }
    }
  }

  /**
   * 处理操作结果
   */
  resolveResult(res: NativeOperatorResult): OperatorResult {
    const isSkiped = res.error instanceof SkipError
    const isLimited = res.error instanceof LimitError

    // 记录撤销操作所需字段
    if (res.outputPath) {
      this.outputPath = res.outputPath
    }
    if (res.inputBuffer) {
      this.inputBuffer = res.inputBuffer
      this.addCommandCache()
    }

    return {
      ...res,
      error: res.error?.message ? res.error.message : toString(res.error),
      isSkiped,
      isLimited,
      inputBuffer: null, // 减少非必要的传输数据量
    }
  }

  /**
   * 把撤销命令添加到缓存中
   */
  addCommandCache() {
    this.commander?.addToCache()
  }

  /**
   * 合并配置
   */
  mergeOption(option) {
    return mergeWith(this.option, option || {}, (_, srcValue) => {
      if (isArray(srcValue)) return srcValue
    })
  }

  /**
   * 检查是否支持该图片
   */
  private _isSupported(filePath: string) {
    const ext = this.getFileExt(filePath)

    if (!this.limit.from.includes(ext)) {
      return i18n.t('core.compress_fail_reason_extension', ext)
    }

    // const { size } = fs.statSync(filePath)
    // if (this.limit.size && size >= this.limit.size) {
    //   return i18n.t('core.compress_fail_reason_size', this.limit.size / 1024 / 1024)
    // }

    return true
  }

  /**
   * 检查是否支持图片类型
   */
  public checkLimit(filePath: string) {
    const res = this._isSupported(filePath)
    if (isString(res)) {
      return Promise.reject(new LimitError(res))
    }
    return Promise.resolve(true)
  }

  /**
   * 获取文件名
   */
  public getFilename(filePath: string) {
    const { name } = path.parse(filePath)
    return name
  }

  /**
   * 获取文件后缀名
   */
  public getFileExt(filePath: string) {
    return path.extname(filePath).slice(1)
  }

  /**
   * 删除文件
   */
  async trashFile(
    filePath: string,
    options?: {
      useTrash?: boolean
    },
  ) {
    try {
      const { useTrash = Config.file_trashAfterProcessing } = options || {}
      await VscodeMessageCenter[CmdToVscode.delete_file]({ filePaths: [filePath], useTrash })
    } catch (e) {
      Channel.info(`${i18n.t('core.trash_error')}: ${e}`)
    }
  }

  /**
   * 生成输出路径
   */
  public getOutputPath(
    sourcePath: string,
    outputOptions: {
      ext: string
      size: number
      fileSuffix?: string
    } = {
      ext: '',
      size: 1,
      fileSuffix: '',
    },
  ): string {
    const { ext, size, fileSuffix } = outputOptions
    const { keepOriginal } = this.option || {}

    let outputPath = sourcePath
    if (size !== 1) {
      outputPath = generateOutputPath(outputPath, `@${size}x`)
    }

    if (keepOriginal && fileSuffix) {
      outputPath = generateOutputPath(outputPath, fileSuffix)
    }

    return this.changeExt(outputPath, ext)
  }

  /**
   * 修改文件后缀名
   */
  public changeExt(filePath: string, ext?: string) {
    if (ext) {
      return filePath.replace(new RegExp(`${this.getFileExt(filePath)}$`), ext)
    }
    return filePath
  }

  /**
   * 获取文件体积大小
   */
  public async getFileSize(filePath: string) {
    return (await fs.stat(filePath)).size
  }
}

export class LimitError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = 'LimitError'
  }
}

export class SkipError extends Error {
  constructor(message?: string) {
    super(message)
    this.name = 'SkipError'
  }
}
