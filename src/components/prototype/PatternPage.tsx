/**
 * AI 打版（二级页面）：版型检索、复用与推荐。
 * 按 PRD 实现三个 Tab：平台AI版师 / 品牌AI版师 / 爆款版型库；底部常驻「历史打版记录」。
 * 版师 Tab 参照品牌落地页形式：Hero 横幅（版型拟合度/基因特征库/新款建议系列）+ 四大能力卡 + 富信息版师卡片。
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import PatternStudioPage from './PatternStudioPage'
import {
  ArrowLeft,
  Award,
  Box,
  Camera,
  ChevronDown,
  History,
  ImageUp,
  Loader2,
  Search,
  Send,
  SlidersHorizontal,
  Sparkles,
  TrendingUp,
  Upload,
  X
} from 'lucide-react'

/* ================= 数据 ================= */

interface Master {
  id: string
  name: string
  title: string // 专家称号
  desc: string
  style: string // 擅长风格
  strength: string // 核心特长
  tags: string[]
  works: number // 出品版型数
  rating: number
  color: string // 头像底色
  photo: string // 人物照片（复刻附件图）
  brand?: string // 品牌AI版师：所属品牌
  isBrand?: boolean // 品牌版师卡片：头像为品牌 logo，名称为品牌名称（区别个人 AI 版师）
  cats: string[] // 擅长品类（用于筛选）
}

const BRAND_MASTERS: Master[] = [
  {
    id: 'm0', photo: '', isBrand: true, name: '娅丽达', title: '品牌版师 · 全品类裤型', desc: '沉淀娅丽达品牌基因的全品类裤型版型库，品牌风格全场景支持，区别于个人 AI 版师。',
    style: '品牌全风格 · 全品类裤型', strength: '全品类支持 · 品牌基因复刻', tags: ['直筒裤', '阔腿裤', '烟管裤', '工装裤', '喇叭裤', '弯刀裤'],
    works: 1580, rating: 5.0, color: '#C26E70', cats: ['直筒裤', '阔腿裤', '烟管裤', '工装裤', '喇叭裤', '弯刀裤'],
  },
  {
    id: 'm2', photo: '/masters/master-su.png', name: '苏版师', title: '阔腿裤专家', desc: '擅长打造高腰阔腿裤型，注重比例拉长与舒适度平衡。',
    style: '法式优雅、休闲大气', strength: '高腰显瘦 · 廓形优雅', tags: ['阔腿裤', '高腰裤', '法式风格', '垂坠面料', '大廓形'],
    works: 301, rating: 4.9, color: '#7C5CFC', cats: ['阔腿裤'],
  },
  {
    id: 'm3', photo: '/masters/master-chen.png', name: '陈版师', title: '烟管裤专家', desc: '精通烟管裤修身版型，适配多种场景穿着需求。',
    style: '职场干练、日常百搭', strength: '修身合体 · 活动自如', tags: ['烟管裤', '修身裤', '职场风', '九分裤', '弹力面料'],
    works: 258, rating: 4.8, color: '#0EA5E9', cats: ['直筒裤', '西装上衣'],
  },
  {
    id: 'm4', photo: '/masters/master-tang.png', name: '唐版师', title: '工装裤专家', desc: '擅长工装风女裤设计，兼顾功能性与时尚感。',
    style: '工装机能、休闲帅气', strength: '口袋结构 · 实用耐穿', tags: ['工装裤', '口袋设计', '机能风', '束脚裤', '耐磨面料'],
    works: 214, rating: 4.7, color: '#F59E0B', cats: ['弯刀裤'],
  },
  {
    id: 'm5', photo: '/masters/master-su.png', name: '陆版师', title: '喇叭裤专家', desc: '十五年一线裤装打版经验，专攻女裤臀胯弧线与垂坠量控制。',
    style: '复古摩登、曲线优美', strength: '提臀塑形 · 摆量精准', tags: ['喇叭裤', '微喇裤', '复古风', '高腰设计', '弹力丹宁'],
    works: 287, rating: 4.9, color: '#F472B6', cats: ['喇叭裤'],
  },
  {
    id: 'm6', photo: '/masters/master-chen.png', name: '沈版师', title: '弯刀裤专家', desc: '擅长弯刀裤立体剪裁与归拔工艺，版型稳定性强。',
    style: '街潮复古、立体剪裁', strength: '弯刀弧线 · 修饰小腿', tags: ['弯刀裤', 'Y2K', '立体省', '做旧洗水', '堆量脚口'],
    works: 233, rating: 4.8, color: '#10B981', cats: ['弯刀裤'],
  },
]

const PLATFORM_MASTERS: Master[] = [
  {
    id: 'b1', photo: '/masters/master-lin.png', name: '致知数字版师', title: '极简廓形专家', desc: '沉淀品牌极简廓形库，直身版型与高级垂感调优。',
    style: '东方极简、高级通勤', strength: '极简廓形 · 垂感调优', tags: ['阔腿裤', '直筒裤', '极简风', '高级感', '垂坠面料'],
    works: 96, rating: 4.9, color: '#111827', brand: '致知 ZHIZHI', cats: ['阔腿裤', '直筒裤'],
  },
  {
    id: 'b2', photo: '/masters/master-su.png', name: '之禾数字版师', title: '天然面料专家', desc: '天然面料版型数据库加持，环保材质的松量控制成熟。',
    style: '自然环保、舒适松弛', strength: '松量控制 · 亲肤剪裁', tags: ['连衣裙', '西装上衣', '天然面料', '环保工艺', '松弛感'],
    works: 88, rating: 4.8, color: '#65A30D', brand: '之禾 ICICLE', cats: ['连衣裙', '西装上衣'],
  },
  {
    id: 'b3', photo: '/masters/master-tang.png', name: 'UR 数字版师', title: '快反爆款专家', desc: '快时尚高频上新版型库，喇叭裤与弯刀裤爆款命中率高。',
    style: '快潮时尚、高频上新', strength: '爆款命中 · 快速翻单', tags: ['喇叭裤', '弯刀裤', '快时尚', '爆款基因', '年轻化'],
    works: 142, rating: 4.7, color: '#DC2626', brand: 'URBAN REVIVO', cats: ['喇叭裤', '弯刀裤'],
  },
  {
    id: 'b4', photo: '/masters/master-chen.png', name: '例外数字版师', title: '东方美学专家', desc: '东方美学廓形与宽松结构，长款上衣版型独具辨识度。',
    style: '东方美学、艺术宽松', strength: '廓形辨识 · 结构创新', tags: ['西装上衣', '连衣裙', '东方美学', '宽松廓形', '艺术感'],
    works: 73, rating: 4.8, color: '#B45309', brand: '例外 EXCEPTION', cats: ['西装上衣', '连衣裙'],
  },
  {
    id: 'b5', photo: '/masters/master-lin.png', name: 'MO&Co. 数字版师', title: '酷感通勤专家', desc: '酷感通勤风格版型库，直筒裤与中高腰结构沉淀深厚。',
    style: '酷感通勤、都市摩登', strength: '中高腰 · 直身结构', tags: ['直筒裤', '喇叭裤', '通勤风', '摩登', '中高腰'],
    works: 105, rating: 4.6, color: '#4F46E5', brand: 'MO&Co.', cats: ['直筒裤', '喇叭裤'],
  },
]

interface PatternItem {
  id: string
  name: string
  img: string // 品牌款式图
  year: number
  quarter: string
  sales: string // 历史销量
  salesNum: number // 排序用（万件）
  fabric: string // 面料说明
  patternNote: string // 版型说明
  selling: string // 卖点说明
  rec?: boolean // 商品部门重点推荐
}

const PATTERNS: PatternItem[] = [
  {
    id: 'p1', name: '高腰微喇牛仔裤版型', img: '/samples/pf-hit.png', year: 2026, quarter: 'Q2', sales: '86.5 万件', salesNum: 86.5,
    fabric: '12.5oz 弹力丹宁，纬向 12% 拉伸回弹', patternNote: '高腰节 +3cm，膝围内收 1.2cm，微喇摆量 24cm', selling: '提臀显腿长，梨形身材友好；久穿不卡裆', rec: true,
  },
  {
    id: 'p2', name: '垂感阔腿西装裤版型', img: '/samples/pf-trade.png', year: 2026, quarter: 'Q1', sales: '64.2 万件', salesNum: 64.2,
    fabric: 'TR 斜纹四面弹，270g/m² 垂坠抗皱', patternNote: '直裆加深 1.5cm，前中单褶，裤线烫迹定型', selling: '通勤百搭，垂感遮胯宽，久坐不起皱', rec: true,
  },
  {
    id: 'p3', name: '复古弯刀裤版型', img: '/samples/gen-look.png', year: 2025, quarter: 'Q4', sales: '52.8 万件', salesNum: 52.8,
    fabric: '全棉无弹粗斜纹，洗水做旧工艺', patternNote: '膝部外弧 2.8cm 立体省，脚口内收微堆量', selling: 'Y2K 复古廓形，弯刀弧线修饰小腿线条', rec: false,
  },
  {
    id: 'p4', name: '九分直筒烟管裤版型', img: '/samples/pf-plan.png', year: 2025, quarter: 'Q3', sales: '48.1 万件', salesNum: 48.1,
    fabric: '醋酸混纺，哑光垂顺，亲肤凉感', patternNote: '中高腰直筒，臀围松量 6cm，九分露踝', selling: '显瘦直线条，通勤休闲两穿，小个子友好', rec: false,
  },
  {
    id: 'p5', name: '工装多袋阔腿裤版型', img: '/samples/pf-techpack.png', year: 2025, quarter: 'Q1', sales: '39.6 万件', salesNum: 39.6,
    fabric: '重磅帆布 310g/m²，耐磨硬挺', patternNote: '立体工装袋 ×4，膝部打褶增量，抽绳脚口', selling: '山系工装风，大容量口袋实用主义', rec: false,
  },
  {
    id: 'p6', name: '云朵空气层喇叭裤版型', img: '/samples/pf-fabric.png', year: 2024, quarter: 'Q4', sales: '33.4 万件', salesNum: 33.4,
    fabric: '空气层三明治面料，轻量保暖', patternNote: '松紧腰 + 抽绳，膝下展开喇叭摆 22cm', selling: '居家外穿两用，软糯空气感零束缚', rec: false,
  },
  {
    id: 'p7', name: '极简锥形西裤版型', img: '/samples/pf-detail.png', year: 2024, quarter: 'Q2', sales: '28.9 万件', salesNum: 28.9,
    fabric: '精纺羊毛混纺，四季克重 240g/m²', patternNote: '锥形收脚，无褶净版，隐藏式侧袋', selling: '极简正装感，搭配西装/大衣皆宜', rec: false,
  },
]

interface ProjectRec {
  id: string
  name: string
  img: string
  status: string // 项目状态标签（已完成等）
  master: string
  time: string
}

const INIT_PROJECTS: ProjectRec[] = [
  { id: 'j1', name: '高腰微喇牛仔裤 · 26AW', img: '/samples/pf-hit.png', status: '已完成', master: '陆版师', time: '昨天 18:32' },
  { id: 'j2', name: '垂感阔腿西装裤 · 26SS', img: '/samples/pf-trade.png', status: '已完成', master: '苏版师', time: '昨天 15:07' },
  { id: 'j3', name: '复古弯刀裤 · 25AW', img: '/samples/gen-look.png', status: '已完成', master: '沈版师', time: '08-18 21:40' },
  { id: 'j4', name: '九分直筒烟管裤 · 25AW', img: '/samples/pf-plan.png', status: '已完成', master: '陈版师', time: '08-16 10:22' },
]

const YEARS = [2026, 2025, 2024]

/* ----- 以图搜图：权重维度与匹配结果 ----- */
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
  p: PatternItem
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

/* ================= 页面 ================= */

export default function PatternPage({ showToast, onBack }: { showToast: (m: string) => void; onBack?: () => void }) {
  const [tab, setTab] = useState<'platform' | 'brand' | 'hot'>('platform')
  const [qInput, setQInput] = useState('') // 输入中的关键词
  const [q, setQ] = useState('') // 已确认的检索词（点击搜索后生效）
  const [year, setYear] = useState<number | 0>(0) // 0 = 全部
  const [sort, setSort] = useState<'rec' | 'sales' | 'new'>('rec')
  const [sortOpen, setSortOpen] = useState(false)
  const [detail, setDetail] = useState<PatternItem | null>(null)
  const [studio, setStudio] = useState<Master | null>(null) // 打版工作台：选择版师后进入
  /** 版师页副导航：AI 版师基因打版 / AI 版师版型积累（新增） */
  const [masterSub, setMasterSub] = useState<'gene' | 'accum'>('gene')
  /** 版型积累：选择版师上传版型 → CAD 版片上传弹窗 */
  const [uploadMaster, setUploadMaster] = useState<Master | null>(null)
  const [cadFile, setCadFile] = useState('')
  const [cadName, setCadName] = useState('')
  const cadFileRef = useRef<HTMLInputElement>(null)

  // 副导航初始状态始终停留在「AI 版师基因打版」：离开品牌 Tab（含退出页面/退出产品后再次进入）即重置
  useEffect(() => {
    if (tab !== 'brand' && masterSub !== 'gene') setMasterSub('gene')
  }, [tab, masterSub])
  const [projects, setProjects] = useState<ProjectRec[]>(INIT_PROJECTS)

  /* ----- 以图搜图状态 ----- */
  const [imgOpen, setImgOpen] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const [imgPreview, setImgPreview] = useState<string | null>(null)
  const [imgName, setImgName] = useState('')
  const [weights, setWeights] = useState<Record<string, number>>({ sil: 1, collar: 2, sleeve: 3 })
  const [searching, setSearching] = useState(false)
  const [matchResults, setMatchResults] = useState<MatchResult[] | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const camRef = useRef<HTMLInputElement>(null)

  const pickFile = (f: File) => {
    setImgPreview(URL.createObjectURL(f))
    setImgName(f.name)
    setMatchResults(null)
  }
  const useDemoImg = () => {
    setImgPreview('/samples/gen-look.png')
    setImgName('示例参考图 · 复古弯刀裤')
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
      const sims = [97, 94, 91, 88, 85, 82]
      const ranked = [...PATTERNS].sort((a, b) => b.salesNum - a.salesNum).slice(0, 6)
      setMatchResults(ranked.map((p, i) => ({ p, sim: sims[i], note: buildNote(sims[i], dims) })))
      setSearching(false)
    }, 1600)
  }

  const masters = tab === 'platform' ? PLATFORM_MASTERS : BRAND_MASTERS

  const patterns = useMemo(() => {
    let list = PATTERNS.filter((p) => year === 0 || p.year === year)
    list = [...list].sort((a, b) => {
      if (sort === 'rec') return Number(b.rec ?? false) - Number(a.rec ?? false) || b.year - a.year || b.salesNum - a.salesNum
      if (sort === 'sales') return b.salesNum - a.salesNum
      return b.year - a.year || b.salesNum - a.salesNum
    })
    return list
  }, [year, sort])

  // 文本检索结果：仅在搜索版块内展示，不污染下方内容区
  const searchResults = useMemo(() => {
    if (!q) return []
    return PATTERNS.filter((p) => p.name.includes(q) || p.fabric.includes(q) || p.selling.includes(q))
  }, [q])

  const runTextSearch = () => setQ(qInput.trim())
  const clearSearch = () => {
    setQInput('')
    setQ('')
  }

  const pushProject = (p: PatternItem, status: string) => {
    setProjects((h) => [{ id: `j${Date.now()}`, name: p.name, img: p.img, status, master: 'AI 版师', time: '刚刚' }, ...h].slice(0, 8))
  }

  /* ---------- 版师卡片（参照附件：官方徽章 + 大头像 + 称号 + 风格/特长 + 标签 + 整宽按钮） ---------- */
  const masterCard = (m: Master) => (
    <div
      key={m.id}
      className="rounded-2xl border border-line bg-panel p-4 flex flex-col transition-all hover:border-pri/40 hover:shadow-[0_10px_28px_rgba(42,104,254,0.10)]"
    >
      <div className="flex items-start gap-3">
        {m.isBrand ? (
          <div
            className="w-[76px] h-[96px] rounded-xl flex flex-col items-center justify-center select-none shadow-[0_6px_16px_rgba(0,0,0,0.10)]"
            style={{ background: 'linear-gradient(160deg, #F3D3D0, #F9E9E4)' }}
          >
            <span className="font-serif text-[10.5px] font-semibold tracking-[0.16em] text-ink">YERAD</span>
            <span className="mt-0.5 font-serif text-[15px] font-bold tracking-[0.12em] text-ink">娅丽达</span>
          </div>
        ) : (
          <img
            src={m.photo}
            alt={m.name}
            className="w-[76px] h-[96px] rounded-xl object-cover object-top shadow-[0_6px_16px_rgba(0,0,0,0.10)]"
            style={{ background: `linear-gradient(160deg, ${m.color}22, ${m.color}08)` }}
          />
        )}
        <div className="min-w-0 flex-1 pt-0.5">
          <div className="text-[16px] font-bold text-ink">{m.name}</div>
          <div className="text-[12px] font-medium text-pri mt-0.5">{m.title}</div>
          <p className="mt-1.5 text-[11.5px] text-mut leading-relaxed line-clamp-2">{m.desc}</p>
        </div>
      </div>
      {/* 擅长风格 / 核心特长 */}
      <div className="mt-3 space-y-1 text-[12px]">
        <div className="flex gap-1.5"><span className="text-mut-2 shrink-0">擅长风格：</span><span className="text-ink font-medium">{m.style}</span></div>
        <div className="flex gap-1.5"><span className="text-mut-2 shrink-0">核心特长：</span><span className="text-ink font-medium">{m.strength}</span></div>
      </div>
      {/* 标签 */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {m.tags.map((t) => (
          <span key={t} className="h-6 px-2 rounded-md bg-pri-soft text-pri text-[11px] font-medium inline-flex items-center">{t}</span>
        ))}
      </div>
      {/* 整宽主按钮：基因打版=选择版师打版；版型积累=大号虚线上传区（上传入口加大，更符合上传交互形式） */}
      {tab === 'brand' && masterSub === 'accum' ? (
        <button
          onClick={() => {
            setCadName(`${m.title}版型`)
            setCadFile('')
            setUploadMaster(m)
          }}
          className="group mt-3.5 w-full h-[64px] rounded-xl border border-dashed border-pri/40 bg-pri-soft/30 flex flex-col items-center justify-center gap-1 text-pri transition-all hover:border-pri hover:bg-pri-soft/60"
        >
          <span className="flex items-center gap-1.5 text-[12.5px] font-medium">
            <Upload className="w-4 h-4 transition-transform group-hover:-translate-y-0.5" />
            选择版师上传版型
          </span>
          <span className="text-[10.5px] text-pri/70">上传自有 CAD 版片（DXF/prj）</span>
        </button>
      ) : (
        <button
          onClick={() => setStudio(m)}
          className="mt-3.5 h-9.5 h-[38px] w-full rounded-xl border border-pri/50 text-pri text-[12.5px] font-medium hover:bg-pri hover:text-white transition-colors"
        >
          选择版师打版
        </button>
      )}
    </div>
  )

  /* ---------- 打版工作台（参照附件：选择版师后进入全屏打版页面） ---------- */
  if (studio) {
    return <PatternStudioPage master={studio} showToast={showToast} onExit={() => setStudio(null)} />
  }

  /* ---------- 详情视图 ---------- */
  if (detail) {
    const p = detail
    return (
      <div className="relative max-w-[1240px] mx-auto px-8 pt-8 pb-16">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setDetail(null)}
            title="返回版型库"
            className="w-9 h-9 rounded-full bg-panel border border-line flex items-center justify-center text-ink-2 hover:text-pri hover:border-pri/40 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-[20px] font-semibold text-ink flex items-center gap-2">
            {p.name}
            {p.rec && <span className="text-[10.5px] px-1.5 py-0.5 rounded bg-acc-soft text-acc border border-acc-line flex items-center gap-0.5"><Award className="w-3 h-3" />重点推荐</span>}
          </h1>
          {onBack && (
            <button
              onClick={onBack}
              className="ml-auto h-9 px-3.5 rounded-full bg-panel border border-line text-[12.5px] text-ink-2 hover:text-pri hover:border-pri/40 transition-colors inline-flex items-center gap-1.5 shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              返回首页
            </button>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-4">
          {/* 品牌款式图 */}
          <div className="rounded-2xl border border-line bg-panel overflow-hidden">
            <div className="px-4 py-2.5 text-[12px] text-mut border-b border-line-soft">品牌款式图</div>
            <img src={p.img} alt={p.name} className="w-full h-72 object-cover" />
          </div>
          {/* 3D 预览（WebGL 占位） */}
          <div className="rounded-2xl border border-line bg-panel overflow-hidden flex flex-col">
            <div className="px-4 py-2.5 text-[12px] text-mut border-b border-line-soft">3D 模型预览</div>
            <div className="flex-1 min-h-72 flex flex-col items-center justify-center gap-2 text-mut-2 bg-fill-2/60">
              <Box className="w-8 h-8 text-mut-3" />
              <span className="text-[12.5px]">3D 预览能力即将接入（WebGL）</span>
            </div>
          </div>
        </div>

        {/* 数据字段 */}
        <div className="mt-4 rounded-2xl border border-line bg-panel divide-y divide-line-soft">
          {([
            ['年度 / 季度', `${p.year} · ${p.quarter}`],
            ['历史销量', p.sales],
            ['面料说明', p.fabric],
            ['版型说明', p.patternNote],
            ['卖点说明', p.selling],
            ['推荐等级', p.rec ? '商品部门重点推荐' : '常规版型'],
          ] as [string, string][]).map(([k, v]) => (
            <div key={k} className="flex items-start gap-4 px-5 py-3.5 text-[13px]">
              <span className="w-24 shrink-0 text-mut">{k}</span>
              <span className="text-ink">{v}</span>
            </div>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={() => {
              pushProject(p, '复用版型')
              showToast(`已复用「${p.name}」，可在历史打版记录中查看`)
              setDetail(null)
            }}
            className="h-10 px-6 rounded-full border border-line bg-panel text-[13.5px] font-medium text-ink hover:border-pri/40 hover:text-pri transition-colors"
          >
            复用版型
          </button>
          <button
            onClick={() => {
              pushProject(p, '应用至当前设计')
              showToast(`已将「${p.name}」应用至当前设计（原型演示）`)
              setDetail(null)
            }}
            className="h-10 px-6 rounded-full bg-pri text-white text-[13.5px] font-medium hover:bg-pri/90 transition-colors"
          >
            应用至当前设计
          </button>
        </div>
      </div>
    )
  }

  /* ---------- 列表视图 ---------- */
  return (
    <div className="relative max-w-[1240px] mx-auto px-8 pt-8 pb-16">
      {/* ===== 品牌AI版师专属背景视觉（仅限此页面）：满屏从上到下由深到浅的暖粉渐变 + 悬浮柔光斑（参考附件图1的渐变颜色与逻辑） ===== */}
      {tab === 'brand' && (
        <div
          aria-hidden
          className="fixed inset-0 z-0 pointer-events-none overflow-hidden"
          style={{
            background:
              'linear-gradient(180deg, rgba(240,199,196,0.90) 0%, rgba(246,215,208,0.72) 30%, rgba(247,228,221,0.45) 58%, rgba(250,244,241,0.18) 82%, rgba(249,249,249,0) 100%)',
          }}
        >
          <div className="absolute -left-28 top-[34%] w-[460px] h-[460px] rounded-full blur-3xl opacity-70" style={{ background: 'radial-gradient(circle, rgba(128,152,255,0.55) 0%, transparent 70%)' }} />
          <div className="absolute right-[10%] top-[10%] w-[280px] h-[280px] rounded-full blur-3xl opacity-60" style={{ background: 'radial-gradient(circle, rgba(246,163,181,0.55) 0%, transparent 70%)' }} />
          <div className="absolute right-[24%] bottom-[4%] w-[480px] h-[480px] rounded-full blur-3xl opacity-50" style={{ background: 'radial-gradient(circle, rgba(198,160,240,0.5) 0%, transparent 70%)' }} />
        </div>
      )}
      <div className={tab === 'brand' ? 'relative z-10' : undefined}>
      {/* 顶栏：返回首页 与 胶囊导航同一行、垂直居中对齐 */}
      <div className="flex items-center">
        <div className="w-[132px] shrink-0 flex">
          {onBack && (
            <button
              onClick={onBack}
              className="h-9 px-3.5 rounded-full bg-panel border border-line text-[12.5px] text-ink-2 hover:text-pri hover:border-pri/40 transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              返回首页
            </button>
          )}
        </div>
        {/* 一级导航：平台AI版师 / 品牌AI版师 / 爆款版型库（居中主导航切换） */}
        <div className="flex-1 flex justify-center">
        <div className="inline-flex bg-panel border border-line rounded-full p-1.5 text-[14px] shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          {([
            ['platform', '平台AI版师'],
            ['brand', '品牌AI版师'],
            ['hot', '爆款版型库'],
          ] as const).map(([k, label]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`h-9 px-6 rounded-full transition-colors ${tab === k ? 'bg-ink text-panel font-medium shadow-sm' : 'text-ink-3 hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
          </div>
        </div>
        <div className="w-[132px] shrink-0" />
      </div>

      {/* ===== 版师 Tab：Hero 页头（大留白介绍区） + 版师卡片 ===== */}
      {(tab === 'platform' || tab === 'brand') && (
        <>
          <div className="mt-10 mb-4 text-center px-6">
            {/* 副导航：AI 版师基因打版 / AI 版师版型积累（新增）两个功能模块；仅品牌AI版师提供，平台AI版师不需要版型积累板块 */}
            {tab === 'brand' ? (
            <div className="inline-flex bg-fill rounded-full p-1 text-[13px]">
              {([
                ['gene', 'AI 版师基因打版'],
                ['accum', 'AI 版师版型积累'],
              ] as const).map(([k, label]) => (
                <button
                  key={k}
                  onClick={() => setMasterSub(k)}
                  className={`h-8 px-4 rounded-full transition-colors ${
                    masterSub === k ? 'bg-panel font-semibold text-ink shadow-sm' : 'text-mut hover:text-ink'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            ) : (
              <span className="inline-flex items-center h-7 px-3 rounded-full bg-pri-soft text-pri text-[12px] font-medium">
                AI 版师 · 基因打版
              </span>
            )}
            <div className="mt-5 flex items-center justify-center gap-5">
              {tab === 'brand' && (
                <div className="flex flex-col items-center select-none shrink-0 pr-5 border-r border-ink/15">
                  <span className="font-serif text-[15px] font-semibold tracking-[0.34em] text-ink pl-[0.34em]">YERAD</span>
                  <span className="mt-0.5 font-serif text-[22px] font-bold tracking-[0.24em] text-ink pl-[0.24em]">娅丽达</span>
                </div>
              )}
              <h2 className="text-[34px] font-bold text-ink tracking-wide leading-snug text-left">
                {tab === 'platform' ? (
                  <>平台 AI 版师，汇聚<span className="text-pri">官方版型智慧</span></>
                ) : (
                  <>品牌 AI 版师，你的<span className="text-pri">专属数字版师</span>团队</>
                )}
              </h2>
            </div>
            <p className="mt-4 text-[14px] text-mut leading-relaxed max-w-[580px] mx-auto">
              {tab === 'platform'
                ? '每一位平台版师都是资深真人版师的数字化分身，按品类专长沉淀版型经验，为你的设计输出稳定、可靠、可复用的打版方案。'
                : '基于品牌基因数据训练的专属数字版师，精准还原品牌调性与经典版型特征，随新季数据持续进化，长用长准。'}
            </p>
          </div>
          <div className="mt-8 grid grid-cols-4 gap-3.5">
            {masters.map(masterCard)}
            {!masters.length && <div className="col-span-4 py-14 text-center text-[12.5px] text-mut">该品类暂无{tab === 'platform' ? '平台' : '品牌'}版师</div>}
          </div>
        </>
      )}

      {/* ===== 爆款版型库 Tab ===== */}
      {tab === 'hot' && (
        <>
          {/* 页头：留白介绍区（简洁形式） */}
          <div className="mt-10 mb-2 px-1">
            <h2 className="text-[24px] font-bold text-ink tracking-wide">爆款版型库</h2>
            <p className="mt-2.5 text-[13.5px] text-mut leading-relaxed max-w-[560px]">
              汇聚历年市场验证的爆款裤装版型，每款附带电子 CAD 文件与完整数据档案，支持搜索、以图搜图与时间线浏览，一键复用至你的设计。
            </p>
          </div>
          {/* 搜索模块：大留白胶囊式（搜索框与图搜按钮等高 56px），输入需求 → 点击确认 → 检索结果排列显示 */}
          <div className="mt-8">
            <div className="flex items-center gap-3.5">
              <div className="flex-1 flex items-center gap-3 h-14 pl-5 pr-2 rounded-xl bg-panel border border-line shadow-[0_2px_12px_rgba(0,0,0,0.04)] focus-within:border-pri focus-within:ring-4 focus-within:ring-pri/10 transition-shadow">
                <Search className="w-[19px] h-[19px] text-mut-2 shrink-0" />
                <input
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') runTextSearch() }}
                  placeholder="搜索版型关键词：廓形 / 领型 / 袖型 / 面料 / 工艺…"
                  className="flex-1 min-w-0 bg-transparent outline-none text-[14px] placeholder:text-mut-3"
                />
                {qInput && (
                  <button onClick={clearSearch} title="清空" className="w-7 h-7 rounded-full text-mut-3 hover:text-ink hover:bg-fill flex items-center justify-center shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
                <span className="hidden xl:inline text-[11px] text-mut-3 shrink-0">共 {PATTERNS.length} 款爆款版型</span>
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
            {/* 检索结果：显示在搜索版块内，下方内容区保持完整版型库 */}
            {q && (
              <div className="mt-3 rounded-xl border border-line bg-panel p-4">
                <div className="flex items-center gap-1.5 text-[12.5px] text-mut">
                  <Sparkles className="w-3.5 h-3.5 text-pri shrink-0" />
                  <span>
                    为您找到 <span className="text-ink font-semibold">{searchResults.length}</span> 款与「{q}」相关的版型
                  </span>
                  <button onClick={clearSearch} className="ml-1 text-pri hover:underline inline-flex items-center gap-0.5 shrink-0">
                    <X className="w-3 h-3" />清除检索，查看全部
                  </button>
                </div>
                {searchResults.length > 0 ? (
                  <div className="mt-3 grid grid-cols-5 gap-3">
                    {searchResults.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          pushProject(p, '已完成')
                          setDetail(p)
                        }}
                        className={`rounded-2xl border bg-panel overflow-hidden text-left transition-all hover:shadow-[0_8px_24px_rgba(42,104,254,0.08)] ${
                          p.rec ? 'border-acc/50 ring-1 ring-acc/20' : 'border-line hover:border-pri/40'
                        }`}
                      >
                        <div className="relative">
                          <img src={p.img} alt={p.name} className="w-full h-28 object-cover" />
                          <span className="absolute left-2.5 top-2.5 h-6 px-2 rounded-full bg-black/55 backdrop-blur text-white text-[10.5px] inline-flex items-center gap-1">
                            <Box className="w-3 h-3" />3D
                          </span>
                          {p.rec && (
                            <span className="absolute right-2.5 top-2.5 h-6 px-2 rounded-full bg-[linear-gradient(135deg,#FFB13D_0%,#FF7A1A_100%)] text-white text-[10.5px] font-medium inline-flex items-center gap-1">
                              <Award className="w-3 h-3" />重点推荐
                            </span>
                          )}
                        </div>
                        <div className="p-3">
                          <div className="text-[12.5px] font-semibold text-ink truncate">{p.name}</div>
                          <div className="mt-1 flex items-center justify-between text-[10.5px]">
                            <span className="flex items-center gap-1 text-acc"><TrendingUp className="w-3 h-3" />{p.sales}</span>
                            <span className="text-mut-2 shrink-0">{p.year} · {p.quarter}</span>
                          </div>
                          <div className="mt-1.5 text-[11px] text-mut leading-relaxed line-clamp-1">{p.selling}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 py-8 text-center text-[12.5px] text-mut">未找到与「{q}」相关的版型，可换个关键词试试</div>
                )}
              </div>
            )}

            {/* 图搜工作区 */}
            {imgOpen && (
              <div className="mt-4 rounded-xl bg-panel border border-line p-4">
                <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
                  <Sparkles className="w-4 h-4 text-pri" />
                  AI 多因子图搜
                  <span className="text-[11.5px] text-mut-2 font-normal">上传参考图，AI 按权重维度比对版型库，返回相似度最高的前 6 款</span>
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
                      if (f) pickFile(f)
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
                            onClick={() => fileRef.current?.click()}
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
                    <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = '' }} />
                    <input ref={camRef} type="file" accept="image/*" capture="user" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = '' }} />
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
                      <span className="ml-auto text-[11px] text-mut-3">检索范围：全部 {PATTERNS.length} 款版型档案</span>
                    </div>
                  </div>
                </div>

                {/* 检索中 */}
                {searching && (
                  <div className="mt-4 rounded-xl border border-line bg-fill/40 px-4 py-5 flex items-center gap-3">
                    <Loader2 className="w-5 h-5 text-pri animate-spin shrink-0" />
                    <div>
                      <div className="text-[12.5px] font-medium text-ink">AI 引擎正在比对版型库…</div>
                      <div className="mt-0.5 text-[11.5px] text-mut-2">按预设权重多因子检索：廓形向量比对 → 领型 / 袖型结构分析 → 面料工艺特征匹配</div>
                    </div>
                  </div>
                )}

                {/* 检索结果：相似度 Top 3，降序 */}
                {matchResults && !searching && (
                  <div className="mt-4">
                    <div className="flex items-center gap-2 text-[12.5px] font-semibold text-ink">
                      相似度最高的 6 款版型
                      <span className="text-[11px] text-mut-3 font-normal">按相似度降序排列</span>
                      <button onClick={() => setMatchResults(null)} className="ml-auto text-[11.5px] text-mut-2 hover:text-ink">收起结果</button>
                    </div>
                    <div className="mt-2.5 grid grid-cols-3 gap-3">
                      {matchResults.map((r, i) => (
                        <button
                          key={r.p.id}
                          onClick={() => { pushProject(r.p, '已完成'); setDetail(r.p) }}
                          className="rounded-xl border border-line bg-panel overflow-hidden text-left transition-all hover:border-pri/50 hover:shadow-[0_8px_24px_rgba(42,104,254,0.10)]"
                        >
                          <div className="relative">
                            <img src={r.p.img} alt={r.p.name} className="w-full h-28 object-cover" />
                            <span className={`absolute left-2 top-2 h-6 px-2 rounded-full text-[11px] font-bold inline-flex items-center ${
                              i === 0 ? 'bg-[linear-gradient(135deg,#FFB13D_0%,#FF7A1A_100%)] text-white' : 'bg-black/55 backdrop-blur text-white'
                            }`}>
                              TOP {i + 1}
                            </span>
                          </div>
                          <div className="p-3">
                            <div className="flex items-baseline justify-between gap-2">
                              <span className="text-[12.5px] font-semibold text-ink truncate">{r.p.name}</span>
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

          {/* 年份时间线 + 排序（与搜索模块上方留白一致：32px） */}
          <div className="mt-8 flex items-center gap-2">
            <History className="w-4 h-4 text-mut-3 shrink-0" />
            {[0, ...YEARS].map((y) => (
              <button
                key={y}
                onClick={() => setYear(y)}
                className={`h-7 px-3 rounded-full text-[12px] transition-colors border ${
                  year === y ? 'bg-ink text-panel border-ink' : 'bg-panel text-ink-3 border-line hover:text-ink'
                }`}
              >
                {y === 0 ? '全部年份' : `${y} 年`}
              </button>
            ))}
            <div className="relative ml-auto">
              <button
                onClick={() => setSortOpen((v) => !v)}
                className="h-7 px-3 rounded-full border border-line bg-panel text-[12px] text-ink-3 flex items-center gap-1 hover:text-ink"
              >
                {sort === 'rec' ? '推荐优先' : sort === 'sales' ? '销量优先' : '最新优先'}
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
              {sortOpen && (
                <>
                  <div className="fixed inset-0 z-30" onClick={() => setSortOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 z-40 w-32 rounded-xl border border-line bg-panel shadow-lg py-1">
                    {([
                      ['rec', '推荐优先'],
                      ['sales', '销量优先'],
                      ['new', '最新优先'],
                    ] as const).map(([k, label]) => (
                      <button
                        key={k}
                        onClick={() => {
                          setSort(k)
                          setSortOpen(false)
                        }}
                        className={`w-full text-left px-3.5 h-8 text-[12.5px] hover:bg-fill ${sort === k ? 'text-pri font-medium' : 'text-ink-2'}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* 版型卡片 */}
          <div className="mt-4 grid grid-cols-5 gap-3">
            {patterns.map((p) => (
              <button
                key={p.id}
                onClick={() => {
                  pushProject(p, '已完成')
                  setDetail(p)
                }}
                className={`rounded-2xl border bg-panel overflow-hidden text-left transition-all hover:shadow-[0_8px_24px_rgba(42,104,254,0.08)] ${
                  p.rec ? 'border-acc/50 ring-1 ring-acc/20' : 'border-line hover:border-pri/40'
                }`}
              >
                <div className="relative">
                  <img src={p.img} alt={p.name} className="w-full h-28 object-cover" />
                  <span className="absolute left-2.5 top-2.5 h-6 px-2 rounded-full bg-black/55 backdrop-blur text-white text-[10.5px] inline-flex items-center gap-1">
                    <Box className="w-3 h-3" />3D
                  </span>
                  {p.rec && (
                    <span className="absolute right-2.5 top-2.5 h-6 px-2 rounded-full bg-[linear-gradient(135deg,#FFB13D_0%,#FF7A1A_100%)] text-white text-[10.5px] font-medium inline-flex items-center gap-1">
                      <Award className="w-3 h-3" />重点推荐
                    </span>
                  )}
                </div>
                <div className="p-3">
                  <div className="text-[12.5px] font-semibold text-ink truncate">{p.name}</div>
                  <div className="mt-1 flex items-center justify-between text-[10.5px]">
                    <span className="flex items-center gap-1 text-acc"><TrendingUp className="w-3 h-3" />{p.sales}</span>
                    <span className="text-mut-2 shrink-0">{p.year} · {p.quarter}</span>
                  </div>
                  <div className="mt-1.5 text-[11px] text-mut leading-relaxed line-clamp-1">{p.selling}</div>
                </div>
              </button>
            ))}
            {!patterns.length && <div className="col-span-5 py-14 text-center text-[12.5px] text-mut">没有匹配的版型</div>}
          </div>
        </>
      )}

      {/* ===== 最近项目：卡片式排列，按时间顺序（版型积累页不展示该模块） ===== */}
      {(tab !== 'brand' || masterSub === 'gene') && (
      <div className="mt-8">
        <div className="flex items-center gap-2 text-[15px] font-semibold text-ink">
          <History className="w-4 h-4 text-pri" />
          最近项目
          <span className="text-[11px] text-mut-2 font-normal">按时间顺序排列</span>
          <span className="text-[11px] text-mut-2 font-normal ml-auto">最近打版项目自动保存，跨设备同步</span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-3.5">
          {projects.map((h) => (
            <button
              key={h.id}
              onClick={() => showToast(`打开项目「${h.name}」（原型演示）`)}
              className="rounded-2xl border border-line bg-panel overflow-hidden text-left transition-all hover:border-pri/40 hover:shadow-[0_8px_24px_rgba(42,104,254,0.08)]"
            >
              <div className="relative">
                <img src={h.img} alt={h.name} className="w-full aspect-[4/3] object-cover" />
                <span className="absolute left-2.5 top-2.5 h-[22px] px-2 rounded-full bg-black/55 backdrop-blur text-white text-[10.5px] font-medium inline-flex items-center">
                  {h.status}
                </span>
              </div>
              <div className="p-3.5">
                <div className="text-[12.5px] font-medium text-ink truncate">{h.name}</div>
                <div className="text-[10.5px] text-mut-2 mt-1">{h.master} · {h.time}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
      )}

      {/* ===== 版型积累：上传 CAD 版型弹窗（版师上传自有 CAD 版片，沉淀进版型积累库） ===== */}
      {uploadMaster && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-6" onClick={() => setUploadMaster(null)}>
          <div className="w-[520px] bg-panel rounded-2xl border border-line shadow-[0_24px_64px_rgba(0,0,0,0.18)] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center">
              <div>
                <h3 className="text-[17px] font-bold text-ink">上传 CAD 版型</h3>
                <p className="mt-0.5 text-[12px] text-mut">{uploadMaster.name} · {uploadMaster.title}，上传自有 CAD 版片至版型积累库</p>
              </div>
              <button
                onClick={() => setUploadMaster(null)}
                title="关闭"
                className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center text-mut hover:bg-fill hover:text-ink transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-5">
              <div className="text-[12.5px] font-medium text-ink-2 mb-1.5">版型名称</div>
              <input
                value={cadName}
                onChange={(e) => setCadName(e.target.value)}
                placeholder="如：高腰直筒裤基础版"
                className="w-full h-10 px-3.5 rounded-lg bg-fill outline-none text-[13px] placeholder:text-mut-3 focus:ring-2 focus:ring-pri/15"
              />
            </div>

            <div
              onClick={() => cadFileRef.current?.click()}
              className="mt-4 h-[150px] rounded-xl border border-dashed border-line-strong bg-panel flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-pri/50 transition-colors"
            >
              <Upload className="w-6 h-6 text-mut" />
              <div className="text-[14px] font-semibold text-ink">{cadFile || '选择 CAD 版片文件'}</div>
              <div className="text-[12px] text-mut-2">支持 DXF / PLT / ASTM 等 CAD 版片格式，或包含版片的 zip 包。</div>
              <input
                ref={cadFileRef}
                type="file"
                accept=".dxf,.plt,.astm,.zip,.cad"
                className="hidden"
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  setCadFile(e.target.files?.[0]?.name ?? '')
                  e.target.value = ''
                }}
              />
            </div>

            <button
              onClick={() => {
                showToast(`已将「${cadName.trim() || uploadMaster.title + '版型'}」上传至版型积累库，审核通过后可被智能打版调用`)
                setUploadMaster(null)
              }}
              className="mt-5 h-10 w-full rounded-xl bg-pri text-white text-[13.5px] font-medium hover:bg-pri/90 transition-colors inline-flex items-center justify-center gap-1.5"
            >
              <Upload className="w-4 h-4" />
              上传版型
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}
