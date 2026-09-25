import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

/**
 * 全局快速图标提示：
 * 浏览器原生 title 提示延迟约 1s+ 且不可调，这里通过事件委托接管所有
 * [title] 元素 —— 悬停时将 title 转存为 data-tip（抑制原生提示），
 * 约 120ms 后以统一样式的浮层快速展示说明；移出 / 点按 / 滚动立即隐藏。
 */

type Tip = { text: string; x: number; y: number; above: boolean }

const SHOW_DELAY = 120

export default function FastTooltip() {
  const [tip, setTip] = useState<Tip | null>(null)
  const timer = useRef<number | null>(null)
  const host = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const clear = () => {
      if (timer.current) {
        window.clearTimeout(timer.current)
        timer.current = null
      }
      host.current = null
      setTip(null)
    }

    const onOver = (e: MouseEvent) => {
      const el = ((e.target as HTMLElement | null)?.closest?.('[title],[data-tip]') ?? null) as HTMLElement | null
      if (el === host.current) return
      clear()
      // iframe title is its accessible document name, not an icon tooltip.
      if (!el || el.tagName === 'IFRAME') return
      let text = el.getAttribute('data-tip')
      const native = el.getAttribute('title')
      if (native !== null) {
        text = native
        el.removeAttribute('title') // 移除原生 title，避免浏览器慢速提示重复弹出
        el.setAttribute('data-tip', native)
        if (!el.getAttribute('aria-label')) el.setAttribute('aria-label', native)
      }
      if (!text || !text.trim()) return
      host.current = el
      timer.current = window.setTimeout(() => {
        if (!el.isConnected) return clear()
        const r = el.getBoundingClientRect()
        if (r.width === 0 && r.height === 0) return clear()
        const above = r.top > 44
        setTip({
          text: text!,
          x: Math.min(Math.max(r.left + r.width / 2, 70), window.innerWidth - 70),
          y: above ? r.top - 8 : r.bottom + 8,
          above,
        })
      }, SHOW_DELAY)
    }

    const onOut = (e: MouseEvent) => {
      if (!host.current) return
      const rt = e.relatedTarget as Node | null
      if (!rt || !host.current.contains(rt)) clear()
    }

    document.addEventListener('mouseover', onOver, true)
    document.addEventListener('mouseout', onOut, true)
    document.addEventListener('pointerdown', clear, true)
    document.addEventListener('wheel', clear, true)
    document.addEventListener('keydown', clear, true)
    window.addEventListener('blur', clear)
    return () => {
      document.removeEventListener('mouseover', onOver, true)
      document.removeEventListener('mouseout', onOut, true)
      document.removeEventListener('pointerdown', clear, true)
      document.removeEventListener('wheel', clear, true)
      document.removeEventListener('keydown', clear, true)
      window.removeEventListener('blur', clear)
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  if (!tip) return null
  return createPortal(
    <div
      role="tooltip"
      className="fast-tip"
      style={{ left: tip.x, top: tip.y, transform: tip.above ? 'translate(-50%,-100%)' : 'translate(-50%,0)' }}
    >
      {tip.text}
    </div>,
    document.body,
  )
}
