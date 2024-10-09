import { useMemo, useState } from 'react'
import { useSetState } from 'ahooks'
import { createContainer } from 'context-state'
import { type FormatConverterOptions } from '~/core'
import { ConfigKey } from '~/core/config/common'
import { type CompressionOptions } from '~/core/operator/compressor/type'
import { useExtConfigState } from '~/webview/hooks/use-ext-config-state'
import VscodeContext from '~/webview/ui-framework/src/contexts/vscode-context'

export type WebviewCompressorType = {
  option: CompressionOptions
  limit: {
    from: string[]
    to: string[]
  }
}

export type WebviewFormatConverterType = {
  option: FormatConverterOptions
  limit: {
    from: string[]
    to: string[]
  }
}

function useGlobalContext() {
  const { extConfig, workspaceState, vscodeConfig } = VscodeContext.usePicker([
    'extConfig',
    'workspaceState',
    'vscodeConfig',
  ])

  /* ------------- image compressor ------------ */
  const [compressor, setCompressor] = useState<WebviewCompressorType>()
  /* ---------- image format converter ---------- */
  const [formatConverter, setFormatConverter] = useState<WebviewFormatConverterType>()

  /* --------------- images state --------------- */
  const [imageState, setImageState] = useSetState<{
    loading: boolean
    workspaceFolders: string[]
    data: {
      images: ImageType[]
      workspaceFolder: string
      absWorkspaceFolder: string
      fileTypes: string[]
      dirs: string[]
    }[]
  }>({
    loading: true,
    workspaceFolders: [],
    data: [],
  })

  /* ---------------- image width --------------- */
  const [imageWidth, setImageWidth] = useExtConfigState(ConfigKey.viewer_imageWidth, extConfig.viewer.imageWidth, [], {
    wait: 500,
  })

  /* ---------- image placeholder size ---------- */
  const [imagePlaceholderSize, setImagePlaceholderSize] = useState<{ width: number; height: number }>()

  /* ---------- reveal image path ---------- */
  /**
   * @note imageReveal 是带t query参数的，用于处理同一张图片的情况
   */
  const [imageReveal, setImageReveal] = useState<string | undefined>(window.__reveal_image_path__)

  /* ----------------- dir reveal ----------------- */
  const [dirReveal, setDirReveal] = useState<string>('')

  /* ------------- tree context 中的数据 ------------ */
  const [treeData, setTreeData] = useState<{ workspaceFolder: string; visibleList: ImageType[] }[]>([])

  /* ------------ 图片sticky header的高度 ------------ */
  const [viewerHeaderStickyHeight, setViewerHeaderStickyHeight] = useState<number>(0)

  /* ----------------- 项目中所有图片类型 ---------------- */
  const allImageTypes = useMemo(() => imageState.data.flatMap((item) => item.fileTypes), [imageState.data])

  return {
    vscodeConfig,
    workspaceState,
    compressor,
    setCompressor,
    formatConverter,
    setFormatConverter,
    extConfig,
    imageState,
    setImageState,
    imageWidth,
    setImageWidth,
    imagePlaceholderSize,
    setImagePlaceholderSize,
    imageReveal,
    setImageReveal,
    treeData,
    setTreeData,
    viewerHeaderStickyHeight,
    setViewerHeaderStickyHeight,
    dirReveal,
    setDirReveal,
    allImageTypes,
  }
}

const GlobalContext = createContainer(useGlobalContext)

export default GlobalContext
