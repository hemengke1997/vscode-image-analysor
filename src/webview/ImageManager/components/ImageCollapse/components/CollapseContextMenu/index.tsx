import { useLockFn } from '@minko-fe/react-hook'
import { type ImageType } from '@rootSrc/webview/ImageManager'
import useImageOperation from '@rootSrc/webview/ImageManager/hooks/useImageOperation'
import GlobalContext from '@rootSrc/webview/ui-framework/src/contexts/GlobalContext'
import { App } from 'antd'
import { memo } from 'react'
import { Item, type ItemParams, Menu, Separator } from 'react-contexify'
import { useTranslation } from 'react-i18next'
import { os } from 'un-detector'

export const COLLAPSE_CONTEXT_MENU_ID = 'COLLAPSE_CONTEXT_MENU_ID'

function CollapseContextMenu() {
  const { theme } = GlobalContext.usePicker(['theme'])
  const { t } = useTranslation()
  const { message } = App.useApp()

  const { openInOsExplorer, openInVscodeExplorer, compressImage, onCompressEnd } = useImageOperation()

  const handleOpenInOsExplorer = (e: ItemParams<{ targetPath: string }>) => {
    openInOsExplorer(e.props?.targetPath || '')
  }

  const handleOpenInVscodeExplorer = (e: ItemParams<{ targetPath: string }>) => {
    openInVscodeExplorer(e.props?.targetPath || '')
  }

  const handleCompressImage = useLockFn(async (images: ImageType[] | undefined) => {
    if (!images?.length) return

    const LoadingKey = `${images[0].path}-compressing`

    message.loading({
      content: t('ia.compressing'),
      duration: 10,
      key: LoadingKey,
    })
    const res = await compressImage(images.map((t) => t.path) || [])
    message.destroy(LoadingKey)
    if (Array.isArray(res)) {
      res.forEach((item) => {
        onCompressEnd(item, {
          onRetryClick: (filePath) => handleCompressImage([{ path: filePath }] as ImageType[]),
        })
      })
    }
  })

  return (
    <Menu id={COLLAPSE_CONTEXT_MENU_ID} theme={theme}>
      <Item
        onClick={(e: ItemParams<{ targetPath: string; images: ImageType[] }>) => handleCompressImage(e.props?.images)}
      >
        {t('ia.compress_under_folder')}
      </Item>
      <Separator />
      <Item onClick={handleOpenInOsExplorer}>
        {os.isMac() ? t('ia.reveal_in_os_mac') : t('ia.reveal_in_os_windows')}
      </Item>
      <Item onClick={handleOpenInVscodeExplorer}>{t('ia.reveal_in_explorer')}</Item>
    </Menu>
  )
}

export default memo(CollapseContextMenu)