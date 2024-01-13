import fs from 'node:fs'
import tinify from 'tinify'
import { AbsCompressor, type CompressOptions } from '../AbsCompressor'

type TinypngOptions = {
  apiKey: string
}

type PostInfo = {
  error?: any
  output: {
    url: string
    size: number
    type: string
    width: number
    height: number
    ratio: number
  }
}

class TinyPng extends AbsCompressor {
  public static DEFAULT_CONFIG = {
    exts: ['.png', '.jpg', '.jpeg', '.webp'],
    max: 10 * 1024 * 1024, // 10MB
  }

  constructor(
    public compressOptions: CompressOptions,
    public options: TinypngOptions,
  ) {
    super(compressOptions, {
      exts: TinyPng.DEFAULT_CONFIG.exts,
      sizeLimit: TinyPng.DEFAULT_CONFIG.max,
    })

    tinify.key = options.apiKey
  }

  compress(filePaths: string[]): Promise<
    {
      filePath: string
      originSize?: number | undefined
      compressedSize?: number | undefined
      error?: any
    }[]
  > {
    const res = Promise.all(filePaths.map((filePath) => this.tiny_compress(filePath)))
    return res
  }

  async tiny_compress(filePath: string) {
    try {
      await this.tryCompressable(filePath)

      const originSize = fs.statSync(filePath).size
      const postInfo = await this.fileUpload(filePath)

      return {
        originSize,
        compressedSize: postInfo.output.size,
        filePath,
      }
    } catch (e) {
      return {
        error: e,
        filePath,
      }
    }
  }

  async fileUpload(filePath: string): Promise<PostInfo> {
    return new Promise((resolve, reject) => {
      tinify.fromFile(filePath).toBuffer((err, buffer) => {
        if (err) {
          if (err instanceof tinify.AccountError) {
            reject('Authentication failed. Have you set the API Key?')
          }
          if (err instanceof tinify.ClientError) {
            reject('Check your source image and request options.')
          }
          if (err instanceof tinify.ServerError) {
            reject('Temporary issue with the Tinify API. Please try again later.')
          }
          if (err instanceof tinify.ConnectionError) {
            reject('A network connection error occurred.')
          }
          reject(err)
        }

        if (buffer) {
          const fileWritableStream = fs.createWriteStream(this.getOutputPath(filePath))
          fileWritableStream.write(buffer)
          fileWritableStream.on('finish', () => {
            const postInfo = JSON.parse(buffer.toString()) as PostInfo
            resolve(postInfo)
          })
        }
      })
    })
  }

  validateApiKey(): Promise<boolean> {
    return new Promise((resolve, reject) => {
      tinify.validate((err: Error | null) => {
        if (err) {
          reject(err)
        } else {
          resolve(true)
        }
      })
    })
  }
}

export { TinyPng }
