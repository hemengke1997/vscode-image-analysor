import type Cropperjs from 'cropperjs'
import { isNil, round } from '@minko-fe/lodash-pro'
import { useControlledState, useSetState, useThrottleFn, useUpdateEffect } from '@minko-fe/react-hook'
import { isDev } from '@minko-fe/vite-config/client'
import { App, Button, Card, Checkbox, Divider, InputNumber, Modal, Popover, Segmented, Skeleton, Tooltip } from 'antd'
import classNames from 'classnames'
import { produce } from 'immer'
import mime from 'mime/lite'
import { memo, startTransition, useEffect, useReducer, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IoIosArrowDropup } from 'react-icons/io'
import { LuArrowRightLeft, LuArrowUpDown } from 'react-icons/lu'
import { RxReset } from 'react-icons/rx'
import { CmdToVscode } from '~/message/cmd'
import { vscodeApi } from '~/webview/vscode-api'
import { type ImageType } from '../..'
import ReactCropper, { type ReactCropperElement } from './components/Cropper'
import { DETAIL_MAP, getAspectRatios, getViewmodes } from './utils'
import 'cropperjs/dist/cropper.css'
import styles from './index.module.css'

export type ImageCropperProps = {
  image: ImageType | undefined
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ImageCropper(props?: ImageCropperProps) {
  const { image, open: openProp, onOpenChange } = props || {}

  const [open, setOpen] = useControlledState({
    defaultValue: openProp,
    value: openProp,
    onChange: onOpenChange,
  })

  const { t, i18n } = useTranslation()
  const { message, notification } = App.useApp()
  const cropperRef = useRef<ReactCropperElement>(null)
  const _onCrop = (e: Cropperjs.CropEvent) => {
    if (allTruly(e.detail)) {
      startTransition(() => setDetails(e.detail))
    }
  }

  const onCrop = useThrottleFn(_onCrop, { wait: 100 })

  const [loading, setLoading] = useState(true)

  const allTruly = (obj: Record<string, any>) => {
    return Object.values(obj).every((item) => !isNil(item))
  }

  const [cropperOptions, setCropperOptions] = useSetState<Cropperjs.Options>({
    aspectRatio: getAspectRatios(i18n)[0].value,
    viewMode: getViewmodes(i18n)[0].value as Cropperjs.ViewMode,
    guides: true,
    highlight: false,
    background: false,
  })

  useUpdateEffect(() => {
    updateCropper()
  }, [cropperOptions])

  // from cropper
  const [details, setDetails] = useState<Partial<Cropperjs.Data>>()

  const [controlledDetails, setControlledDetails] = useControlledState<Partial<Cropperjs.Data>>({
    defaultValue: details,
    value: details,
    onChange: (value) => {
      // set cropper data
      cropperRef.current?.cropper?.setData({
        ...cropperRef.current?.cropper?.getData(),
        ...value,
      })
    },
  })

  const [forceRenderCropper, updateCropper] = useReducer((s: number) => s + 1, 0)
  useEffect(() => {
    // for hmr
    if (isDev()) {
      updateCropper()
    }
  }, [])

  const previewRef = useRef<HTMLDivElement>(null)
  const [saveModalOpen, setSaveModalOpen] = useState(false)
  const handlePreview = () => {
    previewRef.current?.appendChild(cropperRef.current!.cropper?.getCroppedCanvas())
    setSaveModalOpen(true)
  }

  const handleSave = async () => {
    if (cropperRef.current?.cropper && image) {
      const canvas = cropperRef.current?.cropper.getCroppedCanvas()
      const imageType = mime.getType(image.fileType)!

      const MESSAGE_KEY = 'save-cropper-image'
      message.loading({
        content: t('im.saving'),
        duration: 0,
        key: MESSAGE_KEY,
      })

      vscodeApi.postMessage(
        {
          cmd: CmdToVscode.SAVE_CROPPER_IMAGE,
          data: {
            dataUrl: canvas.toDataURL(imageType),
            image,
          },
        },
        (data) => {
          if (data) {
            message.destroy(MESSAGE_KEY)

            notification.success({
              duration: 10,
              message: data.filename,
              description: <div className={'flex flex-col space-y-1'}>{t('im.save_success')}</div>,
            })
          } else {
            message.error({
              key: MESSAGE_KEY,
              content: t('im.save_fail'),
            })
          }
        },
      )
      setSaveModalOpen(false)
      setOpen(false)
    }
  }

  const getCropBoxCenterPoint = () => {
    const { left, top, width, height } = cropperRef.current!.cropper!.getCropBoxData()
    return {
      x: left + width / 2,
      y: top + height / 2,
    }
  }

  const getContainerCenterPoint = () => {
    const { width, height } = cropperRef.current!.cropper.getContainerData()
    return {
      x: width / 2,
      y: height / 2,
    }
  }

  const moveToCenter = (options?: { centerCrop?: boolean; centerX?: boolean; centerY?: boolean }) => {
    const { centerCrop = false, centerX = true, centerY = true } = options || {}
    if (centerCrop) {
      // move crop box to container center
      const { x: containerX, y: containerY } = getContainerCenterPoint()
      cropperRef.current?.cropper?.setCropBoxData({
        left: containerX - cropperRef.current?.cropper.getCropBoxData().width / 2,
        top: containerY - cropperRef.current?.cropper.getCropBoxData().height / 2,
      })
    }

    const { x: cropBoxX, y: cropBoxY } = getCropBoxCenterPoint()
    const { width, height } = cropperRef.current!.cropper.getImageData()
    const { top, left } = cropperRef.current!.cropper.getCanvasData()
    cropperRef.current?.cropper?.moveTo(centerX ? cropBoxX - width / 2 : left, centerY ? cropBoxY - height / 2 : top)
  }

  return (
    <Modal
      maskClosable={false}
      keyboard={false}
      mask
      open={open}
      title={t('im.crop')}
      footer={null}
      width={'80%'}
      onCancel={() => setOpen(false)}
      // resolve z-index bug
      destroyOnClose
    >
      <div className={'flex items-stretch space-x-2 overflow-auto'}>
        <div className={'h-full w-[70%] flex-none'}>
          <Card>
            <ReactCropper
              src={image?.vscodePath}
              className={classNames('w-full max-w-full h-[500px]', styles.cropper, loading && 'opacity-0 absolute')}
              ready={() => {
                if (cropperRef.current) {
                  moveToCenter({
                    centerCrop: true,
                  })
                }
                setLoading(false)
              }}
              dragMode='move'
              ref={cropperRef}
              forceRender={forceRenderCropper}
              toggleDragModeOnDblclick={false}
              crop={onCrop.run}
              checkCrossOrigin={false}
              center
              zoomOnTouch={false}
              wheelZoomRatio={0.1}
              {...cropperOptions}
            />
            <Skeleton loading={loading} active paragraph={{ rows: 7 }} />
          </Card>
        </div>
        <div className={'flex-1'}>
          <Card
            rootClassName={'h-full'}
            styles={{
              body: {
                height: '100%',
              },
            }}
          >
            <div className={'flex h-full flex-col justify-between'}>
              <div className={'flex flex-col space-y-1'}>
                <Popover
                  trigger={['hover']}
                  content={
                    <div className={'flex w-full flex-col flex-wrap gap-x-1'}>
                      <Checkbox
                        value={'highlight'}
                        checked={cropperOptions.highlight}
                        onChange={(e) => {
                          setCropperOptions({
                            highlight: e.target.checked,
                          })
                        }}
                      >
                        {t('im.highlight')}
                      </Checkbox>
                      <Checkbox
                        value={'guides'}
                        checked={cropperOptions.guides}
                        onChange={(e) => {
                          setCropperOptions({
                            guides: e.target.checked,
                          })
                        }}
                      >
                        {t('im.guides')}
                      </Checkbox>
                      <Checkbox
                        value={'background'}
                        checked={cropperOptions.background}
                        onChange={(e) => {
                          setCropperOptions({
                            background: e.target.checked,
                          })
                        }}
                      >
                        {t('im.background')}
                      </Checkbox>
                    </div>
                  }
                >
                  <Button type='default' icon={<IoIosArrowDropup />}>
                    {t('im.toggle_options')}
                  </Button>
                </Popover>

                <div className={'w-full'}>
                  <Segmented
                    value={cropperOptions.viewMode}
                    onChange={(e) => {
                      setCropperOptions({
                        viewMode: e as Cropperjs.ViewMode,
                      })
                    }}
                    options={getViewmodes(i18n).map((item) => ({
                      label: item.label,
                      value: item.value,
                    }))}
                    className={'flex'}
                    block
                    size='small'
                  ></Segmented>
                </div>

                <div className={'w-full'}>
                  <Segmented
                    value={cropperOptions.aspectRatio}
                    onChange={(e) => {
                      setCropperOptions({
                        aspectRatio: e as number,
                      })
                    }}
                    className={'flex'}
                    block
                    size='small'
                    options={getAspectRatios(i18n).map((item) => ({
                      label: item.label,
                      value: item.value,
                    }))}
                  ></Segmented>
                </div>
                <div className={'flex flex-col space-y-1'}>
                  {Object.keys(details || {}).map((key) => (
                    <InputNumber
                      addonBefore={
                        <div title={DETAIL_MAP[key].label} className={'flex-center w-14'}>
                          {DETAIL_MAP[key].label}
                        </div>
                      }
                      addonAfter={DETAIL_MAP[key].unit}
                      value={round(controlledDetails[key], 2)}
                      onChange={(value) =>
                        setControlledDetails(
                          produce((draft) => {
                            draft[key] = value
                          }),
                        )
                      }
                      key={key}
                    ></InputNumber>
                  ))}
                  <Divider dashed plain>
                    {t('im.operation')}
                  </Divider>
                  <div className={'flex flex-col gap-y-3'}>
                    <Button.Group className={'flex-center w-full'}>
                      <Button className={'flex-1'} onClick={() => moveToCenter({ centerCrop: true })}>
                        {t('im.center')}
                      </Button>
                      <Button
                        className={'flex-1'}
                        onClick={() =>
                          moveToCenter({
                            centerX: true,
                            centerY: false,
                          })
                        }
                      >
                        {t('im.center_x')}
                      </Button>
                      <Button
                        className={'flex-1'}
                        onClick={() =>
                          moveToCenter({
                            centerY: true,
                            centerX: false,
                          })
                        }
                      >
                        {t('im.center_y')}
                      </Button>
                    </Button.Group>
                    <Button.Group className={'flex-center w-full'}>
                      <Tooltip title={t('im.scale_x')}>
                        <Button
                          className={'flex-1'}
                          onClick={() => {
                            cropperRef.current?.cropper.scaleX((controlledDetails.scaleX || 0) >= 0 ? -1 : 1)
                          }}
                          icon={<LuArrowRightLeft />}
                        ></Button>
                      </Tooltip>
                      <Tooltip title={t('im.scale_y')}>
                        <Button
                          className={'flex-1'}
                          onClick={() => {
                            cropperRef.current?.cropper.scaleY((controlledDetails.scaleY || 0) >= 0 ? -1 : 1)
                          }}
                          icon={<LuArrowUpDown />}
                        ></Button>
                      </Tooltip>
                    </Button.Group>
                    <Button.Group className={'flex-center w-full'}>
                      <Button
                        className={'flex-1'}
                        icon={<RxReset />}
                        onClick={() => cropperRef.current?.cropper.reset()}
                      >
                        {t('im.reset')}
                      </Button>
                    </Button.Group>
                  </div>
                </div>
              </div>
              <div className={'flex w-full justify-center'}>
                <Button type='primary' className={'w-full'} size='middle' onClick={handlePreview}>
                  {t('im.preview')}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>

      <Modal
        forceRender
        destroyOnClose
        open={saveModalOpen}
        footer={
          <div>
            <Button type='primary' onClick={handleSave}>
              {t('im.save')}
            </Button>
          </div>
        }
        onCancel={() => {
          setSaveModalOpen(false)
        }}
        afterOpenChange={(open) => {
          if (!open && previewRef.current) {
            previewRef.current.innerHTML = ''
          }
        }}
        title={t('im.preview')}
      >
        <Card>
          <div ref={previewRef} className={classNames('flex justify-center', styles.canvas_box)}></div>
        </Card>
      </Modal>
    </Modal>
  )
}

export default memo(ImageCropper)
