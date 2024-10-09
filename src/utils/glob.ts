import { convertPathToPattern } from 'globby'
import { remove } from 'lodash-es'
import micromatch from 'micromatch'

function addLastSlash(path: string) {
  return path.replace(/\/?$/g, '/')
}

export type Pattern = string

function isNegativePattern(pattern: Pattern): boolean {
  return pattern.startsWith('!') && pattern[1] !== '('
}

function isPositivePattern(pattern: Pattern): boolean {
  return !isNegativePattern(pattern)
}

function convertToPositivePattern(pattern: Pattern): Pattern {
  return isNegativePattern(pattern) ? pattern.slice(1) : pattern
}

function convertToNegativePattern(pattern: Pattern): Pattern {
  return `!${pattern}`
}

function convertToIgnore(patterns: string[]) {
  return patterns.map((pattern) => {
    if (isPositivePattern(pattern)) {
      if (!pattern.startsWith('*')) {
        return convertToNegativePattern(`**/${pattern}`)
      }
      return convertToNegativePattern(pattern)
    }
    return convertToPositivePattern(pattern)
  })
}

export function imageGlob(options: { scan: string[]; exclude: string[]; cwds: string[] }) {
  const { scan, exclude, cwds } = options

  const imagePattern = `**/*.{${scan.join(',')}}`

  const create = (pattern: string, exclude: string[]) => {
    const patterns = cwds.map((cwd) => `${addLastSlash(convertPathToPattern(cwd))}${pattern}`)
    exclude.forEach((e) => {
      patterns.forEach((pattern) => {
        if (micromatch.isMatch(pattern, e)) {
          remove(exclude, (t) => t === e)
        }
      })
    })
    return patterns.concat(...convertToIgnore(exclude))
  }

  const allImagePatterns = create(imagePattern, exclude)
  const allCwdPatterns = create('**/*', exclude)

  return {
    imagePattern,
    allImagePatterns,

    allCwdPatterns,
  }
}
