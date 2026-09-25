import { useEffect, useRef, useState } from 'react'
import type { PointerEvent as RPointerEvent, RefObject } from 'react'

/* =====================================================================
   全局统一滑动条标准（源自无限画布左侧 Agent 对话框面板右侧移动轴）：
   · 6px 浅灰圆角移动轴（bg-line），悬浮高亮（bg-mut/45）、拖拽加深（bg-mut/60）
   · 原生滚动条隐藏，内容无溢出时移动轴自动隐藏
   · 移动轴可直接拖拽，按内容比例映射滚动位置
   用法：
     const ax = useScrollAxis()            // maxRatio 默认 1；0.5 表示轴长上限为视口一半
     <div className="relative">
       <div ref={ax.ref} onScroll={ax.sync} className="overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">...</div>
       <ScrollAxis ax={ax} />
     </div>
   ===================================================================== */
export interface ScrollAxisState {
  top: number
  h: number
  show: boolean
}

export interface ScrollAxisCtl {
  ref: RefObject<HTMLDivElement | null>
  ax: ScrollAxisState
  drag: boolean
  sync: () => void
  startDrag: (e: RPointerEvent) => void
}

export function useScrollAxis(maxRatio = 1): ScrollAxisCtl {
  const ref = useRef<HTMLDivElement>(null)
  const [ax, setAx] = useState<ScrollAxisState>({ top: 0, h: 0, show: false })
  const [drag, setDrag] = useState(false)
  const dragRef = useRef<{ startY: number; startTop: number } | null>(null)
  const ratioRef = useRef(maxRatio)
  ratioRef.current = maxRatio

  const sync = () => {
    const el = ref.current
    if (!el) return
    const { scrollHeight: sh, clientHeight: ch, scrollTop: st } = el
    if (sh <= ch + 1) {
      setAx((s) => (s.show ? { top: 0, h: 0, show: false } : s))
      return
    }
    const h = Math.max(28, Math.min(ch * ratioRef.current, (ch / sh) * ch))
    const top = (st / (sh - ch)) * (ch - h)
    setAx((s) => (s.show && Math.abs(s.top - top) < 0.5 && Math.abs(s.h - h) < 0.5 ? s : { top, h, show: true }))
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    sync()
    const ro = new ResizeObserver(sync)
    ro.observe(el)
    return () => ro.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(sync) // 内容变化后同步移动轴

  const startDrag = (e: RPointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = ref.current
    if (!el) return
    dragRef.current = { startY: e.clientY, startTop: el.scrollTop }
    setDrag(true)
    const onMove = (ev: PointerEvent) => {
      const d = dragRef.current
      if (!d) return
      const sh = el.scrollHeight
      const ch = el.clientHeight
      const hPx = Math.max(28, Math.min(ch * ratioRef.current, (ch / sh) * ch))
      el.scrollTop = d.startTop + ((ev.clientY - d.startY) * (sh - ch)) / (ch - hPx)
    }
    const onUp = () => {
      dragRef.current = null
      setDrag(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  return { ref, ax, drag, sync, startDrag }
}

/** 移动轴本体：浅灰圆角，悬浮高亮，可拖拽；默认贴容器右侧内缘 */
export function ScrollAxis({ ctl, rightClass = 'right-0' }: { ctl: ScrollAxisCtl; rightClass?: string }) {
  if (!ctl.ax.show) return null
  return (
    <div
      onPointerDown={ctl.startDrag}
      title="拖拽滚动内容"
      className={`absolute ${rightClass} w-[6px] rounded-full z-30 transition-colors duration-150 ${ctl.drag ? 'bg-mut/60' : 'bg-line hover:bg-mut/45'}`}
      style={{ top: ctl.ax.top, height: ctl.ax.h }}
    />
  )
}
