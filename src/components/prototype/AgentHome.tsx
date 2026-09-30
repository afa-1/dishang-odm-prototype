import { useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import {
  ArrowDownRight,
  BadgeCheck,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Puzzle,
  Hammer,
  Images,
  Palette,
  Library,
  MessageCircleQuestion,
  Plus,
  NotebookPen,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  Scissors,
  Send,
  SwatchBook,
  Shirt,
  Sparkles,
  Users,
  X,
  Zap,
  Lightbulb,
  FolderKanban,
  Building2,
} from 'lucide-react'
import logoUrl from '@/assets/logo.png'
import { AccountCluster, PlansModal } from './TopRightBar'
import { useLang } from '@/hooks/useLang'
import InspoPage from './InspoPage'
import PatternPage from './PatternPage'
import SkillsPage from './SkillsPage'
import DirectoryPage, { BrandHub } from './projects/DirectoryPage'
import WorkbenchPage from './WorkbenchPage'
import ProjectsPage from './projects/ProjectsPage'

import ResourceLibrary from './projects/ResourceLibrary'
import CapabilityHub from './projects/CapabilityHub'
import { ConnectorLinkBar, ConnectorsModal } from './Connectors'
import { GLYPHS, OFFICIAL_TEAMS, PLATFORM_SKILLS, teamMemberOf, useSkillStore, type SkillEntry, type Team, type TeamMember } from './skills'
import { useScrollAxis, ScrollAxis } from './scrollBar'

/* ================= 数据：技能胶囊（点击把指令示例代入输入框，可修改后再发送） ================= */

interface HomeSkill {
  id: string
  name: string
  prompt: string
  icon: React.ComponentType<{ className?: string }>
  /** 场景分类：design=服装设计；market=视觉营销（顶部分类导航联动） */
  cat: 'design' | 'market'
  /** 卡片副标题说明 */
  sub?: string
  /** 卡片右侧叠放示例图 */
  imgs?: string[]
}

/** 服装版片图标（AI打版）：版片轮廓 + 经向基准线 + 对位剪口 */
function PatternPieceIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M8 3 L12 5.4 L16 3 L18.5 21 L5.5 21 Z" />
      <path d="M12 8.2 L12 17.2" strokeDasharray="2 2.4" />
      <path d="M10.9 21 L12 18.9 L13.1 21" />
    </svg>
  )
}

const HOME_SKILLS: HomeSkill[] = [
  { id: 'style', name: '服装款式设计', cat: 'design', icon: Shirt, prompt: '帮我设计一款 2026 秋冬女装新款，静奢通勤风格', sub: '从灵感描述到成衣款式图', imgs: ['/samples/gen-look.png', '/samples/pf-trade.png'] },
  { id: 'pattern', name: 'AI打版', cat: 'design', icon: PatternPieceIcon, prompt: '基于画布中的款式生成打版结构图与尺寸表', sub: '款式一键生成打版结构图', imgs: ['/samples/pf-techpack.png', '/samples/pf-detail.png'] },
  { id: 'plan', name: '服装企划', cat: 'design', icon: NotebookPen, prompt: '帮我制作一份 2026 秋冬服装系列企划案', sub: '系列企划案与流行趋势分析', imgs: ['/samples/pf-plan.png', '/samples/pf-trend.png'] },
  { id: 'fabric', name: '面料选配', cat: 'design', icon: SwatchBook, prompt: '为这款风衣推荐 3 组面料方案：成分、克重、手感与供应商建议' },
  { id: 'print', name: '图案花型设计', cat: 'design', icon: Palette, prompt: '为 2026 春夏系列设计 3 组原创印花花型：含配色方案与循环方式' },
  { id: 'marketing', name: '营销套图设计', cat: 'market', icon: Images, prompt: '帮我设计一套亚马逊营销套图：1 张主图 + 3 张卖点图 + 1 张场景图', sub: '主图 + 卖点图 + 场景图一套出齐', imgs: ['/samples/pf-hit.png', '/samples/gen-model.png'] },
]

// 「更多」浮层中的扩展技能（与画布内技能库对齐）
const MORE_SKILLS: HomeSkill[] = [
  { id: 'illust', name: '插画与视觉叙事', cat: 'design', icon: NotebookPen, prompt: '为我的秋冬系列创作一组时尚插画，故事化场景表达' },
  { id: 'brand', name: '品牌视觉全案', cat: 'market', icon: Zap, prompt: '为我的新服装品牌设计一套品牌视觉全案：Logo、吊牌、包装与标准色规范' },
  { id: 'emoji', name: '创意表情包制作', cat: 'market', icon: Images, prompt: '基于我的品牌 IP 形象制作一套创意表情包' },
  { id: 'video', name: '素材成片', cat: 'market', icon: Images, prompt: '把我的款式素材拼接成一支 15 秒品牌短片' },
  { id: 'nbpro', name: 'NB Pro 电商图', cat: 'market', icon: Images, prompt: '为新款风衣批量生成高转化电商主图' },
  { id: 'model', name: '模特上身图', cat: 'market', icon: Users, prompt: '为这款大衣生成真人模特上身展示图：城市街拍场景，静奢风格' },
  { id: 'social', name: '社媒种草图', cat: 'market', icon: Images, prompt: '为新款生成 4 张社媒种草风格图片：含封面文案与排版' },
]

/* 场景胶囊点击后的「推荐指令」chips（参照附件交互：胶囊行变为指令候选，点击再次代入） */
const SKILL_HINTS: Record<string, string[]> = {
  style: ['帮我设计一款 2026 秋冬女装新款，静奢通勤风格', '设计一款春季法式茶歇裙，含面料建议', '为通勤胶囊衣橱设计一件百搭西装外套'],
  pattern: ['基于画布中的款式生成打版结构图与尺寸表', '为这款连衣裙生成袖型改版打版方案', '输出这条直筒裤的放码规则与工艺要点'],
  plan: ['帮我制作一份 2026 秋冬服装系列企划案', '规划一个 12 款的春季胶囊系列：波段与价格带', '生成度假风胶囊系列企划：主题与 SKU 结构'],
  fabric: ['为这款风衣推荐 3 组面料方案', '真丝衬衫有哪些高性价比替代面料？', '60S 匹马棉适合做 T 恤吗？给出手感与克重建议'],
  print: ['为 2026 春夏系列设计 3 组原创印花花型', '设计一组几何抽象定位花型：含配色方案', '把品牌 Logo 延展成连续循环花型'],
  illust: ['为我的秋冬系列创作一组时尚插画', '画一组静奢风街拍场景插画：大衣为主角', '为新品发布会创作主题视觉插画'],
  marketing: ['帮我设计一套亚马逊营销套图', '为这款连衣裙生成主图 + 卖点图 + 场景图', '输出一套静奢风大衣的电商套图'],
  brand: ['为我的新服装品牌设计一套品牌视觉全案', '生成品牌吊牌、包装与标准色规范', '为品牌升级设计 2026 版视觉手册'],
  emoji: ['基于我的品牌 IP 形象制作一套创意表情包', '做一组服装人日常吐槽表情包', '把品牌吉祥物做成 16 张动态表情'],
  video: ['把我的款式素材拼接成一支 15 秒品牌短片', '为新品上市剪一支节奏感 Lookbook 短片', '把秀场照片做成竖屏短视频'],
  nbpro: ['为新款风衣批量生成高转化电商主图', '生成白底 + 场景双版本主图', '批量输出 5 张差异化点击率主图'],
  model: ['为这款大衣生成真人模特上身展示图', '生成静奢风街拍模特图：城市街景背景', '输出棚拍白底模特上身图'],
  social: ['为新款生成 4 张社媒种草风格图片', '做一组小红书封面图：含标题文案', '生成穿搭合集长图：多 Look 排版'],
}

/* ================= 数据：模板卡片（点击代入输入框，可修改后再发送） ================= */

/* ================= 数据：自定义模型档位（与画布内 BottomControlBar 双向同步 localStorage） ================= */

const CUSTOM_MODELS = [
  { key: 'pro', name: 'Pro', level: '能力强', desc: '进阶版本，适合常规设计任务与改款生图。' },
  { key: 'max', name: 'Max', level: '能力更强', desc: '高性能版本，适合复杂系列设计与多图套图。' },
  { key: 'flagship', name: '旗舰', level: '能力最强', desc: '满配旗舰版本，面向最复杂的全链路设计任务。' },
]

/* ================= 数据：左侧导航栏（可收起，目录见产品手绘稿） ================= */

interface NavItem {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
}

const NAV_GROUPS: NavItem[][] = [
  [{ id: 'projects', name: '项目', icon: FolderKanban }, { id: 'customers', name: '客户', icon: Building2 }],
  [
    { id: 'circle', name: '服装圈', icon: Users },
    { id: 'brand', name: '品牌库', icon: Library },
    { id: 'assets', name: '资产', icon: Package },
  ],
  [
    { id: 'workbench', name: '设计工作台', icon: Palette },
    { id: 'pattern', name: 'AI 打版', icon: Scissors },
  ],
  [
    { id: 'inspo', name: '灵感', icon: Lightbulb },
    { id: 'skills', name: '技能', icon: Sparkles },
  ],
  [{ id: 'orders', name: '订单', icon: ClipboardList }],
]

const LS_MODE = 'hyy-exec-mode'
const LS_MODEL = 'hyy-model'

/* ================= 主组件 ================= */

export default function AgentHome({
  onLaunch,
  onOpenCanvas,
}: {
  /** 提交任务：进入画布编辑器并交给 Agent 执行（autoSubmit=true）；false 仅填充待手动发送 */
  onLaunch: (task: string, autoSubmit: boolean, team?: { name: string; members: TeamMember[] } | null) => void
  /** 直接进入画布编辑器（无任务） */
  onOpenCanvas: () => void
}) {
  const [input, setInput] = useState('')
  const [navCollapsed, setNavCollapsed] = useState(false) // 左侧导航栏收起态
  const [searchParams, setSearchParams] = useSearchParams()
  const routeView = searchParams.get('view')
  const routePage = routeView === 'projects' ? 'projects' : routeView === 'customers' ? 'customers' : routeView === 'brands' ? 'brand' : routeView === 'assets' ? 'assets' : routeView === 'skills' ? 'skills' : routeView === 'legacy-skills' ? 'legacy-skills' : null
  const [localNav, setActiveNav] = useState<string | null>(null)
  const [localPage, setPage] = useState<'home' | 'skills' | 'inspo' | 'pattern' | 'brand' | 'bench'>('home')
  const activeNav = routePage ?? localNav
  const page = routePage ?? localPage

  const [plansOpen, setPlansOpen] = useState(false) // 升级套餐弹窗
  const { t } = useLang() // 全局语言
  // 已选技能（可多选，一起工作）：点击选择器/场景胶囊代入，输入框上方横向并列展示，发送时以「技能协作」前缀带入
  const [activeSkills, setActiveSkills] = useState<HomeSkill[]>([])
  const toggleSkill = (sk: HomeSkill) =>
    setActiveSkills((arr) => (arr.some((x) => x.id === sk.id) ? arr.filter((x) => x.id !== sk.id) : [...arr, sk]))
  const removeSkill = (id: string) => setActiveSkills((arr) => arr.filter((x) => x.id !== id))
  const [sceneCat, setSceneCat] = useState<'design' | 'market'>('design') // 顶部分类导航：服装设计 / 视觉营销 // 已代入输入框的技能（胶囊选中态）
  const [attachments, setAttachments] = useState<string[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [toast, setToast] = useState('')
  // 执行模式 / 自定义模型档位：与画布共享 localStorage，双向同步（PRD 3.3）
  const [mode, setMode] = useState<'auto' | 'ask'>(() => (localStorage.getItem(LS_MODE) === 'ask' ? 'ask' : 'auto'))
  const [tier, setTier] = useState<string | null>(() => localStorage.getItem(LS_MODEL))
  const [openPop, setOpenPop] = useState<'mode' | 'tier' | 'skill' | 'more' | 'team' | null>(null)
  /* —— 浮层统一滑动条：6px 浅灰移动轴（与画布 Agent 面板同标准）；技能浮层轴长上限减半 —— */
  const skillPopAx = useScrollAxis(0.5)
  const tierPopAx = useScrollAxis()
  const teamPopAx = useScrollAxis()
  const { equippedSkills } = useSkillStore() // 已安装技能：技能页「安装技能」真实写入，此处联动可调用
  const [enhancing, setEnhancing] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const taRef = useRef<HTMLTextAreaElement>(null)
  const toastTimer = useRef(0)
  const typeTimer = useRef(0)

  useEffect(() => () => window.clearInterval(typeTimer.current), [])

  const showToast = (msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2200)
  }

  // 浮层弹出方向自适应：输入框上方空间不足时改为向下弹出，避免超出页面可视边框
  const boxRef = useRef<HTMLDivElement>(null)
  const pillRef = useRef<HTMLDivElement>(null)
  /** 场景胶囊行：滚动边界状态（初始在最左端，不显示左箭头） */
  const [pillCanL, setPillCanL] = useState(false)
  const [pillCanR, setPillCanR] = useState(true)
  const syncPillArrows = () => {
    const el = pillRef.current
    if (!el) return
    setPillCanL(el.scrollLeft > 4)
    setPillCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }
  useEffect(() => {
    pillRef.current?.scrollTo({ left: 0 })
    syncPillArrows()
    window.addEventListener('resize', syncPillArrows)
    return () => window.removeEventListener('resize', syncPillArrows)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sceneCat])
  const [popDown, setPopDown] = useState(false)
  const [connOpen, setConnOpen] = useState(false) // 连接器（应用链接）设置弹窗
  /** 当前团队（会话快照，R-02）：状态栏展示 + 热插拔仅影响本次会话，不修改团队定义 */
  const [activeTeam, setActiveTeam] = useState<{ name: string; members: TeamMember[] } | null>(null)
  useEffect(() => {
    if (!openPop) return
    const r = boxRef.current?.getBoundingClientRect()
    if (!r) return
    const est = openPop === 'tier' ? 290 : openPop === 'skill' ? 430 : 150
    setPopDown(r.top < est + 16)
  }, [openPop])

  /* 点击外部关闭浮层 */
  useEffect(() => {
    if (!openPop) return
    const onDocDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('[data-pop]')) setOpenPop(null)
    }
    document.addEventListener('pointerdown', onDocDown, true)
    return () => document.removeEventListener('pointerdown', onDocDown, true)
  }, [openPop])

  /* 模式 / 档位变更立即写入 Store（localStorage 持久化，画布侧读取同源偏好） */
  const switchMode = (v: 'auto' | 'ask') => {
    setMode(v)
    localStorage.setItem(LS_MODE, v)
    setOpenPop(null)
  }
  const switchTier = (key: string) => {
    setTier(key)
    localStorage.setItem(LS_MODEL, key)
    setOpenPop(null)
  }

  /* 技能页「立即使用 / 试试这些提示词」：回到首页并把技能代入下方 Agent 对话框（而非画布内页对话框） */
  const useSkillAtHome = (s: SkillEntry, prompt?: string) => {
    setSearchParams({})
    setPage('home')
    setActiveNav(null)
    const Icon = GLYPHS[s.glyph ?? (s.source === 'mine' ? 'mine' : 'trend')]
    typeFill(prompt ?? s.prompt, { id: s.id, name: s.name, prompt: s.prompt, icon: Icon, cat: 'design' })
  }

  /* 技能页「使用团队」：回到首页并加载「当前团队」状态栏；members 拷贝为会话快照（R-02：改团队定义不影响进行中会话） */
  const useTeamAtHome = (team: Team) => {
    setSearchParams({})
    setPage('home')
    setActiveNav(null)
    selectTeam(team)
  }

  /* 团队热插拔（仅本次会话）：剔除至空 = 退出团队模式；追加 = 工作流末尾顺位执行 */
  const removeTeamMember = (skillId: string) => {
    setActiveTeam((t) => {
      if (!t) return t
      const members = t.members.filter((m) => m.skillId !== skillId)
      if (members.length === 0) {
        showToast('已移除全部成员技能，退出团队模式')
        return null
      }
      return { ...t, members }
    })
  }
  const addTeamMember = (skillId: string) => {
    setActiveTeam((t) => (t && !t.members.some((m) => m.skillId === skillId) ? { ...t, members: [...t.members, teamMemberOf(skillId)] } : t))
    setOpenPop(null)
  }

  /* 技能 / 模板代入：指令示例以打字机效果填入输入框，提醒用户可修改后再发送 */
  /* 首页「选择团队」：团队以状态栏形式带入对话框（表现形式与技能模块「团队」一致；members 拷贝为会话快照 R-02） */
  const selectTeam = (team: Team) => {
    setActiveTeam({ name: team.name, members: [...team.members] })
    showToast(`已加载团队「${team.name}」，下达指令后成员将按工作流串行执行`)
    typeFill(`调用团队「${team.name}」：`, null)
  }

  const typeFill = (text: string, skill: HomeSkill | null) => {
    window.clearInterval(typeTimer.current)
    if (skill) setActiveSkills((arr) => (arr.some((x) => x.id === skill.id) ? arr : [...arr, skill]))
    setOpenPop(null)
    setInput('')
    let i = 0
    typeTimer.current = window.setInterval(() => {
      i += 1
      setInput(text.slice(0, i))
      if (i >= text.length) window.clearInterval(typeTimer.current)
    }, 36)
    taRef.current?.focus()
  }

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const ok = Array.from(files)
      .filter((f) => f.size < 20 * 1024 * 1024) // 前端大小限制 < 20MB
      .map((f) => f.name)
    setAttachments((a) => [...a, ...ok].slice(0, 6))
  }

  /* 发送：非空校验 → 进入无限画布并交给 Agent 执行任务 */
  const send = () => {
    const text = input.trim()
    if (!text && attachments.length === 0) {
      showToast('请输入需求，或点击下方模板快速开始')
      return
    }
    const suffix = attachments.length ? `（附件：${attachments.join('、')}）` : ''
    const teamPrefix = activeTeam && activeTeam.members.length > 0 ? `【团队「${activeTeam.name}」工作流：${activeTeam.members.map((m) => m.name).join(' → ')}】` : ''
    const skillPrefix = activeSkills.length > 0 ? `【技能协作：${activeSkills.map((sk) => sk.name).join(' + ')}】` : ''
    setActiveSkills([])
    onLaunch(teamPrefix + skillPrefix + (text || '基于附件进行设计') + suffix, true, activeTeam && activeTeam.members.length > 0 ? activeTeam : null)
  }

  /* 增强提示词（前端模拟，与画布内同一语义） */
  const enhance = () => {
    const t = input.trim()
    if (!t || enhancing) return
    setEnhancing(true)
    window.setTimeout(() => {
      setInput(`请生成一张${t}的设计图，要求：纯白背景（#FFFFFF），产品居中放置，高清画质，细节丰富，专业服装摄影级打光。`)
      setEnhancing(false)
    }, 900)
  }

  const canSend = input.trim().length > 0 || attachments.length > 0

  /* ===== AI 打版：独立页面（不显示侧边导航，含返回首页模块） ===== */
  if (page === 'pattern') {
    return (
      <div className="h-screen w-screen bg-cvs text-ink antialiased overflow-y-auto [scrollbar-width:thin]">
        {toast && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-ink text-panel text-[12px] px-4 py-2 rounded-full shadow-lg">{toast}</div>
        )}
        <PatternPage
          showToast={showToast}
          onBack={() => {
            setPage('home')
            setActiveNav(null)
          }}
        />
      </div>
    )
  }

  return (
    <div className="h-screen w-screen bg-cvs text-ink antialiased overflow-hidden flex">
      {/* ===== 左侧导航栏（可收起）：bg/sidebar 灰底，激活=白底胶囊+蓝字，底部升级套餐+用户卡 ===== */}
      <aside
        className={`shrink-0 h-full bg-fill border-r border-line-soft flex flex-col py-4 transition-all duration-200 ${
          navCollapsed ? 'w-[68px] px-3' : 'w-60 px-4'
        }`}
      >
        {/* Logo 区（高 64px）+ 收起/展开开关 */}
        <div className={`h-16 flex items-center ${navCollapsed ? 'justify-center' : 'justify-between px-1'}`}>
          {navCollapsed ? (
            <button onClick={() => setNavCollapsed(false)} title="展开导航栏" className="group relative w-9 h-9 rounded-[10px] flex items-center justify-center hover:bg-panel/60 transition-colors">
              <img src={logoUrl} alt="画衣衣" className="w-7 h-7 object-contain group-hover:opacity-0 transition-opacity" />
              <PanelLeftOpen className="w-4.5 h-4.5 w-[18px] h-[18px] text-ink-3 absolute opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <img src={logoUrl} alt="画衣衣" className="w-8 h-8 object-contain" />
                <span className="text-[15px] font-semibold text-ink tracking-wide">画衣衣</span>
              </div>
              <button onClick={() => setNavCollapsed(true)} title="收起导航栏" className="w-8 h-8 rounded-[10px] flex items-center justify-center text-ink-3 hover:bg-panel/60 hover:text-ink transition-colors">
                <PanelLeftClose className="w-[18px] h-[18px]" />
              </button>
            </>
          )}
        </div>

        {/* 导航分组（间距分区，组间 1px 细分隔线） */}
        <nav className="mt-2 flex-1 min-h-0 overflow-y-auto [scrollbar-width:none]">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {gi > 0 && <div className={`my-2 h-px bg-line ${navCollapsed ? 'mx-0' : 'mx-1'}`} />}
              <div className="flex flex-col gap-[5px]">
                {group.map((item) => {
                  const active = activeNav === item.id
                  const featured = item.id === 'pattern' // AI 版师：产品重点项目，视觉重点标记
                  return (
                    <button
                      key={item.id}
                      title={navCollapsed ? t('nav.' + item.id) : undefined}
                      onClick={() => {
                        if (item.id === 'projects' || item.id === 'customers' || item.id === 'brand' || item.id === 'assets' || item.id === 'skills') {
                          setSearchParams({ view: item.id === 'brand' ? 'brands' : item.id })
                          return
                        }
                        if (item.id !== 'workbench' && routePage) setSearchParams({})
                        if (item.id === 'workbench') {
                          onOpenCanvas()
                          return
                        }
                        if (item.id === 'pattern') {
                          setActiveNav(item.id)
                          setPage('pattern') // AI 打版：进入二级页面（平台/品牌版师 + 爆款版型库）
                          return
                        }
                        if (item.id === 'skills') {
                          setActiveNav(item.id)
                          setPage('skills') // 技能：进入二级页面（我的技能 / 平台技能）
                          return
                        }
                        if (item.id === 'brand') {
                          setActiveNav(item.id)
                          setPage('brand') // 品牌库：进入二级页面（款式/版/面料/辅料/模特库）
                          return
                        }
                        if (item.id === 'inspo') {
                          setActiveNav(item.id)
                          setPage('inspo') // 灵感：进入二级页面「灵感盒」
                          return
                        }
                        setActiveNav(item.id)
                        setPage('home')
                        showToast(`「${t('nav.' + item.id)}」模块即将上线，敬请期待`)
                      }}
                      className={`h-11 rounded-[10px] flex items-center text-[14px] transition-colors ${
                        navCollapsed ? 'justify-center' : 'gap-3 px-3.5'
                      } ${
                        active
                          ? 'bg-panel text-pri font-medium shadow-[0_4px_16px_rgba(0,0,0,0.08)]'
                          : 'text-ink font-normal hover:bg-panel/60'
                      }`}
                    >
                      <item.icon className={`w-5 h-5 shrink-0 ${active || featured ? 'text-pri' : 'text-ink-3'}`} />
                      {!navCollapsed && t('nav.' + item.id)}
                      {featured && !navCollapsed && (
                        <span className="ml-1 h-[18px] px-1.5 rounded-full bg-pri-soft border border-pri-line text-[10px] leading-[17px] text-pri tracking-wide">
                          Featured
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* 个人工作台一级菜单（原升级套餐模块位置）：蓝紫绿三色渐变主按钮形态，增加视觉权重；升级套餐入口已从导航栏移除 */}
        <div className="mt-3">
          {navCollapsed ? (
            <div className="flex flex-col items-center gap-3">
              <button
                onClick={() => { setSearchParams({}); setActiveNav('bench'); setPage('bench') }}
                title={t('nav.bench')}
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all text-white ${
                  activeNav === 'bench'
                    ? 'bg-[linear-gradient(118deg,#5685FA_0%,#957BF3_52%,#45CB8D_100%)]'
                    : 'bg-[linear-gradient(118deg,#6B96FF_0%,#A48BFA_52%,#5BD9A0_100%)] hover:bg-[linear-gradient(118deg,#5685FA_0%,#957BF3_52%,#45CB8D_100%)]'
                }`}
              >
                <Puzzle className="w-5 h-5" />
              </button>
              <AccountCluster up vertical />
            </div>
          ) : (
            <>
              {/* 一级菜单：个人工作台（主按钮形态） */}
              <button
                onClick={() => { setSearchParams({}); setActiveNav('bench'); setPage('bench') }}
                className={`w-full h-11 rounded-xl flex items-center gap-3 px-3.5 text-[14px] font-medium transition-all text-white ${
                  activeNav === 'bench'
                    ? 'bg-[linear-gradient(118deg,#5685FA_0%,#957BF3_52%,#45CB8D_100%)]'
                    : 'bg-[linear-gradient(118deg,#6B96FF_0%,#A48BFA_52%,#5BD9A0_100%)] hover:bg-[linear-gradient(118deg,#5685FA_0%,#957BF3_52%,#45CB8D_100%)]'
                }`}
              >
                <Puzzle className="w-5 h-5 shrink-0" />
                {t('nav.bench')}
              </button>
              {/* 底部账户模块：与画布右上角「我的」同款，展开态补充姓名 / 邮箱 */}
              <div className="mt-2.5">
                <AccountCluster up expanded />
              </div>
            </>
          )}
        </div>
        {plansOpen && <PlansModal onClose={() => setPlansOpen(false)} showToast={showToast} />}
      </aside>


      {/* ===== 主内容区 ===== */}
      <main className="flex-1 min-w-0 h-full overflow-y-auto [scrollbar-width:thin] relative">

      {/* 轻提示（非空校验等） */}
      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 bg-ink text-panel text-[12px] px-4 py-2 rounded-full shadow-lg">{toast}</div>
      )}

      {page === 'projects' ? (
        <ProjectsPage />
      ) : page === 'customers' ? (
        <DirectoryPage kind="customer" />
      ) : page === 'bench' ? (
        <WorkbenchPage showToast={showToast} />
      ) : page === 'brand' ? (
        <BrandHub showToast={showToast} />
      ) : page === 'assets' ? (
        <ResourceLibrary />
      ) : page === 'skills' ? (
        <CapabilityHub />
      ) : page === 'legacy-skills' ? (
        <SkillsPage
          onBack={() => {
            setSearchParams({ view: 'skills' })
            setActiveNav('skills')
          }}
          onUseSkill={useSkillAtHome}
          onUseTeam={useTeamAtHome}
          showToast={showToast}
        />
      ) : page === 'inspo' ? (
        <InspoPage
          onBack={() => {
            setPage('home')
            setActiveNav(null)
          }}
          onLaunch={onLaunch}
          showToast={showToast}
        />
      ) : (
      <div className="max-w-[880px] mx-auto px-8 pt-[10vh] pb-16">
        {/* ===== Hero：居中排版（参照附件：居中主标题 + 副标题） ===== */}
        <div className="flex flex-col items-center text-center">
          <h1 className="text-[34px] font-bold tracking-wide text-ink">{t('home.title')}</h1>
          {/* 分类导航：服装设计 / 视觉营销（参照附件分段胶囊，联动下方场景分类） */}
          <div className="mt-[11px] inline-flex items-center bg-fill rounded-full p-1 text-[14px]">
            {([
              ['design', '款式设计', Shirt],
              ['market', '视觉营销', Images],
            ] as const).map(([k, label, Icon]) => (
              <button
                key={k}
                onClick={() => {
                  setSceneCat(k)
                  // 已代入技能的状态下切换分类：自动带入目标分类的第一个技能，支持随时切换
                  setActiveSkills((cur) =>
                    cur.length ? [[...HOME_SKILLS, ...MORE_SKILLS].find((sk) => sk.cat === k) ?? cur[0]] : cur
                  )
                }}
                className={`h-9 px-4 rounded-full inline-flex items-center gap-1.5 transition-colors ${
                  sceneCat === k ? 'bg-ink text-panel font-medium shadow-sm' : 'text-ink-3 hover:text-ink'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ===== 场景胶囊行：移到对话框上方（参照附件：图标 pills + 左右切换箭头），点击代入输入框 ===== */}
        <div className="mt-[61px] flex items-center gap-2">
          {activeSkills.length === 0 && pillCanL && (
            <button
              onClick={() => pillRef.current?.scrollBy({ left: -320, behavior: 'smooth' })}
              title="向左查看更多场景"
              className="w-8 h-8 rounded-full border border-line bg-panel flex items-center justify-center shrink-0 text-ink-3 hover:text-ink hover:border-ink transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <div ref={pillRef} onScroll={syncPillArrows} className="flex-1 min-w-0 flex items-center gap-2.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {activeSkills.length > 0
              ? /* 已选技能：胶囊行变为最近选择技能的推荐指令 chips（点击代入，打字机效果不变） */
                (SKILL_HINTS[activeSkills[activeSkills.length - 1].id] ?? [activeSkills[activeSkills.length - 1].prompt]).map((h) => (
                  <button
                    key={h}
                    onClick={() => typeFill(h, activeSkills[activeSkills.length - 1])}
                    className="h-[38px] max-w-[320px] pl-4 pr-3 rounded-full bg-fill border border-transparent flex items-center gap-1.5 text-[13.5px] whitespace-nowrap shrink-0 transition-colors hover:bg-fill-2 hover:border-line"
                  >
                    <span className="truncate text-ink-2">{h}</span>
                    <ArrowDownRight className="w-3.5 h-3.5 text-mut-3 shrink-0" />
                  </button>
                ))
              : [...HOME_SKILLS, ...MORE_SKILLS].filter((sk) => sk.cat === sceneCat).map((sk) => (
                  <button
                    key={sk.id}
                    onClick={() => typeFill(sk.prompt, sk)}
                    className="h-[38px] px-4 rounded-full border flex items-center gap-2 text-[13.5px] whitespace-nowrap shrink-0 transition-colors border-line bg-panel text-ink-2 hover:border-pri/40 hover:text-ink"
                  >
                    <sk.icon className="w-3.5 h-3.5" />
                    {sk.name}
                  </button>
                ))}
          </div>
          {activeSkills.length === 0 && pillCanR && (
            <button
              onClick={() => pillRef.current?.scrollBy({ left: 320, behavior: 'smooth' })}
              title="向右查看更多场景"
              className="w-8 h-8 rounded-full border border-line bg-panel flex items-center justify-center shrink-0 text-ink-3 hover:text-ink hover:border-ink transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* ===== 核心交互区：任务输入框（BottomControlBar 精简版，PRD 6.2） ===== */}
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            addFiles(e.dataTransfer.files)
          }}
          ref={boxRef}
          className={`mt-2 rounded-3xl border bg-panel shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-colors relative z-10 ${
            dragOver ? 'border-pri' : 'border-line'
          }`}
        >


          {/* 当前团队状态栏（PRD 4.3）：团队名 + 成员技能 Tag，+/- 热插拔仅本次会话生效 */}
          {activeTeam && (
            <div className="flex items-center gap-1.5 flex-wrap mx-4 mt-3 rounded-xl border border-pri/25 bg-pri-soft/50 px-3 py-2">
              <span className="inline-flex items-center gap-1.5 text-[12px] text-pri font-medium shrink-0">
                <Users className="w-3.5 h-3.5" />
                {activeTeam.name}
                <span className="text-mut-2 font-normal">正使用{activeTeam.members.length}个skill 为你工作</span>
              </span>
              <span className="flex items-center gap-1">
                {activeTeam.members.map((m, i) => {
                  const G = GLYPHS[m.glyph]
                  return (
                    <span key={m.skillId} className="flex items-center gap-1">
                      {i > 0 && <span className="text-mut-3 text-[10px]">→</span>}
                      <span className="group/tag relative" title={`${m.name}（悬停可剔除）`}>
                        <span className={`block w-5 h-5 rounded-full bg-gradient-to-br ${m.tint} border border-panel flex items-center justify-center`}>
                          <G className="w-2.5 h-2.5 text-white" />
                        </span>
                        <button
                          onClick={() => removeTeamMember(m.skillId)}
                          title="本次会话中剔除该技能"
                          className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-ink text-panel items-center justify-center hidden group-hover/tag:flex"
                        >
                          <X className="w-2 h-2" />
                        </button>
                      </span>
                    </span>
                  )
                })}
              </span>
              <span className="relative">
                <button
                  data-pop
                  onClick={() => setOpenPop(openPop === 'team' ? null : 'team')}
                  title="追加技能（仅本次会话）"
                  className={`w-6 h-6 rounded-full border border-dashed flex items-center justify-center transition-colors ${
                    openPop === 'team' ? 'border-pri bg-pri-soft text-pri' : 'border-pri/40 text-pri hover:bg-pri-soft'
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
                {openPop === 'team' && (
                  <div data-pop className="absolute top-full mt-1.5 left-0 z-40 w-64 bg-panel rounded-xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.12)] p-1.5">
                  <div ref={teamPopAx.ref} onScroll={teamPopAx.sync} className="max-h-[248px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {PLATFORM_SKILLS.map((sk) => {
                      const added = activeTeam.members.some((m) => m.skillId === sk.id)
                      const G = GLYPHS[sk.glyph ?? 'mine']
                      return (
                        <button
                          key={sk.id}
                          disabled={added}
                          onClick={() => addTeamMember(sk.id)}
                          className="w-full flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-fill disabled:opacity-40 disabled:hover:bg-transparent"
                        >
                          <G className="w-3.5 h-3.5 text-mut-2 shrink-0" />
                          <span className="text-[12.5px] text-ink flex-1">{sk.name}</span>
                          {added && <Check className="w-3.5 h-3.5 text-pri shrink-0" />}
                        </button>
                      )
                    })}
                  </div>
                  <ScrollAxis ctl={teamPopAx} rightClass="right-1" />
                </div>
                )}
              </span>
              <button
                onClick={() => {
                  setActiveTeam(null)
                  showToast('已退出团队模式')
                }}
                title="退出团队模式"
                className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-mut-3 hover:text-ink transition-colors shrink-0"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* 附件 chips */}
          {attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-4 pt-3">
              {attachments.map((name, i) => (
                <span
                  key={`${name}-${i}`}
                  className="group flex items-center gap-1 h-6 pl-2 pr-1 rounded-md bg-pri-soft border border-pri-line text-[11px] text-pri"
                >
                  <Paperclip className="w-3 h-3" />
                  <span className="max-w-[140px] truncate">{name}</span>
                  <button
                    onClick={() => setAttachments((a) => a.filter((_, j) => j !== i))}
                    className="w-4 h-4 rounded flex items-center justify-center opacity-50 hover:opacity-100"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* 输入行：已选技能胶囊与文本默认水平排列（胶囊在前横向并列，可逐个移除；文本紧随其后） */}
          <div className="flex flex-wrap items-start gap-2 px-4 pt-4">
            {activeSkills.map((sk) => (
              <span key={sk.id} className="flex items-center gap-1.5 h-7 pl-2.5 pr-1.5 rounded-full bg-pri border border-pri text-[12.5px] text-white select-none shrink-0">
                <Zap className="w-3.5 h-3.5" />
                {sk.name}
                <button
                  onClick={() => removeSkill(sk.id)}
                  title="移除技能"
                  className="w-4 h-4 rounded-full flex items-center justify-center opacity-60 hover:opacity-100 hover:bg-white/20 transition-all"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
            <textarea
              ref={taRef}
              value={input}
              onChange={(e) => {
                window.clearInterval(typeTimer.current) // 用户主动编辑时停止打字机动画
                setInput(e.target.value)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
                if (e.key === 'Tab' && !input.trim()) {
                  e.preventDefault()
                  typeFill('帮我设计一套亚马逊营销套图！', null)
                }
              }}
              placeholder={t('home.composer')}
              rows={4}
              className="flex-1 min-w-[160px] resize-none outline-none bg-transparent text-[14.5px] placeholder:text-mut-3 leading-relaxed"
            />
          </div>

          {/* 底部工具行：附件 / 技能 / 执行模式 | 自定义档位 / 增强 / 语音 / 发送 */}
          <div className="flex items-center gap-1 px-3 pb-3 pt-1">
            <input ref={fileRef} type="file" multiple accept="image/*,.pdf,.md,.txt" className="hidden" onChange={(e) => addFiles(e.target.files)} />
            <button
              onClick={() => fileRef.current?.click()}
              title="上传附件（或拖拽文件到输入框）"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-mut hover:bg-fill hover:text-ink transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* 技能入口 */}
            <button
              data-pop
              onClick={() => setOpenPop(openPop === 'skill' ? null : 'skill')}
              title="选择技能"
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                openPop === 'skill' || activeSkills.length > 0 ? 'bg-pri-soft text-pri' : 'text-mut hover:bg-fill hover:text-ink'
              }`}
            >
              <Hammer className="w-4 h-4" />
            </button>

            {/* 执行模式：与画布双向同步；初始自动执行，图标随两个功能切换 */}
            <div className="relative">
              <button
                data-pop
                onClick={() => setOpenPop(openPop === 'mode' ? null : 'mode')}
                title="执行模式"
                className="flex items-center gap-1 h-8 px-2 rounded-lg text-[12.5px] whitespace-nowrap text-ink-3 hover:bg-fill transition-colors"
              >
                {mode === 'auto' ? <Zap className="w-3.5 h-3.5 shrink-0" /> : <MessageCircleQuestion className="w-3.5 h-3.5 shrink-0" />}
                {mode === 'auto' ? '自动' : '询问'}
                <ChevronDown className={`w-3 h-3 text-mut-3 transition-transform ${openPop === 'mode' ? 'rotate-180' : ''}`} />
              </button>

              {/* 执行模式浮层：紧贴触发按钮（亲密性原则） */}
              {openPop === 'mode' && (
                <div data-pop className={`absolute ${popDown ? 'top-full mt-1.5' : 'bottom-full mb-1.5'} left-0 z-40 w-44 bg-panel rounded-xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.12)] p-1.5`}>
                  {([
                    { v: 'auto' as const, name: '自动执行', Icon: Zap },
                    { v: 'ask' as const, name: '询问执行', Icon: MessageCircleQuestion },
                  ]).map(({ v, name, Icon }) => (
                    <button
                      key={v}
                      onClick={() => switchMode(v)}
                      className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-[12.5px] transition-colors ${
                        mode === v ? 'text-ink font-medium bg-fill' : 'text-ink-2 hover:bg-fill'
                      }`}
                    >
                      <Icon className="w-4 h-4 text-ink-3" />
                      {name}
                      {mode === v && <Check className="w-3.5 h-3.5 text-pri ml-auto" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2.5">
              {/* 自定义模型档位：与画布双向同步 */}
              <button
                data-pop
                onClick={() => setOpenPop(openPop === 'tier' ? null : 'tier')}
                title="自定义模型（按能力强弱）"
                className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] whitespace-nowrap transition-colors ${
                  tier ? 'bg-acc-soft text-acc hover:bg-acc-line font-medium' : 'text-ink hover:bg-fill'
                }`}
              >
                {tier ? CUSTOM_MODELS.find((cm) => cm.key === tier)?.name ?? 'Auto' : 'Auto'}
                <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
              </button>
              <button
                onClick={enhance}
                disabled={!input.trim() || enhancing}
                title="增强提示词"
                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                  enhancing ? 'text-acc animate-pulse' : 'text-acc hover:bg-acc-soft disabled:text-mut-3 disabled:hover:bg-transparent'
                }`}
              >
                <Sparkles className="w-4 h-4" />
              </button>
              <button
                onClick={send}
                title="发送"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  canSend ? 'bg-pri text-white hover:bg-pri-hover' : 'bg-fill text-mut-3'
                }`}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 自定义档位浮层：pro / max / 旗舰 */}
          {openPop === 'tier' && (
            <div data-pop className={`absolute ${popDown ? 'top-full mt-2' : 'bottom-full mb-2'} right-3 z-40 w-64 bg-panel rounded-xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.12)] p-2`}>
              <div ref={tierPopAx.ref} onScroll={tierPopAx.sync} className="max-h-[min(70vh,464px)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="text-[10.5px] text-mut-2 px-1 pb-1">按能力强弱选择模型</div>
              {CUSTOM_MODELS.map((cm) => (
                <button
                  key={cm.key}
                  onClick={() => switchTier(cm.key)}
                  className={`w-full flex items-start gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${
                    tier === cm.key ? 'bg-acc-soft' : 'hover:bg-fill'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[12.5px] font-medium ${tier === cm.key ? 'text-acc' : 'text-ink'}`}>{cm.name}</span>
                      <span className="text-[10px] px-1 py-px rounded bg-acc-soft text-acc border border-acc-line">{cm.level}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-mut leading-relaxed">{cm.desc}</p>
                  </div>
                  {tier === cm.key && <Check className="w-3.5 h-3.5 text-acc shrink-0 mt-0.5" />}
                </button>
              ))}
              </div>
              <ScrollAxis ctl={tierPopAx} rightClass="right-1" />
            </div>
          )}

          {/* 技能浮层：多选模式——点击勾选/取消，多个技能一起工作；浮层保持展开便于连续选择 */}
          {openPop === 'skill' && (
            <div data-pop className={`absolute ${popDown ? 'top-full mt-2' : 'bottom-full mb-2'} left-3 z-40 w-72 bg-panel rounded-xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.12)] p-2`}>
              <div ref={skillPopAx.ref} onScroll={skillPopAx.sync} className="max-h-[min(70vh,464px)] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-[10.5px] text-mut-2">选择技能（可多选，技能一起工作）</span>
                {activeSkills.length > 0 && <span className="text-[10.5px] text-pri font-medium">已选 {activeSkills.length} 个</span>}
              </div>
              {equippedSkills.length > 0 && (
                <>
                  <div className="text-[10.5px] text-mut-3 px-1 pt-1 pb-0.5">我安装的</div>
                  {equippedSkills.map((sk) => {
                    const Icon = GLYPHS[sk.glyph ?? (sk.source === 'mine' ? 'mine' : 'trend')]
                    const picked = activeSkills.some((x) => x.id === sk.id)
                    return (
                      <button
                        key={sk.id}
                        onClick={() => toggleSkill({ id: sk.id, name: sk.name, prompt: sk.prompt, icon: Icon, cat: 'design' })}
                        className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${picked ? 'bg-pri-soft/60' : 'hover:bg-fill'}`}
                      >
                        <Icon className="w-3.5 h-3.5 text-pri shrink-0" />
                        <span className="text-[12.5px] text-ink flex-1">{sk.name}</span>
                        {picked && <Check className="w-3.5 h-3.5 text-pri shrink-0" />}
                      </button>
                    )
                  })}
                  <div className="my-1 h-px bg-line" />
                </>
              )}
              {[...HOME_SKILLS, ...MORE_SKILLS].map((sk) => {
                const picked = activeSkills.some((x) => x.id === sk.id)
                return (
                  <button
                    key={sk.id}
                    onClick={() => toggleSkill(sk)}
                    className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors ${picked ? 'bg-pri-soft/60' : 'hover:bg-fill'}`}
                  >
                    <sk.icon className="w-3.5 h-3.5 text-ink-3 shrink-0" />
                    <span className="text-[12.5px] text-ink flex-1">{sk.name}</span>
                    {picked && <Check className="w-3.5 h-3.5 text-pri shrink-0" />}
                  </button>
                )
              })}
              </div>
              <ScrollAxis ctl={skillPopAx} rightClass="right-1" />
            </div>
          )}
        </div>

        {/* ===== 应用链接条：点击进入「连接器」设置（与画布内页对话框一致） ===== */}
        <ConnectorLinkBar onOpen={() => setConnOpen(true)} />

        {/* ===== 选择设计团队为你干活（与技能模块「团队」同源：官方团队；卡片=标题+描述+成员图标组+常驻胶囊，点选后团队以状态栏形式带入对话框） ===== */}
        <div className="mt-6">
          <p className="text-[13.5px] text-mut">选择设计团队为你工作</p>
          <div className="mt-4 grid grid-cols-3 gap-4 items-start">
            {OFFICIAL_TEAMS.filter((t) => t.cat === sceneCat).map((t) => {
              const isActive = activeTeam?.name === t.name
              return (
                <div key={t.id} className={`group rounded-2xl border bg-panel p-4 transition-colors ${isActive ? 'border-pri/40' : 'border-line-soft hover:border-pri/40'}`}>
                  {/* 初始状态：仅标题（官方认证标识）+ 描述（附件图 1） */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-[14px] font-bold text-ink truncate">{t.name}</span>
                    <BadgeCheck className="w-3.5 h-3.5 text-pri shrink-0" />
                  </div>
                  <p className="mt-1 text-[11.5px] text-mut leading-relaxed line-clamp-2">{t.desc}</p>
                  {/* 底部信息栏（附件图 2）：悬停展开，点选「选择团队」后常驻原有选中样式 */}
                  <div
                    className={`grid transition-all duration-300 ${
                      isActive ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0 group-hover:grid-rows-[1fr] group-hover:opacity-100'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="pt-3.5 flex items-center justify-between">
                        <span className="flex items-center">
                          {t.members.map((m) => {
                            const G = GLYPHS[m.glyph]
                            return (
                              <span
                                key={m.skillId}
                                title={m.name}
                                className={`-ml-1.5 first:ml-0 w-6 h-6 rounded-full border-2 border-panel bg-gradient-to-br ${m.tint} flex items-center justify-center`}
                              >
                                <G className="w-3 h-3 text-white" />
                              </span>
                            )
                          })}
                        </span>
                        <button
                          onClick={() => selectTeam(t)}
                          disabled={isActive}
                          className={`h-8 px-4 rounded-full text-[12px] font-medium inline-flex items-center gap-1 transition-colors ${
                            isActive ? 'bg-fill text-mut cursor-default' : 'bg-ink text-panel hover:bg-pri'
                          }`}
                        >
                          {isActive ? (
                            <>
                              已选择
                              <Check className="w-3.5 h-3.5" />
                            </>
                          ) : (
                            '选择团队'
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
      )}
      </main>
      {connOpen && <ConnectorsModal onClose={() => setConnOpen(false)} />}
    </div>
  )
}
