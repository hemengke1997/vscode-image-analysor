import { isFunction, isObject } from '@minko-fe/lodash-pro'
import {
  useAsyncEffect,
  useLatest,
  useMemoizedFn,
  usePrevious,
  useSetState,
  useUpdateEffect,
} from '@minko-fe/react-hook'
import { createContainer } from 'context-state'
import { diff } from 'deep-object-diff'
import { useEffect, useMemo, useRef } from 'react'
import { type WorkspaceStateType } from '~/core/persist/workspace/common'
import { CmdToVscode } from '~/message/cmd'
import { vscodeApi } from '~/webview/vscode-api'
import { FilterRadioValue } from '../components/ImageActions/components/Filter'
import { bytesToKb, uniqSortByThenMap } from '../utils'
import { type ImageFilterType } from './GlobalContext'

export type ImageStateType = {
  /**
   * 原始图片列表（从用户系统中获取，不会在内部改变）
   */
  originalList: ImageType[]
  /**
   * 处理过后的图片列表，在originList的基础上新增了一些属性 (extraProps)
   * 不直接供页面使用
   */
  list: ImageType[]
  /**
   * 当前可以显示的图片列表，根据图片的visible属性筛选出来的
   * 供页面使用
   */
  visibleList: ImageType[]
}

type Condition = {
  /**
   * visible的key
   */
  key: ImageVisibleFilterType
  /**
   * 判断是否显示图片
   * @returns should show or not
   */
  condition: (image: ImageType, index: number) => boolean | undefined | Promise<boolean | undefined>
}

// 根据条件改变图片的visible
async function changeImageVisible(imageList: ImageType[], conditions: Condition[]) {
  const promises = imageList.map((image, index) => async () => {
    for (const { key, condition } of conditions) {
      if (!image.visible) {
        image.visible = {}
      }
      image.visible[key] = isFunction(condition) ? await condition(image, index) : condition
    }
    return image
  })

  if (promises.length) {
    const first = await promises[0]()
    const rest = await Promise.all(promises.slice(1).map((p) => p()))
    return [first, ...rest]
  }
  return []
}

// 图片排序
const sortFunctions = {
  size: {
    asc: (a: ImageType, b: ImageType) => a.stats.size - b.stats.size,
    desc: (a: ImageType, b: ImageType) => b.stats.size - a.stats.size,
  },
  name: {
    asc: (a: ImageType, b: ImageType) => a.name.localeCompare(b.name),
    desc: (a: ImageType, b: ImageType) => b.name.localeCompare(a.name),
  },
}

// 1. 按照文件大小排序
// 2. 按照文件名排序
function sortImages(sort: string[], images: ImageType[]) {
  const [sortType, sortOrder] = sort
  const sortFunction = sortFunctions[sortType][sortOrder]
  return [...images.sort(sortFunction)]
}

/**
 * 根据visible字段判断是否应该展示图片
 * @param image
 * @returns
 */
function shouldShowImage(image: ImageType) {
  if (isObject(image.visible) && Object.keys(image.visible).some((k) => image.visible?.[k] === false)) {
    return false
  }
  return true
}

type TreeContextProp = {
  /**
   * 当前树的图片列表
   */
  imageList: ImageType[]
  /**
   * 当前树工作区
   */
  workspaceFolder: string
  /**
   * 排序
   */
  sort?: WorkspaceStateType['display_sort']
  /**
   * 展示图片类型
   */
  displayImageTypes?: WorkspaceStateType['display_type']
  /**
   * 图片过滤条件
   */
  imageFilter?: ImageFilterType
  /**
   * 父组件收集树数据
   */
  onCollectTreeData: (data: { visibleList: ImageType[]; workspaceFolder: string }) => void
}

function useTreeContext(props: TreeContextProp) {
  const {
    imageList: imageListProp,
    workspaceFolder: originalWorkspaceFolder,
    sort,
    displayImageTypes,
    imageFilter,
    onCollectTreeData,
  } = props

  const [imageSingleTree, setImageSingleTree] = useSetState<ImageStateType>({
    originalList: [],
    list: [],
    visibleList: [],
  })

  const latestImageList = useLatest(imageSingleTree.list)

  useEffect(() => {
    onCollectTreeData({ visibleList: imageSingleTree.visibleList, workspaceFolder: originalWorkspaceFolder })
  }, [imageSingleTree.visibleList])

  // 筛选出当前树显示的工作区
  const workspaceFolder = useMemo(
    () =>
      uniqSortByThenMap(imageSingleTree.visibleList, 'absWorkspaceFolder', (image) => ({
        label: image.workspaceFolder,
        value: image.absWorkspaceFolder,
      }))[0],
    [imageSingleTree.visibleList],
  )

  // 筛选出当前树显示的文件夹
  const dirs = useMemo(
    () =>
      uniqSortByThenMap(imageSingleTree.visibleList, 'absDirPath', (image) => ({
        label: image.dirPath,
        value: image.absDirPath,
      })),
    [imageSingleTree.visibleList],
  )

  // 筛选出当前树显示的图片类型
  const imageTypes = useMemo(
    () =>
      uniqSortByThenMap(imageSingleTree.visibleList, 'fileType', (image) => ({
        label: image.fileType,
        value: image.fileType,
      })),
    [imageSingleTree.visibleList],
  )

  // Everytime list changed, update visibleList
  // the only entry to update visibleList
  // !! 修改 visibleList 的唯一入口 !!
  // 只有当list改变时，才会重新生成visibleList
  useEffect(() => {
    setImageSingleTree((t) => ({ visibleList: t.list.filter(shouldShowImage) }))
  }, [imageSingleTree.list])

  // !!CARE!!: once imageListProp changed, the list will be updated
  // 以下条件会影响list的生成结果。如果有更多的影响因素，都需要加在这里面
  // 1. sort

  // 2. filter:
  // display image type
  // size filter
  // git staged filter
  // compressed filter
  const generateImageList = useMemoizedFn(async (imageList: ImageType[]) => {
    // sort
    let res = imageList
    if (sort) {
      onSortChange(imageList, sort)
    }

    // filter
    if (imageFilter) {
      res = await changeImageVisibleByFilterKeys(res, ['file_type', 'size', 'git_staged', 'compressed'], imageFilter)
    }

    return res
  })

  // prop 改变时，重新根据目前已有的限制条件生成list
  useAsyncEffect(async () => {
    const list = await generateImageList(imageListProp)
    setImageSingleTree({
      originalList: imageListProp,
      list,
    })
  }, [imageListProp])

  const onSortChange = useMemoizedFn((imageList: ImageType[], sort: string[] | undefined) => {
    if (sort) {
      return sortImages(sort, imageList)
    }
    return imageList
  })

  /**
   * 排序改变时，需要修改list
   */
  useUpdateEffect(() => {
    setImageSingleTree((t) => ({
      list: onSortChange(t.list, sort),
    }))
  }, [sort])

  const git_staged_cache = useRef<string[] | null>(null)

  const changeImageVisibleByFilterKeys = useMemoizedFn(
    (imageList: ImageType[], key: ImageVisibleFilterType[], imageFilter: ImageFilterType): Promise<ImageType[]> => {
      const builtInConditions: Condition[] = [
        {
          key: 'file_type',
          condition: (image) =>
            displayImageTypes?.checked ? displayImageTypes.checked.includes(image.fileType) : true,
        },
        {
          key: 'size',
          condition: (image) =>
            bytesToKb(image.stats.size) >= (imageFilter.size?.min || 0) &&
            bytesToKb(image.stats.size) <= (imageFilter.size?.max || Number.POSITIVE_INFINITY),
        },
        {
          key: 'git_staged',
          condition: async (image, index) => {
            if (imageFilter.git_staged) {
              // Get staged images when needed to improve performance
              if (index === 0 || !git_staged_cache.current) {
                try {
                  git_staged_cache.current = await new Promise<string[]>((resolve) => {
                    vscodeApi.postMessage({ cmd: CmdToVscode.get_git_staged_images }, (res) => {
                      resolve(res || [])
                    })
                  })
                } catch {
                  git_staged_cache.current = null
                }
              }

              switch (imageFilter.git_staged) {
                case FilterRadioValue.yes:
                  return git_staged_cache.current?.includes(image.path)
                case FilterRadioValue.no:
                  return !git_staged_cache.current?.includes(image.path)
                default:
                  return true
              }
            }
            return true
          },
        },
        {
          key: 'compressed',
          condition: async (image) => {
            if (imageFilter.compressed) {
              let compressed = false
              try {
                compressed = await new Promise<boolean>((resolve) => {
                  vscodeApi.postMessage(
                    { cmd: CmdToVscode.get_image_metadata, data: { filePath: image.path } },
                    (res) => {
                      if (res) {
                        resolve(res.compressed)
                      }
                    },
                  )
                })
              } catch {}
              switch (imageFilter.compressed) {
                case FilterRadioValue.yes:
                  return compressed
                case FilterRadioValue.no:
                  return !compressed
                default:
                  return true
              }
            }
            return true
          },
        },
      ]

      const conditions = key.map((k) => builtInConditions.find((c) => c.key === k) as Condition)
      return changeImageVisible(imageList, conditions)
    },
  )

  // action image filter change
  // 目前有以下filter
  // 1. size
  // 2. git-staged
  // 3. compressed

  // 统一处理筛选条件
  // 优化单个副作用导致重复渲染的性能损耗
  const previousImageFilter = usePrevious(imageFilter)
  useUpdateEffect(() => {
    if (!imageFilter) return
    // 这里需要一个前提：imageFilter 的 key 和 ImageVisibleFilterType 一一对应
    const changedKeys = Object.keys(diff(previousImageFilter!, imageFilter)) as ImageVisibleFilterType[]
    changeImageVisibleByFilterKeys(latestImageList.current, changedKeys, imageFilter).then((res) => {
      setImageSingleTree({
        list: res,
      })
    })
  }, [imageFilter])

  return {
    imageSingleTree,
    workspaceFolder,
    originalWorkspaceFolder,
    dirs,
    imageTypes,
  }
}

const TreeContext = createContainer(useTreeContext)

export default TreeContext
