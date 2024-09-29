import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMemoizedFn } from 'ahooks'
import { Button, Popover, Tooltip } from 'antd'
import { upperFirst } from 'lodash-es'
import { IoIosMore } from 'react-icons/io'
import ActionContext from '~/webview/image-manager/contexts/action-context'

function More() {
  const { t } = useTranslation()
  const { openAllCollapse, closeAllCollapse } = ActionContext.usePicker(['openAllCollapse', 'closeAllCollapse'])

  const [open, setOpen] = useState(false)

  const toggleAllCollapse = useMemoizedFn((open: boolean) => {
    open ? openAllCollapse() : closeAllCollapse()
  })

  return (
    <Popover
      title={upperFirst(t('im.action'))}
      trigger={['click']}
      placement='left'
      open={open}
      onOpenChange={(open) => {
        setOpen(open)
      }}
      arrow={false}
      overlayClassName={'select-none'}
      content={
        <div className={'flex flex-col gap-2'}>
          <div className={'flex items-center space-x-2'}>
            <div>{t('im.folder')}</div>
            <Button.Group>
              <Button
                onClick={() => {
                  toggleAllCollapse(true)
                  setOpen(false)
                }}
              >
                {t('im.expand')}
              </Button>
              <Button
                onClick={() => {
                  toggleAllCollapse(false)
                  setOpen(false)
                }}
              >
                {t('im.collapse')}
              </Button>
            </Button.Group>
          </div>
        </div>
      }
    >
      <Tooltip title={upperFirst(t('im.action'))} arrow={false} placement={'bottom'}>
        <Button
          type='text'
          icon={
            <div className={'flex items-center text-xl'}>
              <IoIosMore />
            </div>
          }
        />
      </Tooltip>
    </Popover>
  )
}

export default memo(More)
