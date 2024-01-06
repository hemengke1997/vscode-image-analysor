import { useClickAway, useControlledState, useInViewport } from '@minko-fe/react-hook'
import { CmdToVscode } from '@rootSrc/message/shared'
import { vscodeApi } from '@rootSrc/webview/vscode-api'
import { App, Badge, Button, Image, type ImageProps, Tooltip } from 'antd'
import classNames from 'classnames'
import { motion } from 'framer-motion'
import { memo, useRef, useState } from 'react'
import { useContextMenu } from 'react-contexify'
import { CopyToClipboard } from 'react-copy-to-clipboard'
import { useHotkeys } from 'react-hotkeys-hook'
import { useTranslation } from 'react-i18next'
import { BsCopy } from 'react-icons/bs'
import { FaImages } from 'react-icons/fa6'
import { ImEyePlus } from 'react-icons/im'
import { PiFileImage } from 'react-icons/pi'
import { type ImageType } from '../..'
import ImageManagerContext from '../../contexts/ImageManagerContext'
import useImageOperation from '../../hooks/useImageOperation'
import { bytesToKb, formatBytes } from '../../utils'
import ImageContextMenu, { IMAGE_CONTEXT_MENU_ID } from './components/ImageContextMenu'

type LazyImageProps = {
  imageProp: ImageProps
  image: ImageType
  index?: number
  preview?: {
    open?: boolean
    current?: number
  }
  onPreviewChange?: (preview: { open?: boolean; current?: number }) => void
  lazy?: boolean
}

function LazyImage(props: LazyImageProps) {
  const { imageProp, image, preview, onPreviewChange, index, lazy = true } = props

  const { t } = useTranslation()

  const { config, imagePlaceholderSize } = ImageManagerContext.usePicker(['config', 'imagePlaceholderSize'])

  const placeholderRef = useRef<HTMLDivElement>(null)
  const [inViewport] = useInViewport(placeholderRef, {
    rootMargin: '200px 0px', // expand 200px area of vertical intersection calculation
  })
  const { message } = App.useApp()

  const [copied, setCopied] = useState(false)

  const [, setPreview] = useControlledState({
    defaultValue: preview,
    value: preview,
    onChange: onPreviewChange,
  })

  const [dimensions, setDimensions] = useState<{ width: number; height: number }>()

  const handleMaskMouseOver = () => {
    if (!dimensions) {
      vscodeApi.postMessage({ cmd: CmdToVscode.GET_IMAGE_DIMENSIONS, data: { filePath: image.path } }, (data) => {
        setDimensions(data)
      })
    }
  }

  const { selectedImage, setSelectedImage } = ImageManagerContext.usePicker(['selectedImage', 'setSelectedImage'])
  const boxRef = useRef<HTMLDivElement>(null)
  useClickAway(
    () => {
      setSelectedImage(undefined)
    },
    boxRef,
    ['click', 'contextmenu'],
  )

  const { copyImage } = useImageOperation()

  const keybindRef = useHotkeys<HTMLDivElement>(
    `mod+c`,
    () => {
      copyImage(image.path)
    },
    {
      enabled: inViewport,
    },
  )

  const isCurrentActive = () => selectedImage?.vscodePath === image.vscodePath
  const ifWarning = bytesToKb(image.stats.size) > config.warningSize

  const { show } = useContextMenu<{ image: ImageType }>()

  const clns = {
    containerClassName: 'flex flex-none flex-col items-center p-2 space-y-1 transition-colors',
    imageClassName: 'rounded-md object-contain p-1 will-change-auto',
    nameClassName: 'max-w-full truncate',
  }

  if (!inViewport && lazy) {
    return (
      <div
        ref={placeholderRef}
        style={{
          width: imagePlaceholderSize?.width,
          height: imagePlaceholderSize?.height,
        }}
      ></div>
    )
  }

  return (
    <div tabIndex={-1} ref={keybindRef}>
      <motion.div
        className={classNames(
          clns.containerClassName,
          'overflow-hidden border-[1px] border-solid border-transparent rounded-md hover:border-ant-color-primary',
          isCurrentActive() && 'border-ant-color-primary',
        )}
        initial={{ opacity: 0 }}
        viewport={{ once: true, margin: '20px 0px' }}
        transition={{ duration: 0.8 }}
        whileInView={{ opacity: 1 }}
        ref={boxRef}
        onClick={() => {
          setSelectedImage(image)
        }}
        onContextMenu={(e) => {
          setSelectedImage(image)
          show({ event: e, id: IMAGE_CONTEXT_MENU_ID, props: { image } })
        }}
      >
        <Badge status='warning' dot={ifWarning}>
          <Image
            {...imageProp}
            className={classNames(clns.imageClassName)}
            preview={
              lazy
                ? {
                    mask: (
                      <div
                        className={'flex-col-center h-full w-full justify-center space-y-1 text-xs'}
                        onMouseOver={handleMaskMouseOver}
                      >
                        <div
                          className={'flex-center cursor-pointer space-x-1 truncate'}
                          onClick={(e) => {
                            e.stopPropagation()
                            setPreview({ open: true, current: index })
                          }}
                        >
                          <ImEyePlus />
                          <span>{t('ia.preview')}</span>
                        </div>
                        <div className={'flex-center space-x-1 truncate'}>
                          <PiFileImage />
                          <span className={classNames(ifWarning && 'text-ant-color-warning-text')}>
                            {formatBytes(image.stats.size)}
                          </span>
                        </div>
                        <div className={'flex-center space-x-1 truncate'}>
                          <FaImages />
                          <span>
                            {dimensions?.width}x{dimensions?.height}
                          </span>
                        </div>
                      </div>
                    ),
                    maskClassName: 'rounded-md !cursor-auto',
                  }
                : false
            }
            rootClassName='transition-all'
            style={{ width: imageProp.width, height: imageProp.height, ...imageProp.style }}
          ></Image>
        </Badge>
        <Tooltip
          mouseEnterDelay={0.03}
          mouseLeaveDelay={0.05}
          trigger={['click']}
          overlayClassName={'max-w-full'}
          title={
            <div className={'flex w-full items-center space-x-2'}>
              <span className={'flex-none'}>{image.name}</span>
              <CopyToClipboard
                text={image.name}
                onCopy={() => {
                  if (copied) return
                  setCopied(true)
                  message.success(t('ia.copy_success'))
                }}
              >
                <Button type={'primary'} disabled={copied} size='small' className={'flex-center cursor-pointer'}>
                  <BsCopy />
                </Button>
              </CopyToClipboard>
            </div>
          }
          arrow={false}
          placement='bottom'
          destroyTooltipOnHide={false}
          afterOpenChange={(open) => {
            if (!open) {
              setCopied(false)
            }
          }}
        >
          <div className={classNames(clns.nameClassName, 'cursor-pointer')} style={{ maxWidth: imageProp.width }}>
            {image.name}
          </div>
        </Tooltip>
      </motion.div>
      <ImageContextMenu />
    </div>
  )
}

export default memo(LazyImage)
