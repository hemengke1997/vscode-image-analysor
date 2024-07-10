import { useMemoizedFn } from '@minko-fe/react-hook'
import styleObjectToString from '@minko-fe/style-object-to-string'
import { Card, Empty, Skeleton } from 'antd'
import { AnimatePresence, motion } from 'framer-motion'
import { produce } from 'immer'
import { memo, useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { IoMdImages } from 'react-icons/io'
import GlobalContext from '../../contexts/global-context'
import SettingsContext from '../../contexts/settings-context'
import TreeContext from '../../contexts/tree-context'
import { useSticky } from '../../hooks/use-sticky'
import useWheelScaleEvent from '../../hooks/use-wheel-scale-event'
import { ANIMATION_DURATION } from '../../utils/duration'
import CollapseTree from '../collapse-tree'
import ImageActions from '../image-actions'
import TitleIconUI from '../title-icon-UI'

function Viewer() {
  const { t } = useTranslation()
  const { imageState, imageFilter, setTreeData, setViewerHeaderStickyHeight } = GlobalContext.usePicker([
    'imageState',
    'imageFilter',
    'setTreeData',
    'setViewerHeaderStickyHeight',
  ])

  const { displayGroup, displayStyle, sort, displayImageTypes } = SettingsContext.usePicker([
    'displayGroup',
    'displayStyle',
    'sort',
    'displayImageTypes',
  ])

  const onCollectTreeData = useMemoizedFn(
    ({ visibleList, workspaceFolder }: { visibleList: ImageType[]; workspaceFolder: string }) => {
      setTreeData(
        produce((draft) => {
          const index = draft.findIndex((t) => t.workspaceFolder === workspaceFolder)
          if (index !== -1) {
            draft[index].visibleList = [...visibleList]
          } else {
            draft.push({ workspaceFolder, visibleList })
          }
        }),
      )
    },
  )

  /* ---------------- image scale --------------- */
  const [containerRef] = useWheelScaleEvent()

  const stickyRef = useRef<HTMLDivElement>(null)

  const target = stickyRef.current?.querySelector('.ant-card-head') as HTMLElement

  useSticky({
    target,
    onStickyToogle(sticky, { style: rawStyle }) {
      if (sticky) {
        const style =
          styleObjectToString({
            position: 'sticky',
            // 比collapse的sticky层级高就行
            zIndex: 5,
            backgroundColor: 'var(--ant-color-bg-container)',
            top: '0px',
          }) || ''
        target.setAttribute('style', rawStyle + style)
      } else {
        target.setAttribute('style', rawStyle)
      }
    },
  })

  useEffect(() => {
    if (target) {
      setViewerHeaderStickyHeight(target.getBoundingClientRect().height)
    }
  }, [target])

  return (
    <div ref={containerRef} className={'space-y-4'}>
      <Card
        styles={{
          header: {
            borderBottom: 'none',
          },
          body: { padding: 0 },
        }}
        title={<TitleIconUI icon={<IoMdImages />}>{t('im.images')}</TitleIconUI>}
        extra={<ImageActions />}
        ref={stickyRef}
      >
        <AnimatePresence mode='sync'>
          {imageState.loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: ANIMATION_DURATION.middle }}
            >
              <Skeleton className={'px-4 py-2'} active paragraph={{ rows: 4 }} />
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: ANIMATION_DURATION.middle }}
            >
              <div className={'space-y-4'}>
                {imageState.data.length ? (
                  imageState.data.map((item) => (
                    <TreeContext.Provider
                      key={item.workspaceFolder}
                      value={{
                        imageList: item.images,
                        workspaceFolder: item.workspaceFolder,
                        sort,
                        displayImageTypes,
                        imageFilter,
                        onCollectTreeData,
                      }}
                    >
                      <CollapseTree displayGroup={displayGroup} displayStyle={displayStyle} />
                    </TreeContext.Provider>
                  ))
                ) : (
                  <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('im.no_image')} />
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </div>
  )
}

export default memo(Viewer)
