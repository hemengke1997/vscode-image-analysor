import { Log } from '@/utils/Log'
import { type AbsCompressor, type CommonOptions, type CompressorMethod } from './AbsCompressor'
import { Sharp } from './sharp/Sharp'
import { TinyPng } from './tinypng/TinyPng'
import { TinypngFree } from './tinypng-free/TinypngFree'

const AbsorbMessage = 'Absorb instance'

class Compressor {
  static StaticSymbolFlag: symbol
  private instanceSymbol: symbol

  constructor(
    public method: CompressorMethod,
    public commonOptions: CommonOptions & {
      tinypngKey?: string
    },
    private _depsInstalled = false,
  ) {
    Compressor.StaticSymbolFlag = this.instanceSymbol = Symbol('compressor')
  }

  async init() {
    if (this.method === 'sharp') {
      if (!this._depsInstalled) {
        // fallback to tinypng if sharp is not available
        this.method = 'tinypng'
      }
    }
    return this
  }

  private _absorbInstance() {
    if (Compressor.StaticSymbolFlag !== this.instanceSymbol) {
      throw new Error(AbsorbMessage)
    }
    return true
  }

  public async getInstance(): Promise<AbsCompressor | null> {
    this._absorbInstance()

    Log.info(`Init compressor ${this.method}`)
    const methodMap: Record<
      CompressorMethod,
      {
        compressor: AbsCompressor
        next: CompressorMethod
      }
    > = {
      sharp: {
        compressor: new Sharp(this.commonOptions),
        next: 'tinypng',
      },
      tinypng: {
        compressor: new TinyPng(this.commonOptions, { apiKey: this.commonOptions.tinypngKey! }),
        next: 'tinypngFree',
      },
      tinypngFree: {
        compressor: new TinypngFree(this.commonOptions),
        next: 'tinypngFree',
      },
    }
    try {
      const current = methodMap[this.method]

      const isValid = await current.compressor.validate()
      this._absorbInstance()

      Log.info(`Compressor ${this.method} is valid: ${isValid}`)

      if (isValid) {
        Log.info(`Use [${this.method}] as compressor`)
        return current.compressor
      } else {
        Log.info(`Compressor ${this.method} is not valid, fallback to ${current.next}`)
        this.method = current.next
        return await this.getInstance()
      }
    } catch (e: any) {
      if (e instanceof Error && e.message === AbsorbMessage) {
        return null
      } else {
        Log.info(`Compressor ${this.method} init failed: ${e}`)
        return methodMap['tinypngFree'].compressor
      }
    }
  }
}

export { Compressor }
