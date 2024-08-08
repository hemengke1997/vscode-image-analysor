import { commands, type Event, EventEmitter, type ExtensionContext, ExtensionMode, window, workspace } from 'vscode'
import { Commands } from '~/commands'
import { Installer } from '~/core/sharp'
import { i18n } from '~/i18n'
import { EXT_NAMESPACE } from '~/meta'
import { AbortError, TimeoutError } from '~/utils/abort-promise'
import { Channel } from '~/utils/channel'
import { Config, Watcher, WorkspaceState } from '.'
import { ConfigKey, type VscodeConfigType } from './config/common'
import { Svgo } from './operator/svgo'

export class Global {
  static rootpaths: string[]
  /**
   * extension context
   */
  static context: ExtensionContext
  /**
   * vscode theme
   */
  static vscodeTheme: Theme
  /**
   * vscode language
   */
  static vscodeLanguage: Language
  /**
   * vscode reduce motion
   */
  static vscodeReduceMotion: ReduceMotion
  /**
   * sharp
   */
  static sharp: TSharp
  /**
   * 程序式更改配置
   */
  static isProgrammaticChangeConfig = false
  /**
   * sharp 安装器
   */
  static installer: Installer

  /**
   * events
   */
  private static _onDidChangeRootPath: EventEmitter<string[]> = new EventEmitter()

  static readonly onDidChangeRootPath: Event<string[]> = Global._onDidChangeRootPath.event

  static init(context: ExtensionContext, settings: VscodeConfigType) {
    this.context = context

    Watcher.init()
    WorkspaceState.init()
    Svgo.init()
    this.initSharpInstaller()

    this.vscodeTheme = settings.theme
    this.vscodeLanguage = settings.language
    this.vscodeReduceMotion = settings.reduceMotion

    context.subscriptions.push(workspace.onDidChangeWorkspaceFolders(() => this.updateRootPath()))
    context.subscriptions.push(
      workspace.onDidChangeConfiguration((e) => {
        for (const config of [ConfigKey.compression, ConfigKey.conversion]) {
          const key = `${EXT_NAMESPACE}.${config}`

          if (e.affectsConfiguration(key)) {
            Channel.info(i18n.t('core.config_changed', key))
            break
          }
        }
      }),
    )
    this.updateRootPath()
  }
  static updateRootPath(_rootpaths?: string[]) {
    let rootpaths = _rootpaths?.length ? _rootpaths : Config.file_root
    if (!rootpaths) {
      if (workspace.rootPath) {
        rootpaths = [workspace.rootPath]
      }
      if (workspace.workspaceFolders) {
        rootpaths = workspace.workspaceFolders.map((f) => f.uri.fsPath)
      }
    }

    if (rootpaths?.length) {
      Channel.info(i18n.t('core.workspace_changed', rootpaths.join(',')))
      this.rootpaths = rootpaths
      this._onDidChangeRootPath.fire(this.rootpaths)
    }
  }

  static initSharpInstaller() {
    this.installer = new Installer({
      timeout: 30 * 1000, // 30s
    })
  }

  static async installSharp() {
    return new Promise<boolean>(async (resolve, reject) => {
      this.installer.event
        .on('install-success', (e) => {
          Channel.info(i18n.t('prompt.deps_init_success'))
          Global.sharp = e
        })
        .on('install-fail', async (e) => {
          reject(e)
          if (e instanceof TimeoutError) {
            const SELECT_MIRROR = i18n.t('pkg.cmd.select_mirror')
            const result = await window.showErrorMessage(i18n.t('prompt.deps_init_timeout'), SELECT_MIRROR)
            if (result === SELECT_MIRROR) {
              commands.executeCommand(Commands.select_mirror)
            }
          } else if (e instanceof AbortError) {
            window.showErrorMessage(i18n.t('prompt.deps_init_aborted'))
          } else {
            Channel.error(i18n.t('prompt.compressor_init_fail'), true)
          }
          reject(e)
        })

      await this.installer.run()
      resolve(true)
    })
  }

  static isDevelopment() {
    return this.context.extensionMode === ExtensionMode.Development
  }

  static isProduction() {
    return this.context.extensionMode === ExtensionMode.Production
  }
}
