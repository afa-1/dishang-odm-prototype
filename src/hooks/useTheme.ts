import { useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

/** 主题切换：仅切换 <html data-theme>，所有颜色经 Design Tokens 响应，业务零侵入 */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const saved = localStorage.getItem('hyy-theme')
    return saved === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    localStorage.setItem('hyy-theme', theme)
  }, [theme])

  return { theme, toggle: () => setTheme((t) => (t === 'light' ? 'dark' : 'light')) }
}
