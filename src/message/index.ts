import { Log } from '@rootSrc/utils/Log'
import micromatch from 'micromatch'
import { type Webview } from 'vscode'
import { messageHandler } from './messageHandler'
import { CmdToVscode } from './shared'

export type MessageType<T = any> = {
  msgId: string
  cmd: string
  postTime: string
  callbackId: string
  data: T
}

export type MessageParams<T = any> = { message: MessageType<T>; webview: Webview }

export type KeyofMessage = keyof typeof VscodeMessageCenter

export type ReturnOfMessageCenter<K extends KeyofMessage> = RmPromise<ReturnType<(typeof VscodeMessageCenter)[K]>>

export const VscodeMessageCenter = {
  [CmdToVscode.RELOAD_WEBVIEW]: async () => {
    const data = messageHandler.reloadWebview()
    return data
  },
  [CmdToVscode.GET_ALL_IMAGES]: async ({ webview }: MessageParams) => {
    const data = await messageHandler.getAllImgs(webview)
    return data
  },
  [CmdToVscode.GET_IMAGE_DIMENSIONS]: async ({ message }: MessageParams<{ filePath: string }>) => {
    const data = messageHandler.getImageDimensions(message.data.filePath)
    return data
  },
  [CmdToVscode.GET_EXT_CONFIG]: async () => {
    const data = messageHandler.getExtConfig()
    return data
  },
  [CmdToVscode.GET_COMPRESSOR]: () => {
    const data = messageHandler.getCompressor()
    return data
  },
  [CmdToVscode.OPEN_IMAGE_IN_VSCODE_EXPLORER]: ({ message }: MessageParams<{ filePath: string }>) => {
    messageHandler.openImageInVscodeExplorer(message.data.filePath)
  },
  [CmdToVscode.OPEN_IMAGE_IN_OS_EXPLORER]: ({ message }: MessageParams<{ filePath: string }>) => {
    messageHandler.openImageInOsExplorer(message.data.filePath)
  },
  [CmdToVscode.COPY_IMAGE_AS_BASE64]: ({ message }: MessageParams<{ filePath: string }>) => {
    return messageHandler.copyImageAsBase64(message.data.filePath)
  },
  [CmdToVscode.COMPRESS_IMAGE]: async ({
    message,
  }: MessageParams<{ filePaths: string[] }>): Promise<
    | {
        filePath: string
        originSize?: number | undefined
        compressedSize?: number | undefined
        error?: any
      }[]
    | undefined
  > => {
    try {
      const res = await messageHandler.compressImage(message.data.filePaths)
      Log.info(`Compress result: ${JSON.stringify(res)}`)
      return res
    } catch (e: any) {
      Log.error(`Compress error: ${e}`)
      return e
    }
  },
  [CmdToVscode.MICROMATCH_ISMATCH]: ({ message }: MessageParams<{ filePaths: string[]; globs: string[] }>) => {
    const { filePaths, globs } = message.data
    return micromatch(filePaths, globs)
  },
  [CmdToVscode.TEMP_TEST_CMD]: ({ message }: MessageParams<{ cmd: string; path: string }>) => {
    messageHandler.testBuiltInCmd({
      cmd: message.data.cmd,
      path: message.data.path,
    })
  },
}
