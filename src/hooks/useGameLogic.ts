import { useReducer } from 'react'
// gameReducer.tsから、ロジックの本体をインポートする
import { createInitialState, gameReducer } from './gameReducer'

/**
 * ゲームのすべてのロジックと状態を管理するカスタムフック。
 * このフック自身はロジックを持たず、gameReducerに処理を委譲する。
 */
export function useGameLogic() {
  /**
   * ReactのuseReducerフックを使用して、ゲームの状態管理を初期化します。
   */
  const [state, dispatch] = useReducer(gameReducer, 5, createInitialState)

  // 現在のゲーム状態(state)と、アクションを発行するための関数(dispatch)を返す
  return { state, dispatch }
}
