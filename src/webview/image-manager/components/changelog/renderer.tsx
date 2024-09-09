import { markdown } from '~root/CHANGELOG.md'
import { useAsyncEffect } from 'ahooks'
import { useControlledState } from 'ahooks-x'
import { Modal, Skeleton } from 'antd'
import MarkdownIt from 'markdown-it'
import { memo, useRef, useState } from 'react'

export type ChangelogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

function ChangeLogRenderer(props: ChangelogProps) {
  const { open: openProp, onOpenChange } = props

  const [open, setOpen] = useControlledState({
    defaultValue: openProp,
    value: openProp,
    onChange: onOpenChange,
  })

  const [loading, setLoading] = useState(true)
  const md = useRef<MarkdownIt>()

  useAsyncEffect(async () => {
    md.current = MarkdownIt()
    setLoading(false)
  }, [])

  return (
    <Modal
      open={open}
      onCancel={() => {
        setOpen(false)
      }}
      keyboard
      destroyOnClose
      width={'70%'}
      centered
      footer={null}
    >
      {loading ? (
        <Skeleton active paragraph={{ rows: 6 }} />
      ) : (
        <div
          className={'max-h-[60vh] overflow-auto'}
          dangerouslySetInnerHTML={{ __html: md.current?.render(markdown) || '' }}
        />
      )}
    </Modal>
  )
}

export default memo(ChangeLogRenderer)
