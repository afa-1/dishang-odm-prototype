/**
 * 品牌库（二级页面）：品牌资产库管理。
 * 参照附件：顶部标题 + 标签库管理；五张库卡片（款式/版/面料/辅料/模特）；
 * 分类胶囊 + 上传款式；搜索 / 以图搜图模块（与爆款版型库一致）；属性筛选行；款式图片网格。
 */
import { useMemo, useRef, useState } from 'react'
import {
  Camera,
  ChevronDown,
  Flower2,
  ImageUp,
  LayoutGrid,
  Loader2,
  PersonStanding,
  Scissors,
  Search,
  Send,
  Settings,
  Shirt,
  SlidersHorizontal,
  Sparkles,
  SwatchBook,
  Upload,
  X,
} from 'lucide-react'
import coat1 from '@/assets/brandlib/coat1.png'
import coat2 from '@/assets/brandlib/coat2.png'
import coat3 from '@/assets/brandlib/coat3.png'
import coat4 from '@/assets/brandlib/coat4.png'
import coat5 from '@/assets/brandlib/coat5.png'

/* ================= 数据 ================= */

interface LibCard {
  id: string
  name: string
  count: string
  icon: React.ComponentType<{ className?: string }>
  soft: { bg: string; fg: string }
}

const LIB_CARDS: LibCard[] = [
  { id: 'style', name: '品牌款式库', count: '1120 个款式', icon: Shirt, soft: { bg: '#EAF1FF', fg: '#2A68FE' } },
  { id: 'pattern', name: '品牌版库', count: '0 个版式', icon: Scissors, soft: { bg: '#F1EBFF', fg: '#7C5CFC' } },
  { id: 'fabric', name: '品牌面料库', count: '0 款面料', icon: SwatchBook, soft: { bg: '#E9F8EF', fg: '#22A06B' } },
  { id: 'trim', name: '品牌辅料库', count: '0 款辅料', icon: Flower2, soft: { bg: '#FFF7E3', fg: '#E3A008' } },
  { id: 'model', name: '品牌模特库', count: '0 个模特', icon: PersonStanding, soft: { bg: '#FFEDEB', fg: '#F05252' } },
]

interface Garment {
  id: string
  name: string
  code: string
  img: string
  cat: '外套'
}

const GARMENTS: Garment[] = [
  { id: 'g1', name: '束腰双面呢大衣', code: 'HYY-C-0001', img: coat1, cat: '外套' },
  { id: 'g2', name: '毛领绗缝束腰大衣', code: 'HYY-C-0002', img: coat2, cat: '外套' },
  { id: 'g3', name: '竖条绗缝衬衫式长外套', code: 'HYY-C-0003', img: coat3, cat: '外套' },
  { id: 'g4', name: '黑色菱格皮衣长外套', code: 'HYY-C-0004', img: coat4, cat: '外套' },
  { id: 'g5', name: '牛角扣菱格连帽大衣', code: 'HYY-C-0005', img: coat5, cat: '外套' },
]

const CATS = ['全部', '外套', '裤装', '裙装'] as const

const ATTR_FILTERS: { label: string; options: string[] }[] = [
  { label: '廓形', options: ['H 型', 'X 型', 'A 型', 'O 型'] },
  { label: '肩型', options: ['正肩', '落肩', '插肩', '耸肩'] },
  { label: '袖型', options: ['常规袖', '蝙蝠袖', '灯笼袖', '无袖'] },
  { label: '领型', options: ['翻领', '立领', '连帽', 'V 领'] },
  { label: '衣长', options: ['短款', '中长款', '长款', '超长款'] },
  { label: '下装长度（裤型/半裙）', options: ['九分', '全长', '及膝', '过膝'] },
  { label: '风格', options: ['静奢通勤', '极简', '街头', '法式'] },
  { label: '季节', options: ['春夏', '秋冬', '四季'] },
  { label: '年份', options: ['2026', '2025', '2024'] },
]

/* ----- 以图搜图：权重维度与匹配说明（与爆款版型库一致） ----- */
const SEARCH_DIMS = [
  { id: 'sil', label: '廓形相似度' },
  { id: 'collar', label: '领型' },
  { id: 'sleeve', label: '袖型' },
  { id: 'fabric', label: '面料质感' },
  { id: 'craft', label: '工艺细节' },
  { id: 'color', label: '色彩倾向' },
]
const WEIGHT_LABEL = ['', '高', '中', '低']

interface MatchResult {
  g: Garment
  sim: number
  note: string
}

const buildNote = (sim: number, dims: { id: string; label: string }[]) => {
  if (!dims.length) return `综合相似度 ${sim}%，廓形与细节工艺整体接近`
  const parts = [`${dims[0].label}匹配度 ${sim}%`]
  if (dims[1]) parts.push(`${dims[1].label}一致`)
  if (dims[2]) parts.push(`${dims[2].label}接近`)
  return parts.join('，')
}

/* ================= 主组件 ================= */

export default function BrandLibPage({ showToast }: { showToast: (m: string) => void }) {
  const [lib, setLib] = useState('style')
  const [cat, setCat] = useState<(typeof CATS)[number]>('全部')
  const [qInput, setQInput] = useState('') // 输入中的关键词
  const [q, setQ] = useState('') // 已确认的检索词（点击搜索后生效）
  const [attrOpen, setAttrOpen] = useState<string | null>(null)
  const [attrSel, setAttrSel] = useState<Record<string, string>>({})
  const fileRef = useRef<HTMLInputElement>(null)

  /* ----- 以图搜图状态 ----- */
  const [imgOpen, setImgOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [imgPreview, setImgPreview] = useState<string | null>(null)
  const [imgName, setImgName] = useState('')
  const [weights, setWeights] = useState<Record<string, number>>({ sil: 1, collar: 2, sleeve: 3 })
  const [searching, setSearching] = useState(false)
  const [matchResults, setMatchResults] = useState<MatchResult[] | null>(null)
  const imgFileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)

  const activeLib = LIB_CARDS.find((l) => l.id === lib)!

  const list = useMemo(() => {
    if (lib !== 'style') return []
    if (cat === '裤装' || cat === '裙装') return []
    return GARMENTS
  }, [lib, cat])

  // 文本检索结果：仅在搜索版块内展示，不污染下方内容区
  const results = useMemo(() => {
    if (!q) return []
    const k = q.toLowerCase()
    return GARMENTS.filter((g) => g.name.includes(q) || g.code.toLowerCase().includes(k) || g.cat.includes(q))
  }, [q])

  const runTextSearch = () => setQ(qInput.trim())
  const clearSearch = () => {
    setQInput('')
    setQ('')
  }

  const pickImg = (f: File) => {
    setImgPreview(URL.createObjectURL(f))
    setImgName(f.name)
    setMatchResults(null)
  }
  const useDemoImg = () => {
    setImgPreview(coat1)
    setImgName('示例参考图 · 束腰双面呢大衣')
    setMatchResults(null)
  }
  const runImgSearch = () => {
    if (!imgPreview) {
      showToast('请先上传一张参考图，或使用示例图体验')
      return
    }
    setSearching(true)
    setMatchResults(null)
    window.setTimeout(() => {
      const dims = SEARCH_DIMS.filter((d) => (weights[d.id] ?? 0) > 0)
      const sims = [97, 94, 91, 88, 85]
      setMatchResults(GARMENTS.slice(0, 5).map((g, i) => ({ g, sim: sims[i], note: buildNote(sims[i], dims) })))
      setSearching(false)
    }, 1600)
  }

  return (
    <div className="max-w-[1360px] mx-auto px-10 pt-8 pb-16" onClick={() => setAttrOpen(null)}>
      {/* ===== 页头：标题 + 标签库管理 ===== */}
      <div className="flex items-center justify-between">
        <h1 className="text-[24px] font-bold text-ink tracking-wide">品牌库</h1>
        <button
          onClick={() => showToast('标签库管理即将上线，敬请期待')}
          className="h-10 px-4 rounded-lg border border-line bg-panel flex items-center gap-2 text-[13.5px] text-ink hover:border-ink transition-colors"
        >
          <Settings className="w-4 h-4 text-ink-2" />
          标签库管理
        </button>
      </div>

      {/* ===== 库卡片行 ===== */}
      <div className="mt-6 grid grid-cols-5 gap-5">
        {LIB_CARDS.map((l) => (
          <button
            key={l.id}
            onClick={() => setLib(l.id)}
            className={`rounded-xl border bg-panel px-5 py-5 flex items-center gap-3.5 text-left transition-all ${
              lib === l.id ? 'border-pri shadow-[0_4px_16px_rgba(42,104,254,0.10)]' : 'border-line hover:border-ink-3'
            }`}
          >
            <span className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0" style={{ background: l.soft.bg, color: l.soft.fg }}>
              <l.icon className="w-5 h-5" />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold text-ink">{l.name}</span>
              <span className="block mt-1 text-[12.5px] text-mut">{l.count}</span>
            </span>
          </button>
        ))}
      </div>

      {/* ===== 搜索 / 以图搜图模块（与爆款版型库一致：搜索框与图搜按钮等高 56px，输入需求 → 点击确认 → 检索结果排列显示） ===== */}
      <div className="mt-7">
        <div className="flex items-center gap-3.5">
          <div className="flex-1 flex items-center gap-3 h-14 pl-5 pr-2 rounded-xl bg-panel border border-line shadow-[0_2px_12px_rgba(0,0,0,0.04)] focus-within:border-pri focus-within:ring-4 focus-within:ring-pri/10 transition-shadow">
            <Search className="w-[19px] h-[19px] text-mut-2 shrink-0" />
            <input
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') runTextSearch() }}
              placeholder="搜索款式关键词：名称 / 编号 / 廓形 / 领型 / 面料 / 工艺…"
              className="flex-1 min-w-0 bg-transparent outline-none text-[14px] placeholder:text-mut-3"
            />
            {qInput && (
              <button onClick={clearSearch} title="清空" className="w-7 h-7 rounded-full text-mut-3 hover:text-ink hover:bg-fill flex items-center justify-center shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
            <span className="hidden xl:inline text-[11px] text-mut-3 shrink-0">共 {GARMENTS.length} 款在库款式</span>
            <button
              onClick={runTextSearch}
              title="搜索"
              className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors shrink-0 ${
                qInput.trim() ? 'bg-pri text-white hover:bg-pri-hover' : 'bg-fill text-mut-3'
              }`}
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <button
            onClick={() => setImgOpen((v) => !v)}
            className={`h-10 px-6 rounded-xl text-[14px] font-medium flex items-center gap-2 shrink-0 transition-all ${
              imgOpen
                ? 'bg-pri/90 text-white ring-4 ring-pri/15'
                : 'bg-pri text-white hover:bg-pri/90 shadow-[0_6px_16px_rgba(42,104,254,0.24)]'
            }`}
          >
            <ImageUp className="w-[18px] h-[18px]" />
            以图搜图
            <ChevronDown className={`w-4 h-4 transition-transform ${imgOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
        {/* 检索结果：显示在搜索版块内，下方内容区保持完整款式库 */}
        {q && (
          <div className="mt-3 rounded-xl border border-line bg-panel p-4">
            <div className="flex items-center gap-1.5 text-[12.5px] text-mut">
              <Sparkles className="w-3.5 h-3.5 text-pri shrink-0" />
              <span>
                为您找到 <span className="text-ink font-semibold">{results.length}</span> 款与「{q}」相关的品牌款式
              </span>
              <button onClick={clearSearch} className="ml-1 text-pri hover:underline inline-flex items-center gap-0.5 shrink-0">
                <X className="w-3 h-3" />清除检索，查看全部
              </button>
            </div>
            {results.length > 0 ? (
              <div className="mt-3 grid grid-cols-5 gap-4">
                {results.map((g) => (
                  <button key={g.id} onClick={() => showToast(`「${g.name}」详情即将上线`)} className="group text-left">
                    <div className="rounded-xl bg-white border border-line-soft overflow-hidden transition-shadow group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                      <img src={g.img} alt={g.name} className="w-full aspect-[3/4] object-contain" draggable={false} />
                    </div>
                    <div className="mt-2.5 text-[13px] text-ink">{g.name}</div>
                    <div className="mt-0.5 text-[11.5px] text-mut-3">{g.code}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="mt-2 py-8 text-center text-[12.5px] text-mut">未找到与「{q}」相关的款式，可换个关键词试试</div>
            )}
          </div>
        )}

        {/* 图搜工作区 */}
        {imgOpen && (
          <div className="mt-4 rounded-xl bg-panel border border-line p-4">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
              <Sparkles className="w-4 h-4 text-pri" />
              AI 多因子图搜
              <span className="text-[11.5px] text-mut-2 font-normal">上传参考图，AI 按权重维度比对品牌款式库，返回相似度最高的款式</span>
            </div>
            <div className="mt-3 grid grid-cols-[minmax(0,5fr)_minmax(0,7fr)] gap-4">
              {/* 上传区：拖拽 / 上传 / 拍照 */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault()
                  setDragOver(false)
                  const f = e.dataTransfer.files?.[0]
                  if (f) pickImg(f)
                }}
                className={`relative rounded-xl border-2 border-dashed min-h-[188px] flex flex-col items-center justify-center gap-2 text-center px-4 transition-colors ${
                  dragOver ? 'border-pri bg-pri-soft' : 'border-line bg-fill/40'
                }`}
              >
                {imgPreview ? (
                  <>
                    <img src={imgPreview} alt={imgName} className="absolute inset-0 w-full h-full object-cover rounded-[10px]" />
                    <div className="absolute inset-x-2 bottom-2 flex items-center gap-2">
                      <span className="flex-1 min-w-0 h-7 px-2.5 rounded-lg bg-black/55 backdrop-blur text-white text-[11px] inline-flex items-center truncate">{imgName}</span>
                      <button
                        onClick={() => { setImgPreview(null); setImgName(''); setMatchResults(null) }}
                        className="h-7 px-2.5 rounded-lg bg-black/55 backdrop-blur text-white text-[11px] hover:bg-black/70 shrink-0"
                      >
                        重传
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="w-11 h-11 rounded-full bg-pri-soft text-pri flex items-center justify-center">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-[12.5px] text-ink-2 font-medium">拖拽图片到此处</div>
                    <div className="text-[11px] text-mut-3">支持 JPG / PNG 格式参考图</div>
                    <div className="mt-1 flex items-center gap-2">
                      <button
                        onClick={() => imgFileRef.current?.click()}
                        className="h-8 px-3.5 rounded-lg bg-pri text-white text-[12px] font-medium hover:bg-pri/90 flex items-center gap-1.5"
                      >
                        <ImageUp className="w-3.5 h-3.5" />上传图片
                      </button>
                      <button
                        onClick={() => camRef.current?.click()}
                        className="h-8 px-3.5 rounded-lg border border-line bg-panel text-[12px] text-ink-2 hover:border-pri/40 hover:text-pri flex items-center gap-1.5"
                      >
                        <Camera className="w-3.5 h-3.5" />拍照上传
                      </button>
                    </div>
                  </>
                )}
                <input ref={imgFileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImg(f); e.target.value = '' }} />
                <input ref={camRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickImg(f); e.target.value = '' }} />
              </div>

              {/* 权重维度 + 检索操作 */}
              <div className="flex flex-col">
                <div className="flex items-center gap-1.5 text-[12px] font-medium text-ink-2">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-pri" />
                  匹配权重维度
                  <span className="text-[11px] text-mut-3 font-normal">点击标签循环切换权重：高 → 中 → 低 → 关闭</span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {SEARCH_DIMS.map((d) => {
                    const w = weights[d.id] ?? 0
                    return (
                      <button
                        key={d.id}
                        onClick={() => setWeights((st) => ({ ...st, [d.id]: ((st[d.id] ?? 0) + 1) % 4 }))}
                        className={`h-8 pl-3 pr-2 rounded-full border text-[12px] inline-flex items-center gap-1.5 transition-colors ${
                          w > 0 ? 'border-pri/50 bg-pri-soft text-pri font-medium' : 'border-line bg-panel text-ink-3 hover:text-ink'
                        }`}
                      >
                        {d.label}
                        {w > 0 && (
                          <span className={`text-[10px] px-1.5 rounded-full font-semibold ${w === 1 ? 'bg-pri text-white' : w === 2 ? 'bg-pri/60 text-white' : 'bg-pri/25 text-pri'}`}>
                            {WEIGHT_LABEL[w]}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-auto pt-3 flex items-center gap-3">
                  <button
                    onClick={runImgSearch}
                    disabled={searching}
                    className="h-10 px-5 rounded-xl bg-pri text-white text-[13px] font-medium hover:bg-pri/90 disabled:opacity-60 flex items-center gap-2 shadow-[0_4px_14px_rgba(42,104,254,0.25)]"
                  >
                    {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    {searching ? 'AI 检索中…' : '开始 AI 检索'}
                  </button>
                  {!imgPreview && (
                    <button onClick={useDemoImg} className="text-[12px] text-pri hover:underline">没有图片？使用示例图体验</button>
                  )}
                  <span className="ml-auto text-[11px] text-mut-3">检索范围：全部 {GARMENTS.length} 款款式档案</span>
                </div>
              </div>
            </div>

            {/* 检索中 */}
            {searching && (
              <div className="mt-4 rounded-xl border border-line bg-fill/40 px-4 py-5 flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-pri animate-spin shrink-0" />
                <div>
                  <div className="text-[12.5px] font-medium text-ink">AI 引擎正在比对品牌款式库…</div>
                  <div className="mt-0.5 text-[11.5px] text-mut-2">按预设权重多因子检索：廓形向量比对 → 领型 / 袖型结构分析 → 面料工艺特征匹配</div>
                </div>
              </div>
            )}

            {/* 检索结果：相似度降序 */}
            {matchResults && !searching && (
              <div className="mt-4">
                <div className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
                  相似度最高的 {matchResults.length} 款品牌款式
                  <span className="text-[11px] text-mut-3 font-normal">按相似度降序排列，点击卡片查看款式</span>
                </div>
                <div className="mt-2.5 grid grid-cols-5 gap-3">
                  {matchResults.map((r, i) => (
                    <button
                      key={r.g.id}
                      onClick={() => showToast(`「${r.g.name}」详情即将上线`)}
                      className="rounded-xl border border-line bg-panel overflow-hidden text-left transition-all hover:border-pri/50 hover:shadow-[0_8px_24px_rgba(42,104,254,0.10)]"
                    >
                      <div className="relative bg-white">
                        <img src={r.g.img} alt={r.g.name} className="w-full aspect-[3/4] object-contain" />
                        <span className={`absolute left-2 top-2 h-6 px-2 rounded-full text-[11px] font-bold inline-flex items-center ${
                          i === 0 ? 'bg-[linear-gradient(135deg,#FFB13D_0%,#FF7A1A_100%)] text-white' : 'bg-black/55 backdrop-blur text-white'
                        }`}>
                          TOP {i + 1}
                        </span>
                      </div>
                      <div className="p-3">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[12.5px] font-semibold text-ink truncate">{r.g.name}</span>
                          <span className="text-[15px] font-bold text-pri shrink-0">{r.sim}%</span>
                        </div>
                        <div className="mt-1.5 h-1.5 rounded-full bg-fill overflow-hidden">
                          <div className="h-full rounded-full bg-[linear-gradient(90deg,#2A68FE,#7C5CFC)]" style={{ width: `${r.sim}%` }} />
                        </div>
                        <div className="mt-1.5 text-[11px] text-mut leading-relaxed line-clamp-2">{r.note}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ===== 分类胶囊 + 上传款式 ===== */}
      <div className="mt-5 flex items-center gap-3.5">
        {CATS.map((c) => (
          <button
            key={c}
            onClick={() => setCat(c)}
            className={`h-10 px-5 rounded-full border text-[14px] inline-flex items-center gap-1.5 transition-colors ${
              cat === c ? 'border-pri text-pri bg-panel font-medium' : 'border-line bg-panel text-ink hover:border-ink-3'
            }`}
          >
            {c === '全部' && <LayoutGrid className="w-4 h-4" />}
            {c}
            {c !== '全部' && <ChevronDown className="w-3.5 h-3.5 text-mut" />}
          </button>
        ))}
        <div className="ml-auto flex items-center gap-2.5">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => {
              const n = e.target.files?.length ?? 0
              if (n) showToast(`已上传 ${n} 个款式，审核通过后将进入品牌款式库`)
              e.target.value = ''
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            title="上传款式"
            className="h-10 w-10 rounded-full border border-line bg-panel text-ink inline-flex items-center justify-center hover:border-ink-3 transition-colors"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ===== 属性筛选行 ===== */}
      <div className="mt-5 flex items-center gap-7 flex-wrap relative">
        {ATTR_FILTERS.map((f) => (
          <div key={f.label} className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setAttrOpen(attrOpen === f.label ? null : f.label)
              }}
              className={`inline-flex items-center gap-1 text-[13.5px] transition-colors ${attrSel[f.label] ? 'text-pri' : 'text-ink-3 hover:text-ink'}`}
            >
              {attrSel[f.label] ?? f.label}
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${attrOpen === f.label ? 'rotate-180' : ''}`} />
            </button>
            {attrOpen === f.label && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute left-0 top-full mt-2 z-40 w-40 bg-panel rounded-xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.12)] py-1.5"
              >
                {attrSel[f.label] && (
                  <button
                    onClick={() => {
                      setAttrSel((m) => {
                        const next = { ...m }
                        delete next[f.label]
                        return next
                      })
                      setAttrOpen(null)
                    }}
                    className="w-full px-3.5 py-2 text-left text-[12.5px] text-mut hover:bg-fill flex items-center gap-1.5"
                  >
                    <X className="w-3 h-3" /> 清除筛选
                  </button>
                )}
                {f.options.map((op) => (
                  <button
                    key={op}
                    onClick={() => {
                      setAttrSel((m) => ({ ...m, [f.label]: `${f.label}·${op}` }))
                      setAttrOpen(null)
                    }}
                    className="w-full px-3.5 py-2 text-left text-[12.5px] text-ink hover:bg-fill transition-colors"
                  >
                    {op}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* ===== 款式网格 ===== */}
      {list.length > 0 ? (
        <div className="mt-8 grid grid-cols-5 gap-6">
          {list.map((g) => (
            <div key={g.id} className="group cursor-pointer" onClick={() => showToast(`「${g.name}」详情即将上线`)}>
              <div className="rounded-xl bg-white border border-line-soft overflow-hidden transition-shadow group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                <img src={g.img} alt={g.name} className="w-full aspect-[3/4] object-contain" draggable={false} />
              </div>
              <div className="mt-2.5 text-[13px] text-ink">{g.name}</div>
              <div className="mt-0.5 text-[11.5px] text-mut-3">{g.code}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-24 flex flex-col items-center justify-center text-center">
          <span
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ background: activeLib.soft.bg, color: activeLib.soft.fg }}
          >
            <activeLib.icon className="w-7 h-7" />
          </span>
          <p className="mt-4 text-[14px] text-ink-2">
            {lib !== 'style' ? `${activeLib.name}暂无内容` : '该分类下暂无款式'}
          </p>
          <p className="mt-1.5 text-[12.5px] text-mut-2">
            {lib !== 'style' ? '可通过上传或从设计任务沉淀来积累品牌资产' : '可点击右上角「上传款式」添加'}
          </p>
        </div>
      )}
    </div>
  )
}
