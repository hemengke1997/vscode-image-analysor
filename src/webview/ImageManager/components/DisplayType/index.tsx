import { difference, uniq } from '@minko-fe/lodash-pro'
import { useControlledState, useUpdateEffect } from '@minko-fe/react-hook'
import { Badge, Checkbox, ConfigProvider, theme } from 'antd'
import { produce } from 'immer'
import { memo, useMemo } from 'react'
import GlobalContext from '../../contexts/GlobalContext'

type DisplayTypeProps = {
  value: string[]
  onChange: (checked: string[], unchecked: string[]) => void
}

function DisplayType(props: DisplayTypeProps) {
  const { token } = theme.useToken()
  const { value, onChange } = props

  const { imageState, setImageFilter } = GlobalContext.usePicker(['imageState', 'setImageFilter'])

  const allImageTypes = useMemo(() => uniq(imageState.data.flatMap((item) => item.fileTypes)).sort(), [imageState.data])
  const allImageFiles = useMemo(() => imageState.data.flatMap((item) => item.imgs), [imageState.data])

  const options = useMemo(() => {
    return allImageTypes.map((item) => {
      return {
        label: (
          <div className={'flex items-center gap-x-2'}>
            <span>{item}</span>
            <ConfigProvider
              theme={{
                components: {
                  Badge: {
                    colorBgContainer: token.colorWhite,
                  },
                },
              }}
            >
              <Badge
                overflowCount={Number.POSITIVE_INFINITY}
                color={token.colorPrimary}
                count={allImageFiles.filter((t) => t.fileType === item).length}
                showZero
              />
            </ConfigProvider>
          </div>
        ),
        value: item,
      }
    })
  }, [allImageTypes, token, allImageFiles])

  const [checked, setChecked] = useControlledState({
    defaultValue: value,
    value,
    onChange: (value) => {
      onChange(value, difference(allImageTypes, value))
    },
  })

  useUpdateEffect(() => {
    setImageFilter(
      produce((draft) => {
        draft.type = checked
      }),
    )
  }, [checked])

  return <Checkbox.Group value={checked} onChange={setChecked} options={options}></Checkbox.Group>
}

export default memo(DisplayType)
