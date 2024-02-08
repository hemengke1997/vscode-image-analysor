import fs from 'fs-extra'
import https from 'node:https'
import {
  AbstractCompressor,
  type CommonOptions,
  type CompressinOptions,
  type CompressorMethod,
} from '../abstract/AbstractCompressor'

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

export class TinypngFree extends AbstractCompressor {
  name: CompressorMethod = 'tinypngFree'
  option: CompressinOptions

  public static DEFAULT_CONFIG = {
    exts: ['png', 'jpg', 'jpeg', 'webp'],
    max: 5 * 1024 * 1024, // 5MB
  }

  constructor(public commonOptions: CommonOptions) {
    super(commonOptions, {
      exts: TinypngFree.DEFAULT_CONFIG.exts,
      sizeLimit: TinypngFree.DEFAULT_CONFIG.max,
    })
    this.option = {
      keep: 0,
    }
  }

  validate(): Promise<boolean> {
    return Promise.resolve(true)
  }

  async compress(
    filePaths: string[],
    option: CompressinOptions,
  ): Promise<
    {
      filePath: string
      originSize?: number
      compressedSize?: number
      error?: any
    }[]
  > {
    this.option = option
    const res = Promise.all(filePaths.map((filePath) => this.tiny_compress(filePath)))
    return res
  }

  async tiny_compress(filePath: string) {
    try {
      await this.tryCompressable(filePath)
      const originSize = fs.statSync(filePath).size
      const postInfo = await this.fileUpload(filePath)
      await this._downloadFile(filePath, postInfo)
      return {
        originSize,
        compressedSize: postInfo.output.size,
        filePath,
      }
    } catch (e) {
      if (e instanceof Error) {
        return {
          error: e.message,
          filePath,
        }
      }
      return {
        error: String(e),
        filePath,
      }
    }
  }

  async fileUpload(filePath: string): Promise<PostInfo> {
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          method: 'POST',
          hostname: 'tinypng.com',
          path: '/backend/opt/shrink',
          headers: {
            'Cache-Control': 'no-cache',
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'X-Forwarded-For': this._genRandomIP(),
          },
          agent: new https.Agent({ rejectUnauthorized: false }),
        },
        (res) => {
          res.on('data', (buffer: Buffer) => {
            const postInfo = JSON.parse(buffer.toString()) as PostInfo
            if (postInfo.error) {
              reject(postInfo.error)
            } else {
              resolve(postInfo)
            }
          })
        },
      )

      const fileStream = fs.createReadStream(filePath)

      fileStream.pipe(req)
      req.on('error', (e) => {
        reject(e)
      })
      fileStream.on('error', (e) => {
        reject(e)
      })
      fileStream.on('end', () => {
        req.end()
      })
    })
  }

  private async _downloadFile(filePath: string, info: PostInfo): Promise<void> {
    return new Promise((resolve, reject) => {
      const options = new URL(info.output.url)
      const req = https.request(options, (res) => {
        const outputPath = this.getOutputPath(filePath)
        const fileWritableStream = fs.createWriteStream(outputPath)
        res.pipe(fileWritableStream)
        fileWritableStream.on('finish', () => {
          this.trashFile(filePath)
          resolve()
        })
        fileWritableStream.on('error', (e) => {
          reject(e)
        })
      })
      req.on('error', (e) => {
        reject(e)
      })
      req.end()
    })
  }

  private _genRandomIP() {
    return Array.from(Array(3))
      .map(() => Number.parseInt(String(Math.random() * 255), 10))
      .concat([new Date().getTime() % 255])
      .join('.')
  }
}
