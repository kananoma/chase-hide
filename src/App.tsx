// src/App.tsx
import { Game } from './components/Game'
import { useGameLogic } from './hooks/useGameLogic'

export const App = () => {
  // カスタムフックから状態とディスパッチャーを取得
  const { state, dispatch } = useGameLogic()

  // コンポーネントに渡す
  return <Game gameState={state} dispatch={dispatch} />
}
