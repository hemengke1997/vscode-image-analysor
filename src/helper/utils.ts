import { Uri, type Webview, env, window, workspace } from 'vscode'

export const getProjectPath = () => {
  try {
    const workspaceFolders = workspace.workspaceFolders
    if (!workspaceFolders || workspaceFolders.length === 0) {
      return ''
    }
    if (workspaceFolders.length > 1) {
      console.error('more than one workspaceFolders')
    }
    return workspaceFolders[0].uri.fsPath
  } catch (error) {
    showError('workspace not found')
  }
  return ''
}

let lastLogTimestamp = 0

/**
 * log to file
 */
const log = (text: any) => {
  const now = new Date()
  const gap = now.getTime() - lastLogTimestamp
  // add some blank rows
  if (gap > 5 * 1000) {
    if (gap > 120 * 1000) {
      console.log('\n\n')
    }
    console.log('')
  }
  lastLogTimestamp = now.getTime()
  console.log(`${new Date().toISOString()} ${text}`)
}
export const logInfo = (text: any, ...args: any[]) => log(`[Info] ${text} ${args.join('')}`)
export const logWarn = (text: any) => log(`[Warn] ${text}`)
export const logError = (text: any) => log(`[Error] ${text}`)
export const showInfo = (text: any) => {
  window.showInformationMessage(text)
  logInfo(text)
}
export const showError = (text: any) => {
  window.showErrorMessage(text)
  logError(text)
}

export function getUri(webview: Webview, extensionUri: Uri, pathList: string[]) {
  return webview.asWebviewUri(Uri.joinPath(extensionUri, ...pathList))
}

export function slash(path: string) {
  return path.replace(/\\/g, '/')
}

export function getEnvForWebview() {
  return {
    language: env.language,
  }
}
