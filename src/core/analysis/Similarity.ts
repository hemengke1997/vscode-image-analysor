import path from 'node:path'
import pMap, { pMapSkip } from 'p-map'
import { Config } from '..'
import { hammingDistance, phash } from './phash'

export class Similarity {
  public static limit: {
    extensions: string[]
  } = {
    extensions: ['png', 'jpg', 'jpeg', 'webp', 'gif', 'tiff', 'avif', 'heif'],
  }

  static async findSimilar(image: ImageType, scope: ImageType[]) {
    let sourcehash: string

    const source = image.path
    const ext = this.getFileExt(source)
    if (!this.limit.extensions.includes(ext)) {
      return Promise.reject('format not supported')
    }

    try {
      sourcehash = await phash(source)
    } catch (e) {
      return Promise.reject(e)
    }

    const result = await pMap(scope, async (image) => {
      try {
        if (image.path === source) return pMapSkip
        const hash = await phash(image.path)
        return { image, hash }
      } catch {
        return pMapSkip
      }
    })

    const similar: { image: ImageType; distance: number }[] = []

    result.forEach((res) => {
      const distance = hammingDistance(sourcehash, res.hash)
      if (distance <= Config.similarity_precision) {
        similar.push({
          distance,
          image: res.image,
        })
      }
    })

    return similar
  }

  private static getFileExt(filePath: string) {
    return path.extname(filePath).slice(1)
  }
}
