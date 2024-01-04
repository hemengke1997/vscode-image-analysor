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
  [CmdToVscode.COPY_IMAGE]: async ({ message }: MessageParams<{ filePath: string }>) => {
    const data = await messageHandler.copyImage(message.data.filePath)
    return data
  },
  [CmdToVscode.PASTE_IMAGE]: async ({ message }: MessageParams<{ dest: string }>) => {
    const data = await messageHandler.pasteImage(message.data.dest)
    return data
  },
}
