import { useMemoizedFn } from '@minko-fe/react-hook'
import { App } from 'antd'
import { memo } from 'react'
import { Item, type ItemParams, type PredicateParams, Separator, Submenu } from 'react-contexify'
import { useTranslation } from 'react-i18next'
import { os } from 'un-detector'
import { type ImageType } from '~/webview/ImageManager'
import useImageOperation from '~/webview/ImageManager/hooks/useImageOperation'
import MaskMenu from '../../../MaskMenu'

export const COLLAPSE_CONTEXT_MENU_ID = 'COLLAPSE_CONTEXT_MENU_ID'
export const COLLAPSE_CONTEXT_MENU = {
  openInOsExplorer: 'openInOsExplorer',
  openInVscodeExplorer: 'openInVscodeExplorer',
  compressImage: 'compressImage',
  compressImageDeeply: 'compressImageDeeply',
}

export type CollapseContextMenuType =
  | {
      [key in keyof typeof COLLAPSE_CONTEXT_MENU]?: boolean
    }
  | boolean

function CollapseContextMenu() {
  const { t } = useTranslation()
  const { message } = App.useApp()

  const { openInOsExplorer, openInVscodeExplorer, beginCompressProcess } = useImageOperation()

  const isItemHidden = (e: PredicateParams<{ contextMenu: CollapseContextMenuType }>) => {
    const { data, props } = e
    if (Array.isArray(data)) {
      return data.every((d) => props?.contextMenu[d] === false)
    }
    return props?.contextMenu[data] === false
  }

  const handleOpenInOsExplorer = (e: ItemParams<{ targetPath: string }>) => {
    openInOsExplorer(e.props?.targetPath || '')
  }

  const handleOpenInVscodeExplorer = (e: ItemParams<{ targetPath: string }>) => {
    openInVscodeExplorer(e.props?.targetPath || '')
  }

  const _compressImage = useMemoizedFn((images: ImageType[] | undefined) => {
    if (!images?.length) {
      return message.warning(t('im.no_image_to_compress'))
    }
    beginCompressProcess(images)
  })

  const handleCompressImage = useMemoizedFn((e: ItemParams<{ images: ImageType[] }>) => {
    _compressImage(e.props!.images)
  })

  const handleCompressImageDeeply = useMemoizedFn((e: ItemParams<{ underFolderDeeplyImages: ImageType[] }>) => {
    _compressImage(e.props!.underFolderDeeplyImages)
  })

  return (
    <>
      <MaskMenu id={COLLAPSE_CONTEXT_MENU_ID}>
        <Item hidden={isItemHidden} onClick={handleOpenInOsExplorer} data={COLLAPSE_CONTEXT_MENU.openInOsExplorer}>
          {os.isMac() ? t('im.reveal_in_os_mac') : t('im.reveal_in_os_windows')}
        </Item>
        <Item
          hidden={isItemHidden}
          onClick={handleOpenInVscodeExplorer}
          data={COLLAPSE_CONTEXT_MENU.openInVscodeExplorer}
        >
          {t('im.reveal_in_explorer')}
        </Item>

        <Separator
          hidden={isItemHidden}
          data={[COLLAPSE_CONTEXT_MENU.openInOsExplorer, COLLAPSE_CONTEXT_MENU.openInVscodeExplorer]}
        />
        <Submenu
          label={t('im.compress')}
          hidden={(e) =>
            isItemHidden({
              ...e,
              data: [COLLAPSE_CONTEXT_MENU.compressImage, COLLAPSE_CONTEXT_MENU.compressImageDeeply],
            })
          }
        >
          <Item hidden={isItemHidden} onClick={handleCompressImage} data={COLLAPSE_CONTEXT_MENU.compressImage}>
            {t('im.child_folder')}
          </Item>
          <Item
            hidden={isItemHidden}
            onClick={handleCompressImageDeeply}
            data={COLLAPSE_CONTEXT_MENU.compressImageDeeply}
          >
            {t('im.all_folder')}
          </Item>
        </Submenu>
      </MaskMenu>
    </>
  )
}

export default memo(CollapseContextMenu)
