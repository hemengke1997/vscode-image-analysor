import { intersection, uniq } from '@minko-fe/lodash-pro'
import { CmdToVscode, CmdToWebview } from '@rootSrc/message/constant'
import { App, Card, Skeleton } from 'antd'
import { AnimatePresence, motion } from 'framer-motion'
import { type Stats } from 'node:fs'
import { type ParsedPath } from 'node:path'
import { type ReactElement, type ReactNode, useEffect, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { localStorageEnum } from '../local-storage'
import PrimaryColorPicker from '../ui-framework/src/components/CustomConfigProvider/components/PrimaryColorPicker'
import FrameworkContext from '../ui-framework/src/contexts/FrameworkContext'
import { vscodeApi } from '../vscode-api'
import CollapseTree from './components/CollapseTree'
import ContextMenus from './components/ContextMenus'
import DisplayGroup, { type GroupType } from './components/DisplayGroup'
import DisplaySort from './components/DisplaySort'
import DisplayStyle from './components/DisplayStyle'
import DisplayType from './components/DisplayType'
import ImageActions from './components/ImageActions'
import ImageCropper from './components/ImageCropper'
import ImageForSize from './components/ImageForSize'
import ImageSearch from './components/ImageSearch'
import ActionContext from './contexts/ActionContext'
import CroppoerContext from './contexts/CropperContext'
import GlobalContext from './contexts/GlobalContext'
import SettingsContext from './contexts/SettingsContext'
import TreeContext from './contexts/TreeContext'
import useWheelScaleEvent from './hooks/useWheelScaleEvent'
import { Colors } from './utils/color'

vscodeApi.registerEventListener()

// The visible of image is determined by 'visible' prop.
// at present, there are two filetr condition
// 1. type - image type (i.e png, jpg, gif)
// 2. size - image size (i.e 1kb)
type ImageVisibleFilterType = 'type' | 'size'

export type ImageType = {
  name: string
  path: string
  stats: Stats
  dirPath: string
  fileType: string
  vscodePath: string
  workspaceFolder: string
  absWorkspaceFolder: string
  absDirPath: string
  basePath: string
  extraPathInfo: ParsedPath
} & {
  // extra

  // image visible
  visible?: Partial<Record<ImageVisibleFilterType | string, boolean>>
  // image name for display
  nameElement?: ReactElement
}

export default function ImageManager() {
  const { message } = App.useApp()
  const { t } = useTranslation()

  const { mode } = FrameworkContext.usePicker(['mode'])

  const { imageState, setImageState } = GlobalContext.usePicker(['imageState', 'setImageState'])

  const { imageRefreshedState, refreshImages, imageSearchOpen, setImageSearchOpen } = ActionContext.usePicker([
    'imageRefreshedState',
    'refreshImages',
    'imageSearchOpen',
    'setImageSearchOpen',
  ])

  const {
    sort,
    setSort,
    displayStyle,
    setDisplayStyle,
    displayGroup,
    setDisplayGroup,
    displayImageTypes,
    setDisplayImageTypes,
  } = SettingsContext.useSelector((ctx) => ctx)

  const { refreshTimes, refreshType } = imageRefreshedState

  useEffect(() => {
    const isRefresh = refreshTimes && refreshType === 'refresh'
    const messageKey = 'REFRESH_IMAGES'
    if (isRefresh) {
      message.loading({
        content: t('im.img_refreshing'),
        key: messageKey,
        duration: 0,
      })
    }

    vscodeApi.postMessage({ cmd: CmdToVscode.GET_ALL_IMAGES }, ({ data, workspaceFolders }) => {
      console.log('GET_ALL_IMAGES', data, workspaceFolders)

      setImageState({
        data,
        workspaceFolders,
        loading: false,
      })

      const allTypes = data.flatMap((item) => item.fileTypes)
      const imageTypes = displayImageTypes?.length ? intersection(displayImageTypes, allTypes) : allTypes
      onImageTypeChange(imageTypes)

      if (isRefresh) {
        message.destroy(messageKey)
        message.success(t('im.img_refreshed'))
      }
    })
  }, [refreshTimes])

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      const message = e.data
      switch (message.cmd) {
        case CmdToWebview.IMAGES_CHANGED: {
          refreshImages({ type: 'slientRefresh' })
          break
        }
        default:
          break
      }
    }
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
    }
  }, [])

  /* ------------ image type checkbox ----------- */
  const allImageTypes = useMemo(() => uniq(imageState.data.flatMap((item) => item.fileTypes)), [imageState.data])
  const allImageFiles = useMemo(() => imageState.data.flatMap((item) => item.imgs), [imageState.data])

  const onImageTypeChange = (checked: string[]) => {
    setDisplayImageTypes(checked)
  }

  /* ---------------- image group --------------- */
  const groupType: { label: string; value: GroupType; hidden?: boolean }[] = useMemo(
    () => [
      {
        label: 'TODO: workspace',
        value: 'workspace',
        hidden: true,
      },
      {
        label: t('im.group_by_dir'),
        value: 'dir',
      },
      {
        label: t('im.group_by_type'),
        value: 'type',
      },
    ],
    [],
  )

  const { backgroundColor, setBackgroundColor } = SettingsContext.usePicker(['backgroundColor', 'setBackgroundColor'])

  /* ---------------- image sort ---------------- */
  const sortOptions = [
    {
      label: t('im.name_sort'),
      value: 'name',
    },
    {
      label: t('im.size_sort'),
      value: 'size',
    },
  ]

  const onSortChange = (value: string[]) => {
    setSort(value)
  }

  /* ---------------- image scale --------------- */
  const [containerRef] = useWheelScaleEvent()

  /* --------------- image cropper -------------- */
  const { cropperProps, setCropperProps } = CroppoerContext.usePicker(['cropperProps', 'setCropperProps'])

  return (
    <>
      <ContextMenus />

      <div ref={containerRef} className={'space-y-4'}>
        <AnimatePresence>
          {mode === 'standard' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <Card size='small' title={t('im.settings')}>
                <div className={'flex flex-col space-y-2.5'}>
                  <OperationItemUI title={t('im.type')}>
                    <DisplayType
                      imageType={{
                        all: allImageTypes,
                        checked: displayImageTypes!,
                      }}
                      images={allImageFiles}
                      onImageTypeChange={onImageTypeChange}
                    />
                  </OperationItemUI>

                  <div className={'flex space-x-6'}>
                    <OperationItemUI title={t('im.group')}>
                      <DisplayGroup
                        options={groupType
                          .filter((t) => !t.hidden)
                          .map((item) => ({ label: item.label, value: item.value }))}
                        value={displayGroup}
                        onChange={setDisplayGroup}
                      ></DisplayGroup>
                    </OperationItemUI>
                    <OperationItemUI title={t('im.style')}>
                      <DisplayStyle value={displayStyle} onChange={setDisplayStyle} />
                    </OperationItemUI>
                  </div>

                  <div className={'flex space-x-6'}>
                    <OperationItemUI title={t('im.sort')}>
                      <DisplaySort options={sortOptions} value={sort} onChange={onSortChange} />
                    </OperationItemUI>
                    <OperationItemUI title={t('im.background_color')}>
                      <PrimaryColorPicker
                        color={backgroundColor}
                        onColorChange={setBackgroundColor}
                        localKey={localStorageEnum.LOCAL_STORAGE_BACKGROUND_RECENT_COLORS_KEY}
                        extraColors={[Colors.warmBlack]}
                      />
                    </OperationItemUI>
                  </div>
                </div>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        <Card
          headStyle={{ borderBottom: 'none' }}
          bodyStyle={{ padding: 0 }}
          title={t('im.images')}
          extra={<ImageActions />}
        >
          {imageState.loading ? (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2, delay: 1 }}>
              <Skeleton className={'p-4'} active paragraph={{ rows: 14 }} />
            </motion.div>
          ) : (
            <div className={'space-y-4'}>
              {imageState.data.map((item, index) => (
                <TreeContext.Provider
                  key={index}
                  value={{
                    imageList: item.imgs,
                  }}
                >
                  <TreeContext.Consumer>
                    {({ dirs, imageType, workspaceFolders }) => (
                      <CollapseTree
                        workspaceFolders={workspaceFolders}
                        displayStyle={displayStyle!}
                        dirs={dirs}
                        imageType={imageType}
                        displayGroup={displayGroup}
                      />
                    )}
                  </TreeContext.Consumer>
                </TreeContext.Provider>
              ))}
            </div>
          )}
        </Card>

        <ImageForSize />
        <ImageSearch open={imageSearchOpen} onOpenChange={setImageSearchOpen} />
      </div>
      <ImageCropper
        {...cropperProps}
        onOpenChange={(open) =>
          setCropperProps((t) => ({
            ...t,
            open,
          }))
        }
      />
    </>
  )
}

type OperationItemProps = {
  children: ReactNode
  title: ReactNode
}

function OperationItemUI(props: OperationItemProps) {
  const { children, title } = props
  return (
    <div className={'flex items-center space-x-4'}>
      <div className={'font-semibold'}>{title}</div>
      {children}
    </div>
  )
}
