/**
 * 灵感盒（二级页面）：创意灵感瀑布流社区。
 * 交互逻辑：
 *  1. 列表页 = 分类筛选 + 排序（最热/最新）+ 瀑布流卡片；
 *  2. 鼠标悬浮卡片 → 图片上浮现「做同款」功能模块；
 *  3. 点击「做同款」→ 底部弹出 Agent 命令框（复用主页/画布对话框样式与交互，去掉连接器卡片），预填提示词可直接发送；
 *  4. 点击卡片 → 详情页：上半部分结果图（支持缩放），下半部分提示词部分；右下角「做同款」同样弹出命令框。
 */
import { useMemo, useRef, useState } from 'react'

/* 自定义模型档位：与首页 / 画布对话框保持一致 */
const CUSTOM_MODELS = [
  { key: 'pro', name: 'Pro', level: '能力强', desc: '进阶版本，适合常规设计任务与改款生图。' },
  { key: 'max', name: 'Max', level: '能力更强', desc: '高性能版本，适合复杂系列设计与多图套图。' },
  { key: 'flagship', name: '旗舰', level: '能力最强', desc: '满配旗舰版本，面向最复杂的全链路设计任务。' },
]
import { useLang } from '@/hooks/useLang'
import {
  ArrowLeft,
  ChevronDown,
  Eye,
  Hammer,
  Heart,
  Lightbulb,
  Loader2,
  Maximize2,
  Minus,
  Plus,
  Search,
  Send,
  Share2,
  Sparkles,
  X,
  Zap,
} from 'lucide-react'

/* ================= 数据 ================= */

interface InspoCard {
  id: string
  title: string
  img: string
  cat: string
  author: string
  color: string // 头像底色
  views: string
  likes: number
  ts: number // 排序用时间戳（越大越新）
  prompt: string
}

const CATS = ['全部', '款式参考', '面料纹样', '色彩企划', '秀场趋势', '搭配 LOOK', '详情页', '营销海报', '品牌视觉']

const CARDS: InspoCard[] = [
  {
    id: 'i1',
    title: '韩系通勤风搭配板',
    img: '/samples/gen-look.png',
    cat: '搭配 LOOK',
    author: '姚思源',
    color: '#F53F3F',
    views: '1.2k',
    likes: 86,
    ts: 9,
    prompt:
      '以这张韩系通勤风搭配板为参考，为 2026 春夏系列生成 4 套通勤 LOOK：西装短外套 + 高腰格纹半裙的组合逻辑，保持色系统一（藏青 / 奶白 / 浅灰），输出正面上身效果图与单品拆解图。',
  },
  {
    id: 'i2',
    title: '静奢风大衣系列企划',
    img: '/samples/pf-plan.png',
    cat: '色彩企划',
    author: '甲方的保姆',
    color: '#8B5CF6',
    views: '1.5k',
    likes: 120,
    ts: 10,
    prompt:
      '参考这份静奢风系列企划，为我的品牌生成 2026 秋冬大衣企划：驼 / 米白 / 深灰三色波段，含廓形方向（H 型长风衣、落肩双排扣）、面料建议（羊绒双面呢 / 高支羊毛）与价格带规划。',
  },
  {
    id: 'i3',
    title: 'AI 超模上身图',
    img: '/samples/gen-model.png',
    cat: '款式参考',
    author: 'Fadi Shayya',
    color: '#12B76A',
    views: '986',
    likes: 64,
    ts: 8,
    prompt:
      '基于这张 AI 超模上身图的效果，把我画布中的风衣生成真人模特街拍展示图：都市街景背景、自然光、九分裤搭配乐福鞋，保持款式细节与颜色严格一致。',
  },
  {
    id: 'i4',
    title: '爆款风衣卖点拆解',
    img: '/samples/pf-hit.png',
    cat: '营销海报',
    author: 'Lin 林',
    color: '#F5A623',
    views: '2.3k',
    likes: 210,
    ts: 7,
    prompt:
      '参考这张爆款拆解海报的结构，为我的新款风衣生成一张卖点拆解长图：主图上身效果 + 4 个卖点细节框（领型 / 腰带 / 面料纹理 / 走线工艺），文案风格简洁有购买欲。',
  },
  {
    id: 'i5',
    title: '外贸大单快反方案',
    img: '/samples/pf-trade.png',
    cat: '品牌视觉',
    author: 'Yuyan Han',
    color: '#2E6BFF',
    views: '752',
    likes: 45,
    ts: 6,
    prompt:
      '参考这份外贸大单方案，把这款基础外套适配欧美市场：调整版型为宽松落肩、补充英文洗标与尺码表、输出符合 SHEIN / 亚马逊上架规范的详情图清单。',
  },
  {
    id: 'i6',
    title: '面料智库色卡墙',
    img: '/samples/pf-fabric.png',
    cat: '面料纹样',
    author: '面料酱',
    color: '#0EA5E9',
    views: '643',
    likes: 38,
    ts: 5,
    prompt:
      '参考这面面料色卡墙，为 2026 秋冬西装系列生成面料企划：60S 匹马棉与 80S 天丝混纺对比、克重与垂感说明、每款面料配 3 个潘通近似色号与适用款式建议。',
  },
  {
    id: 'i7',
    title: '工艺单标准模板',
    img: '/samples/pf-techpack.png',
    cat: '详情页',
    author: '版师老周',
    color: '#64748B',
    views: '1.1k',
    likes: 97,
    ts: 4,
    prompt:
      '参考这份工艺单模板，把画布上的风衣生成标准 Tech Pack：尺寸表、车缝工艺标注、辅料清单与印花位置图，导出为可直接发厂的 PDF 结构。',
  },
  {
    id: 'i8',
    title: '细节放大展示图',
    img: '/samples/pf-detail.png',
    cat: '详情页',
    author: 'Detail Lab',
    color: '#EC4899',
    views: '508',
    likes: 29,
    ts: 3,
    prompt:
      '参考这张细节放大图的版式，为我的连衣裙生成详情页细节模块：领口 / 袖口 / 拉链 / 里布四张细节放大图，白底、统一光线、配极简说明文字。',
  },
  {
    id: 'i9',
    title: '成本核价分析表',
    img: '/samples/pf-cost.png',
    cat: '品牌视觉',
    author: '成本控',
    color: '#10B981',
    views: '420',
    likes: 22,
    ts: 2,
    prompt:
      '参考这张成本核价表，估算这款西装的单件成本：按 BOM 清单拆分面料 / 辅料 / 工时 / 印绣花，给出小单（200 件）与大单（2000 件）两档报价区间。',
  },
  {
    id: 'i10',
    title: '秀场趋势解读板',
    img: '/samples/pf-trend.png',
    cat: '秀场趋势',
    author: '趋势雷达',
    color: '#6366F1',
    views: '1.8k',
    likes: 156,
    ts: 1,
    prompt:
      '参考这张秀场趋势解读板，解析最新巴黎时装周并落地到我的品类：提炼 3 个关键廓形、2 组核心配色与 1 种面料趋势，各配一张可执行的款式方向图。',
  },
]

const SORTS = ['最热', '最新'] as const

/* ================= 做同款命令框（复用主页/画布对话框样式，去掉连接器卡片） ================= */

function SameStyleBar({
  card,
  onClose,
  onLaunch,
}: {
  card: InspoCard
  onClose: () => void
  onLaunch: (task: string, autoSubmit: boolean) => void
}) {
  const [text, setText] = useState(card.prompt)
  const [sending, setSending] = useState(false)
  const [tier, setTier] = useState('') // 自定义模型档位（与首页对话框 Auto 一致）
  const [tierOpen, setTierOpen] = useState(false)
  const taRef = useRef<HTMLTextAreaElement>(null)

  const send = () => {
    if (!text.trim() || sending) return
    setSending(true)
    setTimeout(() => onLaunch(text.trim(), true), 450) // 与主页一致的提交动效节奏
  }

  return (
    <div className="fixed inset-0 z-50" onClick={onClose}>
      {/* 半透明遮罩，点击空白收起 */}
      <div className="absolute inset-0 bg-black/20" />
      <div
        className="absolute left-1/2 bottom-6 -translate-x-1/2 w-[720px] max-w-[calc(100vw-48px)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="rounded-3xl border border-line bg-panel shadow-[0_24px_64px_rgba(0,0,0,0.18)] relative z-10">
          {/* 做同款胶囊 + 可编辑提示词 */}
          <div className="flex items-start gap-2.5 px-4 pt-4">
            <span className="mt-1 flex items-center gap-1.5 h-6 pl-2 pr-2.5 rounded-full bg-ink text-panel text-[11.5px] shrink-0 select-none">
              <Lightbulb className="w-3 h-3" />
              做同款
            </span>
            <textarea
              ref={taRef}
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  send()
                }
                if (e.key === 'Escape') onClose()
              }}
              rows={4}
              className="flex-1 resize-none outline-none bg-transparent text-[13.5px] leading-relaxed placeholder:text-mut-3"
            />
            <button
              onClick={onClose}
              title="收起（Esc）"
              className="w-7 h-7 rounded-full flex items-center justify-center text-mut hover:bg-fill hover:text-ink transition-colors shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* 工具行：与主页对话框一致的控件语言 */}
          <div className="flex items-center gap-1 px-3 pb-3 pt-1">
            <button title="上传附件" className="w-8 h-8 rounded-lg flex items-center justify-center text-mut hover:bg-fill hover:text-ink transition-colors">
              <Plus className="w-4 h-4" />
            </button>
            <button title="选择技能" className="w-8 h-8 rounded-lg flex items-center justify-center text-mut hover:bg-fill hover:text-ink transition-colors">
              <Hammer className="w-4 h-4" />
            </button>
            <button title="执行模式" className="flex items-center gap-1 h-8 px-2 rounded-lg text-[12px] text-ink-3 hover:bg-fill transition-colors">
              <Zap className="w-3.5 h-3.5" />
              自动
              <ChevronDown className="w-3 h-3 text-mut-3" />
            </button>
            <div className="flex-1" />
            <div className="relative">
              <button
                onClick={() => setTierOpen(!tierOpen)}
                title="自定义模型（按能力强弱）"
                className={`flex items-center gap-1.5 h-8 px-3 rounded-full text-[12.5px] whitespace-nowrap transition-colors ${
                  tier ? 'bg-acc-soft text-acc hover:bg-acc-line font-medium' : 'text-ink hover:bg-fill'
                }`}
              >
                {tier ? CUSTOM_MODELS.find((cm) => cm.key === tier)?.name ?? 'Auto' : 'Auto'}
                <ChevronDown className="w-3.5 h-3.5 shrink-0 opacity-70" />
              </button>
              {tierOpen && (
                <div className="absolute bottom-full right-0 mb-1.5 w-64 bg-panel rounded-xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.12)] p-1.5 z-50">
                  <button
                    onClick={() => { setTier(''); setTierOpen(false) }}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${!tier ? 'bg-fill' : 'hover:bg-fill'}`}
                  >
                    <div className="text-[12.5px] font-medium text-ink">Auto</div>
                    <div className="text-[11px] text-mut-2 mt-0.5">自动匹配最合适的模型能力</div>
                  </button>
                  {CUSTOM_MODELS.map((cm) => (
                    <button
                      key={cm.key}
                      onClick={() => { setTier(cm.key); setTierOpen(false) }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${tier === cm.key ? 'bg-fill' : 'hover:bg-fill'}`}
                    >
                      <div className="text-[12.5px] font-medium text-ink">
                        {cm.name} <span className="ml-1 text-[10.5px] text-acc">{cm.level}</span>
                      </div>
                      <div className="text-[11px] text-mut-2 mt-0.5">{cm.desc}</div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button title="增强提示词" className="w-8 h-8 rounded-lg flex items-center justify-center text-ink hover:bg-fill transition-colors">
              <Sparkles className="w-4 h-4" />
            </button>
            <button
              onClick={send}
              disabled={!text.trim() || sending}
              title="发送到设计工作台（Enter）"
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                text.trim() && !sending ? 'bg-pri text-white hover:bg-pri-deep' : 'bg-fill text-mut-3'
              }`}
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ================= 主组件 ================= */

export default function InspoPage({
  onLaunch,
  showToast,
}: {
  onBack: () => void
  onLaunch: (task: string, autoSubmit: boolean) => void
  showToast: (m: string) => void
}) {
  const [cat, setCat] = useState('全部')
  const [sort, setSort] = useState<(typeof SORTS)[number]>('最热')
  const [sortOpen, setSortOpen] = useState(false)
  const [kw, setKw] = useState('')
  const { t } = useLang() // 全局语言
  const [detailId, setDetailId] = useState<string | null>(null)
  const [cmdCard, setCmdCard] = useState<InspoCard | null>(null)
  const [liked, setLiked] = useState<Record<string, boolean>>({})
  const [zoom, setZoom] = useState(100)

  const list = useMemo(() => {
    let arr = CARDS.filter((c) => (cat === '全部' || c.cat === cat) && (!kw.trim() || c.title.includes(kw.trim()) || c.prompt.includes(kw.trim())))
    arr = [...arr].sort((a, b) => (sort === '最热' ? parseFloat(b.views) * (b.views.includes('k') ? 1000 : 1) - (parseFloat(a.views) * (a.views.includes('k') ? 1000 : 1)) : b.ts - a.ts))
    return arr
  }, [cat, kw, sort])

  const detail = detailId ? CARDS.find((c) => c.id === detailId) ?? null : null

  /** 悬浮卡片浮现的「做同款」功能模块 */
  const hoverActions = (c: InspoCard) => (
    <div className="absolute inset-x-0 bottom-0 p-3 flex justify-end bg-gradient-to-t from-black/35 via-black/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
      <span
        role="button"
        onClick={(e) => {
          e.stopPropagation()
          setCmdCard(c)
        }}
        className="pointer-events-auto flex items-center gap-1.5 h-8 px-3.5 rounded-full bg-[linear-gradient(135deg,#FFB13D_0%,#FF7A1A_100%)] text-white text-[12.5px] font-medium shadow-[0_8px_18px_rgba(255,122,26,0.35)] hover:brightness-[1.05] active:scale-[0.98] transition cursor-pointer"
      >
        <Lightbulb className="w-3.5 h-3.5" />
        做同款
      </span>
    </div>
  )

  return (
    <div className="max-w-[1360px] mx-auto px-10 pt-8 pb-16">
      {detail ? (
        /* ================= 详情页：上半结果图，下半提示词 ================= */
        <div>
          {/* 页头：返回 + 作者信息 + 数据 + 点赞/分享 */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setDetailId(null)
                setZoom(100)
              }}
              title="返回灵感盒"
              className="w-9 h-9 rounded-full bg-panel border border-line flex items-center justify-center text-ink-2 hover:text-pri hover:border-pri/40 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="w-9 h-9 rounded-full text-white flex items-center justify-center text-[13px] font-semibold" style={{ background: detail.color }}>
              {detail.author[0]}
            </span>
            <span className="text-[13.5px] text-ink-2">by {detail.author}</span>
            <span className="text-[12px] text-mut-2 flex items-center gap-1">
              <Eye className="w-3.5 h-3.5" />
              {detail.views}
            </span>
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={() => setLiked((m) => ({ ...m, [detail.id]: !m[detail.id] }))}
                className={`h-9 px-3.5 rounded-full border flex items-center gap-1.5 text-[13px] transition-colors ${
                  liked[detail.id] ? 'border-err/40 text-err bg-err-soft/40' : 'border-line text-ink-2 hover:bg-fill'
                }`}
              >
                <Heart className={`w-4 h-4 ${liked[detail.id] ? 'fill-err' : ''}`} />
                {detail.likes + (liked[detail.id] ? 1 : 0)}
              </button>
              <button
                onClick={() => showToast('链接已复制到剪贴板')}
                title="分享"
                className="w-9 h-9 rounded-full border border-line flex items-center justify-center text-ink-2 hover:bg-fill transition-colors"
              >
                <Share2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 上半部分：结果图（带缩放控制） */}
          <div className="mt-4 relative rounded-3xl border border-line bg-panel overflow-auto max-h-[62vh] [scrollbar-width:thin]">
            <div className="min-w-full flex justify-center p-4" style={{ width: `${zoom}%` }}>
              <img src={detail.img} alt={detail.title} className="w-full h-auto rounded-2xl" draggable={false} />
            </div>
            {/* 缩放控件 */}
            <div className="sticky bottom-3 left-0 right-0 flex justify-center pointer-events-none">
              <div className="pointer-events-auto flex items-center gap-1 bg-ink/70 backdrop-blur text-panel rounded-full px-1.5 py-1">
                <button onClick={() => setZoom((z) => Math.max(50, z - 25))} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors">
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="text-[11px] tabular-nums w-9 text-center">{zoom}%</span>
                <button onClick={() => setZoom((z) => Math.min(200, z + 25))} className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </button>
                <span className="w-px h-3.5 bg-white/25 mx-0.5" />
                <button
                  onClick={() => setZoom(100)}
                  title="适配窗口"
                  className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-white/15 transition-colors"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            {/* 右下角做同款 */}
            <button
              onClick={() => setCmdCard(detail)}
              className="absolute right-4 bottom-4 flex items-center gap-1.5 h-9 px-4 rounded-full bg-[linear-gradient(135deg,#FFB13D_0%,#FF7A1A_100%)] text-white text-[13px] font-medium shadow-[0_8px_18px_rgba(255,122,26,0.35)] hover:brightness-[1.05] active:scale-[0.98] transition"
            >
              <Lightbulb className="w-4 h-4" />
              做同款
            </button>
          </div>

          {/* 下半部分：提示词 */}
          <h1 className="mt-6 text-[20px] font-semibold text-ink">{detail.title}</h1>
          <p className="mt-3 text-[13.5px] leading-relaxed text-ink-2 whitespace-pre-line">{detail.prompt}</p>
          <p className="mt-4 text-[12px] text-mut-2">分类：{detail.cat} · 点击右上角复制链接可分享给团队成员</p>
        </div>
      ) : (
        /* ================= 列表页：灵感盒瀑布流 ================= */
        <div>
          {/* 页头：标题 + 搜索（无返回功能） */}
          <div className="flex items-center gap-3">
            <h1 className="text-[22px] font-semibold text-ink flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-pri" />
              {t('inspo.title')}
            </h1>
            <div className="ml-auto w-64 h-9 rounded-full border border-line bg-panel flex items-center px-3.5 gap-2 focus-within:border-pri transition-colors">
              <Search className="w-4 h-4 text-mut-2 shrink-0" />
              <input
                value={kw}
                onChange={(e) => setKw(e.target.value)}
                placeholder={t('inspo.search')}
                className="flex-1 min-w-0 text-[13px] outline-none placeholder:text-mut-3 bg-transparent"
              />
            </div>
          </div>

          {/* 分类筛选 + 排序/我的分享 */}
          <div className="mt-5 flex items-center gap-2 flex-wrap">
            {CATS.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={`h-9 px-4 rounded-full text-[13px] transition-colors ${
                  cat === c ? 'bg-pri text-white font-medium shadow-[0_4px_14px_rgba(42,104,254,0.25)]' : 'bg-panel border border-line text-ink-2 hover:border-pri/40 hover:text-pri'
                }`}
              >
                {c}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2">
              <div className="relative">
                <button
                  onClick={() => setSortOpen((v) => !v)}
                  className="h-9 px-3.5 rounded-full bg-panel border border-line flex items-center gap-1.5 text-[13px] text-ink hover:border-pri/40 transition-colors"
                >
                  {sort}
                  <ChevronDown className={`w-3.5 h-3.5 text-mut-2 transition-transform ${sortOpen ? 'rotate-180' : ''}`} />
                </button>
                {sortOpen && (
                  <div className="absolute right-0 top-full mt-1.5 z-30 w-28 bg-panel rounded-xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.12)] p-1">
                    {SORTS.map((s) => (
                      <button
                        key={s}
                        onClick={() => {
                          setSort(s)
                          setSortOpen(false)
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-lg text-[12.5px] transition-colors ${sort === s ? 'text-pri font-medium bg-pri-soft' : 'text-ink-2 hover:bg-fill'}`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => showToast('「我分享的」即将上线，敬请期待')}
                className="h-9 px-3.5 rounded-full bg-panel border border-line text-[13px] text-ink-2 hover:border-pri/40 hover:text-pri transition-colors"
              >
                我分享的
              </button>
            </div>
          </div>

          {/* 瀑布流卡片 */}
          {list.length === 0 ? (
            <div className="mt-16 text-center text-[13px] text-mut-2">暂无匹配的灵感内容</div>
          ) : (
            <div className="mt-5 columns-4 gap-3.5 [column-fill:balance]">
              {list.map((c) => (
                <div
                  key={c.id}
                  onClick={() => setDetailId(c.id)}
                  title="查看详情"
                  className="group relative mb-3.5 break-inside-avoid rounded-2xl border border-line-soft bg-panel overflow-hidden cursor-pointer transition-all hover:border-line hover:shadow-[0_10px_28px_rgba(0,0,0,0.08)]"
                >
                  <div className="relative">
                    <img src={c.img} alt={c.title} className="w-full h-auto block" draggable={false} loading="lazy" />
                    {hoverActions(c)}
                  </div>
                  <div className="px-3.5 pt-2.5 pb-3">
                    <div className="text-[13.5px] font-medium text-ink truncate">{c.title}</div>
                    <div className="mt-1.5 flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] font-semibold" style={{ background: c.color }}>
                        {c.author[0]}
                      </span>
                      <span className="text-[11.5px] text-mut truncate">{c.author}</span>
                      <span className="ml-auto flex items-center gap-1 text-[11px] text-mut-2 shrink-0">
                        <Eye className="w-3 h-3" />
                        {c.views}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 做同款命令框 */}
      {cmdCard && <SameStyleBar card={cmdCard} onClose={() => setCmdCard(null)} onLaunch={onLaunch} />}
    </div>
  )
}
