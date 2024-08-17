import { isArray, isEmpty, mergeWith, toLower } from '@minko-fe/lodash-pro'
import { useMemoizedFn } from '@minko-fe/react-hook'
import { Checkbox, Form, Tag } from 'antd'
import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { type FormatConverterOptions, type OperatorResult } from '~/core'
import { CmdToVscode } from '~/message/cmd'
import { abortPromise } from '~/utils/abort-promise'
import { useTrackState } from '~/webview/hooks/use-track-state'
import { vscodeApi } from '~/webview/vscode-api'
import ImageOperator, { type ImageOperatorProps } from '../../components/image-operator'
import Format from '../../components/image-operator/components/format'
import KeepOriginal from '../../components/image-operator/components/keep-original'
import GlobalContext from '../../contexts/global-context'
import useAbortController from '../use-abort-controller'
import useImageManagerEvent from '../use-image-manager-event'
import useImageOperation from '../use-image-operation'
import { type ImperativeModalProps } from '../use-imperative-modal'
import { type FormComponent, useOperatorModalLogic } from '../use-operator-modal-logic/use-operator-modal-logic'

export type ImageConverterProps = {} & ImageOperatorProps

type FormValue = FormatConverterOptions

function ImageConverter(props: ImageConverterProps & ImperativeModalProps) {
  const { images: imagesProp, id, onClose } = props
  const { t } = useTranslation()
  const { formatConverter } = GlobalContext.usePicker(['formatConverter'])
  const [form] = Form.useForm()

  const [images, setImages] = useTrackState(imagesProp)

  const abortController = useAbortController()

  const [submitting, setSubmitting] = useState(false)

  // const hasSomeImageType = useMemoizedFn((type: string) => {
  //   return images?.some((img) => img.fileType === type)
  // })

  const { beginFormatConversionProcess, beginUndoProcess } = useImageOperation()
  const { handleOperateImage } = useOperatorModalLogic()

  const convertImages = useMemoizedFn((images: ImageType[], option: FormValue, abortController: AbortController) => {
    const fn = () =>
      new Promise<OperatorResult[] | undefined>((resolve) => {
        vscodeApi.postMessage({ cmd: CmdToVscode.convert_image_format, data: { images, option } }, (data) => {
          resolve(data)
        })
      })
    return abortPromise(fn, {
      abortController,
      timeout: (15 + images.length) * 1000,
    })
  })

  const onFinish = useMemoizedFn((value: FormValue) => {
    value = mergeWith({}, formatConverter?.option || {}, value, (_, srcValue) => {
      if (isArray(srcValue)) return srcValue
    })

    handleOperateImage(
      () => {
        return convertImages(images, value, abortController)
      },
      {
        onSuccess() {
          onClose(id)
        },
        onCancel() {
          abortController.abort()
        },
        onFinal() {
          setSubmitting(false)
        },
        onRedoClick() {
          beginFormatConversionProcess(images)
        },
        onUndoClick(results) {
          beginUndoProcess(results)
        },
      },
    )
  })

  useImageManagerEvent({
    on: {
      reveal_in_viewer: () => {
        onClose(id)
      },
    },
  })

  const tab = {
    options: formatConverter?.option,
    componentMap: {
      format: {
        el: () => <Format exts={formatConverter?.limit.to} />,
      },
      icoSize: {
        el: () => {
          const sizes = [16, 32, 48, 64, 128, 256]
          return (
            <Form.Item noStyle dependencies={['format']}>
              {({ getFieldValue }) => {
                if (toLower(getFieldValue('format')) !== 'ico') return null
                const icoTooltips = [
                  [16, t('im.ico_16')],
                  [32, t('im.ico_32')],
                  [48, t('im.ico_48')],
                  [128, t('im.ico_128')],
                  [256, t('im.ico_256')],
                ]

                return (
                  <Form.Item
                    valuePropName='value'
                    label={t('im.ico_size')}
                    name='icoSize'
                    tooltip={
                      <div className={'space-y-2'}>
                        {icoTooltips.map(([size, text], index) => {
                          return (
                            <div key={index}>
                              <div className={'flex flex-col'}>
                                <Tag className={'w-fit'}>
                                  {size}x{size}
                                </Tag>
                                <div>{text}</div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    }
                    rules={[
                      ({ getFieldValue }) => ({
                        validator() {
                          const icoSize = getFieldValue('icoSize')
                          if (icoSize.length === 0) {
                            return Promise.reject(t('im.ico_size_empty'))
                          }
                          return Promise.resolve()
                        },
                      }),
                    ]}
                  >
                    <Checkbox.Group options={sizes.map((size) => ({ label: size, value: size }))}></Checkbox.Group>
                  </Form.Item>
                )
              }}
            </Form.Item>
          )
        },
      },
      keepOriginal: {
        el: () => <KeepOriginal />,
      },
    } as FormComponent<FormatConverterOptions>,
  }

  if (isEmpty(formatConverter?.option)) return null

  return (
    <ImageOperator
      images={images}
      onImagesChange={setImages}
      form={form}
      submitting={submitting}
      onSubmittingChange={setSubmitting}
    >
      <Form
        layout='horizontal'
        colon={false}
        name='image-converter'
        initialValues={formatConverter.option}
        form={form}
        requiredMark={false}
        onFinish={onFinish}
      >
        <div className={'max-h-[600px] overflow-auto'}>
          {Object.keys(tab.componentMap).map((key, index) => {
            return <div key={index}>{tab.componentMap[key]?.el()}</div>
          })}
        </div>
      </Form>
    </ImageOperator>
  )
}

export default memo(ImageConverter)