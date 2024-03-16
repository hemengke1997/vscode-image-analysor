import { set } from '@minko-fe/lodash-pro'
import { useUpdateEffect } from '@minko-fe/react-hook'
import { produce } from 'immer'
import { type WorkspaceStateKey } from '~/core/persist/workspace/common'
import { CmdToVscode } from '~/message/cmd'
import VscodeContext from '../ui-framework/src/contexts/VscodeContext'
import { vscodeApi } from '../vscode-api'
import { useTrackState } from './useTrackState'

/**
 *
 * @param key workspaceState 的 key
 */
export function useWorkspaceState<T extends WorkspaceStateKey, U>(key: T, trackState: U) {
  const { setWorkspaceState } = VscodeContext.usePicker(['setWorkspaceState'])

  const [state, setState] = useTrackState(trackState)

  useUpdateEffect(() => {
    vscodeApi.postMessage(
      {
        cmd: CmdToVscode.update_workspace_state,
        data: {
          key,
          value: state,
        },
      },
      () => {
        setWorkspaceState(
          produce((draft) => {
            set(draft, key, state)
          }),
        )
      },
    )
  }, [state])

  return [state, setState] as const
}
