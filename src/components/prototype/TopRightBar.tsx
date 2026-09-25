import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Bell,
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  CreditCard,
  FileText,
  Gem,
  Globe,
  HelpCircle,
  Link2,
  LogOut,
  Mail,
  MessageCircleQuestion,
  Moon,
  PanelRightClose,
  PanelRightOpen,
  Settings,
  ShoppingBag,
  Sparkles,
  Sun,
  UserRound,
  X,
} from 'lucide-react'
import { useTheme } from '@/hooks/useTheme'
import { PlanCards, SettingsTabContent, USER, type SettingsTab } from './SettingsContent'
import { ConnectorsPanel } from './Connectors'
import CraftSheetFlow from './CraftSheet'

export { USER } from './SettingsContent' // 兼容既有引用（AgentHome 等）
import { LANGS, useLang } from '@/hooks/useLang'

/* ================= 设置弹窗 ================= */

const SETTINGS_NAV: { key: SettingsTab; label: string; icon: typeof Gem; dot?: boolean }[] = [
  { key: 'plan', label: '订阅套餐', icon: Gem },
  { key: 'recharge', label: '充值积分', icon: Sparkles },
  { key: 'pay', label: '支付方式', icon: CreditCard },
  { key: 'connect', label: '连接器', icon: Link2 },
  { key: 'profile', label: '个人信息', icon: UserRound },
  { key: 'bills', label: '账单记录', icon: FileText },
  { key: 'notice', label: '通知公告', icon: Bell, dot: true },
]

function SettingsModal({
  tab,
  setTab,
  onClose,
  showToast,
}: {
  tab: SettingsTab
  setTab: (t: SettingsTab) => void
  onClose: () => void
  showToast: (m: string) => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="w-[920px] max-w-full h-[620px] max-h-full bg-panel rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.25)] flex overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 左侧导航 */}
        <div className="w-52 shrink-0 border-r border-line-soft p-4 flex flex-col">
          <div className="text-[15px] font-semibold text-ink px-2 pb-3">设置</div>
          {SETTINGS_NAV.map((it) => {
            const Icon = it.icon
            return (
              <button
                key={it.key}
                onClick={() => setTab(it.key)}
                className={`flex items-center gap-2.5 h-10 px-3 rounded-xl text-[13px] transition-colors ${
                  tab === it.key ? 'bg-panel shadow-sm border border-line font-medium text-ink' : 'text-ink-3 hover:bg-fill hover:text-ink'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {it.label}
                {it.dot && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-acc" />}
              </button>
            )
          })}
        </div>
        {/* 右侧内容 */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex items-center justify-between px-6 pt-5 shrink-0">
            <div />
            <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-mut hover:bg-fill hover:text-ink transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-6 pb-6">
            {/* 内容页与连接器弹窗左侧菜单全局共用同一实现（SettingsContent.tsx）；连接器页复用 ConnectorsPanel */}
            {tab === 'connect' ? (
              <ConnectorsPanel />
            ) : (
              <SettingsTabContent tab={tab} showToast={showToast} onSwitchTab={setTab} />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================= 升级套餐弹窗 ================= */

export function PlansModal({ onClose, showToast }: { onClose: () => void; showToast: (m: string) => void }) {
  return (
    <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="w-[920px] max-w-full max-h-full bg-panel rounded-2xl shadow-[0_24px_80px_rgba(0,0,0,0.25)] p-6 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div className="text-[22px] font-bold text-ink">升级套餐，创意加速！</div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-mut hover:bg-fill hover:text-ink transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3.5 mt-4">
          <div className="rounded-xl border border-line p-4">
            <div className="flex items-center justify-between">
              <span className="text-[13px] text-mut">剩余积分</span>
              <button
                onClick={() => showToast('原型演示：积分明细请前往「设置 - 账单记录」查看')}
                className="w-6 h-6 rounded-full flex items-center justify-center text-mut hover:bg-fill transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-[24px] font-bold text-ink mt-1.5">
              {USER.credits} <span className="text-[13px] font-normal text-mut">Credits</span>
            </div>
            <div className="mt-2.5 h-1.5 rounded-full bg-fill overflow-hidden">
              <div className="h-full bg-pri rounded-full" style={{ width: `${(USER.credits / USER.total) * 100}%` }} />
            </div>
            <div className="flex items-center justify-between text-[11px] text-mut-2 mt-1.5">
              <span>总量 {USER.total.toLocaleString()} Credits</span>
              <span>剩余 {USER.credits}</span>
            </div>
            <div className="text-[11px] text-mut mt-2">您有 {USER.credits} 积分将于 {USER.expire} 过期</div>
          </div>
          <div className="rounded-xl border border-line p-4">
            <div className="text-[13px] text-mut">我的套餐</div>
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[24px] font-bold text-ink">{USER.plan}</span>
              <button
                onClick={() => showToast('原型演示：支付能力即将上线')}
                className="h-8 px-4 rounded-full bg-ink text-panel text-[12.5px] hover:bg-ink/85 transition-colors"
              >
                订阅套餐
              </button>
            </div>
          </div>
        </div>
        <div className="mt-5">
          <PlanCards onSubscribe={() => showToast('原型演示：支付能力即将上线')} />
        </div>
      </div>
    </div>
  )
}

/* ================= 账户下拉菜单 ================= */

function AccountDropdown({
  onOpenSettings,
  onOpenPlans,
  showToast,
  up,
}: {
  onOpenSettings: (t: SettingsTab) => void
  onOpenPlans: () => void
  showToast: (m: string) => void
  /** 在页面底部使用时向上弹出（对齐画布右上角模块，仅方向不同） */
  up?: boolean
}) {
  const { theme, toggle } = useTheme()
  const { lang, setLang, t } = useLang()
  const [langView, setLangView] = useState(false) // 语言子面板
  const menu: { label: string; icon: typeof Settings; extra?: ReactNode; danger?: boolean; act: () => void }[] = [
    { label: t('acct.settings'), icon: Settings, act: () => onOpenSettings('bills') },
    {
      label: t('acct.dark'),
      icon: theme === 'light' ? Moon : Sun,
      extra: (
        <span className={`w-8 h-[18px] rounded-full p-[2px] transition-colors ${theme === 'dark' ? 'bg-pri' : 'bg-fill-2'}`}>
          <span className={`block w-[14px] h-[14px] rounded-full bg-white shadow transition-transform ${theme === 'dark' ? 'translate-x-[14px]' : ''}`} />
        </span>
      ),
      act: toggle,
    },
    {
      label: t('acct.lang'),
      icon: Globe,
      extra: (
        <>
          <span className="text-[12px] text-mut-2">{LANGS.find((l) => l.key === lang)?.name}</span>
          <ChevronRight className="w-3.5 h-3.5 text-mut-2" />
        </>
      ),
      act: () => setLangView(true),
    },
    { label: t('acct.help'), icon: HelpCircle, extra: <ChevronRight className="w-3.5 h-3.5 text-mut-2" />, act: () => showToast('原型演示：帮助中心即将上线') },
    { label: t('acct.notice'), icon: Bell, extra: <span className="w-1.5 h-1.5 rounded-full bg-acc" />, act: () => onOpenSettings('notice') },
    { label: t('acct.contact'), icon: Mail, extra: <ChevronRight className="w-3.5 h-3.5 text-mut-2" />, act: () => showToast('原型演示：联系方式即将上线') },
    {
      label: t('acct.feedback'),
      icon: MessageCircleQuestion,
      extra: <ChevronRight className="w-3.5 h-3.5 text-mut-2" />,
      act: () => showToast('原型演示：反馈通道即将上线'),
    },
    { label: t('acct.logout'), icon: LogOut, danger: true, act: () => showToast('已退出登录（原型演示）') },
  ]
  // 语言子面板：简体中文 / English / 日本語 / 한국어，全局即时切换并持久化
  if (langView)
    return (
      <div
        className={`absolute z-50 w-72 rounded-2xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.16)] overflow-hidden ${
          up ? 'left-0 bottom-full mb-2' : 'right-0 top-full mt-2'
        }`}
      >
        <div className="bg-panel py-1.5">
          <button
            onClick={() => setLangView(false)}
            className="w-full flex items-center gap-2.5 px-4 h-10 text-[13px] text-ink-2 hover:bg-fill transition-colors"
          >
            <ChevronLeft className="w-4 h-4 shrink-0 text-mut-2" />
            <span className="font-medium text-ink">{t('acct.lang')}</span>
          </button>
          <div className="mx-3.5 my-1 border-t border-line-soft" />
          {LANGS.map((l) => (
            <button
              key={l.key}
              onClick={() => {
                setLang(l.key)
                setLangView(false)
              }}
              className="w-full flex items-center gap-2.5 px-4 h-10 text-[13px] text-ink-2 hover:bg-fill transition-colors"
            >
              <Globe className="w-4 h-4 shrink-0 text-mut-2" />
              {l.name}
              {lang === l.key && <Check className="ml-auto w-4 h-4 text-pri" />}
            </button>
          ))}
        </div>
      </div>
    )
  return (
    <div
      className={`absolute z-50 w-72 rounded-2xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.16)] overflow-hidden ${
        up ? 'left-0 bottom-full mb-2' : 'right-0 top-full mt-2'
      }`}
    >
      {/* 深色资料卡 */}
      <div className="bg-ink text-panel p-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-full bg-panel text-ink flex items-center justify-center text-[14px] font-semibold shrink-0">V</span>
          <div className="min-w-0">
            <div className="text-[14px] font-semibold truncate">{USER.name}</div>
            <div className="flex items-center gap-1 text-[11.5px] text-panel/60 truncate">
              {USER.email}
              <Copy
                className="w-3 h-3 cursor-pointer hover:text-panel"
                onClick={(e) => {
                  e.stopPropagation()
                  try {
                    navigator.clipboard.writeText(USER.email)
                  } catch {
                    /* ignore */
                  }
                  showToast('邮箱已复制')
                }}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between mt-3.5">
          <span className="flex items-center gap-1 text-[13px]">
            <Sparkles className="w-3.5 h-3.5 text-acc" />
            {USER.credits} Credits
          </span>
          <span className="text-[11px] px-1.5 py-0.5 rounded bg-white/10">{USER.plan}</span>
        </div>
        <div className="mt-2 h-1 rounded-full bg-white/15 overflow-hidden">
          <div className="h-full bg-acc rounded-full" style={{ width: `${(USER.credits / USER.total) * 100}%` }} />
        </div>
        <button
          onClick={onOpenPlans}
          className="mt-3.5 w-full h-9 rounded-full bg-panel text-ink text-[13px] font-medium hover:bg-panel/90 transition-colors"
        >
          {t('acct.upgrade')}
        </button>
      </div>
      {/* 白色菜单列表 */}
      <div className="bg-panel py-1.5">
        {menu.map((it) => {
          const Icon = it.icon
          return (
            <button
              key={it.label}
              onClick={it.act}
              className={`w-full flex items-center gap-2.5 px-4 h-10 text-[13px] transition-colors ${
                it.danger ? 'text-red-500 hover:bg-red-50' : 'text-ink-2 hover:bg-fill'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {it.label}
              {it.extra && <span className="ml-auto flex items-center gap-1.5">{it.extra}</span>}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ================= 账户体系模块（头像 / 积分 / 分享）：画布右上角「我的」同款，可复用于任意页面 ================= */

export function AccountCluster({ up, vertical, expanded }: { up?: boolean; vertical?: boolean; expanded?: boolean }) {
  const [accountOpen, setAccountOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null)
  const [plansOpen, setPlansOpen] = useState(false)
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const showToast = (m: string) => {
    setToast(m)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2400)
  }

  useEffect(() => {
    const h = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setAccountOpen(false)
    }
    document.addEventListener('pointerdown', h, true)
    return () => {
      document.removeEventListener('pointerdown', h, true)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  return (
    <>
      <div ref={rootRef} className={expanded ? 'relative' : `flex gap-1 ${vertical ? 'flex-col items-center' : 'items-center justify-center'}`}>
        {/* 账户体系：头像 / 积分 / 分享；expanded=左侧导航展开态，补充姓名与邮箱信息排版 */}
        <div className={expanded ? '' : 'relative'}>
          <button
            onClick={() => setAccountOpen(!accountOpen)}
            title="账户"
            className={
              expanded
                ? 'w-full flex items-center gap-3 rounded-2xl px-1.5 py-1.5 text-left hover:bg-panel/80 transition-colors'
                : 'w-9 h-9 rounded-full bg-pri text-white flex items-center justify-center text-[13px] font-semibold hover:bg-pri-hover transition-colors'
            }
          >
            <span
              className={`rounded-full bg-pri text-white flex items-center justify-center font-semibold shrink-0 ${
                expanded ? 'w-10 h-10 text-[14px]' : 'w-9 h-9 text-[13px]'
              }`}
            >
              V
            </span>
            {expanded && (
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-ink truncate">{USER.name}</span>
                <span className="block text-[12px] text-mut truncate">{USER.email}</span>
              </span>
            )}
          </button>
          {accountOpen && (
            <AccountDropdown
              up={up}
              onOpenSettings={(t) => {
                setAccountOpen(false)
                setSettingsTab(t)
              }}
              onOpenPlans={() => {
                setAccountOpen(false)
                setPlansOpen(true)
              }}
              showToast={showToast}
            />
          )}
        </div>
      </div>
      {settingsTab && <SettingsModal tab={settingsTab} setTab={setSettingsTab} onClose={() => setSettingsTab(null)} showToast={showToast} />}
      {plansOpen && <PlansModal onClose={() => setPlansOpen(false)} showToast={showToast} />}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] h-9 px-4 rounded-full bg-ink text-panel text-[13px] flex items-center shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
          {toast}
        </div>
      )}
    </>
  )
}

/* ================= 顶部横向导航条 ================= */

export function TopRightBar({ libraryOpen, onToggleLibrary }: { libraryOpen: boolean; onToggleLibrary: () => void }) {
  const [accountOpen, setAccountOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<SettingsTab | null>(null)
  const [plansOpen, setPlansOpen] = useState(false)
  const [craftOpen, setCraftOpen] = useState(false) // 创建工艺单：完整复用工艺单模块（选图弹窗 → 工艺单文档）
  const [toast, setToast] = useState('')
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rootRef = useRef<HTMLDivElement>(null)

  const showToast = (m: string) => {
    setToast(m)
    if (toastTimer.current) clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 2400)
  }

  useEffect(() => {
    const h = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setAccountOpen(false)
      }
    }
    document.addEventListener('pointerdown', h, true)
    return () => {
      document.removeEventListener('pointerdown', h, true)
      if (toastTimer.current) clearTimeout(toastTimer.current)
    }
  }, [])

  return (
    <>
      <div
        ref={rootRef}
        className="absolute right-2 top-2 z-30 h-12 px-1.5 bg-panel rounded-full border border-line shadow-[0_4px_20px_rgba(0,0,0,0.08)] flex items-center gap-1" // 外圈留白随整体减少三分之一（12→8），与左侧对话卡片顶边对齐
      >
        {/* 素材库 */}
        <button
          onClick={onToggleLibrary}
          title={libraryOpen ? '收起素材库' : '展开素材库'}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            libraryOpen ? 'bg-pri-soft text-pri' : 'text-ink-3 hover:bg-fill hover:text-ink'
          }`}
        >
          {libraryOpen ? <PanelRightClose className="w-[18px] h-[18px]" /> : <PanelRightOpen className="w-[18px] h-[18px]" />}
        </button>
        <span className="w-px h-5 bg-line mx-0.5" />
        {/* 工作流操作 */}
        <button
          onClick={() => setCraftOpen(true)}
          title="创建工艺单"
          className="w-9 h-9 rounded-full flex items-center justify-center text-ink-3 hover:bg-fill hover:text-ink transition-colors"
        >
          <FileText className="w-[18px] h-[18px]" />
        </button>
        <button
          onClick={() => showToast('原型演示：样衣下单流程即将上线')}
          title="下单样衣"
          className="w-9 h-9 rounded-full flex items-center justify-center text-ink-3 hover:bg-fill hover:text-ink transition-colors"
        >
          <ShoppingBag className="w-[18px] h-[18px]" />
        </button>
        <span className="w-px h-5 bg-line mx-0.5" />
        {/* 账户体系：头像 / 积分 / 分享 */}
        <button
          onClick={() => {
            setSettingsTab('recharge')
            setAccountOpen(false)
          }}
          title="我的积分"
          className="h-9 pl-2.5 pr-3 rounded-full flex items-center gap-1.5 text-[13px] font-medium text-ink hover:bg-fill transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-acc" />
          {USER.credits}
        </button>
        <div className="relative">
          <button
            onClick={() => {
              setAccountOpen(!accountOpen)
            }}
            title="账户"
            className="w-9 h-9 rounded-full bg-pri text-white flex items-center justify-center text-[13px] font-semibold hover:bg-pri-hover transition-colors"
          >
            V
          </button>
          {accountOpen && (
            <AccountDropdown
              onOpenSettings={(t) => {
                setAccountOpen(false)
                setSettingsTab(t)
              }}
              onOpenPlans={() => {
                setAccountOpen(false)
                setPlansOpen(true)
              }}
              showToast={showToast}
            />
          )}
        </div>
      </div>
      {settingsTab && <SettingsModal tab={settingsTab} setTab={setSettingsTab} onClose={() => setSettingsTab(null)} showToast={showToast} />}
      {plansOpen && <PlansModal onClose={() => setPlansOpen(false)} showToast={showToast} />}
      {craftOpen && <CraftSheetFlow showToast={showToast} baseParams={{}} onClose={() => setCraftOpen(false)} />}
      {toast && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[60] h-9 px-4 rounded-full bg-ink text-panel text-[13px] flex items-center shadow-[0_8px_24px_rgba(0,0,0,0.25)]">
          {toast}
        </div>
      )}
    </>
  )
}
