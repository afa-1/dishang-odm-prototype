import { useEffect, useRef, useState } from 'react'
import {
  ArrowLeft, Bot, ChevronDown, ChevronUp, Download, DraftingCompass, Expand, FileText, Info,
  Maximize2, MoreHorizontal, MousePointer2, PanelLeftClose, PanelRightClose, PanelRightOpen, Plus, Pocket, Redo2, RefreshCw,
  RotateCcw, Rows3, Scissors, Send, Sparkles, Spline, SplitSquareHorizontal, Undo2, Waves,
} from 'lucide-react'
import CraftSheetFlow from './CraftSheet'

/* ============================================================
   AI 打版工作台（参照附件还原：设计 / 打版双模式编辑器）
   - 设计模式：左侧部件库 + 中央款式画布 + 右侧服装参数 + 底部工具栏
   - 打版模式：左侧打版 Agent + 中央 CAD 版片区（可编辑/对齐）+ 右侧参数栏
   ============================================================ */

interface StudioMaster {
  name: string
  photo: string
  title: string
  isBrand?: boolean
}

/* ---------- 款式 SVG：直筒裤正面技术图 ---------- */
const Trousers = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 300 560" className={className}>
    <path
      d="M70,20 L230,20 C236,60 240,95 242,132 L236,540 L186,540 L150,178 L114,540 L64,540 L58,132 C60,95 64,60 70,20 Z"
      fill="#F1F2F4" stroke="#C6CAD2" strokeWidth="1.6"
    />
    <line x1="70" y1="46" x2="230" y2="46" stroke="#C6CAD2" strokeWidth="1.2" />
    <path d="M150,46 C150,86 134,116 150,178" fill="none" stroke="#9AA0AA" strokeWidth="1.2" strokeDasharray="4 4" />
    <path d="M228,52 C212,62 204,88 205,112" fill="none" stroke="#9AA0AA" strokeWidth="1.2" strokeDasharray="4 4" />
    <line x1="98" y1="62" x2="92" y2="528" stroke="#D8DBE0" strokeWidth="1" strokeDasharray="2 4" />
    <line x1="202" y1="62" x2="208" y2="528" stroke="#D8DBE0" strokeWidth="1" strokeDasharray="2 4" />
    <line x1="64" y1="528" x2="114" y2="528" stroke="#C6CAD2" strokeWidth="1" />
    <line x1="186" y1="528" x2="236" y2="528" stroke="#C6CAD2" strokeWidth="1" />
  </svg>
)

/* ---------- 版片 SVG（CAD 区复用） ---------- */
const WaistbandArc = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 220 70" className={className ?? 'w-44'}>
    <path d="M24,56 C64,22 156,22 196,56 L186,38 C148,12 72,12 34,38 Z" fill="#FFFBF2" stroke="#E8A83C" strokeWidth="1.8" />
    <line x1="62" y1="27" x2="62" y2="34" stroke="#9AA0AA" strokeWidth="1" />
    <line x1="158" y1="27" x2="158" y2="34" stroke="#9AA0AA" strokeWidth="1" />
    <line x1="110" y1="14" x2="110" y2="44" stroke="#E4572E" strokeWidth="1.5" />
    <path d="M110,50 L106,40 L114,40 Z" fill="#E4572E" />
  </svg>
)

const LegPanel = ({ back = false, className }: { back?: boolean; className?: string }) => (
  <svg viewBox="0 0 92 250" className={className ?? 'h-60'}>
    <path
      d={
        back
          ? 'M8,20 C24,8 48,2 68,8 C78,12 84,18 86,26 C86,80 82,136 78,190 L74,240 L18,240 C14,170 4,96 8,20 Z'
          : 'M14,20 C28,10 48,6 64,10 L78,16 C80,72 76,132 72,188 L68,240 L20,240 C16,170 10,94 14,20 Z'
      }
      fill="#FFFBF2" stroke="#E8A83C" strokeWidth="1.8"
    />
    <path d="M12,48 L80,46" stroke="#9AA0AA" strokeWidth="1" />
    {back && <path d="M8,20 C20,34 30,44 44,50" fill="none" stroke="#9AA0AA" strokeWidth="1" strokeDasharray="3 3" />}
    <line x1="46" y1="72" x2="46" y2="216" stroke="#E4572E" strokeWidth="1.5" />
    <path d="M46,62 L42,74 L50,74 Z" fill="#E4572E" />
    <path d="M46,226 L42,216 L50,216 Z" fill="#E4572E" />
    <path d="M22,240 L70,240" stroke="#9AA0AA" strokeWidth="1" />
  </svg>
)

const SmallPiece = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 28 72" className={className ?? 'h-12'}>
    <rect x="5" y="4" width="18" height="64" rx="2" fill="#FFFBF2" stroke="#E8A83C" strokeWidth="1.8" />
    <line x1="14" y1="14" x2="14" y2="52" stroke="#E4572E" strokeWidth="1.4" />
    <path d="M14,60 L11,52 L17,52 Z" fill="#E4572E" />
  </svg>
)

/* ---------- 部件缩略图 ---------- */
const PartThumb = ({ shape }: { shape: string }) => {
  const stroke = '#8A8F99'
  const common = { fill: 'none', stroke, strokeWidth: 1.6, strokeLinejoin: 'round' as const }
  return (
    <svg viewBox="0 0 48 48" className="w-9 h-9">
      {shape === 'placket' && <rect x="19" y="7" width="10" height="34" rx="1.5" {...common} />}
      {shape === 'pocket-square' && <rect x="10" y="10" width="28" height="28" rx="1.5" {...common} />}
      {shape === 'pocket-shield' && <path d="M10,10 H38 V30 L24,40 L10,30 Z" {...common} />}
      {shape === 'pocket-round' && <path d="M10,10 H38 V26 A14,14 0 0 1 10,26 Z" {...common} />}
      {shape === 'pocket-angle' && <path d="M10,12 H38 V34 L20,40 H10 Z" {...common} />}
      {shape === 'loop-bar' && <rect x="20" y="6" width="8" height="36" rx="1.5" {...common} />}
      {shape === 'loop-v' && <path d="M12,8 L18,40 M36,8 L30,40" {...common} />}
      {shape === 'loop-x' && <path d="M14,8 L34,40 M34,8 L14,40" {...common} />}
      {shape === 'loop-double' && <path d="M17,6 V42 M31,6 V42 M17,6 H31 M17,42 H31" {...common} />}
      {shape === 'flap-square' && <path d="M8,14 H40 V34 H8 Z M8,20 H40" {...common} />}
      {shape === 'flap-round' && <path d="M8,14 H40 V26 A16,10 0 0 1 8,26 Z M8,20 H40" {...common} />}
      {shape === 'flap-point' && <path d="M8,14 H40 V26 L24,38 L8,26 Z M8,20 H40" {...common} />}
      {shape.startsWith('sil-') && (
        <path
          d={
            shape === 'sil-straight'
              ? 'M16,6 H32 L34,42 H26 L24,18 L22,42 H14 Z'
              : shape === 'sil-taper'
                ? 'M16,6 H32 L36,42 H28 L24,18 L20,42 H12 Z'
                : shape === 'sil-wide'
                  ? 'M15,6 H33 L38,42 H27 L24,18 L21,42 H10 Z'
                  : 'M17,6 H31 L33,30 L37,42 H26 L24,18 L22,42 H11 L15,30 Z'
          }
          {...common}
        />
      )}
      {shape.startsWith('fabric-') && <rect x="6" y="6" width="36" height="36" rx="3" fill={shape.slice(7)} stroke="#D8DBE0" />}
    </svg>
  )
}

/* ---------- 设计模式：库数据 ---------- */
const PART_TABS = [
  { id: 'sil', label: '廓形库' },
  { id: 'fabric', label: '面料库' },
  { id: 'parts', label: '部件库' },
] as const
type PartTab = (typeof PART_TABS)[number]['id']

const PART_SECTIONS: { id: string; label: string; shapes: string[] }[] = [
  { id: 'placket', label: '门襟', shapes: ['placket'] },
  { id: 'pocket', label: '贴袋', shapes: ['pocket-square', 'pocket-shield', 'pocket-round', 'pocket-angle'] },
  { id: 'loop', label: '裤耳', shapes: ['loop-bar', 'loop-v', 'loop-x', 'loop-double'] },
  { id: 'flap', label: '袋盖', shapes: ['flap-square', 'flap-round', 'flap-point'] },
]
const SIL_SHAPES = ['sil-straight', 'sil-taper', 'sil-wide', 'sil-flare']
const SIL_NAMES = ['直筒', '锥形', '阔腿', '微喇']
const FABRICS = [
  ['#D9C7A7', '卡其斜纹'], ['#8A97A8', '灰蓝牛仔'], ['#3E4A5C', '深藏青'], ['#B9BDC6', '浅灰毛呢'],
  ['#6E5B4A', '咖啡灯芯绒'], ['#20242B', '纯黑涤纶'], ['#C5D3C0', '豆绿棉麻'], ['#E5E0D5', '米白帆布'],
] as const

const TOOLS = [
  { id: 'select', label: '选择', Icon: MousePointer2 },
  { id: 'cut', label: '剪接线', Icon: Scissors },
  { id: 'dart', label: '省褶', Icon: Spline },
  { id: 'pocket', label: '斜口袋', Icon: Pocket },
  { id: 'stitch', label: '压线', Icon: Rows3 },
  { id: 'elastic', label: '松紧带', Icon: Waves },
  { id: 'more', label: '更多', Icon: MoreHorizontal },
]

/* ---------- 打版模式：CAD 版片对象 ---------- */
interface Piece {
  id: string
  kind: 'waist' | 'leg' | 'legBack' | 'small'
  label: string
  size: string
  x: number
  y: number
  w: number
  h: number
}
const INIT_PIECES: Piece[] = [
  { id: 'w1', kind: 'waist', label: '腰头 · 前', size: '75.7 × 9.0', x: 110, y: 44, w: 190, h: 60 },
  { id: 'w2', kind: 'waist', label: '腰头 · 后', size: '75.7 × 9.0', x: 360, y: 44, w: 190, h: 60 },
  { id: 'f1', kind: 'leg', label: '前裤片 L', size: '62.1 × 102', x: 96, y: 150, w: 88, h: 240 },
  { id: 'f2', kind: 'leg', label: '前裤片 R', size: '62.1 × 102', x: 214, y: 150, w: 88, h: 240 },
  { id: 'b1', kind: 'legBack', label: '后裤片 L', size: '66.2 × 102', x: 332, y: 150, w: 88, h: 240 },
  { id: 'b2', kind: 'legBack', label: '后裤片 R', size: '66.2 × 102', x: 450, y: 150, w: 88, h: 240 },
  { id: 's1', kind: 'small', label: '门襟', size: '4.0 × 18.5', x: 214, y: 428, w: 28, h: 72 },
  { id: 's2', kind: 'small', label: '袋盖', size: '12.0 × 5.5', x: 270, y: 428, w: 28, h: 72 },
]

/* ---------- 打版模式：参数栏（附件二） ---------- */
interface ParamField {
  id: string
  label: string
  unit?: string
  lock?: boolean
}
const DESIGN_ROWS_TOP: ParamField[][] = [
  [{ id: 'waist', label: '腰围' }, { id: 'hip', label: '臀围' }],
  [{ id: 'length', label: '裤长' }, { id: 'hem', label: '脚口' }],
  [{ id: 'rise', label: '腰高' }, { id: 'knee', label: '膝围', lock: true }],
]
const STRUCT_FIELDS: ParamField[] = [
  { id: 'seamW', label: '腰围拼缝处尺寸', lock: true },
  { id: 'frontDrop', label: '前中下降' },
]
const DETAIL_FIELDS: ParamField[] = [
  { id: 'hipDiff', label: '臀围前后差' },
  { id: 'hipAngle', label: '后臀围角度极限', unit: '°' },
  { id: 'crotchDrop', label: '落裆差' },
  { id: 'frontRatio', label: '前龙门比例', unit: '' },
]
const INIT_PARAMS: Record<string, string> = {
  waist: '70.0', hip: '94.0', length: '102.0', hem: '48.0', rise: '0.0', knee: '52.0',
  thigh: '62.1', gate: '76.4', crotch: '28.0',
  seamW: '75.7', frontDrop: '1.0', hipDiff: '2.000', hipAngle: '4.084', crotchDrop: '0.5', frontRatio: '0.24',
}

/* ---------- 打版 Agent：消息模型 ---------- */
type ChatItem = { kind: 'user' | 'ai'; text: string }
const QUICK_CMDS = ['腰围放大 2cm', '臀围加 1cm 放松量', '裤长减 3cm', '重新自动排版']
const PARAM_LABEL: Record<string, string> = {
  waist: '腰围', hip: '臀围', length: '裤长', hem: '脚口', knee: '膝围', thigh: '大腿围', crotch: '立裆深',
}

/* ============================================================ */
export default function PatternStudioPage({
  master,
  showToast,
  onExit,
}: {
  master: StudioMaster
  showToast: (m: string) => void
  onExit: () => void
}) {
  const [mode, setMode] = useState<'design' | 'pattern'>('design')
  /* —— 设计模式状态 —— */
  const [leftTab, setLeftTab] = useState<PartTab>('parts')
  const [leftVisible, setLeftVisible] = useState(true)
  const [openSecs, setOpenSecs] = useState<Record<string, boolean>>({ placket: true, pocket: true, loop: true, flap: true })
  const [tool, setTool] = useState('select')
  /* —— 共享参数（设计 / 打版两侧联动） —— */
  const [smart, setSmart] = useState(true)
  const [params, setParams] = useState(INIT_PARAMS)
  const [locks, setLocks] = useState<Record<string, boolean>>({ knee: true, thigh: true, crotch: true, seamW: true })
  const [crotchType, setCrotchType] = useState<'立裆深' | '前后浪'>('立裆深')
  const [thighMode, setThighMode] = useState<'大腿围' | '龙门总宽度'>('大腿围')
  const [waistType, setWaistType] = useState<'弧腰头' | '直腰头'>('弧腰头')
  const [paramOpen, setParamOpen] = useState<Record<string, boolean>>({ design: true, struct: true, detail: true })
  /* —— 打版模式：CAD 区 —— */
  const [pieces, setPieces] = useState<Piece[]>(INIT_PIECES)
  const [zoom, setZoom] = useState(1)
  const [regenerating, setRegenerating] = useState(false)
  const [paramCollapsed, setParamCollapsed] = useState(false) // 参数栏收起：收起后仅显示导航区
  /* —— 打版模式：Agent —— */
  const [chat, setChat] = useState<ChatItem[]>([
    { kind: 'ai', text: '你好，我是打版 Agent，专为版片编辑定制。\n你可以直接下达指令，例如「腰围放大 2cm」「重新自动排版」，我会同步修改参数并更新 CAD 区的版片。' },
  ])
  const [chatInput, setChatInput] = useState('')
  const [fileName, setFileName] = useState('AI打版文件') // 文件卡并入 Agent 面板头：点击可重命名
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [agentOpen, setAgentOpen] = useState(true) // Agent 面板收起（沿用导航栏折叠交互）
  const [outOpen, setOutOpen] = useState(false) // 顶栏「生产输出」分组下拉
  const [craftOpen, setCraftOpen] = useState(false) // 创建工艺单流程（选择款式图 → 工艺单文件）
  const [chatBusy, setChatBusy] = useState(false)
  const chatRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<number[]>([])
  useEffect(() => () => timersRef.current.forEach((t) => window.clearTimeout(t)), [])
  useEffect(() => {
    chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight, behavior: 'smooth' })
  }, [chat, chatBusy])

  const later = (fn: () => void, ms: number) => timersRef.current.push(window.setTimeout(fn, ms))
  const commitName = () => {
    const v = nameDraft.trim()
    if (v) setFileName(v)
    setRenaming(false)
  }
  const shortName = master.name.replace(/数字版师|（.*?）/g, '')
  const toggleSec = (id: string) => setOpenSecs((s) => ({ ...s, [id]: !s[id] }))

  /* ---------- 顶栏动作 ---------- */
  const regenerate = () => {
    setRegenerating(true)
    later(() => {
      setRegenerating(false)
      setMode('pattern')
      showToast('版片已按当前参数重新生成')
    }, 1200)
  }
  const swapFabric = () => {
    setMode('design')
    setLeftVisible(true)
    setLeftTab('fabric')
    showToast('已打开面料库，点击面料即可替换')
  }

  /* ---------- CAD：自动排版 ---------- */
  const autoLayout = () => setPieces(INIT_PIECES.map((p) => ({ ...p })))

  /* ---------- 打版 Agent：指令解析 → 改参数 + 更新 CAD ---------- */
  const applyCommand = (text: string, reply: (msg: string) => void) => {
    // 排版类指令
    if (/排版|对齐|整理|复位/.test(text)) {
      setRegenerating(true)
      later(() => {
        autoLayout()
        setRegenerating(false)
        reply('已完成自动排版：8 片版片按前片 → 后片 → 腰头 → 小部件的顺序重新排列，间距与丝缕方向已对齐。')
      }, 800)
      return
    }
    // 尺寸类指令：关键词 + 数值 + 方向
    const kw = (Object.keys(PARAM_LABEL) as (keyof typeof PARAM_LABEL)[]).find((k) => text.includes(PARAM_LABEL[k]))
    const num = text.match(/(\d+(?:\.\d+)?)/)
    if (kw && num) {
      const delta = parseFloat(num[1])
      const isSet = /设为|调到|改为|=/.test(text)
      const isDown = /减|缩小|减少|降低|-/.test(text)
      const oldV = parseFloat(params[kw]) || 0
      const newV = isSet ? delta : Math.max(0, oldV + (isDown ? -delta : delta))
      setParams((p) => ({ ...p, [kw]: newV.toFixed(1) }))
      setRegenerating(true)
      later(() => {
        setRegenerating(false)
        reply(
          `已完成：${PARAM_LABEL[kw]} ${oldV.toFixed(1)} → ${newV.toFixed(1)} cm。\n相关版片（${kw === 'waist' ? '腰头、裤片腰线' : kw === 'hip' ? '前后裤片臀围线' : kw === 'length' ? '前后裤片' : kw === 'crotch' ? '前后裤片裆部' : '前后裤片'}）已同步更新，右侧参数栏可继续微调。`,
        )
      }, 900)
      return
    }
    reply(
      `已收到指令「${text}」。\n我目前支持尺寸调整（腰围 / 臀围 / 裤长 / 脚口 / 膝围 / 大腿围 / 立裆深）与「重新自动排版」，例如「腰围放大 2cm」，下达后我会同步更新 CAD 区版片与右侧参数。`,
    )
  }

  const sendChat = (preset?: string) => {
    const text = (preset ?? chatInput).trim()
    if (!text || chatBusy) return
    setChat((c) => [...c, { kind: 'user', text }])
    setChatInput('')
    setChatBusy(true)
    later(() => {
      applyCommand(text, (msg) => {
        setChat((c) => [...c, { kind: 'ai', text: msg }])
        setChatBusy(false)
      })
    }, 500)
  }

  /* ---------- 设计模式：左库内容 ---------- */
  const leftBody = () => {
    if (leftTab === 'sil') {
      return (
        <div className="p-4 grid grid-cols-4 gap-2">
          {SIL_SHAPES.map((s, i) => (
            <button
              key={s}
              onClick={() => showToast(`已切换「${SIL_NAMES[i]}」廓形`)}
              className="aspect-square rounded-lg bg-fill border border-line-soft flex flex-col items-center justify-center gap-1 hover:border-pri/50 transition-colors"
            >
              <PartThumb shape={s} />
              <span className="text-[10px] text-mut">{SIL_NAMES[i]}</span>
            </button>
          ))}
        </div>
      )
    }
    if (leftTab === 'fabric') {
      return (
        <div className="p-4 grid grid-cols-4 gap-2">
          {FABRICS.map(([c, n]) => (
            <button
              key={n}
              onClick={() => showToast(`已替换面料「${n}」`)}
              className="aspect-square rounded-lg bg-fill border border-line-soft flex flex-col items-center justify-center gap-1 hover:border-pri/50 transition-colors"
            >
              <PartThumb shape={`fabric-${c}`} />
              <span className="text-[10px] text-mut">{n}</span>
            </button>
          ))}
        </div>
      )
    }
    return (
      <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
        {PART_SECTIONS.map((sec) => (
          <div key={sec.id} className="border-b border-line-soft last:border-0">
            <button
              onClick={() => toggleSec(sec.id)}
              className="w-full flex items-center justify-between px-4 h-11 text-[13.5px] font-semibold text-ink"
            >
              {sec.label}
              <ChevronUp className={`w-4 h-4 text-mut-2 transition-transform ${openSecs[sec.id] ? '' : 'rotate-180'}`} />
            </button>
            {openSecs[sec.id] && (
              <div className="px-4 pb-4 grid grid-cols-4 gap-2">
                {sec.shapes.map((sh, i) => (
                  <button
                    key={sh}
                    onClick={() => showToast(`已添加「${sec.label} ${String(i + 1).padStart(2, '0')}」到设计`)}
                    className="aspect-square rounded-lg bg-fill border border-line-soft flex items-center justify-center hover:border-pri/50 transition-colors"
                  >
                    <PartThumb shape={sh} />
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    )
  }

  /* ---------- 参数字段（设计 / 打版右栏共用渲染） ---------- */
  const renderField = (f: ParamField) => (
    <div key={f.id}>
      <div className="flex items-center gap-1 text-[12px] text-mut mb-1.5">
        {f.label}
        <Info className="w-3 h-3 text-mut-3" />
        {f.lock && (
          <button
            onClick={() => setLocks((l) => ({ ...l, [f.id]: !l[f.id] }))}
            title={locks[f.id] ? '解锁后由 AI 联动计算' : '锁定该参数'}
            className={`w-3.5 h-3.5 rounded-full border-2 transition-colors ${locks[f.id] ? 'border-pri bg-pri/15' : 'border-line-strong hover:border-mut'}`}
          />
        )}
      </div>
      <div className="relative">
        <input
          value={params[f.id]}
          disabled={f.lock && locks[f.id]}
          onChange={(e) => setParams((p) => ({ ...p, [f.id]: e.target.value }))}
          className={`w-full h-10 rounded-lg bg-fill pl-3 pr-9 text-[13px] text-ink outline-none focus:ring-1 focus:ring-pri ${f.lock && locks[f.id] ? 'opacity-50' : ''}`}
        />
        {f.unit !== '' && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-mut-3">{f.unit ?? 'cm'}</span>}
      </div>
    </div>
  )

  const SegRow = ({
    label,
    options,
    value,
    onChange,
  }: {
    label: string
    options: string[]
    value: string
    onChange: (v: string) => void
  }) => (
    <div>
      <div className="text-[12px] text-mut mb-1.5">{label}</div>
      <div className="rounded-lg bg-fill p-0.5 flex">
        {options.map((o) => (
          <button
            key={o}
            onClick={() => onChange(o)}
            className={`flex-1 h-8 rounded-md text-[11.5px] transition-colors whitespace-nowrap ${
              value === o ? 'bg-panel font-medium text-ink border border-line' : 'text-mut'
            }`}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  )

  const DESIGN_PANEL_FIELDS: ParamField[] = [
    { id: 'waist', label: '腰围' }, { id: 'hip', label: '臀围' },
    { id: 'length', label: '裤长' }, { id: 'hem', label: '脚口' },
    { id: 'thigh', label: '大腿围', lock: true }, { id: 'rise', label: '腰高' },
    { id: 'knee', label: '膝围', lock: true },
  ]

  /* ---------- 导航区（设计 / 打版两模式的右侧合并卡片共用） ---------- */
  const navSection = (
              <div className={`px-3 pt-3 pb-3 shrink-0 ${paramCollapsed ? '' : 'border-b border-line-soft'}`}>
                <div className="flex items-center gap-1.5">
                  {/* 收起/展开参数栏：置于卡片最左侧 */}
                  <button
                    title={paramCollapsed ? '展开参数栏' : '收起参数栏'}
                    onClick={() => setParamCollapsed((v) => !v)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-mut hover:text-ink hover:bg-fill transition-colors shrink-0"
                  >
                    {paramCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
                  </button>
                  {/* 换面料：与收起按钮一致的图标交互形式（方形无边框，悬停 tooltip 显示名称） */}
                  <button
                    onClick={swapFabric}
                    title="换面料"
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-mut hover:text-ink hover:bg-fill transition-colors shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                  {/* 生产输出：工艺单 / 放码 / 下载 按功能分组收纳 */}
                  <div className="relative shrink-0">
                    <button
                      onClick={() => setOutOpen((v) => !v)}
                      className={`h-8 px-2.5 rounded-full bg-panel border text-[12px] inline-flex items-center gap-1 transition-colors ${
                        outOpen ? 'border-pri/60 text-pri' : 'border-line text-ink hover:border-pri/50 hover:text-pri'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      生产输出
                      <ChevronDown className={`w-3 h-3 transition-transform ${outOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {outOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setOutOpen(false)} />
                        <div className="absolute right-0 top-full mt-1.5 z-40 w-44 rounded-xl border border-line bg-panel py-1">
                          {([
                            ['创建工艺单', FileText, ''],
                            ['一键放码', Expand, '已生成 S / M / L / XL 全码版片'],
                            ['下载生产文件', Download, '生产文件打包下载中（原型演示）'],
                          ] as const).map(([label, Icon, msg]) => (
                            <button
                              key={label}
                              onClick={() => {
                                setOutOpen(false)
                                if (label === '创建工艺单') setCraftOpen(true)
                                else showToast(msg)
                              }}
                              className="w-full px-3.5 h-9 text-left text-[12.5px] text-ink-2 hover:bg-fill flex items-center gap-2"
                            >
                              <Icon className="w-4 h-4 text-mut" />
                              {label}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                  {/* 重新生成版片：并入首行，填满剩余空间 */}
                  <button
                    onClick={regenerate}
                    disabled={regenerating}
                    className="flex-1 h-8 rounded-lg bg-ink text-panel text-[12px] font-medium inline-flex items-center justify-center gap-1.5 hover:opacity-85 transition-opacity disabled:opacity-60 whitespace-nowrap"
                  >
                    {regenerating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    重新生成版片
                  </button>
                </div>
              </div>
  )

  /* ---------- 渲染 ---------- */
  return (
    <div
      className={`relative h-screen w-screen bg-cvs overflow-hidden select-none flex flex-col ${
        mode === 'design' ? 'p-3 gap-3' : ''
      }`}
    >
      {/* ===== 顶栏 ===== */}
      <div className={mode === 'pattern'
        ? 'absolute inset-x-4 top-4 z-30 flex items-center justify-center pointer-events-none'
        : 'absolute inset-x-3 top-3 z-30 flex items-center justify-center pointer-events-none'}>
        <div className="h-11 rounded-full bg-panel border border-line p-1 flex items-center shrink-0 pointer-events-auto">
          {([
            ['design', '设计', Scissors],
            ['pattern', '打版', DraftingCompass],
          ] as const).map(([k, label, Icon]) => (
            <button
              key={k}
              onClick={() => setMode(k)}
              className={`h-9 px-5 rounded-full inline-flex items-center gap-1.5 text-[13.5px] transition-colors ${
                mode === k ? 'bg-fill font-semibold text-ink' : 'text-mut hover:text-ink'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

      </div>

      {/* ===== 主体 ===== */}
      <div className={`flex-1 min-h-0 ${mode === 'design' ? 'flex gap-3' : 'relative'}`}>
        {mode === 'design' ? (
          <>
            {/* 左：文件头 + 库面板 合并卡片（沿用打版页 Agent 卡片聚合形式：Logo 承载返回、文件名可重命名、右侧收起/刷新） */}
            <div className={`w-[300px] shrink-0 rounded-2xl bg-panel border border-line flex flex-col overflow-hidden ${leftVisible ? '' : 'self-start'}`}>
              {/* 文件头 */}
              <div className="px-3 pt-3 pb-2.5 border-b border-line-soft shrink-0">
                <div className="flex items-center gap-2">
                  <button
                    onClick={onExit}
                    title="返回AI版师"
                    className="w-7 h-7 rounded-lg bg-pri text-white flex items-center justify-center shrink-0 hover:bg-pri-hover transition-colors"
                  >
                    <DraftingCompass className="w-4 h-4" />
                  </button>
                  {renaming ? (
                    <input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitName()
                        if (e.key === 'Escape') setRenaming(false)
                      }}
                      onBlur={commitName}
                      className="flex-1 min-w-0 h-7 rounded-md border border-pri bg-panel px-1.5 text-[13.5px] font-bold text-ink outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => { setNameDraft(fileName); setRenaming(true) }}
                      title="点击重命名文件"
                      className="flex-1 min-w-0 text-left text-[13.5px] font-bold text-ink truncate hover:text-pri transition-colors"
                    >
                      {fileName}
                    </button>
                  )}
                  <button title="刷新" onClick={() => showToast('文件已刷新')} className="w-7 h-7 rounded-lg flex items-center justify-center text-mut hover:text-ink hover:bg-fill transition-colors shrink-0">
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                  <button
                    title={leftVisible ? '收起库面板' : '展开库面板'}
                    onClick={() => setLeftVisible((v) => !v)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-mut hover:text-ink hover:bg-fill transition-colors shrink-0"
                  >
                    <PanelLeftClose className={`w-4 h-4 transition-transform ${leftVisible ? '' : 'rotate-180'}`} />
                  </button>
                </div>
              </div>
              {leftVisible && (
              <>
                <div className="flex items-center gap-5 px-4 border-b border-line-soft shrink-0">
                  {PART_TABS.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setLeftTab(t.id)}
                      className={`relative h-11 text-[13.5px] transition-colors ${
                        leftTab === t.id ? 'font-semibold text-ink' : 'text-mut hover:text-ink'
                      }`}
                    >
                      {t.label}
                      {leftTab === t.id && <span className="absolute -bottom-px left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-ink" />}
                    </button>
                  ))}
                </div>
                {leftBody()}
              </>
              )}
            </div>

            {/* 中：款式画布 */}
            <div className="relative flex-1 min-w-0 rounded-2xl flex items-center justify-center">
              <Trousers className="h-[88%]" />
              <div className="absolute left-5 top-6 flex flex-col items-start gap-4">
                <div className="flex flex-col items-center gap-1.5">
                  {master.isBrand ? (
                    <span className="w-11 h-11 rounded-full flex items-center justify-center font-serif text-[13px] font-bold text-ink border-2 border-panel select-none" style={{ background: 'linear-gradient(160deg, #F3D3D0, #F9E9E4)' }}>娅</span>
                  ) : (
                    <img src={master.photo} alt={master.name} className="w-11 h-11 rounded-full object-cover border-2 border-panel" />
                  )}
                  <span className="h-6 px-2.5 rounded-full bg-panel border border-line text-[11px] text-pri inline-flex items-center">{shortName}师傅</span>
                </div>
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    onClick={() => showToast('上传参考图（原型演示）')}
                    className="w-11 h-11 rounded-full bg-panel border border-line flex items-center justify-center text-mut hover:text-pri hover:border-pri/50 transition-colors"
                  >
                    <Plus className="w-5 h-5" />
                  </button>
                  <span className="h-6 px-2.5 rounded-full bg-panel border border-line text-[11px] text-mut inline-flex items-center">参考图</span>
                </div>
              </div>
              <div className="absolute right-5 top-6 flex flex-col items-center gap-3">
                <span className="w-8 h-8 rounded-lg text-[13px] font-semibold text-mut inline-flex items-center justify-center" title="正面视图">正</span>
                <button onClick={() => showToast('已切换视图角度')} className="w-8 h-8 rounded-lg text-mut hover:text-ink inline-flex items-center justify-center" title="切换视图">
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button onClick={() => showToast('已展开前后片对照')} className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-pri" title="前后片对照">
                  <SplitSquareHorizontal className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* 右：导航 + 服装参数 合并卡片（与打版页右侧卡片同一形式，可收起） */}
            <div className={`w-[340px] shrink-0 rounded-2xl bg-panel border border-line flex flex-col ${paramCollapsed ? 'overflow-visible self-start' : 'overflow-hidden'}`}>
              {navSection}
              {!paramCollapsed && (
              <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
              <div className="p-4 pb-6">
                <div className="flex items-center justify-between">
                  <span className="text-[15px] font-bold text-ink">服装参数</span>
                  <ChevronUp className="w-4 h-4 text-mut-2" />
                </div>
                <div className="mt-3 h-11 rounded-xl bg-fill flex items-center justify-between px-3.5">
                  <span className="text-[12.5px] text-mut">版型类型</span>
                  <span className="text-[13px] font-medium text-ink">直筒裤</span>
                </div>
                <div className="mt-3 rounded-xl bg-fill p-1 flex">
                  {(['AI 模式', '自由模式'] as const).map((m, i) => (
                    <button
                      key={m}
                      onClick={() => setSmart(i === 0)}
                      className={`flex-1 h-9 rounded-lg text-[12.5px] transition-colors inline-flex items-center justify-center gap-1 ${
                        smart === (i === 0) ? 'bg-panel font-semibold text-ink border border-line' : 'text-mut hover:text-ink'
                      }`}
                    >
                      {i === 0 && <Sparkles className="w-3.5 h-3.5 text-pri" />}
                      {m}
                    </button>
                  ))}
                </div>
                {smart && (
                  <div className="mt-3 rounded-xl bg-pri-soft p-3 flex gap-2">
                    <Info className="w-4 h-4 text-pri shrink-0 mt-0.5" />
                    <p className="text-[12px] leading-relaxed text-pri">AI 模式下，由AI智能优化参数，生成更优质的版片</p>
                  </div>
                )}
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-[14px] font-bold text-ink">设计参数</span>
                  <ChevronUp className="w-4 h-4 text-mut-2" />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4">
                  {DESIGN_PANEL_FIELDS.map(renderField)}
                </div>
                <div className="mt-5 grid grid-cols-2 gap-x-3">
                  <SegRow label="裆长类型" options={['立裆深', '前后浪']} value={crotchType} onChange={(v) => setCrotchType(v as '立裆深' | '前后浪')} />
                  {renderField({ id: 'crotch', label: crotchType, lock: true })}
                </div>
                <div className="mt-5 flex items-center justify-between">
                  <span className="text-[14px] font-bold text-ink">腰头</span>
                  <ChevronUp className="w-4 h-4 text-mut-2" />
                </div>
                <div className="mt-3">
                  <SegRow label="腰头类型" options={['弧腰头', '直腰头']} value={waistType} onChange={(v) => setWaistType(v as '弧腰头' | '直腰头')} />
                </div>
              </div>
              </div>
              )}
            </div>
          </>
        ) : (
          <>
            {/* ========== 打版模式：整屏 CAD 编辑区，左右卡片悬浮其上（版片仅展示，编辑功能已取消） ========== */}
            <div className="absolute inset-0 overflow-hidden">
              {/* CAD 画布：传统方格网（细格 + 主格） */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundColor: '#FBFCFE',
                  backgroundImage:
                    'linear-gradient(#EDF0F5 1px, transparent 1px), linear-gradient(90deg, #EDF0F5 1px, transparent 1px), linear-gradient(#DFE4EC 1px, transparent 1px), linear-gradient(90deg, #DFE4EC 1px, transparent 1px)',
                  backgroundSize: '20px 20px, 20px 20px, 100px 100px, 100px 100px',
                }}
              />
              {/* 标尺 */}
              <div className="absolute top-0 left-6 right-0 h-5 z-10 border-b border-line-soft bg-panel/70 bg-[repeating-linear-gradient(90deg,transparent_0_19px,#C6CAD2_19px_20px)] bg-bottom [background-size:100%_6px] bg-no-repeat pointer-events-none" />
              <div className="absolute top-5 left-0 bottom-0 w-6 z-10 border-r border-line-soft bg-panel/70 bg-[repeating-linear-gradient(0deg,transparent_0_19px,#C6CAD2_19px_20px)] bg-right [background-size:6px_100%] bg-no-repeat pointer-events-none" />

              {/* 版片层：居中展示 + 缩放 */}
              <div
                className={`absolute left-1/2 top-1/2 w-[560px] h-[560px] origin-center ${regenerating ? 'animate-pulse' : ''}`}
                style={{ transform: `translate(-50%, -50%) scale(${zoom})` }}
              >
                {pieces.map((pc) => (
                  <div key={pc.id} className="absolute" style={{ left: pc.x, top: pc.y, width: pc.w, height: pc.h }}>
                    {pc.kind === 'waist' && <WaistbandArc className="w-full h-full" />}
                    {pc.kind === 'leg' && <LegPanel className="w-full h-full" />}
                    {pc.kind === 'legBack' && <LegPanel back className="w-full h-full" />}
                    {pc.kind === 'small' && <SmallPiece className="w-full h-full" />}
                  </div>
                ))}
              </div>

              {/* 重新排版提示 */}
              {regenerating && (
                <div className="absolute top-[72px] left-1/2 -translate-x-1/2 z-20 h-8 px-3.5 rounded-full bg-ink text-panel text-[11.5px] flex items-center gap-1.5 pointer-events-none">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  正在重新排版…
                </div>
              )}

              {/* 底部中央悬浮：缩放控制 */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 h-9 rounded-lg bg-panel border border-line flex items-center">
                <button onClick={() => setZoom((z) => Math.max(0.6, +(z - 0.1).toFixed(1)))} className="w-9 h-full text-mut hover:text-ink text-[15px]">−</button>
                <span className="w-12 text-center text-[11.5px] text-ink-2">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZoom((z) => Math.min(1.5, +(z + 0.1).toFixed(1)))} className="w-9 h-full text-mut hover:text-ink text-[15px]">+</button>
              </div>

            {/* 左：打版 Agent（文件卡已整合进面板头；可收起为悬浮按钮，交互沿用导航栏折叠） */}
            {agentOpen ? (
            <div className="absolute left-4 top-4 bottom-4 w-[320px] z-30 rounded-2xl bg-panel border border-line flex flex-col overflow-hidden">
              <div className="px-3 pt-3 pb-3 border-b border-line-soft shrink-0">
                {/* 行1：文件头——蓝色 Logo + 可重命名文件名（加粗）+ 收起，布局对齐附件参考图 */}
                <div className="flex items-center gap-2">
                  {/* Logo 图标承载返回功能（去除独立返回按钮） */}
                  <button
                    onClick={onExit}
                    title="返回AI版师"
                    className="w-7 h-7 rounded-lg bg-pri text-white flex items-center justify-center shrink-0 hover:bg-pri-hover transition-colors"
                  >
                    <DraftingCompass className="w-4 h-4" />
                  </button>
                  {renaming ? (
                    <input
                      autoFocus
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') commitName()
                        if (e.key === 'Escape') setRenaming(false)
                      }}
                      onBlur={commitName}
                      className="flex-1 min-w-0 h-7 rounded-md border border-pri bg-panel px-1.5 text-[13.5px] font-bold text-ink outline-none"
                    />
                  ) : (
                    <button
                      onClick={() => { setNameDraft(fileName); setRenaming(true) }}
                      title="点击重命名文件"
                      className="flex-1 min-w-0 text-left text-[13.5px] font-bold text-ink truncate hover:text-pri transition-colors"
                    >
                      {fileName}
                    </button>
                  )}
                  <button
                    title="收起面板"
                    onClick={() => setAgentOpen(false)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-mut hover:text-ink hover:bg-fill transition-colors shrink-0"
                  >
                    <PanelLeftClose className="w-4 h-4" />
                  </button>
                </div>
                {/* 行2：Agent 对话行——标题 + 协作版师 + 右侧操作图标（清空 / 刷新），对齐参考图「新建对话」行 */}
                <div className="mt-2.5 flex items-center gap-1.5">
                  <span className="w-5 h-5 rounded-md bg-pri-soft flex items-center justify-center shrink-0">
                    <Bot className="w-3 h-3 text-pri" />
                  </span>
                  <span className="text-[12.5px] font-semibold text-ink shrink-0">打版 Agent</span>
                  {master.isBrand ? (
                    <span className="w-4 h-4 rounded-full flex items-center justify-center font-serif text-[8px] font-bold text-ink shrink-0 select-none" style={{ background: 'linear-gradient(160deg, #F3D3D0, #F9E9E4)' }}>娅</span>
                  ) : (
                    <img src={master.photo} alt={master.name} className="w-4 h-4 rounded-full object-cover shrink-0" />
                  )}
                  <span className="text-[10.5px] text-mut-3 truncate">{shortName}师傅协作中</span>
                  <span className="ml-auto flex items-center gap-0.5 shrink-0">
                    <button onClick={() => setChat((c) => c.slice(0, 1))} title="清空对话" className="w-6 h-6 rounded-md flex items-center justify-center text-mut-3 hover:text-ink hover:bg-fill transition-colors">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                    <button title="刷新文件" onClick={() => showToast('文件已刷新')} className="w-6 h-6 rounded-md flex items-center justify-center text-mut-3 hover:text-ink hover:bg-fill transition-colors">
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </span>
                </div>
              </div>

              {/* 消息流 */}
              <div ref={chatRef} className="flex-1 overflow-y-auto [scrollbar-width:thin] px-3.5 py-3 space-y-3">
                {chat.map((m, i) =>
                  m.kind === 'user' ? (
                    <div key={i} className="flex justify-end">
                      <div className="max-w-[85%] rounded-xl rounded-br-sm bg-pri text-white text-[12.5px] leading-relaxed px-3 py-2 whitespace-pre-line">{m.text}</div>
                    </div>
                  ) : (
                    <div key={i} className="flex gap-2">
                      <span className="w-6 h-6 rounded-md bg-pri-soft flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5 text-pri" />
                      </span>
                      <div className="max-w-[85%] text-[12.5px] leading-relaxed text-ink whitespace-pre-line">{m.text}</div>
                    </div>
                  ),
                )}
                {chatBusy && (
                  <div className="flex gap-2 items-center text-[12px] text-mut">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-pri" />
                    正在按指令调整版片…
                  </div>
                )}
              </div>

              {/* 快捷指令 */}
              <div className="px-3.5 pb-2 flex flex-wrap gap-1.5 shrink-0">
                {QUICK_CMDS.map((c) => (
                  <button
                    key={c}
                    onClick={() => sendChat(c)}
                    className="h-7 px-2.5 rounded-full bg-fill text-[11px] text-ink-2 hover:bg-pri-soft hover:text-pri transition-colors"
                  >
                    {c}
                  </button>
                ))}
              </div>

              {/* 输入框 */}
              <div className="px-3.5 pb-3.5 shrink-0">
                <div className="rounded-xl border border-line bg-fill focus-within:border-pri/60 focus-within:bg-panel transition-colors p-2 flex items-end gap-2">
                  <textarea
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        sendChat()
                      }
                    }}
                    rows={2}
                    placeholder="下达改版片指令，如：腰围放大 2cm"
                    className="flex-1 resize-none bg-transparent text-[12.5px] text-ink outline-none placeholder:text-mut-3 leading-relaxed"
                  />
                  <button
                    onClick={() => sendChat()}
                    disabled={!chatInput.trim() || chatBusy}
                    title="发送指令"
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                      chatInput.trim() && !chatBusy ? 'bg-pri text-white hover:bg-pri-hover' : 'bg-line-soft text-mut-3'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
            ) : (
              <div className="absolute left-4 top-4 z-30 flex flex-col gap-2">
                <button
                  onClick={onExit}
                  title="返回AI版师"
                  className="w-11 h-11 rounded-xl bg-panel border border-line flex items-center justify-center text-mut hover:text-ink transition-colors"
                >
                  <ArrowLeft className="w-[18px] h-[18px]" />
                </button>
                <button
                  onClick={() => setAgentOpen(true)}
                  title="展开打版 Agent"
                  className="w-11 h-11 rounded-xl bg-panel border border-line flex items-center justify-center text-pri hover:border-pri/50 transition-colors"
                >
                  <Bot className="w-5 h-5" />
                </button>
              </div>
            )}

            {/* 右：导航 + 参数合并卡片（导航区在上；参数栏可收起，收起后仅显示导航区） */}
            <div className={`absolute right-4 top-4 w-[320px] z-30 rounded-2xl bg-panel border border-line flex flex-col ${paramCollapsed ? 'overflow-visible' : 'bottom-4 overflow-hidden'}`}>
              {/* 导航区：换面料 / 生产输出▾ / 收起 + 重新生成版片（与设计模式共用） */}
              {navSection}
              {!paramCollapsed && (
              <div className="flex-1 overflow-y-auto [scrollbar-width:thin]">
              <div className="p-4 pb-6">
                {/* 设计参数 */}
                <button onClick={() => setParamOpen((s) => ({ ...s, design: !s.design }))} className="w-full flex items-center justify-between">
                  <span className="text-[14px] font-bold text-ink">设计参数</span>
                  <ChevronUp className={`w-4 h-4 text-mut-2 transition-transform ${paramOpen.design ? '' : 'rotate-180'}`} />
                </button>
                {paramOpen.design && (
                  <>
                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4">
                      {DESIGN_ROWS_TOP.flat().map(renderField)}
                    </div>
                    <div className="my-4 border-t border-dashed border-line" />
                    <div className="grid grid-cols-2 gap-x-3 gap-y-4 items-end">
                      <SegRow label="　" options={['大腿围', '龙门总宽度']} value={thighMode} onChange={(v) => setThighMode(v as '大腿围' | '龙门总宽度')} />
                      {renderField({ id: thighMode === '大腿围' ? 'thigh' : 'gate', label: thighMode, lock: true })}
                      <SegRow label="裆长类型" options={['立裆深', '前后浪']} value={crotchType} onChange={(v) => setCrotchType(v as '立裆深' | '前后浪')} />
                      {renderField({ id: 'crotch', label: crotchType, lock: true })}
                    </div>
                  </>
                )}

                {/* 结构参数 */}
                <button onClick={() => setParamOpen((s) => ({ ...s, struct: !s.struct }))} className="w-full mt-6 flex items-center justify-between">
                  <span className="text-[14px] font-bold text-ink">结构参数</span>
                  <ChevronUp className={`w-4 h-4 text-mut-2 transition-transform ${paramOpen.struct ? '' : 'rotate-180'}`} />
                </button>
                {paramOpen.struct && <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4">{STRUCT_FIELDS.map(renderField)}</div>}

                {/* 详细参数 */}
                <button onClick={() => setParamOpen((s) => ({ ...s, detail: !s.detail }))} className="w-full mt-6 flex items-center justify-between">
                  <span className="text-[14px] font-bold text-ink">详细参数</span>
                  <ChevronUp className={`w-4 h-4 text-mut-2 transition-transform ${paramOpen.detail ? '' : 'rotate-180'}`} />
                </button>
                {paramOpen.detail && (
                  <>
                    <div className="mt-3 text-[13px] font-bold text-ink">臀围相关参数</div>
                    <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-4">{DETAIL_FIELDS.map(renderField)}</div>
                  </>
                )}
              </div>
              </div>
              )}
            </div>
            </div>
          </>
        )}
      </div>

      {/* ===== 创建工艺单流程（生产输出 → 创建工艺单） ===== */}
      {craftOpen && (
        <CraftSheetFlow showToast={showToast} baseParams={params} onClose={() => setCraftOpen(false)} />
      )}

      {/* ===== 底部工具栏（仅设计模式） ===== */}
      {mode === 'design' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 h-12 rounded-2xl bg-panel border border-line flex items-center gap-0.5 px-2">
          <button onClick={() => showToast('撤销（原型演示）')} className="w-9 h-9 rounded-lg flex items-center justify-center text-mut hover:text-ink hover:bg-fill transition-colors" title="撤销">
            <Undo2 className="w-4 h-4" />
          </button>
          <button onClick={() => showToast('重做（原型演示）')} className="w-9 h-9 rounded-lg flex items-center justify-center text-mut hover:text-ink hover:bg-fill transition-colors" title="重做">
            <Redo2 className="w-4 h-4" />
          </button>
          <span className="w-px h-5 bg-line mx-1.5" />
          {TOOLS.map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => {
                setTool(id)
                if (id !== 'select') showToast(`「${label}」工具（原型演示）`)
              }}
              className={`h-9 px-3 rounded-lg inline-flex items-center gap-1 text-[12.5px] transition-colors ${
                tool === id ? 'bg-pri text-white' : 'text-ink-2 hover:bg-fill'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {id !== 'more' && <ChevronDown className={`w-3 h-3 ${tool === id ? 'text-white/80' : 'text-mut-3'}`} />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
