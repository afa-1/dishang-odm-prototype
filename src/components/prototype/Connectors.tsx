import { useEffect, useMemo, useState } from 'react'
import { SettingsTabContent, type SettingsContentTab } from './SettingsContent'
import {
  Bell,
  Check,
  CreditCard,
  Gem,
  Info,
  PlugZap,
  Plus,
  ReceiptText,
  Search,
  Sparkles,
  User,
  X,
} from 'lucide-react'

/* ================= 连接器（应用链接）模块：首页 / 画布内页对话框共用 =================
   对话框底部「链接条」→ 点击打开「连接器」设置弹窗 → 「+ 自定义连接器」→「添加连接器」流程
   已连接状态持久化 localStorage（hyy-connectors-v1），两处对话框数据一致 */

export interface Connector {
  id: string
  name: string
  cat: string // 分类（开发部署 / 文档素材 / 邮件通知 / 自定义）
  desc: string
  color: string // 徽标底色
  abbr: string // 徽标字符
  custom?: boolean
  url?: string
}

const RECOMMENDED: Connector[] = [
  { id: 'github', name: 'GitHub', cat: '开发部署', desc: '访问和管理仓库、Issue 与拉取请求', color: '#24292f', abbr: 'G' },
  { id: 'tencent-docs', name: '腾讯文档', cat: '文档素材', desc: '访问和管理在线文档、表格与文件', color: '#2b6de8', abbr: '腾' },
  { id: 'notion', name: 'Notion', cat: '文档素材', desc: '整合页面、数据库与团队知识库内容', color: '#111111', abbr: 'N' },
  { id: 'airtable', name: 'Airtable', cat: '文档素材', desc: '管理表格、字段与记录', color: '#18bfff', abbr: 'A' },
  { id: 'linear', name: 'Linear', cat: '开发部署', desc: '管理 Issue、项目与开发计划', color: '#5e6ad2', abbr: 'L' },
  { id: 'resend', name: 'Resend', cat: '邮件通知', desc: '发送邮件、管理联系人与营销广播', color: '#000000', abbr: 'R' },
  { id: 'brevo', name: 'Brevo', cat: '邮件通知', desc: '发送邮件和短信，管理联系人与营销活动', color: '#0b996e', abbr: 'B' },
]

const LS_KEY = 'hyy-connectors-v1'

interface ConnState {
  connected: string[] // 已连接连接器 id
  customs: Connector[] // 自定义连接器
}

const loadState = (): ConnState => {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const p = JSON.parse(raw) as ConnState
      return { connected: p.connected ?? [], customs: p.customs ?? [] }
    }
  } catch {
    /* ignore */
  }
  return { connected: [], customs: [] }
}

export function ConnectorLogo({ c, size = 'md' }: { c: Connector; size?: 'sm' | 'md' }) {
  const cls = size === 'sm' ? 'w-6 h-6 rounded-md text-[11px]' : 'w-10 h-10 rounded-xl text-[15px]'
  return (
    <span className={`${cls} shrink-0 flex items-center justify-center text-white font-semibold`} style={{ background: c.color }}>
      {c.abbr}
    </span>
  )
}

/** 对话框底部链接条：渐变底 + 插头图标 + 文案 + 右侧应用图标，点击进入连接器设置 */
export function ConnectorLinkBar({ onOpen, onClose, inline }: { onOpen: () => void; onClose?: () => void; inline?: boolean }) {
  const [{ connected, customs }] = useState(loadState)
  const icons = useMemo(() => {
    const all = [...RECOMMENDED, ...customs]
    const linked = all.filter((c) => connected.includes(c.id))
    return (linked.length ? linked : all).slice(0, 5)
  }, [connected, customs])
  return (
    <div
      role="button"
      onClick={onOpen}
      className={
        inline
          ? 'w-full h-9 flex items-center gap-2.5 pl-3 pr-3 text-left transition-colors border-t border-line-soft rounded-b-[11px] hover:bg-fill'
          : '-mt-6 relative z-0 w-full h-[62px] rounded-2xl flex items-end gap-2 pl-3.5 pr-3 pb-[7px] text-left cursor-pointer transition-all hover:shadow-[0_4px_16px_rgba(42,104,254,0.10)]'
      }
      style={
        inline
          ? undefined
          : {
              background:
                'linear-gradient(100deg, rgba(42,104,254,0.22) 0%, rgba(42,104,254,0.14) 30%, rgba(16,185,129,0.20) 62%, rgba(139,92,246,0.22) 100%)',
            }
      }
      title="添加应用链接（连接器）"
    >
      <PlugZap className="w-4 h-4 text-ink-2 shrink-0" />
      <span className="text-[13px] text-ink-2 whitespace-nowrap overflow-hidden text-ellipsis flex-1 min-w-0">将你的常用应用接入画衣衣</span>
      <span className="ml-auto flex items-center -space-x-1.5 shrink-0">
        {icons.map((c) => (
          <span
            key={c.id}
            className="w-6 h-6 rounded-md flex items-center justify-center text-white text-[10.5px] font-semibold border-2 border-panel shadow-sm"
            style={{ background: c.color }}
            title={c.name}
          >
            {c.abbr}
          </span>
        ))}
      </span>
      {onClose && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onClose()
          }}
          title="关闭应用接入条（可从工具栏「连接器」恢复）"
          className="ml-1 w-5 h-5 rounded-full flex items-center justify-center text-ink-2/60 hover:text-ink hover:bg-white/50 transition-colors shrink-0"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

/* ---------------- 添加连接器（自定义连接器流程弹窗） ---------------- */

function AddConnectorModal({ onClose, onAdded }: { onClose: () => void; onAdded: (c: Connector) => void }) {
  const [tab, setTab] = useState<'form' | 'json'>('form')
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [auth, setAuth] = useState<'oauth' | 'bearer' | 'header' | 'none'>('oauth')
  const [json, setJson] = useState('')
  const [err, setErr] = useState('')

  const submit = () => {
    if (tab === 'json') {
      try {
        const p = JSON.parse(json) as { name?: string; url?: string }
        if (!p.name || !p.url) throw new Error()
        onAdded({ id: `custom-${Date.now()}`, name: p.name, cat: '自定义', desc: p.url, color: '#2A68FE', abbr: p.name.slice(0, 1).toUpperCase(), custom: true, url: p.url })
      } catch {
        setErr('JSON 配置格式不正确，需包含 name 与 url 字段')
      }
      return
    }
    if (!name.trim()) {
      setErr('请填写连接器名称')
      return
    }
    if (!/^https?:\/\/.+\..+/.test(url.trim())) {
      setErr('请填写正确的 URL（以 http:// 或 https:// 开头）')
      return
    }
    onAdded({ id: `custom-${Date.now()}`, name: name.trim(), cat: '自定义', desc: url.trim(), color: '#2A68FE', abbr: name.trim().slice(0, 1).toUpperCase(), custom: true, url: url.trim() })
  }

  const AUTHS = [
    { v: 'oauth' as const, name: 'OAuth', desc: '下一步进行授权。' },
    { v: 'bearer' as const, name: 'Bearer Token', desc: '以 Authorization: Bearer <token> 形式发送。' },
    { v: 'header' as const, name: '自定义请求头', desc: '设置任意请求头键值对（例如 X-API-Key）。' },
    { v: 'none' as const, name: '无', desc: '不使用认证；连接器服务器须允许匿名访问。' },
  ]

  return (
    <div className="fixed inset-0 z-[70] bg-black/45 flex items-center justify-center p-6" onClick={onClose}>
      <div className="w-[520px] max-w-full bg-panel rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.22)] p-6" onClick={(e) => e.stopPropagation()}>
        <div className="text-[17px] font-bold text-ink">添加连接器</div>
        {/* 手动填写 / 粘贴 JSON 配置 */}
        <div className="mt-4 inline-flex items-center gap-1 bg-fill rounded-full p-1">
          {(
            [
              { v: 'form' as const, name: '手动填写' },
              { v: 'json' as const, name: '粘贴 JSON 配置' },
            ]
          ).map((t) => (
            <button
              key={t.v}
              onClick={() => {
                setTab(t.v)
                setErr('')
              }}
              className={`h-8 px-4 rounded-full text-[13px] transition-all ${tab === t.v ? 'bg-panel text-ink font-medium shadow-sm' : 'text-mut hover:text-ink'}`}
            >
              {t.name}
            </button>
          ))}
        </div>

        {tab === 'form' ? (
          <div className="mt-5 flex flex-col gap-4">
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] text-ink-2">名称</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例如：我的自定义连接器"
                className="h-10 px-3.5 rounded-xl border border-line bg-panel text-[13px] outline-none focus:border-pri transition-colors placeholder:text-mut-3"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[12.5px] text-ink-2">URL</span>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://mcp.website.com/mcp"
                className="h-10 px-3.5 rounded-xl border border-line bg-panel text-[13px] outline-none focus:border-pri transition-colors placeholder:text-mut-3"
              />
            </label>
            <div className="flex flex-col gap-1">
              <span className="text-[12.5px] text-ink-2">认证方式</span>
              <div className="mt-1 flex flex-col gap-3.5">
                {AUTHS.map((a) => (
                  <button key={a.v} onClick={() => setAuth(a.v)} className="flex items-start gap-2.5 text-left group">
                    <span
                      className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                        auth === a.v ? 'border-acc' : 'border-line group-hover:border-mut'
                      }`}
                    >
                      {auth === a.v && <span className="w-2 h-2 rounded-full bg-acc" />}
                    </span>
                    <span>
                      <span className={`block text-[13.5px] ${auth === a.v ? 'text-ink font-medium' : 'text-ink-2'}`}>{a.name}</span>
                      <span className="block text-[12px] text-mut mt-0.5">{a.desc}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="mt-5">
            <textarea
              value={json}
              onChange={(e) => setJson(e.target.value)}
              rows={8}
              placeholder={'{\n  "name": "我的自定义连接器",\n  "url": "https://mcp.website.com/mcp"\n}'}
              className="w-full resize-none rounded-xl border border-line bg-panel px-3.5 py-3 text-[12.5px] font-mono outline-none focus:border-pri transition-colors placeholder:text-mut-3"
            />
          </div>
        )}

        <div className="mt-4 flex items-center gap-2 rounded-xl bg-fill px-3.5 py-2.5 text-[12px] text-mut">
          <Info className="w-3.5 h-3.5 shrink-0" />
          点击「添加并授权」后，将跳转到服务商的授权页面。
        </div>
        {err && <div className="mt-2 text-[12px] text-err">{err}</div>}
        <div className="mt-5 flex items-center justify-end gap-2.5">
          <button onClick={onClose} className="h-9 px-4 rounded-full text-[13px] text-ink-2 hover:bg-fill transition-colors">
            取消
          </button>
          <button onClick={submit} className="h-9 px-5 rounded-full bg-ink text-panel text-[13px] font-medium hover:bg-ink/85 transition-colors">
            添加并授权
          </button>
        </div>
      </div>
    </div>
  )
}

/* ---------------- 连接器设置弹窗（设置侧栏 + 连接器管理） ---------------- */

const SETTINGS_MENU = [
  { id: 'plan', name: '订阅套餐', Icon: Gem },
  { id: 'credits', name: '充值积分', Icon: Sparkles },
  { id: 'pay', name: '支付方式', Icon: CreditCard },
  { id: 'connectors', name: '连接器', Icon: PlugZap },
  { id: 'profile', name: '个人信息', Icon: User },
  { id: 'bills', name: '账单记录', Icon: ReceiptText },
  { id: 'notice', name: '通知公告', Icon: Bell },
]

/* ================= 连接器内容面板：ConnectorsModal 与 设置-连接器 页共用 ================= */

export function ConnectorsPanel({ onClose }: { onClose?: () => void }) {
  const [state, setState] = useState<ConnState>(loadState)
  const [q, setQ] = useState('')
  const [adding, setAdding] = useState(false)
  const [toast, setToast] = useState('')

  useEffect(() => {
    localStorage.setItem(LS_KEY, JSON.stringify(state))
  }, [state])
  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  const all = useMemo(() => [...RECOMMENDED, ...state.customs], [state.customs])
  const list = all.filter((c) => !q || c.name.toLowerCase().includes(q.toLowerCase()) || c.desc.includes(q) || c.cat.includes(q))
  const toggle = (c: Connector) => {
    const on = state.connected.includes(c.id)
    setState((st) => ({ ...st, connected: on ? st.connected.filter((id) => id !== c.id) : [...st.connected, c.id] }))
    setToast(on ? `已断开「${c.name}」` : `已连接「${c.name}」`)
  }

  return (
    <div className="flex-1 min-h-0 flex flex-col p-6 overflow-y-auto relative">
      {toast && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-ink text-panel text-[12px] px-3.5 py-1.5 rounded-full shadow-lg">{toast}</div>
      )}
      <div className="flex items-center gap-3">
        <div>
          <div className="text-[17px] font-bold text-ink">连接器</div>
          <div className="mt-1 text-[12.5px] text-mut">管理已连接的应用，或添加自定义连接器。</div>
        </div>
        <button
          onClick={() => setAdding(true)}
          className="ml-auto h-9 px-4 rounded-full bg-ink text-panel text-[13px] font-medium hover:bg-ink/85 transition-colors flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          自定义连接器
        </button>
        {onClose && (
          <button onClick={onClose} className="w-8 h-8 rounded-full flex items-center justify-center text-mut hover:bg-fill hover:text-ink transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 搜索 */}
      <div className="mt-5 flex items-center gap-2 h-10 px-3.5 rounded-xl bg-fill-2 border border-line-soft">
        <Search className="w-4 h-4 text-mut-3 shrink-0" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="搜索连接器..."
          className="flex-1 min-w-0 bg-transparent outline-none text-[13px] placeholder:text-mut-3"
        />
      </div>

      <div className="mt-4 text-[12px] text-mut-2">推荐连接器</div>
      <div className="mt-2.5 grid grid-cols-2 gap-3">
        {list.map((c) => {
          const on = state.connected.includes(c.id)
          return (
            <div
              key={c.id}
              className={`rounded-2xl border p-4 flex items-start gap-3 transition-colors ${on ? 'border-pri-line bg-pri-soft/40' : 'border-line-soft bg-panel hover:border-pri/30'}`}
            >
              <ConnectorLogo c={c} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13.5px] font-semibold text-ink truncate">{c.name}</span>
                </div>
                <div className="text-[11px] text-mut-2">{c.cat}</div>
                <div className="mt-1.5 text-[12px] text-mut leading-relaxed line-clamp-1">{c.desc}</div>
              </div>
              <button
                onClick={() => toggle(c)}
                title={on ? '断开连接' : '连接'}
                className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 transition-all ${
                  on ? 'bg-pri border-pri text-white' : 'border-line text-ink-3 hover:border-pri hover:text-pri'
                }`}
              >
                {on ? <Check className="w-3.5 h-3.5" /> : <Plus className="w-4 h-4" />}
              </button>
            </div>
          )
        })}
        {!list.length && <div className="col-span-2 py-10 text-center text-[12.5px] text-mut">没有匹配的连接器</div>}
      </div>
      {adding && (
        <AddConnectorModal
          onClose={() => setAdding(false)}
          onAdded={(c) => {
            setState((st) => ({ connected: [...st.connected, c.id], customs: [...st.customs, c] }))
            setAdding(false)
            setToast(`已连接「${c.name}」`)
          }}
        />
      )}
    </div>
  )
}

/* 左侧菜单 id → 设置页 tab（credits 对应设置中心的 recharge） */
const MENU2TAB: Record<string, SettingsContentTab> = {
  plan: 'plan',
  credits: 'recharge',
  pay: 'pay',
  profile: 'profile',
  bills: 'bills',
  notice: 'notice',
}

export function ConnectorsModal({ onClose }: { onClose: () => void }) {
  const [menu, setMenu] = useState('connectors')
  const [toast, setToast] = useState('')

  useEffect(() => {
    if (!toast) return
    const t = window.setTimeout(() => setToast(''), 2200)
    return () => window.clearTimeout(t)
  }, [toast])

  return (
    <div className="fixed inset-0 z-[60] bg-black/40 flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="w-[920px] max-w-full h-[600px] max-h-[86vh] bg-panel rounded-2xl shadow-[0_24px_64px_rgba(0,0,0,0.22)] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 左侧：设置菜单（连接器为当前项） */}
        <div className="w-56 shrink-0 bg-fill/60 border-r border-line-soft py-5 px-3 flex flex-col">
          <div className="px-2.5 text-[15px] font-bold text-ink">设置</div>
          <div className="mt-4 flex flex-col gap-0.5">
            {SETTINGS_MENU.map((m) => (
              <button
                key={m.id}
                onClick={() => setMenu(m.id)}
                className={`flex items-center gap-2.5 h-10 px-3 rounded-xl text-[13px] transition-colors ${
                  menu === m.id ? 'bg-panel text-ink font-medium shadow-[0_2px_8px_rgba(0,0,0,0.06)]' : 'text-ink-3 hover:bg-panel/70 hover:text-ink'
                }`}
              >
                <m.Icon className="w-4 h-4" />
                {m.name}
                {m.id === 'notice' && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-acc" />}
              </button>
            ))}
          </div>
        </div>

        {/* 右侧：内容区（连接器为本模块；其余菜单直接复用设置中心已有功能页，不再显示占位） */}
        <div className="flex-1 min-w-0 flex flex-col relative">
          {toast && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-ink text-panel text-[12px] px-3.5 py-1.5 rounded-full shadow-lg">{toast}</div>
          )}
          {menu === 'connectors' ? (
            <ConnectorsPanel onClose={onClose} />
          ) : (
            <>
              <div className="flex justify-end px-6 pt-5 shrink-0">
                <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-mut hover:bg-fill hover:text-ink transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
                <SettingsTabContent tab={MENU2TAB[menu] ?? 'plan'} showToast={setToast} onSwitchTab={(t) => setMenu(t === 'recharge' ? 'credits' : t)} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
