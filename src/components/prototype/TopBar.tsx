import { ChevronDown, Home, Maximize2, Moon, Share2, Sun } from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import logoUrl from '@/assets/logo.png'

export default function TopBar({ onBackHome }: { onBackHome?: () => void }) {
  const { theme, toggle } = useTheme()
  return (
    <header className="h-12 shrink-0 bg-panel border-b border-line flex items-center justify-between pl-3 pr-4 z-30 relative">
      <div className="flex items-center gap-2">
        {onBackHome && (
          <>
            <button
              onClick={onBackHome}
              title="返回 Agent 首页"
              className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-ink-3 hover:bg-fill hover:text-pri transition-colors"
            >
              <Home className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-line mx-1" />
          </>
        )}
        <div className="flex items-center gap-1.5 cursor-pointer">
          {/* 品牌图形（全局统一 logo） */}
          <img src={logoUrl} alt="画衣衣" className="w-6 h-6 object-contain" />
          <ChevronDown className="w-3.5 h-3.5 text-mut" />
        </div>
        <div className="w-px h-4 bg-line mx-1" />
        <span className="text-[13px] font-medium text-ink">未命名文件</span>
      </div>

      <div className="flex items-center gap-2.5">
        <button
          onClick={toggle}
          title={theme === 'light' ? '切换到深色模式' : '切换到浅色模式'}
          className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-ink-3 hover:bg-fill hover:text-pri transition-colors"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </button>
        <button className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-ink-3 hover:bg-fill transition-colors">
          <Share2 className="w-4 h-4" />
        </button>
        <button className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-ink-3 hover:bg-fill transition-colors">
          <Maximize2 className="w-4 h-4" />
        </button>
        <button className="h-8 px-3.5 rounded-lg border border-line text-[13px] text-ink hover:bg-fill transition-colors">
          创建工艺单
        </button>
        <button className="h-8 px-4 rounded-lg bg-pri text-white text-[13px] font-medium hover:bg-pri-hover transition-colors shadow-sm">
          下单样衣
        </button>
      </div>
    </header>
  )
}
