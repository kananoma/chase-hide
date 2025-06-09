import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App'
import './css/style.css'

// 1. id="root" のDOM要素を取得する
const rootElement = document.getElementById('root')

// 2. root要素が存在することを保証する
if (!rootElement) {
  throw new Error('Failed to find the root element')
}

// 3. 取得した要素を元にReactのルートを作成し、Appコンポーネントを描画する
ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
