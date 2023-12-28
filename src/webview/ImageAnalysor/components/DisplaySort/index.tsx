import { useControlledState } from '@minko-fe/react-hook'
import { Cascader, ConfigProvider } from 'antd'
import { type PropsWithChildren, type ReactNode, memo, startTransition } from 'react'
import { BsSortDown, BsSortDownAlt } from 'react-icons/bs'

type DisplaySortProps = {
  options: { label: ReactNode; value: string }[]
  value: string[] | undefined
  onChange: (value: string[]) => void
}

type SortType = 'desc' | 'asc'

function DisplaySort(props: DisplaySortProps) {
  const { options, value, onChange } = props

  const [sort, setSort] = useControlledState({
    defaultValue: value,
    value,
    onChange,
  })

  const sortMap: Record<SortType, { label: ReactNode }> = {
    asc: {
      label: (
        <SortLabelUI>
          <BsSortDownAlt />
          <span>asc</span>
        </SortLabelUI>
      ),
    },
    desc: {
      label: (
        <SortLabelUI>
          <BsSortDown />
          <span>desc</span>
        </SortLabelUI>
      ),
    },
  }

  const sortOptions = () => {
    return Object.keys(sortMap).map((key) => ({
      label: sortMap[key as SortType].label,
      value: key,
    }))
  }

  return (
    <>
      <ConfigProvider
        theme={{
          components: {
            Cascader: {
              dropdownHeight: 'auto' as any,
              optionSelectedBg: 'var(--ant-color-primary-active)',
            },
          },
        }}
      >
        <Cascader
          value={sort}
          onChange={(value) => {
            startTransition(() => setSort(value as string[]))
          }}
          options={options.map((item) => ({ ...item, children: sortOptions() }))}
          displayRender={(label) => {
            return (
              <div className={'flex items-center'}>
                {label[1]}
                <span className={'mx-1'}> by </span>
                {label[0]}
              </div>
            )
          }}
          allowClear={false}
        ></Cascader>
      </ConfigProvider>
    </>
  )
}

export default memo(DisplaySort) as typeof DisplaySort

function SortLabelUI(props: PropsWithChildren) {
  return <div className={'flex items-center space-x-2'}>{props.children}</div>
}
