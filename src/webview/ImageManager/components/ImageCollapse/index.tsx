import { Collapse, type CollapseProps } from 'antd'
import { type ReactNode, memo, useEffect, useState } from 'react'
import { useContextMenu } from 'react-contexify'
import ImageManagerContext from '../../contexts/ImageManagerContext'
import ImagePreview, { type ImagePreviewProps } from '../ImagePreview'
import CollapseContextMenu, { COLLAPSE_CONTEXT_MENU_ID } from './components/CollapseContextMenu'

type ImageCollapseProps = {
  collapseProps: CollapseProps
  label: ReactNode
  images: ImagePreviewProps['images']
  nestedChildren: JSX.Element | null
  id: string
}

function ImageCollapse(props: ImageCollapseProps) {
  const { collapseProps, nestedChildren, label, images, id } = props

  const { collapseOpen } = ImageManagerContext.usePicker(['collapseOpen'])

  const [activeKeys, setActiveKeys] = useState<string[]>([])

  const onCollapseChange = (keys: string[]) => {
    setActiveKeys(keys)
  }

  // id: COLLAPSE_CONTEXT_MENU_ID,
  const { show } = useContextMenu({ props: { dirPath: '' } })

  useEffect(() => {
    if (collapseOpen > 0) {
      setActiveKeys([id])
    } else {
      setActiveKeys([])
    }
  }, [collapseOpen])

  if (!images.length && !nestedChildren) return null

  return (
    <>
      <Collapse
        destroyInactivePanel={false}
        {...collapseProps}
        activeKey={activeKeys}
        onChange={(keys) => onCollapseChange(keys as string[])}
        items={[
          {
            key: id,
            label,
            children: images.length ? (
              <div className={'space-y-2'}>
                <ImagePreview images={images} />
                {nestedChildren}
              </div>
            ) : (
              nestedChildren
            ),
          },
        ]}
      ></Collapse>
      <CollapseContextMenu />
    </>
  )
}

export default memo(ImageCollapse)
