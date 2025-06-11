/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}', // srcディレクトリ以下のすべての関連ファイルを対象にする
  ],
  theme: {
    extend: {
      colors: {
        'board-bg': '#f0f0f0',
        'hex-bg': '#ffffff',
        player: '#3498db',
        'player-hover': '#2980b9', // :hover用に定義
        highlight: 'rgba(52, 152, 219, 0.3)',
        'disabled-bg': '#bdc3c7',
        'disabled-text': '#7f8c8d',
      },
      fontFamily: {
        // 'sans' を上書きしてプロジェクト全体のデフォルトフォントにする
        sans: ['Inter', '"Noto Sans JP"', 'sans-serif'],
      },
      borderRadius: {
        // カスタムの角丸を追加
        '4xl': '1.5rem', // 24px
      },
      boxShadow: {
        // カスタムの影を追加
        main: '0 8px 30px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
