import { useMemoizedFn } from '@minko-fe/react-hook'
import { App, type ModalFuncProps } from 'antd'
import { nanoid } from 'nanoid'
import { createElement, useRef } from 'react'
import { Modal_Instance_Props } from './use-operator-modal-logic'

export type ImperativeModalProps = {
  id: string
  onClose: (id: string) => void
}

export function useImperativeModal<T extends ImperativeModalProps>(props: {
  FC: React.ComponentType<T>
  modalProps: ModalFuncProps
}) {
  const { FC, modalProps } = props
  const { modal } = App.useApp()

  const modalMap = useRef<Map<string, ReturnType<typeof modal.confirm>>>(new Map())

  const onClose = useMemoizedFn((id: string) => {
    modalMap.current.delete(id)
  })

  const showModal = useMemoizedFn((runtimeProps: Omit<T, 'id' | 'onClose'>) => {
    const id = nanoid()
    const instance = modal.confirm({
      ...Modal_Instance_Props,
      ...modalProps,
      afterClose() {
        onClose(id)
        modalProps.afterClose?.()
      },
      content: createElement(FC, {
        ...runtimeProps,
        id,
        onClose: (id) => {
          const instance = modalMap.current.get(id)
          instance?.destroy()
          onClose(id)
        },
      } as T),
    })

    modalMap.current.set(id, instance)
  })

  return {
    showModal,
    modalMap,
  }
}