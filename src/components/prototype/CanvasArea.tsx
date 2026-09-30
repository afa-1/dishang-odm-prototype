import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type MouseEvent as RMouseEvent,
  type PointerEvent as RPointerEvent,
  type WheelEvent as RWheelEvent,
} from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { createPortal } from 'react-dom'
import {
  Columns3,
  Grid2x2,
  ArrowUp,
  ArrowLeftRight,
  Check,
  ChevronDown,
  Clapperboard,
  ClipboardPaste,
  Copy,
  Crop,
  Download,
  Group,
  GripHorizontal,
  Hand,
  Rows3,
  Image,
  ImageMinus,
  ImagePlus,
  ImageUp,
  Info,
  Layers,
  LayoutGrid,
  Loader2,
  Magnet,
  Map as MapIcon,
  Maximize2,
  Mic,
  Minimize2,
  Minus,
  MousePointer2,
  PenLine,
  Pencil,
  Shirt,
  Slash,
  Spline,
  SquareDashedMousePointer,
  SquareMousePointer,
  Eraser,
  FileImage,
  FlipHorizontal2,
  Play,
  Plus,
  Ungroup,
  Undo2,
  Redo2,
  RotateCcw,
  Combine,
  Sparkles,
  SwatchBook,
  Trash2,
  Upload,
  VenetianMask,
  X,
} from 'lucide-react'
import { CoatThumb, FABRIC_TEXTURES, FlatCoatLarge, ModelFigure, StudioScene, TrimThumb, type CoatSpec, type TrimType } from './artwork'
import { setCanvasStyleAssets, type Mark } from './types'
import { Button as ProjectButton } from './projects/ui'

/** 点选编辑图标（附件样式：带小尾巴的圆形气泡 + 内部两个圆点，lucide 描边风格） */
const PointPickIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <circle cx="12" cy="10.5" r="8" />
    <path d="M6.8 16.9 5.2 20.3l3.5-1.3" />
    <circle cx="9.1" cy="10.2" r="1.4" fill="currentColor" stroke="none" />
    <circle cx="14.9" cy="10.2" r="1.4" fill="currentColor" stroke="none" />
  </svg>
)

interface Card {
  id: string
  tag: string
  x: number
  y: number
  w: number
  imgH: number
  kind: 'model1' | 'model2' | 'flat' | 'studio' | 'gen' | 'frame'
  img?: string
  palette?: number
  /** 交付卡片的视角标签（与对话画廊图片一一对应，用于定位校验） */
  viewLabel?: string
  /** 从素材库拖入的服装规格 */
  coat?: CoatSpec
  /** 从素材库拖入的面料色卡 */
  swatch?: { name: string; fill: string; tex: string }
  /** 从素材库拖入的辅料 */
  trim?: { type: TrimType; fill: string }
  /** 从素材库拖入的模特 */
  model?: { jacket: string; inner: string; skirt: string; pants?: boolean }
  /** 「生成图片」占位图框状态 */
  frame?: { busy: boolean; prompt?: string; model?: string }
  /** 点选编辑「修改」结果卡：生成中遮罩文案为「修改中…」 */
  simModify?: boolean
  /** 背景移除：图片区域以透明棋盘格呈现 */
  noBg?: boolean
  /** AI 结果卡片的生成时间（详情页展示） */
  ts?: number
  /** 「视频生成」结果卡：首帧作封面 + 播放键与「视频 · 时长」角标 */
  video?: boolean
  /** 视频时长标签（如 5秒） */
  videoDur?: string
  /** 「融合」后成为图片内容一部分的笔划（随卡片整体移动/缩放/删除/复制/下载） */
  merged?: MergedCardStrokes
  /** 创建编组：同组卡片点选/拖拽时整组联动 */
  groupId?: string
  /** 合并图层：多张图片压平为一张合并卡（子图层相对坐标保存，随合并卡整体移动/缩放） */
  layers?: { box: { w: number; h: number }; items: Array<{ card: Card; dx: number; dy: number }> }
}

/** AI 结果卡片支持的操作（头部菜单 + 选中态工具栏共用） */
type GenAction = 'regen' | 'selectAll' | 'delete' | 'duplicate' | 'download' | 'detail'
// 画布编辑历史快照：卡片 + 浮动笔划（Ctrl/⌘+Z 撤销上一步操作，支持连续回退）
type CanvasSnap = { cards: Card[]; strokes: PenStroke[] }
export interface ProjectCanvasDocument { cards: Card[]; strokes: PenStroke[]; marks: Mark[] }
export interface ProjectCanvasBridge {
  embedded?: boolean
  initial: ProjectCanvasDocument
  onChange?: (draft: ProjectCanvasDocument) => void
  toolbar?: HTMLElement | null
  onSave: (draft: ProjectCanvasDocument) => Promise<boolean>
  onArchive: (files: { id: string; name: string; blob: Blob }[]) => Promise<boolean>
  onExit: () => void
  onDiscard: () => void
}

export const GEN_PALETTES = [
  { jacket: '#f5f3ee', inner: '#2e4a7a', skirt: '#b5c4de', pants: true },
  { jacket: '#e9d8c8', inner: '#5a4632', skirt: '#cbb491', pants: false },
  { jacket: '#dfe6df', inner: '#40513f', skirt: '#8ea78e', pants: true },
]

/** AI 结果卡片的配色（拖入的模特卡用自带配色，其余按调色板索引） */
const genColors = (c: Card) => c.model ?? GEN_PALETTES[(c.palette ?? 0) % GEN_PALETTES.length]

/** 详情页右侧的品类标签 */
const kindLabel = (c: Card): string =>
  c.img
    ? '导入图片'
    : c.kind === 'gen'
      ? '裙装'
      : c.coat
        ? '款式图'
        : c.swatch
          ? '面料'
          : c.trim
            ? '辅料'
            : c.kind === 'flat'
              ? '款式图'
              : c.kind === 'studio'
                ? '场景图'
                : '效果图'

/** HSV → HEX（h:0-360，s/v:0-1）：画布颜色选择器 */
/** 网格吸附：世界坐标网格间距（px） */
const GRID = 80 / 3 // 点阵密度加大一半：网格间距由 40 调整为 40 / 1.5（吸附网格同步生效）

const hsvToHex = (h: number, s: number, v: number) => {
  const sn = s / 100
  const vn = v / 100
  const f = (n: number) => {
    const k = (n + h / 60) % 6
    return vn - vn * sn * Math.max(0, Math.min(k, 4 - k, 1))
  }
  const to = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0')
  return `#${to(f(5))}${to(f(3))}${to(f(1))}`.toUpperCase()
}

/** HEX → HSV */
const hexToHsv = (hex: string): { h: number; s: number; v: number } => {
  const m = hex.replace('#', '')
  const r = parseInt(m.slice(0, 2), 16) / 255
  const g = parseInt(m.slice(2, 4), 16) / 255
  const b = parseInt(m.slice(4, 6), 16) / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const d = max - min
  let h = 0
  if (d) {
    if (max === r) h = ((g - b) / d) % 6
    else if (max === g) h = (b - r) / d + 2
    else h = (r - g) / d + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max ? (d / max) * 100 : 0, v: max * 100 }
}

/** 选中态底部工具栏（对应设计稿图 2） */

/** 详情页生成时间格式：2026/08/05 17:35:43 */
const fmtTime = (ts?: number) => {
  const d = new Date(ts ?? Date.now())
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}/${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

// 卡片 = 纯图片（功能项已提取至选中态胶囊导航栏），高度即图片高度：框选整体缩放时卡片与间距均严格等比
// 「生成图片」占位图框无卡片外框，视觉高度=imgH，其余卡片=imgH+头部内边距
const cardH = (c: Card) => c.imgH

/** 「画笔」笔划数据结构（世界坐标存储，随画布平移/缩放） */
interface PenStroke {
  id: string
  tool: 'pen' | 'pencil' | 'line' | 'curve' | 'erase'
  color: string
  width: number
  points: Array<{ x: number; y: number }>
  preview?: boolean // 直线工具：松手前的半透明预览
  dash?: boolean // 虚线笔划
  dashScale?: number // 虚线疏密倍率（0.5~2.5，默认 1：越大越疏）
  axis?: number // 左右对称：笔划起始时的镜像轴（世界坐标 x，视口水平中线），仅绘制中的笔划携带
  groupId?: string // 创建编组：同组笔划点选/拖拽时整组联动
}
type PenToolType = PenStroke['tool']

/** 贝塞尔曲线锚点：o1=入口手柄、o2=出口手柄（绝对世界坐标，默认与锚点重合=直线段） */
interface BezAnchor {
  x: number
  y: number
  o1x: number
  o1y: number
  o2x: number
  o2y: number
}

/** 融合进卡片的笔划：坐标相对卡片图片区域左上角，boxW/boxH 为融合时图片区域尺寸（随卡片缩放等比换算） */
interface MergedCardStroke {
  id: string
  tool: 'pen' | 'pencil' | 'line' | 'curve'
  color: string
  width: number
  dash?: boolean
  dashScale?: number
  points: Array<{ x: number; y: number }>
}
interface MergedCardStrokes {
  boxW: number
  boxH: number
  strokes: MergedCardStroke[]
}
const PEN_COLORS = ['#F53F3F', '#F5A623', '#12B76A', '#2A68FE', '#8B5CF6', '#1B1B1F', '#FFFFFF']
const PEN_HISTORY_LIMIT = 50

const TOOLS = [
  { name: '灵感设计', icon: Sparkles },
  { name: '换面料', icon: SwatchBook },
  { name: '模特试衣', icon: VenetianMask },
]

const MODES = ['灵感设计', '改款设计', '自由设计']
const COUNTS = ['1张', '2张', '4张']
const RATIOS = ['3:4', '1:1', '4:3', '9:16']
const VIDEO_DURS = ['5秒', '10秒']
const VIDEO_RATIOS = ['16:9', '9:16', '1:1']
const SNAP = 6

function CardImage({ card }: { card: Card }) {
  if (card.coat)
    return (
      <div className={`w-full h-full ${card.noBg ? 'hxy-nobg' : 'bg-fill-2'} flex items-center justify-center p-4`}>
        <CoatThumb spec={card.coat} className="h-full w-auto" />
      </div>
    )
  if (card.swatch)
    return (
      <div className="w-full h-full relative" style={{ background: card.swatch.fill }}>
        <div className="absolute inset-0" style={FABRIC_TEXTURES[card.swatch.tex]} />
        <span className="absolute left-2 bottom-2 px-1.5 py-0.5 rounded-md bg-panel/85 border border-line text-[10px] text-ink-2 shadow-sm">
          {card.swatch.name}
        </span>
      </div>
    )
  if (card.trim)
    return (
      <div className={`w-full h-full ${card.noBg ? 'hxy-nobg' : 'bg-fill-2'} flex items-center justify-center`}>
        <TrimThumb type={card.trim.type} fill={card.trim.fill} className="w-24 h-24" />
      </div>
    )
  if (card.model)
    return (
      <div className={`w-full h-full ${card.noBg ? 'hxy-nobg' : 'bg-fill'} flex items-end justify-center`}>
        <ModelFigure className="h-[96%]" jacket={card.model.jacket} inner={card.model.inner} skirt={card.model.skirt} pants={card.model.pants} />
      </div>
    )
  // 「生成图片」占位图框：空态=图片图标（无文字）；生成中=进度提示
  if (card.kind === 'frame')
    return (
      <div className="w-full h-full border-[1.33px] border-pri/50 bg-pri-soft/50 backdrop-blur-[2px] flex flex-col items-center justify-center gap-2">
        {card.frame?.busy ? (
          <>
            <Loader2 className="w-8 h-8 text-pri animate-spin" />
            <span className="text-[13px] text-ink-2">正在生成</span>
            <span className="text-[11px] text-mut-2">{card.frame.model ?? '画衣衣 Image 2.0'}</span>
          </>
        ) : (
          <Image className="w-10 h-10 text-pri" strokeWidth={1.5} />
        )}
      </div>
    )
  // 合并图层卡：按压平时的相对布局渲染全部子图层（随合并卡缩放等比换算）
  if (card.layers) {
    const ls = card.layers
    const s = card.w / ls.box.w
    return (
      <div className="w-full h-full relative">
        {ls.items.map((it) => (
          <div key={it.card.id} className="absolute" style={{ left: it.dx * s, top: it.dy * s, width: it.card.w * s, height: it.card.imgH * s }}>
            <CardImage card={it.card} />
          </div>
        ))}
      </div>
    )
  }
  if (card.img)
    return (
      <div className={`w-full h-full relative ${card.noBg ? 'hxy-nobg' : 'bg-fill-2'} flex items-center justify-center`}>
        <img src={card.img} alt="" className="block w-full h-full object-contain" draggable={false} />
        {/* 视频卡：首帧封面 + 播放键与「视频 · 时长」角标 */}
        {card.video && <VideoOverlay dur={card.videoDur} />}
      </div>
    )
  if (card.kind === 'gen') {
    const p = GEN_PALETTES[(card.palette ?? 0) % GEN_PALETTES.length]
    return (
      <div className={`w-full h-full ${card.noBg ? 'hxy-nobg' : 'bg-fill'} flex items-end justify-center relative`}>
        <ModelFigure className="h-[96%]" jacket={p.jacket} inner={p.inner} skirt={p.skirt} pants={p.pants} />
        {/* 纯提示词生成的视频卡：生成画面作封面 + 播放键与「视频 · 时长」角标 */}
        {card.video && <VideoOverlay dur={card.videoDur} />}
        {/* 「再次生成」忙碌遮罩 */}
        {card.frame?.busy && (
          <div className="absolute inset-0 bg-panel/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2">
            <Loader2 className="w-7 h-7 text-pri animate-spin" />
            <span className="text-[12px] text-ink-2">{card.simModify ? '修改中…' : '正在生成'}</span>
          </div>
        )}
      </div>
    )
  }
  if (card.kind === 'model1')
    return (
      <div className={`w-full h-full ${card.noBg ? 'hxy-nobg' : 'bg-fill'} flex items-end justify-center`}>
        <ModelFigure className="h-[96%]" jacket="#f5f3ee" inner="#7a2430" skirt="#c8a75f" />
      </div>
    )
  if (card.kind === 'model2')
    return (
      <div className={`w-full h-full ${card.noBg ? 'hxy-nobg' : 'bg-fill'} flex items-end justify-center relative`}>
        <ModelFigure className="h-[96%]" jacket="#e5ddcd" inner="#e8b7c2" skirt="#d9c8a4" pants />
        <span className="absolute inset-0 flex items-center justify-center text-white/80 text-[22px] tracking-[0.5em] font-light select-none">
          KEIGAN
        </span>
      </div>
    )
  if (card.kind === 'flat')
    return (
      <div className={`w-full h-full ${card.noBg ? 'hxy-nobg' : 'bg-fill-2'} flex items-center justify-center`}>
        <FlatCoatLarge className="h-[94%]" />
      </div>
    )
  return <StudioScene className="w-full h-full object-cover" />
}

/** 「融合」笔划覆盖层：作为图片内容的一部分渲染在卡片图片区域内（随卡片缩放，不拦截指针） */
/** 画笔平滑：原始折线 → 中点二次贝塞尔采样的致密平滑点列（画布绘制 / 融合 / 导出共用，消除折角与抖动锯齿） */
function smoothPenPoints(pts: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
  if (pts.length < 3) return pts.slice()
  const out = [{ ...pts[0] }]
  for (let i = 1; i < pts.length - 1; i++) {
    const c = pts[i]
    const m = { x: (c.x + pts[i + 1].x) / 2, y: (c.y + pts[i + 1].y) / 2 }
    const m0 = out[out.length - 1]
    for (let t = 1; t <= 3; t++) {
      const u = t / 3
      out.push({
        x: (1 - u) * (1 - u) * m0.x + 2 * (1 - u) * u * c.x + u * u * m.x,
        y: (1 - u) * (1 - u) * m0.y + 2 * (1 - u) * u * c.y + u * u * m.y,
      })
    }
  }
  out.push({ ...pts[pts.length - 1] })
  return out
}

/** 画笔平滑：生成二次贝塞尔平滑 SVG path（融合层渲染用） */
function smoothPathD(pts: Array<{ x: number; y: number }>): string {
  if (pts.length < 3) return pts.map((p, i) => `${i ? 'L' : 'M'}${p.x} ${p.y}`).join(' ')
  let d = `M${pts[0].x} ${pts[0].y}`
  for (let i = 1; i < pts.length - 1; i++) {
    d += ` Q${pts[i].x} ${pts[i].y} ${(pts[i].x + pts[i + 1].x) / 2} ${(pts[i].y + pts[i + 1].y) / 2}`
  }
  d += ` L${pts[pts.length - 1].x} ${pts[pts.length - 1].y}`
  return d
}

function MergedOverlay({ m }: { m: MergedCardStrokes }) {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${m.boxW} ${m.boxH}`} preserveAspectRatio="none">
      {m.strokes.map((s) => {
        // 铅笔：与画布渲染一致的多遍低透明度叠描 + 确定性微抖动
        if (s.tool === 'pencil') {
          const rnd = (n: number) => {
            const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
            return x - Math.floor(x)
          }
          const passes = [
            { a: 0.2, w: s.width * 1.2, j: s.width * 0.06 }, // 柔边铺底
            { a: 0.42, w: s.width * 0.85, j: s.width * 0.2 }, // 主干
            { a: 0.16, w: s.width * 0.5, j: s.width * 0.55 }, // 颗粒层
          ]
          return (
            <g key={s.id}>
              {passes.map((ps, pi) => {
                const pts = smoothPenPoints(s.points).map((p, i) => ({
                  x: p.x + (rnd(pi * 7919 + i * 2) - 0.5) * ps.j,
                  y: p.y + (rnd(pi * 7919 + i * 2 + 1) - 0.5) * ps.j,
                }))
                return pts.length === 1 ? (
                  <circle key={pi} cx={pts[0].x} cy={pts[0].y} r={ps.w / 2} fill={s.color} fillOpacity={ps.a} />
                ) : (
                  <path
                    key={pi}
                    d={smoothPathD(pts)}
                    fill="none"
                    stroke={s.color}
                    strokeOpacity={ps.a}
                    strokeWidth={ps.w}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                )
              })}
            </g>
          )
        }
        return s.points.length === 1 ? (
          <circle key={s.id} cx={s.points[0].x} cy={s.points[0].y} r={s.width / 2} fill={s.color} />
        ) : (
          <path
            key={s.id}
            d={smoothPathD(s.points)}
            fill="none"
            stroke={s.color}
            strokeWidth={s.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={s.dash ? `${s.width * 2.5 * (s.dashScale ?? 1)} ${s.width * 1.8 * (s.dashScale ?? 1)}` : undefined}
          />
        )
      })}
    </svg>
  )
}

/** 虚线开关图标（三条短横线段） */
function DashIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M2.5 12h3.8M9.1 12h3.8M15.7 12h3.8" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  )
}

function DesignCard({
  card,
  selected,
  panOn,
  cursor,
  refHint,
  ghosted,
  eraseMasks,
}: {
  card: Card
  selected: boolean
  panOn: boolean
  cursor?: string
  /** 拖拽画布卡片经过时的高亮提示（可绑定为生成参考图） */
  refHint?: boolean
  /** 拖拽上传缩略图激活时：原卡片淡出，避免遮挡功能模块 */
  ghosted?: boolean
  /** AI 擦除：涂抹蒙版（相对图片区域坐标，随卡片移动/缩放） */
  eraseMasks?: Array<{ width: number; points: Array<{ x: number; y: number }> }>
}) {
  // 「生成图片」占位图框：初始状态仅单个线框（无白色卡片外框），与生成面板保持亲密关系
  if (card.kind === 'frame')
    return (
      <div
        id={`card-${card.id}`}
        className={`absolute select-none transition-shadow ${refHint ? 'ring-2 ring-pri ring-offset-2' : ''}`}
        style={{ left: card.x, top: card.y, width: card.w, height: card.imgH, cursor, opacity: ghosted ? 0.15 : undefined, transition: 'opacity .15s' }}
        data-card
      >
        <CardImage card={card} />
      </div>
    )
  // 卡片 = 纯图片：功能项全部提取至选中态顶部胶囊导航栏，底部卡片框去除（避免功能重复）
  return (
    <div
      id={`card-${card.id}`}
      className="group absolute select-none"
      style={{ left: card.x, top: card.y, width: card.w, cursor, opacity: ghosted ? 0.15 : undefined, transition: 'opacity .15s' }}
      data-card
    >
      <div
        className={`overflow-hidden relative border transition-shadow ${
          selected ? 'border-pri shadow-[0_4px_14px_rgba(42,104,254,0.18)]' : 'border-transparent shadow-[0_2px_10px_rgba(0,0,0,0.08)]'
        }`}
        style={{ height: card.imgH }}
      >
        <CardImage card={card} />
        {/* 全局生成 loading：任何图片卡进入生成/编辑任务（frame.busy）都显示过程遮罩，结果返回后自动消失 */}
        {card.frame?.busy && !(card.kind === 'gen' && !card.img) && (
          <div className="absolute inset-0 bg-panel/70 backdrop-blur-[1px] flex flex-col items-center justify-center gap-2 pointer-events-none">
            <Loader2 className="w-7 h-7 text-pri animate-spin" />
            <span className="text-[12px] text-ink-2">{card.simModify ? '修改中…' : '正在生成'}</span>
          </div>
        )}
        {card.merged && <MergedOverlay m={card.merged} />}
        {/* AI 擦除：涂抹蒙版高亮（随卡片图片区域等比缩放） */}
        {eraseMasks && eraseMasks.length > 0 && (
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 ${card.w} ${card.imgH}`} preserveAspectRatio="none">
            {eraseMasks.map((m, i) =>
              m.points.length === 1 ? (
                <circle key={i} cx={m.points[0].x} cy={m.points[0].y} r={m.width / 2} fill="#2A68FE" fillOpacity={0.55} />
              ) : (
                <path
                  key={i}
                  d={m.points.map((pt, j) => `${j ? 'L' : 'M'}${pt.x} ${pt.y}`).join(' ')}
                  fill="none"
                  stroke="#2A68FE"
                  strokeOpacity={0.55}
                  strokeWidth={m.width}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              ),
            )}
          </svg>
        )}
        <span className="absolute right-2 bottom-1.5 text-[10px] text-white/70" style={{ textShadow: '0 0 4px rgba(0,0,0,.25)' }}>
          画衣衣
        </span>
        {/* 卡片左上角类型标签已去除：名称信息由选中态「图片说明」（名称+尺寸）统一展示，避免重复 */}
      </div>
      {/* 缩放把手（抓手模式下隐藏） */}
      {!panOn && (
        <div
          data-resize
          className="absolute -right-2 -bottom-2 w-4 h-4 rounded-full bg-panel border-[1.33px] border-pri shadow-sm cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity"
        />
      )}
    </div>
  )
}

function MiniSelect({
  value,
  options,
  onChange,
  prefix,
}: {
  value: string
  options: string[]
  onChange: (v: string) => void
  prefix?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="h-8 px-2.5 rounded-lg border border-line bg-panel flex items-center gap-1 text-[13px] text-ink hover:bg-cvs transition-colors"
      >
        {prefix}
        {value}
        <ChevronDown className="w-3.5 h-3.5 text-mut" />
      </button>
      {open && (
        <div className="absolute bottom-9 left-0 z-40 w-28 bg-panel rounded-lg border border-line shadow-lg py-1">
          {options.map((o) => (
            <button
              key={o}
              onClick={() => {
                onChange(o)
                setOpen(false)
              }}
              className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-fill ${o === value ? 'text-pri' : 'text-ink-2'}`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

// 视频结果卡角标：左上「视频 · 时长」+ 中央播放键（首帧封面 / 生成画面封面共用）
function VideoOverlay({ dur }: { dur?: string }) {
  return (
    <>
      <span className="absolute left-2 top-2 px-1.5 py-0.5 rounded-md bg-black/55 text-white text-[10px] flex items-center gap-1 select-none">
        <Clapperboard className="w-3 h-3" />
        视频{dur ? ` · ${dur}` : ''}
      </span>
      <span className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
        <span className="w-11 h-11 rounded-full bg-black/45 backdrop-blur-[1px] flex items-center justify-center">
          <Play className="w-5 h-5 ml-0.5 text-white fill-white" />
        </span>
      </span>
    </>
  )
}

function UploadSlot({
  label,
  img,
  onPick,
  onClear,
  slotKey,
  dropHint,
}: {
  label: string
  img: string | null
  onPick: (url: string) => void
  onClear: () => void
  slotKey?: string
  dropHint?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onPick(URL.createObjectURL(f))
          e.target.value = ''
        }}
      />
      <button
        data-refslot={slotKey}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
        }}
        onDrop={(e) => {
          // 本地图片文件直接拖入槽位上传（阻止冒泡，避免落入画布导入逻辑）
          e.preventDefault()
          e.stopPropagation()
          const f = Array.from(e.dataTransfer.files).find((x) => x.type.startsWith('image/'))
          if (f) onPick(URL.createObjectURL(f))
        }}
        className={`relative w-14 h-14 rounded-lg border border-dashed flex flex-col items-center justify-center gap-0.5 transition-colors overflow-hidden ${
          dropHint ? 'border-pri bg-pri-soft text-pri' : 'border-line text-mut hover:border-pri hover:text-pri'
        }`}
      >
        {img ? (
          <>
            <img
              key={img}
              src={img}
              alt={label}
              className="absolute inset-0 w-full h-full object-cover"
              style={{ animation: 'hxy-pop .3s cubic-bezier(.34,1.56,.64,1)' }}
            />
            <span
              role="button"
              onClick={(e) => {
                e.stopPropagation()
                onClear()
              }}
              className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-black/55 text-white flex items-center justify-center"
            >
              <X className="w-2.5 h-2.5" />
            </span>
          </>
        ) : (
          <>
            <Upload className="w-3.5 h-3.5" />
            <span className="text-[10px]">{label}</span>
          </>
        )}
      </button>
    </>
  )
}

export default function CanvasArea({
  leftOffset = 16,
  marks,
  onMarksChange,
  onMarkToChat,
  deliver,
  focusSignal,
  onSendToAgent,
  projectBridge,
}: {
  leftOffset?: number
  marks: Mark[]
  onMarksChange: (m: Mark[]) => void
  /** 放置标记点时触发（用于自动弹出收起状态的 AI 对话卡片） */
  onMarkPlaced?: () => void
  /** 框选编辑：框选完成后标记自动带入 Agent 输入区形成需求胶囊卡片，等待手动发送 */
  onMarkToChat?: () => void
  /** 发送至Agent：把画布中选中的图片一键添加为 Agent 对话框附件 */
  onSendToAgent?: (imgs: { name: string; url: string }[]) => void
  projectBridge?: ProjectCanvasBridge
  /** AI 对话交付：在画布右侧生成设计节点组（ts 作为批次标识，views 为各卡片视角标签） */
  deliver?: { title: string; n: number; ts: number; views?: string[]; anchorCardId?: string | null } | null
  /** 视野聚焦信号：变化时定位到最近交付节点组；index 指定时定位对应单张卡片 */
  focusSignal?: { ts: number; index: number | null }
}) {
  const [view, setView] = useState({ x: 0, y: 0, k: 1 })
  const [cards, setCards] = useState<Card[]>(() => projectBridge?.initial.cards ?? [])
  const [projectBusy, setProjectBusy] = useState(false)
  // 画布图片款式实时同步到共享存储：创建工艺单「项目资产」模块的款式图片全部来源于此
  useEffect(() => {
    setCanvasStyleAssets(cards.filter((c) => c.img).map((c) => ({ id: c.id, img: c.img as string, name: c.tag || '款式图' })))
  }, [cards])
  // 右下角控制栏：画布颜色 / 地图模式 / 缩放百分比下拉
  const [canvasColor, setCanvasColor] = useState('#ECECEC')
  const [colorOpen, setColorOpen] = useState(false)
  const [hexDraft, setHexDraft] = useState('')
  const [mapOpen, setMapOpen] = useState(false)
  const [zoomMenu, setZoomMenu] = useState(false)
  const mmDragRef = useRef(false)
  const mmCvRef = useRef<HTMLCanvasElement>(null)
  // 网格吸附：开启后画布显示网点，拖动卡片时位置吸附到网格
  const [snapGrid, setSnapGrid] = useState(false)
  const snapGridRef = useRef(snapGrid)
  snapGridRef.current = snapGrid

  // 胶囊工具栏自适应：实测渲染宽度，靠近屏幕边界时将其夹取回可视区域内
  const [capsuleW, setCapsuleW] = useState(0)
  const capsuleObs = useRef<ResizeObserver | null>(null)
  const capsuleRefFn = useCallback((el: HTMLDivElement | null) => {
    capsuleObs.current?.disconnect()
    capsuleObs.current = null
    if (el) {
      setCapsuleW(el.offsetWidth)
      const ro = new ResizeObserver(() => setCapsuleW(el.offsetWidth))
      ro.observe(el)
      capsuleObs.current = ro
    }
  }, [])

  // 小地图尺寸与几何：卡片并集 ∪ 当前视口，四周留白后缩放适配
  const MM_W = 232
  const MM_H = 148
  const mmGeom = () => {
    const el = containerRef.current
    if (!el) return null
    const vw = el.clientWidth / view.k
    const vh = el.clientHeight / view.k
    const vx = -view.x / view.k
    const vy = -view.y / view.k
    let x0 = vx
    let y0 = vy
    let x1 = vx + vw
    let y1 = vy + vh
    for (const c of cards) {
      x0 = Math.min(x0, c.x)
      y0 = Math.min(y0, c.y)
      x1 = Math.max(x1, c.x + c.w)
      y1 = Math.max(y1, c.y + cardH(c))
    }
    const bw = Math.max(1, x1 - x0)
    const bh = Math.max(1, y1 - y0)
    const pad = Math.max(bw, bh) * 0.08 + 40
    const sc = Math.min(MM_W / (bw + pad * 2), MM_H / (bh + pad * 2))
    const ox = (MM_W - bw * sc) / 2 - x0 * sc
    const oy = (MM_H - bh * sc) / 2 - y0 * sc
    return { sc, ox, oy, vx, vy, vw, vh }
  }

  // 小地图绘制：内容矩形 + 视口框（蓝），实时跟随 cards / view
  useEffect(() => {
    if (!mapOpen) return
    const cv = mmCvRef.current
    const g = mmGeom()
    if (!cv || !g) return
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const dpr = window.devicePixelRatio || 1
    cv.width = MM_W * dpr
    cv.height = MM_H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, MM_W, MM_H)
    const rr = (x: number, y: number, w: number, h: number, r: number) => {
      ctx.beginPath()
      ctx.roundRect(x, y, Math.max(2, w), Math.max(2, h), Math.min(r, Math.max(2, w) / 2, Math.max(2, h) / 2))
    }
    for (const c of cards) {
      rr(c.x * g.sc + g.ox, c.y * g.sc + g.oy, c.w * g.sc, cardH(c) * g.sc, 3)
      ctx.fillStyle = c.frame?.busy ? 'rgba(42, 104, 254, 0.30)' : 'rgba(128, 134, 148, 0.38)'
      ctx.fill()
    }
    // 视口框：蓝边 + 淡蓝填充，始终可见
    rr(g.vx * g.sc + g.ox, g.vy * g.sc + g.oy, g.vw * g.sc, g.vh * g.sc, 4)
    ctx.fillStyle = 'rgba(42, 104, 254, 0.10)'
    ctx.fill()
    ctx.lineWidth = 1.5
    ctx.strokeStyle = '#2A68FE'
    ctx.stroke()
  }, [mapOpen, cards, view, canvasColor])

  // HEX 输入框跟随当前画布颜色
  useEffect(() => {
    setHexDraft(canvasColor.replace('#', '').toUpperCase())
  }, [canvasColor])
  const [guides, setGuides] = useState<{ v: number[]; h: number[] }>({ v: [], h: [] })
  const [selected, setSelected] = useState<string[]>([])
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [panning, setPanning] = useState(false)
  const [activeTool, setActiveTool] = useState('灵感设计')
  const [mode, setMode] = useState('灵感设计')
  const [count, setCount] = useState('1张')
  const [ratio, setRatio] = useState('3:4')
  const [prompt, setPrompt] = useState('')
  const [protoImg, setProtoImg] = useState<string | null>(null)
  const [inspoImg, setInspoImg] = useState<string | null>(null)
  // 「视频生成」独立输入（与图片工具互不干扰）：首帧 / 尾帧均可选，不上传即纯提示词生成
  const [videoStart, setVideoStart] = useState<string | null>(null)
  const [videoEnd, setVideoEnd] = useState<string | null>(null)
  const [videoPrompt, setVideoPrompt] = useState('')
  const [videoDur, setVideoDur] = useState('5秒')
  const [videoRatio, setVideoRatio] = useState('16:9')
  const [generating, setGenerating] = useState(false)
  // 画布操作模式：false=选择（默认，点选/框选/移动/缩放卡片） true=拖拽（平移画布视图）
  const [panOn, setPanOn] = useState(false)
  const [modeMenu, setModeMenu] = useState(false)
  const [spaceDown, setSpaceDown] = useState(false)
  const [selMenu, setSelMenu] = useState<'space' | null>(null)
  // 右键功能卡片：选中图片（点选单张/框选多张）后右键弹出（复制/粘贴到此处/导出/删除）
  const [ctxMenu, setCtxMenu] = useState<{ x: number; y: number; wx: number; wy: number; onCard: boolean } | null>(null)
  const clipboardRef = useRef<Card[]>([])
  // 生成输入条显隐：点击空白画布收起，点击底部导航栏 AI 功能键再次弹出
  const [genBarOn, setGenBarOn] = useState(false) // 初始状态不展示任务模块：点击底部导航栏 AI 功能键才打开
  // AI 辅助工具：mark=点选编辑（点击卡片添加数字标记点）
  const [aiTool, setAiTool] = useState<'mark' | null>(null)
  // 点选编辑（新交互）：点击图片 → 待定点（蓝色圆点）+ 就地输入气泡（描述修改）→ ↑/回车提交为编号标记；再点新位置自动提交上一个
  const [pendingPoint, setPendingPoint] = useState<{ cardId: string; dx: number; dy: number } | null>(null) // 未提交的待定修改点
  const [pendingNote, setPendingNote] = useState('') // 气泡中的需求描述（新建或编辑已有标记）
  const [editingMarkId, setEditingMarkId] = useState<number | null>(null) // 点击编号徽章重新编辑该标记
  const bubbleOpenRef = useRef(false)
  bubbleOpenRef.current = pendingPoint != null || editingMarkId != null
  const [redoStack, setRedoStack] = useState<Mark[]>([]) // 点选标记重做栈（撤销 = 移除最后一个点选标记，无需独立撤销栈）
  const [aiMenu, setAiMenu] = useState(false)
  const [importMenu, setImportMenu] = useState(false)
  const [imgFn, setImgFn] = useState<'gen' | 'upload'>('gen') // 图片工具主键当前功能：生成图片 / 上传图片（主图标随菜单点选联动切换，与标注工具一致）
  // 「生成图片」：提示词面板（绑定画布中的占位图框卡片）
  const [genPanel, setGenPanel] = useState<{ cardId: string; text: string; model: string; refs: string[]; count: string; ratio: string } | null>(null)
  const [genPanelExpanded, setGenPanelExpanded] = useState(false) // 放大态：遮罩 + 居中大对话框（「还原」返回图框下方锚定态）
  const [genPickMode, setGenPickMode] = useState(false) // 「从画布中选择」参考图模式：点击图片卡片加入输入模块（支持多选）
  // 「视频生成器」：图框 + 锚定输入模块（交互与「生成图片」模块保持一致）
  const [vidPanel, setVidPanel] = useState<{ cardId: string } | null>(null)
  const [vidPanelHidden, setVidPanelHidden] = useState(false)
  const [vidPanelExpanded, setVidPanelExpanded] = useState(false)
  const [vidModel, setVidModel] = useState('画衣衣 Video 2.0')
  const [genBarExpanded, setGenBarExpanded] = useState(false) // AI 任务模块放大态：遮罩 + 居中大对话框（与生成图片模块放大交互一致）
  const genPickModeRef = useRef(false)
  genPickModeRef.current = genPickMode
  const [genPanelHidden, setGenPanelHidden] = useState(false) // 生成器输入模块显隐：点击画布空白隐藏（图框保留），点击图框再次弹出
  // 画布新手引导：仅限用户初次打开无限画布时显示（localStorage 记忆），用户开始使用后不再出现
  const [guideSeen, setGuideSeen] = useState(() => {
    try { return window.localStorage.getItem('hyy_guide_seen') === '1' } catch { return false }
  })
  const markGuideSeen = () => {
    setGuideSeen(true)
    try { window.localStorage.setItem('hyy_guide_seen', '1') } catch { /* 隐私模式下忽略 */ }
  }
  // 拖拽画布卡片作为参考图时的落点提示：'frame'=生成占位图框 / 'proto'=原型图 / 'inspo'=灵感图 / 'bar'=任务条整体
  const [refDropHint, setRefDropHint] = useState<'frame' | 'vframe' | 'proto' | 'inspo' | 'vstart' | 'vend' | 'bar' | null>(null)
  const refDropHintRef = useRef<'frame' | 'vframe' | 'proto' | 'inspo' | 'vstart' | 'vend' | 'bar' | null>(null)
  // AI 任务条：可拖拽移动的偏移量 + 连续生成的批次锚点（结果垂直向下罗列）
  const [genBarOff, setGenBarOff] = useState({ x: 0, y: 0 })
  const genBarDragRef = useRef<{ x: number; y: number } | null>(null)
  // 「生成图片」生成器卡片拖拽偏移（与 AI 任务模块卡片交互逻辑一致：按住顶部手柄拖拽移动位置）
  const genBatchRef = useRef<string[]>([])
  const [cardDragging, setCardDragging] = useState(false)
  const [groupResizing, setGroupResizing] = useState(false)
  // 拖拽上传缩略图动效：被拖卡片 id 集合 + 靠近功能模块时跟随光标的缩略图
  const [dragIds, setDragIds] = useState<string[]>([])
  const [dragGhost, setDragGhost] = useState<{ url: string; x: number; y: number } | null>(null)
  // 本地图片拖入：落点预览（跟随光标的虚线框，松手后图片即以此为中心导入）
  const [fileDropAt, setFileDropAt] = useState<{ x: number; y: number } | null>(null)
  const [fileDragOn, setFileDragOn] = useState(false) // 当前拖拽物为本地文件：仅显示跟随光标的落点框，不再叠全屏遮罩（避免双重提示冲突）
  const fileDropRaf = useRef(0)
  const dragGhostUrlRef = useRef<{ id: string; url: string } | null>(null)
  // 「画笔」：编辑态开关 + 笔划数据（世界坐标）+ 历史栈
  const [penOn, setPenOn] = useState(false)
  const [strokes, setStrokes] = useState<PenStroke[]>(() => projectBridge?.initial.strokes ?? [])
  useEffect(() => { projectBridge?.onChange?.({ cards, strokes, marks }) }, [cards, strokes, marks]) // eslint-disable-line react-hooks/exhaustive-deps
  const [pastStrokes, setPastStrokes] = useState<PenStroke[][]>([]) // 撤销栈：每次修改前的完整快照
  const [futureStrokes, setFutureStrokes] = useState<PenStroke[][]>([]) // 重做栈
  const [penColor, setPenColor] = useState(PEN_COLORS[0])
  const [penWidth, setPenWidth] = useState(4)
  const [penDash, setPenDash] = useState(false) // 虚线开关（作用于画笔/直线/曲线）
  const [penSym, setPenSym] = useState(false) // 左右对称：以用户标定的中线为轴镜像绘制（画笔/直线/曲线/橡皮擦均生效）
  const [symPlacing, setSymPlacing] = useState(false) // 对称中线标定中：辅助线跟随鼠标，点击画布确定位置
  const [symAxis, setSymAxis] = useState<number | null>(null) // 已标定的对称中线（世界坐标 x）
  const [symGuide, setSymGuide] = useState(false) // 中线辅助线可见：标定后持续作为绘制参考，取消对称 / 取消 / 完成退出时才消失
  const symPlacingRef = useRef(false)
  symPlacingRef.current = symPlacing
  const symAxisRef = useRef<number | null>(null)
  symAxisRef.current = symAxis
  const symGuideRef = useRef(false)
  symGuideRef.current = symGuide
  const symHoverRef = useRef<number | null>(null) // 标定中：鼠标处的中线预览位置
  const [selStrokeIds, setSelStrokeIds] = useState<string[]>([]) // 选中的浮动笔划（点选/框选多选，与卡片选中共存、整体移动）
  const selStrokeIdsRef = useRef<string[]>([])
  selStrokeIdsRef.current = selStrokeIds
  // 组合：笔划选区胶囊「组合」的格式选择弹层（选区变化时自动收起）
  const [combineFmt, setCombineFmt] = useState(false)
  const selDragRef = useRef<{
    ids: string[]
    startWX: number
    startWY: number
    orig: Record<string, Array<{ x: number; y: number }>> // 各选中笔划的原始点位
    prev: PenStroke[] // 拖拽前完整快照（撤销用）
    cardStarts: Record<string, { x: number; y: number }> // 同选中的卡片原始位置（一起拖拽）
    moved: boolean
    histPrev?: CanvasSnap // 拖拽前完整快照（Ctrl/⌘+Z 撤销用）
  } | null>(null) // 笔划拖拽移动中
  // AI 擦除（针对单张图片的专属编辑态，与画笔模块的橡皮擦不同）：涂抹蒙版 → 清空 / 取消 / 擦除
  const [eraseMode, setEraseMode] = useState<string | null>(null) // 目标卡片 id
  const eraseModeRef = useRef<string | null>(null)
  eraseModeRef.current = eraseMode
  const [eraseBrush, setEraseBrush] = useState(36) // 笔刷直径（屏幕像素）
  const [eraseMasks, setEraseMasks] = useState<Array<{ width: number; points: Array<{ x: number; y: number }> }>>([]) // 相对卡片图片区域
  const eraseCommittedRef = useRef<Array<{ width: number; points: Array<{ x: number; y: number }> }>>([])
  const eraseDrawRef = useRef<{ width: number; points: Array<{ x: number; y: number }> } | null>(null)
  const [eraseBusy, setEraseBusy] = useState(false)
  // 框选编辑（图片区域框选模式，入口在底部「标注工具」菜单）：在图片上随意框选区域（可多次），标记自动带入左侧 AI 对话发送区，发送后标识自动消失
  const [regionMode, setRegionMode] = useState<string | null>(null)
  const regionModeRef = useRef<string | null>(null)
  regionModeRef.current = regionMode
  const regionDrawRef = useRef<{ x: number; y: number } | null>(null) // 框选起点（相对卡片左上角）
  const [regionLive, setRegionLive] = useState<{ x: number; y: number; w: number; h: number } | null>(null) // 拖拽中的实时矩形

  const [penTool, setPenTool] = useState<PenToolType>('pen')
  const [penClearAsk, setPenClearAsk] = useState(false)
  const penCanvasRef = useRef<HTMLCanvasElement>(null)
  // 已完成笔划的离屏缓存（重绘优化：见 redrawPen）
  const penCacheRef = useRef<HTMLCanvasElement | null>(null)
  const penCacheDirtyRef = useRef(true)
  const drawingRef = useRef<PenStroke | null>(null) // 正在绘制中的笔划
  // 贝塞尔曲线工具（点击落锚点、按住拖拽拉出对称手柄、双击/Enter 落笔、Esc 取消）
  const bezAnchorsRef = useRef<BezAnchor[] | null>(null)
  const bezDragRef = useRef(false) // 当前是否按住拖拽拉手柄
  const bezHoverRef = useRef<{ x: number; y: number } | null>(null) // 光标预览位置
  const penBaseRef = useRef<PenStroke[]>([]) // 进入编辑态时的笔划快照（用于「取消」）
  const penRafRef = useRef(0)
  const strokesRef = useRef<PenStroke[]>([])
  strokesRef.current = strokes
  useEffect(() => {
    setCombineFmt(false)
  }, [selStrokeIds])
  const penOnRef = useRef(penOn)
  penOnRef.current = penOn
  const genFrameInputRef = useRef<HTMLInputElement>(null)
  // 面板提醒高亮 / 全局轻提示
  const [panelPulse, setPanelPulse] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  // AI 结果卡片：…菜单展开态 / 详情二级页
  const [detailId, setDetailId] = useState<string | null>(null)
  const [detailInfo, setDetailInfo] = useState(true)
  const toastTimer = useRef<number | undefined>(undefined)
  const showToast = (msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(null), 2000)
  }
  /* ---------- 局部截图（胶囊导航「框选编辑」右侧入口）：截取画布任意区域，截图卡片放到被截取区域右侧 ---------- */
  const [shotMode, setShotMode] = useState(false)
  const [shotRect, setShotRect] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null)
  const shotModeRef = useRef(false)
  const shotStartRef = useRef<{ x: number; y: number } | null>(null)
  const shotBusyRef = useRef(false)
  useEffect(() => {
    shotModeRef.current = shotMode
  }, [shotMode])
  const exitShot = () => {
    setShotMode(false)
    setShotRect(null)
    shotStartRef.current = null
  }
  const shotMouseDown = (e: RMouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || shotBusyRef.current) return
    const rect = containerRef.current!.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    shotStartRef.current = { x, y }
    setShotRect({ x0: x, y0: y, x1: x, y1: y })
  }
  const shotMouseMove = (e: RMouseEvent<HTMLDivElement>) => {
    const st = shotStartRef.current
    if (!st) return
    const rect = containerRef.current!.getBoundingClientRect()
    setShotRect({ x0: st.x, y0: st.y, x1: e.clientX - rect.left, y1: e.clientY - rect.top })
  }
  const shotMouseUp = () => {
    const r = shotRect
    const st = shotStartRef.current
    setShotRect(null)
    shotStartRef.current = null
    if (!r || !st || shotBusyRef.current) return
    const x = Math.min(r.x0, r.x1)
    const y = Math.min(r.y0, r.y1)
    const w = Math.abs(r.x1 - r.x0)
    const h = Math.abs(r.y1 - r.y0)
    if (w < 8 || h < 8) return // 过小视为误点忽略
    shotBusyRef.current = true
    setShotMode(false) // 先退出截图态：遮罩隐藏后再渲染截取，避免遮罩与提示条入图
    void (async () => {
      try {
        await new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)))
        const { default: html2canvas } = await import('html2canvas')
        const scale = 2 // 2 倍渲染保证截图清晰度
        const full = await html2canvas(containerRef.current!, { scale, useCORS: true, backgroundColor: canvasColor })
        const cv = document.createElement('canvas')
        cv.width = Math.max(1, Math.round(w * scale))
        cv.height = Math.max(1, Math.round(h * scale))
        const ctx = cv.getContext('2d')
        if (!ctx) return
        ctx.drawImage(full, Math.round(x * scale), Math.round(y * scale), cv.width, cv.height, 0, 0, cv.width, cv.height)
        const url = cv.toDataURL('image/png')
        /* 世界坐标换算 */
        const wx = (x - view.x) / view.k
        const wy = (y - view.y) / view.k
        const ww = w / view.k
        const wh = h / view.k
        /* 定位被截取的源图片卡：与截取区域相交面积最大的图片卡；
           截图排列在该图片的右侧部位（与截取区域同高，间距 40）；未截取到图片时退化为区域右侧 */
        let anchorRight: number | null = null
        let best = 0
        for (const c of cardsRef.current) {
          if (!c.img) continue
          const ix = Math.max(0, Math.min(wx + ww, c.x + c.w) - Math.max(wx, c.x))
          const iy = Math.max(0, Math.min(wy + wh, c.y + cardH(c)) - Math.max(wy, c.y))
          const area = ix * iy
          if (area > best) {
            best = area
            anchorRight = c.x + c.w
          }
        }
        pushCanvasHistory()
        setCards((cs) => [
          ...cs,
          {
            id: `shot-${Date.now()}`,
            tag: '局部截图',
            x: (anchorRight ?? wx + ww) + 40,
            y: wy,
            w: ww,
            imgH: wh,
            kind: 'gen' as const,
            img: url,
          },
        ])
        showToast(anchorRight !== null ? '局部截图已生成，排列在被截取图片的右侧' : '局部截图已生成，放置在被截取区域右侧')
      } finally {
        shotBusyRef.current = false
      }
    })()
  }
  const [dragOver, setDragOver] = useState(false)

  const containerRef = useRef<HTMLDivElement>(null)
  const panRef = useRef<{ startX: number; startY: number; viewX: number; viewY: number } | null>(null)
  const dragRef = useRef<{ id: string; startX: number; startY: number; starts: Record<string, { x: number; y: number }>; strokeOrig?: Record<string, Array<{ x: number; y: number }>>; strokePrev?: PenStroke[]; strokesMoved?: boolean; histPrev?: CanvasSnap } | null>(null)
  const resizeRef = useRef<{ id: string; startX: number; startW: number; histPrev?: CanvasSnap } | null>(null)
  const marqueeRef = useRef<{ startWX: number; startWY: number; additive: boolean; base: string[]; baseStrokes: string[] } | null>(null)
  // 多选整体缩放：以对角逐点为锚点，等比缩放所有选中卡片（缩放倍数无上限）
  const groupResizeRef = useRef<{
    ax: number
    ay: number
    startDist: number
    orig: Record<string, { x: number; y: number; w: number; imgH: number }>
    histPrev?: CanvasSnap
  } | null>(null)
  const genCountRef = useRef(0)
  const initialized = useRef(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const markSeq = useRef(0)
  const dragDepth = useRef(0)
  const stackRef = useRef<HTMLDivElement>(null)

  // 初始定位：让卡片组呈现在画布中部偏左（右侧留给对话面板）
  useEffect(() => {
    if (initialized.current || !containerRef.current) return
    initialized.current = true
    const rect = containerRef.current.getBoundingClientRect()
    if (projectBridge && cards.length) {
      const x = Math.min(...cards.map(c => c.x)), y = Math.min(...cards.map(c => c.y))
      const w = Math.max(...cards.map(c => c.x + c.w)) - x, h = Math.max(...cards.map(c => c.y + (c.imgH ?? 240) + 50)) - y
      const k = Math.min(1.25, Math.max(.15, Math.min((rect.width - 80) / w, (rect.height - 120) / h)))
      setView({ x: (rect.width - w * k) / 2 - x * k, y: (rect.height - h * k) / 2 - y * k, k }); return
    }
    const k = Math.min(1, Math.max(0.4, (rect.height - 200) / 1560))
    setView({
      x: rect.width * 0.36 - 60 * k,
      y: 55 - 40 * k,
      k,
    })
  }, [])

  // 卡片状态镜像（供交付/聚焦逻辑读取最新卡片）
  const cardsRef = useRef(cards)
  cardsRef.current = cards
  // 卡片选中集镜像（Delete 快捷键读取最新选中）
  const selectedRef = useRef(selected)
  selectedRef.current = selected
  // 最近一批交付节点组的卡片 id + 完整卡片规格（卡片被删除后可按原规格重建带回画布）
  const deliverGroupRef = useRef<string[]>([])
  const deliverCardsRef = useRef<Card[]>([])

  // 将视野定位到指定卡片组（Fit View）
  const fitToIds = (ids: string[]) => {
    const rect = containerRef.current?.getBoundingClientRect()
    const list = cardsRef.current.filter((c) => ids.includes(c.id))
    if (!rect || !list.length) return
    const x0 = Math.min(...list.map((c) => c.x))
    const x1 = Math.max(...list.map((c) => c.x + c.w))
    const y0 = Math.min(...list.map((c) => c.y))
    const y1 = Math.max(...list.map((c) => c.y + cardH(c)))
    const k = Math.min(1, Math.max(0.2, Math.min((rect.width - 200) / (x1 - x0), (rect.height - 200) / (y1 - y0))))
    setView({ k, x: (rect.width - (x1 - x0) * k) / 2 - x0 * k, y: (rect.height - (y1 - y0) * k) / 2 - y0 * k })
  }

  // AI 对话交付：在现有内容右侧生成 2 列网格设计节点组，并定位视野
  useEffect(() => {
    if (!deliver) return
    const cs = cardsRef.current
    // 框选编辑/标记任务：生成结果同步放到原图的正下方；其余任务：放到现有内容右侧
    const anchor = deliver.anchorCardId ? cs.find((c) => c.id === deliver.anchorCardId) : undefined
    const right = anchor ? anchor.x - 90 : cs.length ? Math.max(...cs.map((c) => c.x + c.w)) : 0
    const top = anchor ? anchor.y + cardH(anchor) + 40 : cs.length ? Math.min(...cs.map((c) => c.y)) : 0
    const news: Card[] = []
    const ids: string[] = []
    for (let i = 0; i < deliver.n; i++) {
      const id = `deliver-${deliver.ts}-${i}`
      ids.push(id)
      news.push({
        id,
        tag: deliver.title,
        kind: 'gen',
        // 与对话画廊图片严格同索引，保证「点击图片 → 定位画布」所见即所达
        palette: i % GEN_PALETTES.length,
        viewLabel: deliver.views?.[i],
        x: right + 90 + (i % 2) * 372,
        y: top + Math.floor(i / 2) * 432,
        w: 320,
        imgH: 360,
        ts: deliver.ts,
      })
    }
    deliverGroupRef.current = ids
    deliverCardsRef.current = news
    setCards([...cs, ...news])
    // 等卡片渲染后定位视野到新节点组
    setTimeout(() => fitToIds(ids), 60)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deliver])

  // 点击图片/在画布中打开：定位到对应交付卡片（无索引时定位整个节点组）；
  // 卡片已被用户删除时，按交付时的原规格在原位置重建，自动带回无限画布
  useEffect(() => {
    if (!focusSignal || !focusSignal.ts) return
    const g = deliverGroupRef.current
    if (focusSignal.index != null && g[focusSignal.index]) {
      const id = g[focusSignal.index]
      if (!cardsRef.current.some((c) => c.id === id)) {
        const spec = deliverCardsRef.current[focusSignal.index]
        if (!spec) return
        pushCanvasHistory()
        setCards((cs) => [...cs, { ...spec }])
        setTimeout(() => {
          setSelected([id])
          fitToIds([id])
        }, 60)
        return
      }
      setSelected([id])
      fitToIds([id])
    } else {
      fitToIds(g)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusSignal])

  // Esc 退出 AI 辅助工具 / 画笔编辑态（自动保存）/ 关闭浮层；H=拖拽 C=点选编辑 V=框选编辑 E=画笔（再按退出）
  const aiToolRef = useRef(aiTool)
  aiToolRef.current = aiTool
  const togglePenRef = useRef<() => void>(() => {})
  const commitBezRef = useRef<() => void>(() => {})
  const toggleRegionRef = useRef<() => void>(() => {})
  const discardPointBubbleRef = useRef<() => void>(() => {})
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (bubbleOpenRef.current) {
          discardPointBubbleRef.current() // Esc：优先丢弃待定点/关闭编辑气泡（工具与已提交标记保留）
          return
        }
        if (genPickModeRef.current) {
          setGenPickMode(false) // Esc：退出生成器「从画布中选择参考」
          return
        }
        if (shotModeRef.current) {
          exitShot() // Esc：退出局部截图模式
          return
        }
        if (eraseModeRef.current) {
          cancelAiErase() // Esc：优先退出 AI 擦除编辑态
          return
        }
        if (regionModeRef.current) {
          exitRegionEdit() // Esc：退出框选编辑模式（已框选的标记保留）
          return
        }
        if (!penOnRef.current && selStrokeIdsRef.current.length) {
          setSelStrokeIds([]) // Esc：优先取消浮动笔划选中
          return
        }
        setAiTool(null)
        setAiMenu(false)
        setImportMenu(false)
        setModeMenu(false)
        if (penOnRef.current) {
          if (symPlacingRef.current) {
            setSymPlacing(false) // Esc：取消中线标定（保持对称关闭）
            setPenSym(false)
            setSymAxis(null)
            setSymGuide(false)
            symPlacingRef.current = false
            symAxisRef.current = null
            symGuideRef.current = false
            symHoverRef.current = null
            redrawPen()
            return
          }
          if (bezAnchorsRef.current) {
            bezAnchorsRef.current = null // Esc：优先取消进行中的贝塞尔曲线
            bezDragRef.current = false
            bezHoverRef.current = null
            redrawPen()
            return
          }
          if (drawingRef.current) {
            drawingRef.current = null // Esc：优先取消进行中的笔划（如直线预览）
            redrawPen()
          } else {
            togglePenRef.current() // 无进行中笔划：退出画笔，自动保存
          }
        }
        return
      }
      const t = e.target as HTMLElement
      const delKey = e.key === 'Delete' || e.key === 'Backspace'
      // 选中图片自动带入发送区后焦点进入聊天输入框：输入框为空且存在画布选中对象时，Delete/Backspace 删除选中图片/笔划（输入框有文字时保持文本编辑优先）；输入框为空时 Ctrl/⌘+Z 放行到画布撤销（空输入框无文本可撤销）
      if (t.closest('input, textarea') || t.isContentEditable) {
        const fieldEmpty = typeof (t as HTMLTextAreaElement).value === 'string' && (t as HTMLTextAreaElement).value === ''
        const undoKey = (e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'z' || e.key === 'Z')
        const toolKey = e.key === 'c' || e.key === 'C' || e.key === 'v' || e.key === 'V'
        // 放行仅限聊天输入框（textarea，选中图片后焦点自动进入）：点选气泡等小 input 一律不透传，否则输入含 C/V 的拼音会误触快捷键导致气泡闪退
        const pass =
          t.tagName === 'TEXTAREA' &&
          ((delKey && fieldEmpty && (selectedRef.current.length > 0 || selStrokeIdsRef.current.length > 0)) ||
            (undoKey && fieldEmpty && !penOnRef.current) ||
            (toolKey && fieldEmpty)) // 空输入框：C=点选编辑 / V=框选编辑 放行到画布
        if (!pass) return
        if (toolKey && fieldEmpty) e.preventDefault() // 快捷键字符不落入输入框，保持为空以便连续切换
      }
      if (e.key === 'Enter' && penOnRef.current && bezAnchorsRef.current) {
        e.preventDefault()
        commitBezRef.current() // Enter：贝塞尔曲线落笔
        return
      }
      // 撤销（回退）：Ctrl+Z（Windows/Linux）或 ⌘+Z（macOS）——画笔编辑态回退上一笔，画布编辑态回退最近一次编辑，支持连续多次回退
      if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault()
        if (penOnRef.current) undoPenRef.current()
        else undoCanvasRef.current()
        return
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (delKey) {
        // 删除：优先移除选中的图片/图层对象（可 Ctrl/⌘+Z 撤销）
        if (selectedRef.current.length) {
          e.preventDefault()
          deleteCardsRef.current(selectedRef.current)
          return
        }
        if (selStrokeIdsRef.current.length) {
          // 删除当前选中的全部浮动笔划（可撤销）
          const ids = selStrokeIdsRef.current
          pushCanvasHistoryRef.current()
          setPastStrokes((pp) => [...pp.slice(-PEN_HISTORY_LIMIT + 1), strokesRef.current])
          setFutureStrokes([])
          setStrokes(strokesRef.current.filter((x) => !ids.includes(x.id)))
          setSelStrokeIds([])
          return
        }
      }
      if (e.key === 'h' || e.key === 'H') selectMode(true)
      if (e.key === 'v' || e.key === 'V') toggleRegionRef.current() // V=框选编辑（需先在画布上单选一张图片）
      if (e.key === 'c' || e.key === 'C') activateTool(aiToolRef.current ? null : 'mark') // C=点选编辑（再按退出）
      if (e.key === 'e' || e.key === 'E') togglePenRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // 选择模式下按住空格：临时切换为拖拽平移（常规画布交互）
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target as HTMLElement).closest('input, textarea')) {
        e.preventDefault()
        setSpaceDown(true)
      }
    }
    const up = (e: KeyboardEvent) => {
      if (e.code === 'Space') setSpaceDown(false)
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
    }
  }, [])

  const toWorld = (e: { clientX: number; clientY: number }) => {
    const rect = containerRef.current!.getBoundingClientRect()
    return { wx: (e.clientX - rect.left - view.x) / view.k, wy: (e.clientY - rect.top - view.y) / view.k }
  }

  // 退出画笔（自动保存笔划）：供「标注工具 / 选择拖拽模式 / AI 任务模块 / 生成图片」等与画笔互斥的功能调用
  const exitPen = () => {
    // 画笔编辑结束（自动保存）：相对进入时有改动 → 编辑前快照入画布撤销栈（Ctrl/⌘+Z 可整体回退本次画笔编辑）
    if (strokesRef.current !== penBaseRef.current) pushCanvasHistory({ cards: cardsRef.current, strokes: penBaseRef.current })
    setPenOn(false)
    setPenClearAsk(false)
    setSelStrokeIds([])
    selDragRef.current = null
    // 完成 / 退出画笔：左右对称参考线随编辑态一起释放
    setPenSym(false)
    setSymPlacing(false)
    setSymAxis(null)
    setSymGuide(false)
    symPlacingRef.current = false
    symAxisRef.current = null
    symGuideRef.current = false
    symHoverRef.current = null
    bezAnchorsRef.current = null // 退出编辑态：丢弃未落笔的贝塞尔路径
    bezDragRef.current = false
    bezHoverRef.current = null
  }

  // 激活/退出 AI 辅助工具（激活时切到选择模式，便于点选卡片；与画笔、AI 任务模块互斥，避免点击逻辑冲突）
  const activateTool = (t: 'mark' | null) => {
    setAiTool(t)
    setAiMenu(false)
    if (!t) discardPointBubbleRef.current() // 退出点选编辑：丢弃待定点（已提交标记保留）
    if (t) {
      setPanOn(false)
      setGenPickMode(false) // 与生成器「从画布中选择」互斥
      if (penOnRef.current) exitPen() // 标注需要点选卡片：先退出画笔，避免笔划层拦截点击
      if (eraseModeRef.current) cancelAiErase() // 退出 AI 擦除：其点击分支优先于标注，不退出会导致标注失效
      if (regionModeRef.current) exitRegionEdit() // 退出框选编辑：同上（已框选的标记保留）
      setGenBarOn(false) // 收起 AI 任务模块，避免浮层堆叠
    }
  }

  // 切换画布操作模式：选择 / 拖拽
  const selectMode = (pan: boolean) => {
    setPanOn(pan)
    setModeMenu(false)
    setAiTool(null)
    if (pan && penOnRef.current) exitPen() // 拖拽平移与画笔互斥：画笔层会拦截画布拖拽
  }

  /* ================= 「画笔」自由画线标记 ================= */
  // 单条笔划绘制：pen=原始折线 / line=起点到终点直线 / curve=已平滑折线 / erase=擦除（destination-out）
  const drawStrokeOn = (ctx: CanvasRenderingContext2D, s: PenStroke) => {
    const pts = s.points
    if (pts.length === 0) return
    ctx.save()
    if (s.tool === 'erase') {
      ctx.globalCompositeOperation = 'destination-out'
      ctx.strokeStyle = 'rgba(0,0,0,1)'
      ctx.fillStyle = 'rgba(0,0,0,1)'
    } else {
      ctx.strokeStyle = s.color
      ctx.fillStyle = s.color
    }
    if (s.preview) ctx.globalAlpha = 0.5 // 直线松手前：半透明预览
    ctx.lineWidth = s.width // 橡皮擦：width 即擦除直径
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    if (s.tool === 'pencil') {
      // 2B 铅笔：柔边铺底 + 逐段压力变化主干（两端收尖）+ 石墨颗粒，模拟铅芯在纸面上的灰度、绒边与颗粒触感
      // 所有随机均按点序确定性生成，同一笔划重渲染结果稳定
      const rnd = (n: number) => {
        const x = Math.sin(n * 127.1 + 311.7) * 43758.5453
        return x - Math.floor(x)
      }
      const baseA = s.preview ? 0.5 : 1
      if (pts.length === 1) {
        // 单点：一小团石墨（柔边 + 颗粒；不用 shadowBlur，避免高频重绘时频闪）
        ctx.globalAlpha = 0.14 * baseA
        ctx.beginPath()
        ctx.arc(pts[0].x, pts[0].y, s.width * 0.85, 0, Math.PI * 2)
        ctx.fill()
        ctx.globalAlpha = 0.3 * baseA
        ctx.beginPath()
        ctx.arc(pts[0].x, pts[0].y, s.width * 0.5, 0, Math.PI * 2)
        ctx.fill()
        for (let k = 0; k < 6; k++) {
          ctx.globalAlpha = (0.12 + rnd(k * 31.7) * 0.2) * baseA
          ctx.beginPath()
          ctx.arc(pts[0].x + (rnd(k * 13.1) - 0.5) * s.width, pts[0].y + (rnd(k * 17.7) - 0.5) * s.width, s.width * (0.1 + rnd(k * 11.3) * 0.22), 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.restore()
        return
      }
      // 平滑致密点列：中点二次贝塞尔采样，消除折角，运笔更顺畅
      const sm = smoothPenPoints(pts)
      const n = sm.length
      const jit = (i: number, k: number, amp: number) => (rnd(i * 37.13 + k * 91.7) - 0.5) * amp
      // ① 柔边铺底：两遍宽线低透明叠描形成铅笔绒边（不用 shadowBlur：每帧全量重绘时阴影会造成频闪与掉帧）
      ctx.beginPath()
      ctx.moveTo(sm[0].x, sm[0].y)
      for (let i = 1; i < n; i++) ctx.lineTo(sm[i].x, sm[i].y)
      ctx.globalAlpha = 0.09 * baseA
      ctx.lineWidth = s.width * 1.45
      ctx.stroke()
      ctx.globalAlpha = 0.13 * baseA
      ctx.lineWidth = s.width * 1.2
      ctx.stroke()
      // ② 主干：逐段绘制，沿线模拟运笔压力（低频起伏保证线条连续，深浅/粗细随压力变化），起笔收笔自然收尖
      const phase = rnd(n * 7.7) * Math.PI * 2 // 每条笔划一个随机压力相位
      for (let i = 1; i < n; i++) {
        const taper = Math.min(1, Math.min(i, n - 1 - i) / 12 + 0.25) // 端部渐细（按平滑后点序）
        const press = 0.88 + 0.24 * Math.sin(i * 0.11 + phase) + (rnd(i * 3.7) - 0.5) * 0.1 // 平滑压力（低频）
        ctx.globalAlpha = (0.5 + 0.2 * Math.sin(i * 0.11 + phase) + rnd(i * 9.1) * 0.12) * baseA // 墨量随压力，底线保证连续
        ctx.lineWidth = Math.max(0.4, s.width * taper * press)
        ctx.beginPath()
        ctx.moveTo(sm[i - 1].x + jit(i - 1, 1, s.width * 0.1), sm[i - 1].y + jit(i - 1, 2, s.width * 0.1))
        ctx.lineTo(sm[i].x + jit(i, 1, s.width * 0.1), sm[i].y + jit(i, 2, s.width * 0.1))
        ctx.stroke()
      }
      // ③ 石墨颗粒：沿线随机撒点，模拟铅芯在纸纹上的颗粒沉积
      for (let i = 0; i < n; i++) {
        if (rnd(i * 5.3) < 0.55) continue // 约半数位置出颗粒，密度自然
        ctx.globalAlpha = (0.08 + rnd(i * 7.7) * 0.16) * baseA
        ctx.beginPath()
        ctx.arc(
          sm[i].x + (rnd(i * 13.1) - 0.5) * s.width * 1.1,
          sm[i].y + (rnd(i * 17.7) - 0.5) * s.width * 1.1,
          Math.max(0.2, s.width * (0.1 + rnd(i * 11.3) * 0.26)),
          0,
          Math.PI * 2,
        )
        ctx.fill()
      }
      ctx.restore()
      return
    }
    if (s.dash && s.tool !== 'erase') {
      const ds = s.dashScale ?? 1 // 虚线疏密倍率
      ctx.setLineDash([s.width * 2.5 * ds, s.width * 1.8 * ds])
    }
    ctx.beginPath()
    if (pts.length === 1) {
      // 单点：画一个圆点
      ctx.moveTo(pts[0].x + s.width / 2, pts[0].y)
      ctx.arc(pts[0].x, pts[0].y, s.width / 2, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
      return
    }
    if (s.tool === 'line') {
      // 直线：起点到终点，保持笔直
      ctx.moveTo(pts[0].x, pts[0].y)
      ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
    } else {
      // 画笔 / 曲线 / 橡皮擦：中点二次贝塞尔平滑，笔迹顺畅无折角
      ctx.moveTo(pts[0].x, pts[0].y)
      if (pts.length === 2) ctx.lineTo(pts[1].x, pts[1].y)
      for (let i = 1; i < pts.length - 1; i++) {
        ctx.quadraticCurveTo(pts[i].x, pts[i].y, (pts[i].x + pts[i + 1].x) / 2, (pts[i].y + pts[i + 1].y) / 2)
      }
      if (pts.length > 2) ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y)
    }
    ctx.stroke()
    ctx.restore()
  }

  // 贝塞尔段展平为致密点列（每段 24 细分），用于最终落笔存储与命中检测
  const flattenBez = (anchors: BezAnchor[]) => {
    const pts: Array<{ x: number; y: number }> = []
    if (!anchors.length) return pts
    pts.push({ x: anchors[0].x, y: anchors[0].y })
    for (let i = 1; i < anchors.length; i++) {
      const a = anchors[i - 1]
      const b = anchors[i]
      for (let j = 1; j <= 24; j++) {
        const t = j / 24
        const mt = 1 - t
        pts.push({
          x: mt * mt * mt * a.x + 3 * mt * mt * t * a.o2x + 3 * mt * t * t * b.o1x + t * t * t * b.x,
          y: mt * mt * mt * a.y + 3 * mt * mt * t * a.o2y + 3 * mt * t * t * b.o1y + t * t * t * b.y,
        })
      }
    }
    return pts
  }

  // 左右对称：点集关于中线（世界坐标 x）镜像
  const mirrorPts = (pts: Array<{ x: number; y: number }>, ax: number) => pts.map((pt) => ({ x: 2 * ax - pt.x, y: pt.y }))

  // 全量重绘：屏幕尺寸对齐 + 世界坐标变换（笔划随画布平移/缩放）
  const redrawPen = () => {
    const cv = penCanvasRef.current
    const rect = containerRef.current?.getBoundingClientRect()
    if (!cv || !rect) return
    // 高 DPI 超采样：按设备像素比分配画布像素，笔划边缘无锯齿（CSS 尺寸不变）
    const dpr = Math.max(1, window.devicePixelRatio || 1)
    const bw = Math.max(1, Math.round(rect.width * dpr))
    const bh = Math.max(1, Math.round(rect.height * dpr))
    if (cv.width !== bw || cv.height !== bh) {
      cv.width = bw
      cv.height = bh
    }
    const ctx = cv.getContext('2d')
    if (!ctx) return
    const v = viewRef.current
    // 已完成笔划离屏缓存：仅在笔划/视图/尺寸变化时重建；绘制中每帧只合成缓存 + 当前笔划，消除高频全量重绘的频闪/掉帧
    let cache = penCacheRef.current
    if (!cache) {
      cache = document.createElement('canvas')
      penCacheRef.current = cache
    }
    if (cache.width !== bw || cache.height !== bh) {
      cache.width = bw
      cache.height = bh
      penCacheDirtyRef.current = true
    }
    if (penCacheDirtyRef.current) {
      const cctx = cache.getContext('2d')!
      cctx.setTransform(1, 0, 0, 1, 0, 0)
      cctx.clearRect(0, 0, bw, bh)
      cctx.setTransform(v.k * dpr, 0, 0, v.k * dpr, v.x * dpr, v.y * dpr)
      strokesRef.current.forEach((s) => drawStrokeOn(cctx, s))
      penCacheDirtyRef.current = false
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    ctx.clearRect(0, 0, cv.width, cv.height)
    ctx.drawImage(cache, 0, 0)
    ctx.setTransform(v.k * dpr, 0, 0, v.k * dpr, v.x * dpr, v.y * dpr)
    if (drawingRef.current) {
      drawStrokeOn(ctx, drawingRef.current)
      const d = drawingRef.current
      if (d.axis != null) drawStrokeOn(ctx, { ...d, points: mirrorPts(d.points, d.axis) }) // 对称镜像预览
    }
    // 贝塞尔曲线编辑中：路径 + 光标预览段 + 锚点/手柄可视化
    const bez = bezAnchorsRef.current
    if (bez && bez.length) {
      const traceBez = (anchors: BezAnchor[], hover: { x: number; y: number } | null) => {
        ctx.beginPath()
        ctx.moveTo(anchors[0].x, anchors[0].y)
        for (let i = 1; i < anchors.length; i++) {
          const a = anchors[i - 1]
          const b = anchors[i]
          ctx.bezierCurveTo(a.o2x, a.o2y, b.o1x, b.o1y, b.x, b.y)
        }
        if (hover) {
          const last = anchors[anchors.length - 1]
          ctx.bezierCurveTo(last.o2x, last.o2y, hover.x, hover.y, hover.x, hover.y)
        }
      }
      ctx.save()
      ctx.strokeStyle = penColor
      ctx.lineWidth = penWidth
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'
      if (penDash) ctx.setLineDash([penWidth * 2.5, penWidth * 1.8])
      traceBez(bez, bezHoverRef.current)
      ctx.stroke()
      if (penSym && symAxis != null) {
        const mir = bez.map((a) => ({ x: 2 * symAxis - a.x, y: a.y, o1x: 2 * symAxis - a.o1x, o1y: a.o1y, o2x: 2 * symAxis - a.o2x, o2y: a.o2y }))
        const mh = bezHoverRef.current ? { x: 2 * symAxis - bezHoverRef.current.x, y: bezHoverRef.current.y } : null
        ctx.globalAlpha = 0.55
        traceBez(mir, mh)
        ctx.stroke()
      }
      ctx.restore()
      // 锚点与手柄（屏幕像素恒定，随缩放换算）
      ctx.save()
      bez.forEach((a, i) => {
        const drawHandle = (hx: number, hy: number) => {
          if (Math.hypot(hx - a.x, hy - a.y) < 1 / v.k) return
          ctx.beginPath()
          ctx.moveTo(a.x, a.y)
          ctx.lineTo(hx, hy)
          ctx.strokeStyle = 'rgba(42,104,254,0.55)'
          ctx.lineWidth = 1 / v.k
          ctx.stroke()
          ctx.beginPath()
          ctx.arc(hx, hy, 3.2 / v.k, 0, Math.PI * 2)
          ctx.fillStyle = '#2A68FE'
          ctx.fill()
        }
        drawHandle(a.o1x, a.o1y)
        drawHandle(a.o2x, a.o2y)
        ctx.beginPath()
        if (i === bez.length - 1) {
          ctx.fillStyle = '#2A68FE'
          ctx.arc(a.x, a.y, 4 / v.k, 0, Math.PI * 2)
          ctx.fill()
        } else {
          const hs = 4.5 / v.k
          ctx.fillStyle = '#ffffff'
          ctx.strokeStyle = '#2A68FE'
          ctx.lineWidth = 1.4 / v.k
          ctx.fillRect(a.x - hs, a.y - hs, hs * 2, hs * 2)
          ctx.strokeRect(a.x - hs, a.y - hs, hs * 2, hs * 2)
        }
      })
      ctx.restore()
    }
    // 对称中线辅助线：标定中跟随鼠标；标定后固定显示并持续作为参考，直到取消对称 / 取消 / 完成退出
    const gx = symPlacingRef.current ? symHoverRef.current : symGuideRef.current ? symAxisRef.current : null
    if (gx != null) {
      ctx.save()
      ctx.strokeStyle = '#2A68FE'
      ctx.lineWidth = 1.2 / v.k
      ctx.setLineDash([6 / v.k, 5 / v.k])
      ctx.beginPath()
      ctx.moveTo(gx, (0 - v.y) / v.k)
      ctx.lineTo(gx, (rect.height - v.y) / v.k)
      ctx.stroke()
      ctx.restore()
    }
    // 选中的浮动笔划：逐条画出虚线包围盒高亮（屏幕像素恒定，随缩放换算）
    const selIds = selStrokeIdsRef.current
    if (selIds.length) {
      strokesRef.current.forEach((st) => {
        if (!selIds.includes(st.id) || !st.points.length) return
        const pad = 6 / v.k + st.width / 2
        const xs = st.points.map((p) => p.x)
        const ys = st.points.map((p) => p.y)
        ctx.save()
        ctx.strokeStyle = '#2A68FE'
        ctx.lineWidth = 1.2 / v.k
        ctx.setLineDash([5 / v.k, 4 / v.k])
        ctx.strokeRect(Math.min(...xs) - pad, Math.min(...ys) - pad, Math.max(...xs) - Math.min(...xs) + pad * 2, Math.max(...ys) - Math.min(...ys) + pad * 2)
        ctx.restore()
      })
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0)
  }

  // 笔划/视图变化时重绘（含编辑态外的持久展示）；容器尺寸变化同步画布像素
  const viewRef = useRef(view)
  viewRef.current = view
  useEffect(() => {
    penCacheDirtyRef.current = true // 笔划/视图变化：离屏缓存失效重建
    redrawPen()
  }, [strokes, view, penOn, selStrokeIds])
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(() => redrawPen())
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // 进入/退出编辑态（toggle）：进入时快照笔划供「取消」恢复；退出（含再次点入口）自动保存
  const togglePen = () => {
    if (penOn) {
      exitPen() // 自动保存：笔划保留在画布上
      return
    }
    penBaseRef.current = strokesRef.current
    setPenOn(true)
    setPenClearAsk(false)
    setSelStrokeIds([])
    selDragRef.current = null
    // 关闭冲突的工具/浮层（与标注工具、AI 任务模块互斥，保证点击逻辑不冲突）
    setAiTool(null)
    setAiMenu(false)
    setImportMenu(false)
    setModeMenu(false)
    setPanOn(false)
    setGenBarOn(false)
  }
  togglePenRef.current = togglePen

  // 左右对称开关：开启进入中线标定（先定准中线再画线）；再次点击取消并清除中线参考
  const toggleSym = () => {
    if (penSym) {
      setPenSym(false)
      setSymPlacing(false)
      setSymAxis(null)
      setSymGuide(false)
      symPlacingRef.current = false
      symAxisRef.current = null
      symGuideRef.current = false
      symHoverRef.current = null
      redrawPen()
    } else {
      setPenSym(true)
      setSymPlacing(true)
      setSymAxis(null)
      setSymGuide(true)
      symPlacingRef.current = true
      symAxisRef.current = null
      symGuideRef.current = true
      symHoverRef.current = null
      redrawPen()
    }
  }
  // 统一提交：当前状态入撤销栈（限深 50），重做栈失效
  const commitStrokes = (next: PenStroke[]) => {
    setPastStrokes((p) => [...p.slice(-PEN_HISTORY_LIMIT + 1), strokesRef.current])
    setFutureStrokes([])
    setStrokes(next)
  }

  /* ================= 画布编辑历史（Ctrl/⌘+Z 撤销） ================= */
  const CANVAS_HISTORY_LIMIT = 50
  const [, setPastCanvas] = useState<CanvasSnap[]>([])
  const pastCanvasRef = useRef<CanvasSnap[]>([])
  // 操作前快照入栈（限深 50）：删除/移动/缩放/排列/编组/合并/复制/粘贴/导入/生成等每个离散编辑动作调用一次
  const pushCanvasHistory = (snap?: CanvasSnap) => {
    const shot = snap ?? { cards: cardsRef.current, strokes: strokesRef.current }
    const next = [...pastCanvasRef.current.slice(-(CANVAS_HISTORY_LIMIT - 1)), shot]
    pastCanvasRef.current = next
    setPastCanvas(next)
  }
  const pushCanvasHistoryRef = useRef(pushCanvasHistory)
  pushCanvasHistoryRef.current = pushCanvasHistory
  // 撤销上一步操作：还原最近快照；选中集/详情/框选标记随快照校准，避免悬空引用
  const undoCanvas = () => {
    const p = pastCanvasRef.current
    if (!p.length) {
      showToast('没有可撤销的操作')
      return
    }
    const snap = p[p.length - 1]
    const rest = p.slice(0, -1)
    pastCanvasRef.current = rest
    setPastCanvas(rest)
    setCards(snap.cards)
    setStrokes(snap.strokes)
    const cardIds = new Set(snap.cards.map((c) => c.id))
    const strokeIds = new Set(snap.strokes.map((st) => st.id))
    setSelected((s) => s.filter((id) => cardIds.has(id)))
    setSelStrokeIds((s) => s.filter((id) => strokeIds.has(id)))
    if (detailId && !cardIds.has(detailId)) setDetailId(null)
    onMarksChange(marks.filter((m) => cardIds.has(m.cardId)))
    showToast('已撤销上一步操作')
  }
  const undoCanvasRef = useRef(undoCanvas)
  undoCanvasRef.current = undoCanvas
  const undoPenRef = useRef<() => void>(() => {})
  // 删除指定卡片（胶囊/右键菜单/Delete 快捷键统一入口）：先入撤销栈再移除，关联标记与详情同步清理
  const deleteCards = (ids: string[]) => {
    if (!ids.length) return
    pushCanvasHistory()
    setCards((cs) => cs.filter((c) => !ids.includes(c.id)))
    setSelected((s) => s.filter((x) => !ids.includes(x)))
    onMarksChange(marks.filter((m) => !ids.includes(m.cardId)))
    if (detailId && ids.includes(detailId)) setDetailId(null)
    // 图框被删除时联动面板一并释放，避免再次点击功能键时引用失效图框而「激活失灵」
    if (genPanel && ids.includes(genPanel.cardId)) {
      setGenPanel(null)
      setGenPanelExpanded(false)
      setGenPickMode(false)
    }
    if (vidPanel && ids.includes(vidPanel.cardId)) {
      setVidPanel(null)
      setVidPanelExpanded(false)
    }
    showToast(ids.length > 1 ? `已删除 ${ids.length} 张图片，Ctrl/⌘+Z 可撤销` : '已删除图片，Ctrl/⌘+Z 可撤销')
  }
  const deleteCardsRef = useRef(deleteCards)
  deleteCardsRef.current = deleteCards
  // 取消：放弃本次编辑的所有修改
  const cancelPen = () => {
    setStrokes(penBaseRef.current)
    setPastStrokes([])
    setFutureStrokes([])
    drawingRef.current = null
    bezAnchorsRef.current = null // 取消：丢弃未落笔的贝塞尔路径
    bezDragRef.current = false
    bezHoverRef.current = null
    setSelStrokeIds([])
    selDragRef.current = null
    setPenOn(false)
    setPenClearAsk(false)
    // 取消本次画笔编辑：左右对称参考线一并释放
    setPenSym(false)
    setSymPlacing(false)
    setSymAxis(null)
    setSymGuide(false)
    symPlacingRef.current = false
    symAxisRef.current = null
    symGuideRef.current = false
    symHoverRef.current = null
  }
  const undoPen = () => {
    setPastStrokes((p) => {
      if (!p.length) return p
      setFutureStrokes((f) => [...f, strokesRef.current])
      setStrokes(p[p.length - 1])
      return p.slice(0, -1)
    })
  }
  const redoPen = () => {
    setFutureStrokes((f) => {
      if (!f.length) return f
      setPastStrokes((p) => [...p.slice(-PEN_HISTORY_LIMIT + 1), strokesRef.current])
      setStrokes(f[f.length - 1])
      return f.slice(0, -1)
    })
  }
  undoPenRef.current = undoPen // Ctrl/⌘+Z（画笔编辑态）经 ref 调用最新实现
  // 清空：确认气泡中点「清空」后移除所有笔划（可通过撤销恢复）
  const clearPen = () => {
    commitStrokes([])
    setPenClearAsk(false)
  }

  // 「融合」：把落在图片卡片上的笔划写入卡片（随卡片移动/缩放/删除/复制/下载），不再作为浮动图层独立存在
  const mergePenIntoCards = (onlyIds?: string[]) => {
    // 指定 id 集合时仅融合这些笔划（笔划胶囊「合并图层」），否则融合全部（画笔工具栏「融合」）
    const pool = onlyIds ? strokesRef.current.filter((s) => onlyIds.includes(s.id)) : strokesRef.current
    if (!pool.some((s) => s.tool !== 'erase')) {
      showToast('没有可融合的笔划')
      return
    }
    // 卡片图片区域（世界坐标）：卡片为纯图片，图片区域即整张卡片
    const targets = cardsRef.current
      .filter((c) => c.kind !== 'frame')
      .map((c) => ({ c, ix: c.x, iy: c.y, iw: c.w, ih: c.imgH }))
    const assigned = new Map<string, PenStroke[]>()
    const remaining: PenStroke[] = []
    pool.forEach((s) => {
      if (s.tool === 'erase' || !s.points.length) {
        remaining.push(s) // 橡皮擦仅作用于浮动层，不参与融合
        return
      }
      // 归属判定：笔划过半点数落在某卡片图片区域内，则融入该卡片（取占比最高者）
      let best: { id: string; ratio: number } | null = null
      for (const t of targets) {
        const inside = s.points.filter((p) => p.x >= t.ix && p.x <= t.ix + t.iw && p.y >= t.iy && p.y <= t.iy + t.ih).length
        const ratio = inside / s.points.length
        if (ratio >= 0.5 && (!best || ratio > best.ratio)) best = { id: t.c.id, ratio }
      }
      if (best) assigned.set(best.id, [...(assigned.get(best.id) ?? []), s])
      else remaining.push(s)
    })
    const mergedCount = [...assigned.values()].reduce((n, arr) => n + arr.length, 0)
    if (!mergedCount) {
      showToast('笔划未落在任何图片上，无法融合')
      return
    }
    pushCanvasHistory() // 入撤销栈：融合前快照（卡片+笔划）
    setCards((cs) =>
      cs.map((c) => {
        const add = assigned.get(c.id)
        if (!add) return c
        const t = targets.find((tt) => tt.c.id === c.id)!
        // 卡片在两次融合之间被缩放：旧笔划按比例换算到新的图片区域
        const prevStrokes =
          c.merged && (c.merged.boxW !== t.iw || c.merged.boxH !== t.ih)
            ? c.merged.strokes.map((st) => ({
                ...st,
                width: (st.width * t.iw) / c.merged!.boxW,
                points: st.points.map((p) => ({ x: (p.x * t.iw) / c.merged!.boxW, y: (p.y * t.ih) / c.merged!.boxH })),
              }))
            : (c.merged?.strokes ?? [])
        const conv: MergedCardStroke[] = add.map((st) => ({
          id: st.id,
          tool: st.tool as MergedCardStroke['tool'],
          color: st.color,
          width: st.width,
          dash: st.dash,
          dashScale: st.dashScale,
          points: st.points.map((p) => ({ x: p.x - t.ix, y: p.y - t.iy })),
        }))
        return { ...c, merged: { boxW: t.iw, boxH: t.ih, strokes: [...prevStrokes, ...conv] } }
      }),
    )
    // 指定范围融合时，未参与的其余笔划保持不动
    const untouched = onlyIds ? strokesRef.current.filter((s) => !onlyIds.includes(s.id)) : []
    setStrokes([...untouched, ...remaining])
    if (onlyIds) {
      const gone = new Set([...assigned.values()].flat().map((s) => s.id))
      setSelStrokeIds(selStrokeIdsRef.current.filter((id) => !gone.has(id)))
    }
    // 融合为单向操作：清空笔划撤销/重做栈，避免撤销把已融合笔划拉回浮动层造成重复
    setPastStrokes([])
    setFutureStrokes([])
    penBaseRef.current = [...untouched, ...remaining]
    setPenClearAsk(false)
    showToast(`已将 ${mergedCount} 笔融合进 ${assigned.size} 张图片，成为图片内容的一部分`)
  }

  // 笔划胶囊动作（框选笔划后弹出的导航栏，与框选图片一致）：创建编组 / 合并图层 / 删除
  const strokeGroupSel = () => {
    const ids = selStrokeIdsRef.current
    if (ids.length < 2) {
      showToast('请至少框选 2 条笔划进行编组')
      return
    }
    pushCanvasHistory()
    const gid = `sgrp-${Date.now()}`
    commitStrokes(strokesRef.current.map((st) => (ids.includes(st.id) ? { ...st, groupId: gid } : st)))
    showToast(`已创建编组（${ids.length} 条笔划）`)
  }
  const strokeUngroupSel = () => {
    const ids = selStrokeIdsRef.current
    pushCanvasHistory()
    commitStrokes(strokesRef.current.map((st) => (ids.includes(st.id) ? { ...st, groupId: undefined } : st)))
    showToast('已解除编组')
  }
  const strokeDeleteSel = () => {
    const ids = selStrokeIdsRef.current
    if (!ids.length) return
    pushCanvasHistory()
    commitStrokes(strokesRef.current.filter((st) => !ids.includes(st.id)))
    setSelStrokeIds([])
    showToast(`已删除 ${ids.length} 条笔划`)
  }

  // 组合导出落卡：导出的图像按原始笔划位置右侧嵌入画布（等比限制宽度，便于复用与分享）
  const embedCombineCard = (url: string, bw: number, bh: number, x0: number, y0: number, name: string) => {
    pushCanvasHistory()
    const w = Math.round(Math.min(480, Math.max(120, bw)))
    const imgH = Math.round((w * bh) / Math.max(1, bw))
    setCards((cs) => [
      ...cs,
      { id: `cmb-${Date.now()}`, tag: name, x: x0 + bw + 40, y: y0, w, imgH, kind: 'gen' as const, img: url },
    ])
  }

  // 组合：选中笔划合并渲染为 PNG（透明底）/ JPG（白底）/ SVG（矢量）并嵌入画布（仅组合，不自动下载；下载由用户在卡片操作栏自行选择）
  const combineStrokes = (fmt: 'png' | 'jpg' | 'svg') => {
    const ids = selStrokeIdsRef.current
    const list = strokesRef.current.filter((st) => ids.includes(st.id) && st.points.length)
    if (!list.length) return
    const xs = list.flatMap((st) => st.points.map((pt) => pt.x))
    const ys = list.flatMap((st) => st.points.map((pt) => pt.y))
    const pad = Math.max(...list.map((st) => st.width / 2)) + 12
    const x0 = Math.min(...xs) - pad
    const y0 = Math.min(...ys) - pad
    const bw = Math.max(1, Math.max(...xs) - Math.min(...xs) + pad * 2)
    const bh = Math.max(1, Math.max(...ys) - Math.min(...ys) + pad * 2)
    const name = `线条组合-${list.length}条笔划`
    if (fmt === 'svg') {
      const esc = (c: string) => c.replace(/"/g, '&quot;')
      const parts = list.map((st) => {
        if (st.points.length === 1)
          return `<circle cx="${(st.points[0].x - x0).toFixed(1)}" cy="${(st.points[0].y - y0).toFixed(1)}" r="${st.width / 2}" fill="${esc(st.color)}"/>`
        const pts = st.points.map((pt) => `${(pt.x - x0).toFixed(1)},${(pt.y - y0).toFixed(1)}`).join(' ')
        const ds = st.dashScale ?? 1
        const dash = st.dash ? ` stroke-dasharray="${st.width * 2.5 * ds} ${st.width * 1.8 * ds}"` : ''
        return `<polyline points="${pts}" fill="none" stroke="${esc(st.color)}" stroke-width="${st.width}" stroke-linecap="round" stroke-linejoin="round"${dash}/>`
      })
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${Math.round(bw)}" height="${Math.round(bh)}" viewBox="0 0 ${bw.toFixed(1)} ${bh.toFixed(1)}">${parts.join('')}</svg>`
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
      embedCombineCard(url, bw, bh, x0, y0, name)
    } else {
      const scale = 2 // 2x 导出，保证清晰度
      const cv = document.createElement('canvas')
      cv.width = Math.round(bw * scale)
      cv.height = Math.round(bh * scale)
      const ctx = cv.getContext('2d')!
      if (fmt === 'jpg') {
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, cv.width, cv.height)
      }
      ctx.scale(scale, scale)
      ctx.translate(-x0, -y0)
      list.forEach((st) => drawStrokeOn(ctx, st))
      const url = cv.toDataURL(fmt === 'jpg' ? 'image/jpeg' : 'image/png', 0.92)
      embedCombineCard(url, bw, bh, x0, y0, name)
    }
    setCombineFmt(false)
    showToast(`已组合 ${list.length} 条笔划（${fmt.toUpperCase()}）并嵌入画布，可在卡片操作栏下载`)
  }

  // 点到线段距离（橡皮擦「单击擦除整条笔划」的命中检测）
  const distToSeg = (p: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len2 = dx * dx + dy * dy
    if (len2 === 0) return Math.hypot(p.x - a.x, p.y - a.y)
    let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2
    t = Math.max(0, Math.min(1, t))
    return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
  }
  // 单击命中：返回被命中的非擦除笔划 id 集合
  const hitStrokeIds = (p: { x: number; y: number }, radius: number) => {
    const hit = new Set<string>()
    strokesRef.current.forEach((st) => {
      if (st.tool === 'erase') return
      const tol = radius + st.width / 2 + 2 / viewRef.current.k // 额外 2 屏幕像素容差，点击更易命中
      const pts = st.points
      if (pts.length === 1) {
        if (Math.hypot(p.x - pts[0].x, p.y - pts[0].y) <= tol) hit.add(st.id)
        return
      }
      for (let i = 0; i < pts.length - 1; i++) {
        if (distToSeg(p, pts[i], pts[i + 1]) <= tol) {
          hit.add(st.id)
          return
        }
      }
    })
    return hit
  }

  // 工具切换：绘制中（pen/curve/erase 拖拽）忽略；进行中的直线先取消再切换
  const switchPenTool = (t: PenToolType) => {
    if (bezAnchorsRef.current) {
      bezAnchorsRef.current = null // 切换工具：放弃进行中的贝塞尔曲线
      bezDragRef.current = false
      bezHoverRef.current = null
      redrawPen()
    }
    const d = drawingRef.current
    if (d) {
      if (d.tool !== 'line') return // 画笔/曲线/橡皮擦拖拽中：忽略切换
      drawingRef.current = null // 进行中的直线：取消该笔划
      redrawPen()
    }
    setPenTool(t)
  }

  // 绘制层指针事件：坐标经 getBoundingClientRect + 视图变换映射到世界坐标系
  const penDown = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    const { wx, wy } = toWorld(e)
    // 对称中线标定中：本次点击用于确定中线位置，不起笔
    if (penSym && symPlacing) {
      setSymAxis(wx)
      setSymPlacing(false)
      setSymGuide(true)
      symAxisRef.current = wx
      symPlacingRef.current = false
      symGuideRef.current = true
      redrawPen()
      return
    }
    const p = { x: wx, y: wy }
    const axis = penSym && symAxis != null ? symAxis : undefined // 对称开启：以标定的中线为镜像轴
    if (penTool === 'curve') {
      // 贝塞尔曲线：点击落锚点，按住拖拽拉出对称手柄；路径保持开放，双击 / Enter 落笔
      const a: BezAnchor = { x: p.x, y: p.y, o1x: p.x, o1y: p.y, o2x: p.x, o2y: p.y }
      bezAnchorsRef.current = bezAnchorsRef.current ? [...bezAnchorsRef.current, a] : [a]
      bezDragRef.current = true
      bezHoverRef.current = p
      redrawPen()
      return
    }
    if (penTool === 'line') {
      // 直线：起点固定，终点随指针移动（半透明预览）
      drawingRef.current = { id: `s${Date.now()}`, tool: 'line', color: penColor, width: penWidth, points: [p, p], preview: true, dash: penDash, axis }
    } else {
      drawingRef.current = { id: `s${Date.now()}`, tool: penTool, color: penColor, width: penWidth, points: [p], dash: penDash, axis }
    }
    redrawPen()
  }
  const penMove = (e: RPointerEvent<HTMLCanvasElement>) => {
    if (penSym && symPlacing) {
      symHoverRef.current = toWorld(e).wx // 中线预览跟随鼠标
      cancelAnimationFrame(penRafRef.current)
      penRafRef.current = requestAnimationFrame(redrawPen)
      return
    }
    if (penTool === 'curve' && bezAnchorsRef.current) {
      // 贝塞尔编辑中：光标预览跟随；按住拖拽时拉出当前锚点的对称手柄
      const { wx, wy } = toWorld(e)
      bezHoverRef.current = { x: wx, y: wy }
      if (bezDragRef.current) {
        const last = bezAnchorsRef.current[bezAnchorsRef.current.length - 1]
        last.o2x = wx
        last.o2y = wy
        last.o1x = 2 * last.x - wx
        last.o1y = 2 * last.y - wy
      }
      cancelAnimationFrame(penRafRef.current)
      penRafRef.current = requestAnimationFrame(redrawPen)
      return
    }
    const d = drawingRef.current
    if (!d) return
    const { wx, wy } = toWorld(e)
    if (d.tool === 'line') {
      d.points[1] = { x: wx, y: wy } // 直线：只更新终点
    } else {
      const last = d.points[d.points.length - 1]
      if (Math.hypot(wx - last.x, wy - last.y) < 1 / viewRef.current.k) return // 采样：距离过小忽略
      d.points.push({ x: wx, y: wy }) // pen/erase：原始点原样记录
    }
    // requestAnimationFrame 合并刷新，避免高频重绘
    cancelAnimationFrame(penRafRef.current)
    penRafRef.current = requestAnimationFrame(redrawPen)
  }
  const penUp = () => {
    if (bezDragRef.current) {
      bezDragRef.current = false // 贝塞尔：松手仅结束拉手柄，路径保持开放等待下一锚点
      redrawPen()
      return
    }
    const d = drawingRef.current
    if (!d) return
    drawingRef.current = null
    cancelAnimationFrame(penRafRef.current)
    if (d.tool === 'line') {
      const [a, b] = d.points
      if (Math.hypot(b.x - a.x, b.y - a.y) < 2 / viewRef.current.k) {
        redrawPen()
        return // 直线：几乎未拖动视为误触，不入历史
      }
      d.preview = false // 松手：预览转为实线
    }
    if (d.tool === 'erase') {
      // 橡皮擦单击（几乎未拖动）：一次性擦除命中的整条笔划
      const a = d.points[0]
      const moved = d.points.reduce((m, pt) => Math.max(m, Math.hypot(pt.x - a.x, pt.y - a.y)), 0)
      if (moved < 3 / viewRef.current.k) {
        const hit = hitStrokeIds(a, d.width / 2)
        if (d.axis != null) hitStrokeIds({ x: 2 * d.axis - a.x, y: a.y }, d.width / 2).forEach((id) => hit.add(id)) // 对称点一并擦除
        if (hit.size) commitStrokes(strokesRef.current.filter((st) => !hit.has(st.id)))
        else redrawPen()
        return
      }
    }
    // 结束笔划：存入统一历史栈（限深 50），新笔划使重做栈失效；对称开启时同时落笔镜像笔划（同一次撤销）
    if (d.axis != null) {
      commitStrokes([...strokesRef.current, d, { ...d, id: `s${Date.now()}-m`, points: mirrorPts(d.points, d.axis), axis: undefined, preview: false }])
      // 对称中线保留：继续作为后续画笔操作的参考依据（仅取消对称 / 取消 / 完成退出时清除）
    } else {
      commitStrokes([...strokesRef.current, d])
    }
  }
  // 贝塞尔落笔：展平为致密点列存储为曲线笔划（双击 / Enter 触发）；对称开启时同时落镜像（同一次撤销）
  const commitBez = () => {
    let anchors = bezAnchorsRef.current
    bezAnchorsRef.current = null
    bezDragRef.current = false
    bezHoverRef.current = null
    if (!anchors) return
    // 双击会先补一个重复锚点：去掉与前一锚点几乎重合的尾部锚点
    while (
      anchors.length > 1 &&
      Math.hypot(anchors[anchors.length - 1].x - anchors[anchors.length - 2].x, anchors[anchors.length - 1].y - anchors[anchors.length - 2].y) < 3 / viewRef.current.k
    ) {
      anchors = anchors.slice(0, -1)
    }
    if (anchors.length < 2) {
      redrawPen()
      return
    }
    const pts = flattenBez(anchors)
    const axis = penSym && symAxis != null ? symAxis : undefined
    const stroke: PenStroke = { id: `s${Date.now()}`, tool: 'curve', color: penColor, width: penWidth, points: pts, dash: penDash }
    if (axis != null) {
      commitStrokes([...strokesRef.current, stroke, { ...stroke, id: `s${Date.now()}-m`, points: mirrorPts(pts, axis) }])
    } else {
      commitStrokes([...strokesRef.current, stroke])
    }
  }
  commitBezRef.current = commitBez
  /* ================= 画笔 END ================= */

  const onWheel = (e: RWheelEvent) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top
    setView((v) => {
      const k = Math.min(2.5, Math.max(0.2, v.k * Math.exp(-e.deltaY * 0.0012)))
      const r = k / v.k
      return { k, x: px - (px - v.x) * r, y: py - (py - v.y) * r }
    })
  }

  const onPointerDown = (e: RPointerEvent) => {
    // 快捷键：按住鼠标滚轮（中键）在任何模式下临时激活"拖拽"抓手平移，松开即恢复
    if (e.button === 1) {
      e.preventDefault()
      panRef.current = { startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y }
      setPanning(true)
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      return
    }
    // 点击控制条弹层以外的区域时，收起取色器 / 缩放菜单（地图模式保持开启）
    if (!(e.target as HTMLElement).closest('[data-canvasbar]')) {
      setColorOpen(false)
      setZoomMenu(false)
    }
    // 画笔编辑态：左键留给绘制层，画布不响应点选/框选/拖动（中键平移仍可用）
    if (penOn) return
    const target = e.target as HTMLElement
    const resizeEl = target.closest('[data-resize]') as HTMLElement | null
    const cardEl = target.closest('[data-card]') as HTMLElement | null
    const interactive = target.closest('button, input, textarea, [data-nopan]')

    // 点击画布（非菜单/按钮等交互控件）时，自动收起导航栏已激活的下拉菜单
    if (!interactive && (modeMenu || aiMenu || importMenu)) {
      setModeMenu(false)
      setAiMenu(false)
      setImportMenu(false)
    }
    // 点击画布空白/卡片时收起选中态胶囊导航的二级菜单（点击胶囊/菜单按钮等交互控件时不收起）
    if (!interactive && selMenu) setSelMenu(null)
    // 点击任意位置收起右键功能卡片（菜单内部点击除外）
    if (ctxMenu && !target.closest('[data-ctxmenu]')) setCtxMenu(null)
    // 右键由 contextmenu 事件接管（弹功能卡片），不触发画布点选/框选/拖拽
    if (e.button === 2) return

    // AI 擦除编辑态：左键仅用于在目标图片上涂抹蒙版（工具条控件放行），其余画布交互暂挂起
    if (eraseModeRef.current) {
      if (interactive) return
      const card = cardsRef.current.find((c) => c.id === eraseModeRef.current)
      if (!card) {
        cancelAiErase()
        return
      }
      const { wx, wy } = toWorld(e)
      const lx = wx - card.x
      const ly = wy - card.y
      if (lx < 0 || ly < 0 || lx > card.w || ly > card.imgH) return // 仅允许在图片区域内涂抹
      eraseDrawRef.current = { width: eraseBrush / viewRef.current.k, points: [{ x: lx, y: ly }] }
      setEraseMasks([...eraseCommittedRef.current, eraseDrawRef.current])
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      return
    }

    // 框选编辑模式：左键在目标图片上拖拽出矩形选区（工具条等控件放行），其余画布交互暂挂起
    if (regionModeRef.current) {
      if (interactive) return
      const card = cardsRef.current.find((c) => c.id === regionModeRef.current)
      if (!card) {
        setRegionMode(null)
        return
      }
      const { wx, wy } = toWorld(e)
      const lx = wx - card.x
      const ly = wy - card.y
      if (lx < 0 || ly < 0 || lx > card.w || ly > card.imgH) return // 仅允许在图片区域内框选
      regionDrawRef.current = { x: lx, y: ly }
      setRegionLive({ x: lx, y: ly, w: 0, h: 0 })
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      return
    }

    // 多选包围盒四角把手：开始整体缩放（优先级最高）
    const gResizeEl = target.closest('[data-gresize]') as HTMLElement | null
    if (gResizeEl) {
      const sel = cards.filter((c) => selected.includes(c.id))
      if (sel.length >= 1) {
        const corner = Number(gResizeEl.getAttribute('data-gresize')) // 0=左上 1=右上 2=左下 3=右下
        const x0 = Math.min(...sel.map((c) => c.x))
        const y0 = Math.min(...sel.map((c) => c.y))
        const x1 = Math.max(...sel.map((c) => c.x + c.w))
        const y1 = Math.max(...sel.map((c) => c.y + cardH(c)))
        // 锚点 = 被拖拽角的对角
        const ax = corner === 0 || corner === 2 ? x1 : x0
        const ay = corner === 0 || corner === 1 ? y1 : y0
        const { wx, wy } = toWorld(e)
        const orig: Record<string, { x: number; y: number; w: number; imgH: number }> = {}
        sel.forEach((c) => {
          orig[c.id] = { x: c.x, y: c.y, w: c.w, imgH: c.imgH }
        })
        groupResizeRef.current = { ax, ay, startDist: Math.max(1, Math.hypot(wx - ax, wy - ay)), orig, histPrev: { cards: cardsRef.current, strokes: strokesRef.current } }
        setGroupResizing(true)
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      }
      return
    }

    // 按住空格：任何模式下临时拖拽平移画布
    if (spaceDown) {
      if (interactive) return
      panRef.current = { startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y }
      setPanning(true)
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      return
    }

    // 生成器「从画布中选择参考」：点击图片卡片 → 作为参考图加入输入模块（支持多选，同一张不重复添加），其余画布交互暂挂起
    if (genPickModeRef.current) {
      if (interactive) return
      const pid = cardEl?.id.replace('card-', '')
      const pcard = pid ? cardsRef.current.find((c) => c.id === pid) : null
      if (pcard && pcard.id !== genPanel?.cardId) {
        if (pcard.img) {
          const url = pcard.img
          setGenPanel((gp) => (gp && !gp.refs.includes(url) ? { ...gp, refs: [...gp.refs, url] } : gp))
        } else {
          showToast('该卡片暂无可参考的图片，请选择图片类卡片')
        }
      }
      return
    }

    // 点选编辑激活时：点击卡片优先响应——先提交上一个待定修改点，再在点击位置放置新的待定点（蓝色圆点 + 就地输入气泡）
    if (aiTool && cardEl && !interactive) {
      const id = cardEl.id.replace('card-', '')
      const card = cards.find((c) => c.id === id)
      if (!card) return
      closePointBubble() // 上一个待定点有文本则自动提交为编号标记
      const { wx, wy } = toWorld(e)
      setPendingPoint({ cardId: id, dx: wx - card.x, dy: wy - card.y })
      setPendingNote('')
      setEditingMarkId(null)
      return
    }

    // 拖拽模式：在画布任意位置（含卡片上）拖动即平移视图
    if (panOn) {
      if (interactive) return
      panRef.current = { startX: e.clientX, startY: e.clientY, viewX: view.x, viewY: view.y }
      setPanning(true)
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      return
    }

    // 「选择」归口：命中未融合的浮动笔划 → 选中并进入拖拽移动（笔划绘制在卡片之上，命中优先于卡片点选与空白框选；点空白则取消笔划选中）
    if (!interactive) {
      const { wx, wy } = toWorld(e)
      const p = { x: wx, y: wy }
      const top = [...strokesRef.current].reverse().find((st) => hitStrokeIds(p, 4 / viewRef.current.k).has(st.id))
      if (top) {
        // 已在选中集合内：保持多选整体拖拽；否则单选（Shift=加选）
        const cur = selStrokeIdsRef.current
        let ids = e.shiftKey || e.ctrlKey || e.metaKey ? Array.from(new Set([...cur, top.id])) : cur.includes(top.id) ? cur : [top.id]
        // 笔划编组联动：命中组内任意一条 → 同组笔划一并选中（拖拽随之整组移动）
        const sg = new Set(strokesRef.current.filter((st) => ids.includes(st.id) && st.groupId).map((st) => st.groupId as string))
        if (sg.size) ids = Array.from(new Set([...ids, ...strokesRef.current.filter((st) => st.groupId && sg.has(st.groupId)).map((st) => st.id)]))
        setSelStrokeIds(ids)
        const orig: Record<string, Array<{ x: number; y: number }>> = {}
        strokesRef.current.forEach((st) => {
          if (ids.includes(st.id)) orig[st.id] = st.points.map((pt) => ({ ...pt }))
        })
        const cardStarts: Record<string, { x: number; y: number }> = {}
        cardsRef.current.forEach((c) => {
          if (selected.includes(c.id)) cardStarts[c.id] = { x: c.x, y: c.y }
        })
        selDragRef.current = { ids, startWX: wx, startWY: wy, orig, prev: strokesRef.current.slice(), cardStarts, moved: false, histPrev: { cards: cardsRef.current, strokes: strokesRef.current } }
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
        return
      }
      // 点在已选中卡片上（准备拖拽卡片+笔划组合选区）时保留笔划选中，其余落空点击取消笔划选中
      const onSelCard = cardEl && selected.includes(cardEl.id.replace('card-', ''))
      if (!onSelCard && selStrokeIdsRef.current.length) setSelStrokeIds([])
    }

    // 选择模式
    if (resizeEl && cardEl) {
      const card = cards.find((c) => `card-${c.id}` === cardEl.id)
      if (card) {
        resizeRef.current = { id: card.id, startX: e.clientX, startW: card.w, histPrev: { cards: cardsRef.current, strokes: strokesRef.current } }
        ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      }
      return
    }
    if (cardEl && !interactive) {
      const id = cardEl.id.replace('card-', '')
      // 点击「生成器」图框：重新弹出联动的输入模块
      if (genPanel && genPanel.cardId === id) setGenPanelHidden(false)
      if (vidPanel && vidPanel.cardId === id) setVidPanelHidden(false)
      // 多选快捷键：按住 Shift / Ctrl / ⌘ 连续点击（与 Figma、Photoshop、Sketch 等主流软件一致）——未选则加选，已选则减选
      const additive = e.shiftKey || e.ctrlKey || e.metaKey
      let sel: string[]
      if (additive) {
        if (selected.includes(id)) {
          const gid = cards.find((c) => c.id === id)?.groupId
          sel = selected.filter((x) => x !== id && !(gid && cards.find((c) => c.id === x)?.groupId === gid))
        } else {
          sel = [...selected, id]
        }
      } else {
        sel = selected.includes(id) ? selected : [id]
      }
      // 编组联动：点选组内任意一张 → 同组卡片一并选中（拖拽随之整组移动）
      const gids = new Set(cards.filter((c) => sel.includes(c.id) && c.groupId).map((c) => c.groupId as string))
      if (gids.size) sel = Array.from(new Set([...sel, ...cards.filter((c) => c.groupId && gids.has(c.groupId)).map((c) => c.id)]))
      setSelected(sel)
      if (!additive && !selected.includes(id) && selStrokeIdsRef.current.length) setSelStrokeIds([]) // 单选重置为另一张卡片时，同步退出笔划多选
      const starts: Record<string, { x: number; y: number }> = {}
      cards.forEach((c) => {
        if (sel.includes(c.id)) starts[c.id] = { x: c.x, y: c.y }
      })
      const card = cards.find((c) => c.id === id)
      if (card && !starts[id]) starts[id] = { x: card.x, y: card.y }
      // 与卡片一起被选中的浮动笔划：记录快照，拖拽卡片时同步移动
      const strokeOrig: Record<string, Array<{ x: number; y: number }>> = {}
      strokesRef.current.forEach((st) => {
        if (selStrokeIdsRef.current.includes(st.id)) strokeOrig[st.id] = st.points.map((pt) => ({ ...pt }))
      })
      dragRef.current = {
        id,
        startX: e.clientX,
        startY: e.clientY,
        starts,
        histPrev: { cards: cardsRef.current, strokes: strokesRef.current },
        strokeOrig: Object.keys(strokeOrig).length ? strokeOrig : undefined,
        strokePrev: Object.keys(strokeOrig).length ? strokesRef.current.slice() : undefined,
        strokesMoved: false,
      }
      setCardDragging(true)
      setDragIds(Object.keys(starts))
      ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
      return
    }
    if (interactive) return
    // 空白处：框选（同时提交/关闭点选气泡、收起生成输入条、关闭导航栏下拉菜单）
    closePointBubble()
    if (genBarOn) {
      setGenBarOn(false)
      setGenBarExpanded(false)
    }
    if (genPanel) setGenPanelHidden(true) // 点击画布空白：隐藏生成器输入模块（图框保留，点击图框再次弹出）
    if (vidPanel) setVidPanelHidden(true) // 视频生成器输入模块同理
    setModeMenu(false)
    setAiMenu(false)
    setImportMenu(false)
    const { wx, wy } = toWorld(e)
    const marqAdd = e.shiftKey || e.ctrlKey || e.metaKey // 框选加选同样支持 Shift / Ctrl / ⌘
    marqueeRef.current = { startWX: wx, startWY: wy, additive: marqAdd, base: marqAdd ? selected : [], baseStrokes: marqAdd ? selStrokeIdsRef.current : [] }
    if (!marqAdd) {
      setSelected([])
      setSelStrokeIds([])
    }
    setMarquee({ x: wx, y: wy, w: 0, h: 0 })
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: RPointerEvent) => {
    // 防御：指针事件乱序/取消可能残留拖拽状态——未按键的移动一律清除，避免悬停把手时误触发整体缩放
    if (e.buttons === 0 && (groupResizeRef.current || resizeRef.current || dragRef.current || marqueeRef.current || panRef.current || selDragRef.current || eraseDrawRef.current || regionDrawRef.current)) {
      if (eraseDrawRef.current) {
        eraseCommittedRef.current = [...eraseCommittedRef.current, eraseDrawRef.current]
        eraseDrawRef.current = null
        setEraseMasks(eraseCommittedRef.current)
      }
      if (regionDrawRef.current) {
        regionDrawRef.current = null
        setRegionLive(null)
      }
      groupResizeRef.current = null
      resizeRef.current = null
      dragRef.current = null
      marqueeRef.current = null
      panRef.current = null
      selDragRef.current = null
      setPanning(false)
      setCardDragging(false)
      setGroupResizing(false)
      setDragIds([])
      setDragGhost(null)
      dragGhostUrlRef.current = null
      setMarquee(null)
      setGuides({ v: [], h: [] })
      return
    }
    // AI 擦除：涂抹中（点坐标换算到卡片图片区域，越界截断到图片边缘）
    if (eraseDrawRef.current) {
      const card = cardsRef.current.find((c) => c.id === eraseModeRef.current)
      if (!card) return
      const { wx, wy } = toWorld(e)
      const lx = Math.max(0, Math.min(card.w, wx - card.x))
      const ly = Math.max(0, Math.min(card.imgH, wy - card.y))
      const pts = eraseDrawRef.current.points
      const last = pts[pts.length - 1]
      if (Math.hypot(lx - last.x, ly - last.y) < 1 / viewRef.current.k) return
      pts.push({ x: lx, y: ly })
      setEraseMasks([...eraseCommittedRef.current, { width: eraseDrawRef.current.width, points: [...pts] }])
      return
    }
    // 框选编辑：拖拽中实时更新矩形选区（坐标截断到图片边缘）
    if (regionDrawRef.current) {
      const card = cardsRef.current.find((c) => c.id === regionModeRef.current)
      if (!card) return
      const { wx, wy } = toWorld(e)
      const lx = Math.max(0, Math.min(card.w, wx - card.x))
      const ly = Math.max(0, Math.min(card.imgH, wy - card.y))
      const st = regionDrawRef.current
      setRegionLive({
        x: Math.min(st.x, lx),
        y: Math.min(st.y, ly),
        w: Math.abs(lx - st.x),
        h: Math.abs(ly - st.y),
      })
      return
    }
    // 浮动笔划拖拽移动：基于起始快照整体平移（多选笔划 + 同选中的卡片一起移动，逻辑与卡片一致）
    if (selDragRef.current) {
      const sd = selDragRef.current
      const { wx, wy } = toWorld(e)
      const dx = wx - sd.startWX
      const dy = wy - sd.startWY
      if (dx || dy) sd.moved = true
      Object.entries(sd.orig).forEach(([sid, pts]) => {
        const idx = strokesRef.current.findIndex((x) => x.id === sid)
        if (idx >= 0) strokesRef.current[idx] = { ...strokesRef.current[idx], points: pts.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })) }
      })
      if (Object.keys(sd.cardStarts).length && (dx || dy)) {
        setCards((cs) => cs.map((c) => (sd.cardStarts[c.id] ? { ...c, x: sd.cardStarts[c.id].x + dx, y: sd.cardStarts[c.id].y + dy } : c)))
      }
      penCacheDirtyRef.current = true
      cancelAnimationFrame(penRafRef.current)
      penRafRef.current = requestAnimationFrame(redrawPen)
      return
    }
    // 多选整体缩放：等比更新所有选中卡片的位置与尺寸（无缩放上限）
    if (groupResizeRef.current) {
      const g = groupResizeRef.current
      const { wx, wy } = toWorld(e)
      const s = Math.max(0.05, Math.hypot(wx - g.ax, wy - g.ay) / g.startDist)
      setCards((cs) =>
        cs.map((c) => {
          const o = g.orig[c.id]
          if (!o) return c
          return { ...c, x: g.ax + (o.x - g.ax) * s, y: g.ay + (o.y - g.ay) * s, w: o.w * s, imgH: o.imgH * s }
        }),
      )
      return
    }
    if (resizeRef.current) {
      const r = resizeRef.current
      const dx = (e.clientX - r.startX) / view.k
      setCards((cs) =>
        cs.map((c) => {
          if (c.id !== r.id) return c
          const w = Math.min(5600, Math.max(200, r.startW + dx)) // 放大上限提升至原 10 倍
          return { ...c, w, imgH: Math.round(w * (c.imgH / c.w)) }
        }),
      )
      return
    }
    if (dragRef.current) {
      const d = dragRef.current
      const s0 = d.starts[d.id]
      let dx = (e.clientX - d.startX) / view.k
      let dy = (e.clientY - d.startY) / view.k
      const card = cards.find((c) => c.id === d.id)
      if (card && s0) {
        let nx = s0.x + dx
        let ny = s0.y + dy
        if (snapGridRef.current) {
          // 网格吸附模式：基准点吸到最近网格；点阵背景下不再出现卡片间磁吸线，两种吸附互斥
          const gx = Math.round(nx / GRID) * GRID
          const gy = Math.round(ny / GRID) * GRID
          dx += gx - nx
          dy += gy - ny
          nx = gx
          ny = gy
          setGuides({ v: [], h: [] })
        } else {
          // 对齐吸附（以被抓取的卡片为基准，未参与拖动的卡片为目标）
          const others = cards.filter((c) => !d.starts[c.id])
          const vTargets = others.flatMap((c) => [c.x, c.x + c.w / 2, c.x + c.w])
          const hTargets = others.flatMap((c) => [c.y, c.y + cardH(c) / 2, c.y + cardH(c)])
          const vEdges = [nx, nx + card.w / 2, nx + card.w]
          const hEdges = [ny, ny + cardH(card) / 2, ny + cardH(card)]
          const gv: number[] = []
          const gh: number[] = []
          outerV: for (const t of vTargets) {
            for (const edge of vEdges) {
              if (Math.abs(edge - t) <= SNAP) {
                dx += t - edge
                gv.push(t)
                break outerV
              }
            }
          }
          outerH: for (const t of hTargets) {
            for (const edge of hEdges) {
              if (Math.abs(edge - t) <= SNAP) {
                dy += t - edge
                gh.push(t)
                break outerH
              }
            }
          }
          setGuides({ v: gv, h: gh })
        }
      }
      // 同选中的浮动笔划随卡片一起平移（框选混合多选的整体移动）
      if (d.strokeOrig) {
        Object.entries(d.strokeOrig).forEach(([sid, pts]) => {
          const idx = strokesRef.current.findIndex((x) => x.id === sid)
          if (idx >= 0) strokesRef.current[idx] = { ...strokesRef.current[idx], points: pts.map((pt) => ({ x: pt.x + dx, y: pt.y + dy })) }
        })
        if (dx || dy) d.strokesMoved = true
        penCacheDirtyRef.current = true
        cancelAnimationFrame(penRafRef.current)
        penRafRef.current = requestAnimationFrame(redrawPen)
      }
      setCards((cs) =>
        cs.map((c) => (d.starts[c.id] ? { ...c, x: d.starts[c.id].x + dx, y: d.starts[c.id].y + dy } : c)),
      )
      // 拖拽经过参考图落点（占位图框 / 原型图 / 灵感图槽位）时给出高亮提示
      const hint = refDropTargetAt(e.clientX, e.clientY, d.id)
      if (hint !== refDropHintRef.current) {
        refDropHintRef.current = hint
        setRefDropHint(hint)
      }
      // 拖拽上传动效：靠近生成功能模块（任务条/槽位）时，大图片收缩为跟随光标的小缩略图，避免遮挡功能模块
      if (hint === 'proto' || hint === 'inspo' || hint === 'vstart' || hint === 'vend' || hint === 'bar' || hint === 'vframe') {
        if (!dragGhostUrlRef.current || dragGhostUrlRef.current.id !== d.id) {
          const src = cardsRef.current.find((c) => c.id === d.id)
          const url = src ? cardRefImage(src) : null
          dragGhostUrlRef.current = url ? { id: d.id, url } : null
        }
        const rect = containerRef.current?.getBoundingClientRect()
        if (dragGhostUrlRef.current && rect)
          setDragGhost({ url: dragGhostUrlRef.current.url, x: e.clientX - rect.left, y: e.clientY - rect.top })
      } else {
        dragGhostUrlRef.current = null
        setDragGhost(null)
      }
      return
    }
    if (marqueeRef.current) {
      const m = marqueeRef.current
      const { wx, wy } = toWorld(e)
      const rect = {
        x: Math.min(m.startWX, wx),
        y: Math.min(m.startWY, wy),
        w: Math.abs(wx - m.startWX),
        h: Math.abs(wy - m.startWY),
      }
      setMarquee(rect)
      const hit = cards
        .filter((c) => c.x < rect.x + rect.w && c.x + c.w > rect.x && c.y < rect.y + rect.h && c.y + cardH(c) > rect.y)
        .map((c) => c.id)
      setSelected(m.additive ? Array.from(new Set([...m.base, ...hit])) : hit)
      // 浮动笔划与卡片同一套框选逻辑：包围盒相交即入选（橡皮擦笔划不可见，不参与）
      const hitStrokes = strokesRef.current
        .filter((st) => {
          if (st.tool === 'erase' || !st.points.length) return false
          const pad = st.width / 2
          const xs = st.points.map((pt) => pt.x)
          const ys = st.points.map((pt) => pt.y)
          const x0 = Math.min(...xs) - pad
          const x1 = Math.max(...xs) + pad
          const y0 = Math.min(...ys) - pad
          const y1 = Math.max(...ys) + pad
          return x0 < rect.x + rect.w && x1 > rect.x && y0 < rect.y + rect.h && y1 > rect.y
        })
        .map((st) => st.id)
      setSelStrokeIds(m.additive ? Array.from(new Set([...m.baseStrokes, ...hitStrokes])) : hitStrokes)
      return
    }
    if (panRef.current) {
      const p = panRef.current
      setView((v) => ({ ...v, x: p.viewX + e.clientX - p.startX, y: p.viewY + e.clientY - p.startY }))
    }
  }

  const onPointerUp = (e?: RPointerEvent) => {
    // AI 擦除：收笔，当前涂抹笔划入蒙版列表
    if (eraseDrawRef.current) {
      eraseCommittedRef.current = [...eraseCommittedRef.current, eraseDrawRef.current]
      eraseDrawRef.current = null
      setEraseMasks(eraseCommittedRef.current)
      return
    }
    // 框选编辑：松手提交矩形选区 → 生成编号标记并自动带入 Agent 对话框（需求胶囊，可多次框选；过小视为误点忽略）
    if (regionDrawRef.current) {
      const cardId = regionModeRef.current
      const live = regionLive
      regionDrawRef.current = null
      setRegionLive(null)
      if (cardId && live && live.w > 8 && live.h > 8) {
        const nm: Mark = { id: ++markSeq.current, cardId, dx: live.x, dy: live.y, w: live.w, h: live.h, staged: true }
        const card = cardsRef.current.find((c) => c.id === cardId)
        nm.part = card ? partCandidates(card, nm)[0] : '整体' // AI 识别默认部位（随区域胶囊带入对话框）
        onMarksChange([...marks, nm])
        onMarkToChat?.() // 自动带入 Agent 对话框：区域以需求胶囊卡片进入输入区
      }
      return
    }
    // 拖拽卡片松手：命中参考图落点 → 绑定为参考图并把卡片弹回原位（不消耗画布卡片）
    const dr0 = dragRef.current
    let refBound = false
    if (dr0 && e && Math.hypot(e.clientX - dr0.startX, e.clientY - dr0.startY) > 4) {
      const target = refDropTargetAt(e.clientX, e.clientY, dr0.id)
      const src = target ? cardsRef.current.find((c) => c.id === dr0.id) : null
      const url = src ? cardRefImage(src) : null
      if (target && url) {
        // 拖到任务条任意位置：优先填入空槽位（原型图 → 灵感图），均已填充则替换首槽；拖到视频生成器图框：首帧 → 尾帧
        const t2: 'frame' | 'proto' | 'inspo' | 'vstart' | 'vend' =
          target === 'bar'
            ? !protoImg
              ? 'proto'
              : !inspoImg
                ? 'inspo'
                : 'proto'
            : target === 'vframe'
              ? !videoStart
                ? 'vstart'
                : !videoEnd
                  ? 'vend'
                  : 'vstart'
              : target
        if (t2 === 'frame') {
          if (genPanel) setGenPanel({ ...genPanel, refs: genPanel.refs.includes(url) ? genPanel.refs : [...genPanel.refs, url] })
        } else if (t2 === 'proto') setProtoImg(url)
        else if (t2 === 'inspo') setInspoImg(url)
        else if (t2 === 'vstart') setVideoStart(url)
        else setVideoEnd(url)
        setCards((cs) => cs.map((c) => (dr0.starts[c.id] ? { ...c, x: dr0.starts[c.id].x, y: dr0.starts[c.id].y } : c)))
        if (dr0.strokePrev) setStrokes(dr0.strokePrev)
        refBound = true
        showToast(
          t2 === 'frame' ? '已绑定为生成参考图' : t2 === 'proto' ? '已设为原型图' : t2 === 'inspo' ? '已设为灵感图' : t2 === 'vstart' ? '已设为视频首帧' : '已设为视频尾帧',
        )
      }
    }
    refDropHintRef.current = null
    setRefDropHint(null)
    setCardDragging(false)
    setGroupResizing(false)
    setDragIds([])
    setDragGhost(null)
    dragGhostUrlRef.current = null
    if (selDragRef.current) {
      // 浮动笔划拖拽结束：移动前快照入撤销栈（可撤销回移动前位置），新位置落库
      const sd = selDragRef.current
      selDragRef.current = null
      if (sd.moved) {
        if (sd.histPrev) pushCanvasHistory(sd.histPrev)
        setPastStrokes((pp) => [...pp.slice(-PEN_HISTORY_LIMIT + 1), sd.prev])
        setFutureStrokes([])
        setStrokes([...strokesRef.current])
      }
    }
    // 卡片拖拽带动了选中笔划：同样入笔划撤销栈
    const dr = dragRef.current
    if (dr?.strokePrev && dr.strokesMoved && !refBound) {
      setPastStrokes((pp) => [...pp.slice(-PEN_HISTORY_LIMIT + 1), dr.strokePrev!])
      setFutureStrokes([])
      setStrokes([...strokesRef.current])
    }
    // 撤销历史：卡片拖拽 / 单卡缩放 / 多选整体缩放结束时，操作前快照入画布撤销栈（Ctrl/⌘+Z 回退）
    const drEnd = dragRef.current
    if (drEnd?.histPrev && e && !refBound && Math.hypot(e.clientX - drEnd.startX, e.clientY - drEnd.startY) > 4) pushCanvasHistory(drEnd.histPrev)
    const rsEnd = resizeRef.current
    if (rsEnd?.histPrev) {
      const rc = cardsRef.current.find((x) => x.id === rsEnd.id)
      if (rc && Math.abs(rc.w - rsEnd.startW) > 0.5) pushCanvasHistory(rsEnd.histPrev)
    }
    const grEnd = groupResizeRef.current
    if (grEnd?.histPrev) {
      const grChanged = Object.keys(grEnd.orig).some((cid) => {
        const c = cardsRef.current.find((x) => x.id === cid)
        return c && Math.abs(c.w - grEnd.orig[cid].w) > 0.5
      })
      if (grChanged) pushCanvasHistory(grEnd.histPrev)
      groupResizeRef.current = null
    }
    panRef.current = null
    dragRef.current = null
    resizeRef.current = null
    marqueeRef.current = null
    setPanning(false)
    setMarquee(null)
    setGuides({ v: [], h: [] })
  }

  // 以画布中心为锚点缩放
  const zoomBy = (factor: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const cx = rect.width / 2
    const cy = rect.height / 2
    setView((v) => {
      const k = Math.min(2.5, Math.max(0.2, v.k * factor))
      const r = k / v.k
      return { k, x: cx - (cx - v.x) * r, y: cy - (cy - v.y) * r }
    })
  }

  /* 自动排列（网格）紧凑打包：保持每张卡自身尺寸，按行紧密排列（行 / 列间距固定 40），
     行高取该行最高卡片、行目标宽度 = 列数 × 平均卡宽——避免个别大尺寸卡片（如局部截图卡）
     撑大全局单元格，导致图与图之间出现稀疏大间隙、不够聚拢规整 */
  const gridPack = (items: { w: number; h: number }[], x0: number, y0: number) => {
    const cols = Math.ceil(Math.sqrt(items.length))
    const gap = 40
    const avgW = items.reduce((sum, c) => sum + c.w, 0) / Math.max(1, items.length)
    const rowTarget = cols * (avgW + gap)
    const pos: { x: number; y: number }[] = []
    let cx = x0
    let cy = y0
    let rowH = 0
    items.forEach((c) => {
      if (cx > x0 && cx + c.w > x0 + rowTarget) {
        cx = x0
        cy += rowH + gap
        rowH = 0
      }
      pos.push({ x: cx, y: cy })
      cx += c.w + gap
      rowH = Math.max(rowH, c.h)
    })
    return pos
  }

  // 多选排列：垂直排列 / 水平排列（≥2 张生效，固定间距 40，对齐到最左/最上卡片）/ 自动排列（紧凑网格）
  const distribute = (type: 'varr' | 'harr' | 'grid') => {
    if (cardsRef.current.filter((c) => selected.includes(c.id)).length < 2) return
    pushCanvasHistory() // 入撤销栈：排列前快照
    setCards((cs) => {
      const sel = cs.filter((c) => selected.includes(c.id))
      if (sel.length < 2) return cs
      if (type === 'grid') {
        const x0 = Math.min(...sel.map((c) => c.x))
        const y0 = Math.min(...sel.map((c) => c.y))
        const sorted = [...sel].sort((a, b) => a.y - b.y || a.x - b.x)
        const pos = gridPack(sorted.map((c) => ({ w: c.w, h: cardH(c) })), x0, y0)
        const posMap = new Map(sorted.map((c, i2) => [c.id, pos[i2]]))
        return cs.map((c) => (posMap.has(c.id) ? { ...c, ...posMap.get(c.id)! } : c))
      }
      const GAP = 40
      if (type === 'harr') {
        // 水平排列：保持当前左右顺序，顶部对齐到最上方卡片，等间距横排
        const sorted = [...sel].sort((a, b) => a.x - b.x)
        const y0 = Math.min(...sel.map((c) => c.y))
        let cur = sorted[0].x
        const posMap = new Map(
          sorted.map((c) => {
            const pos = { x: cur, y: y0 }
            cur += c.w + GAP
            return [c.id, pos]
          }),
        )
        return cs.map((c) => (posMap.has(c.id) ? { ...c, ...posMap.get(c.id)! } : c))
      }
      // 垂直排列：保持当前上下顺序，左对齐到最左卡片，等间距竖排
      const sorted = [...sel].sort((a, b) => a.y - b.y)
      const x0 = Math.min(...sel.map((c) => c.x))
      let cur = sorted[0].y
      const posMap = new Map(
        sorted.map((c) => {
          const pos = { x: x0, y: cur }
          cur += cardH(c) + GAP
          return [c.id, pos]
        }),
      )
      return cs.map((c) => (posMap.has(c.id) ? { ...c, ...posMap.get(c.id)! } : c))
    })
  }

  // 视口可见区域中心的世界坐标（新卡片落点；leftOffset 为左侧 AI 对话面板占位宽度）
  const viewCenterWorld = (w: number, h: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    const vw = rect?.width ?? 1200
    const vh = rect?.height ?? 800
    return { x: ((vw + leftOffset) / 2 - view.x) / view.k - w / 2, y: (vh / 2 - view.y) / view.k - h / 2 }
  }

  // 本地图片导入：按自然比例创建图片卡片，多图采用「自动排列」网格布局
  // 落点 = 整组图片的视觉中心（拖拽时即光标位置）：先并发读出全部尺寸再一次性落卡，避免逐张异步加载导致的位置跳动
  const addImageCards = (files: File[], at?: { wx: number; wy: number }) => {
    const imgs = files.filter((f) => f.type.startsWith('image/'))
    if (!imgs.length) return
    pushCanvasHistory() // 入撤销栈：导入前快照
    const c = at ? null : viewCenterWorld(0, 0)
    const center = at ?? { wx: c!.x, wy: c!.y } // 未指定落点时取视口中心点
    Promise.all(
      imgs.map(
        (f) =>
          new Promise<{ url: string; nw: number; nh: number }>((res) => {
            const url = URL.createObjectURL(f)
            const el = new window.Image()
            el.onload = () => res({ url, nw: el.naturalWidth, nh: el.naturalHeight })
            el.onerror = () => res({ url, nw: 320, nh: 400 })
            el.src = url
          }),
      ),
    ).then((metas) => {
      const w = 320
      const hs = metas.map((m) => Math.round(Math.min(520, Math.max(160, (w * m.nh) / Math.max(1, m.nw)))))
      const stamp = Date.now()
      // 多图：采用「自动排列」网格布局（规则与整理菜单一致），整组以落点为中心；单图：居中于落点
      const n = metas.length
      let xs: number[]
      let ys: number[]
      if (n >= 2) {
        const pos = gridPack(metas.map((_, i) => ({ w, h: hs[i] })), 0, 0)
        const totalW = Math.max(...pos.map((p) => p.x + w))
        const totalH = Math.max(...pos.map((p, i) => p.y + hs[i]))
        xs = pos.map((p) => center.wx - totalW / 2 + p.x)
        ys = pos.map((p) => center.wy - totalH / 2 + p.y)
      } else {
        xs = [center.wx - w / 2]
        ys = [center.wy - hs[0] / 2]
      }
      const add = metas.map((m, i) => ({
        id: `img-${stamp}-${i}`,
        tag: '导入图片',
        x: xs[i],
        y: ys[i],
        w,
        imgH: hs[i],
        kind: 'gen' as const,
        img: m.url,
      }))
      setCards((cs) => [...cs, ...add])
    })
  }

  // 素材库拖入：款式（coat 通道）
  const addCoatCard = (spec: CoatSpec & { name?: string }, at: { wx: number; wy: number }) => {
    pushCanvasHistory()
    setCards((cs) => [
      ...cs,
      { id: `coat-${Date.now()}`, tag: spec.name ?? '款式图', x: at.wx, y: at.wy, w: 300, imgH: 340, kind: 'flat' as const, coat: spec },
    ])
  }

  // 素材库拖入：统一资产通道（面料 / 辅料 / 模特）
  const addAssetCard = (
    asset:
      | { cat: 'fabric'; name: string; fill: string; tex: string }
      | { cat: 'trim'; name: string; trimType: TrimType; fill: string }
      | { cat: 'model'; name: string; model: { jacket: string; inner: string; skirt: string; pants?: boolean } }
      | { cat: 'inspo'; name: string; img: string },
    at: { wx: number; wy: number },
  ) => {
    pushCanvasHistory()
    if (asset.cat === 'inspo')
      setCards((cs) => [
        ...cs,
        { id: `in-${Date.now()}`, tag: asset.name, x: at.wx, y: at.wy, w: 300, imgH: 380, kind: 'gen' as const, img: asset.img },
      ])
    else if (asset.cat === 'fabric')
      setCards((cs) => [
        ...cs,
        { id: `sw-${Date.now()}`, tag: asset.name, x: at.wx, y: at.wy, w: 260, imgH: 260, kind: 'flat' as const, swatch: { name: asset.name, fill: asset.fill, tex: asset.tex } },
      ])
    else if (asset.cat === 'trim')
      setCards((cs) => [
        ...cs,
        { id: `tr-${Date.now()}`, tag: asset.name, x: at.wx, y: at.wy, w: 260, imgH: 260, kind: 'flat' as const, trim: { type: asset.trimType, fill: asset.fill } },
      ])
    else
      setCards((cs) => [
        ...cs,
        { id: `md-${Date.now()}`, tag: asset.name, x: at.wx, y: at.wy, w: 300, imgH: 400, kind: 'gen' as const, model: asset.model, ts: Date.now() },
      ])
  }

  // 下载卡片：导入图片下载原图；AI 结果 / 素材卡片渲染为 SVG 矢量下载
  const downloadGenCard = (card: Card) => {
    // 合并图层卡：逐层导出（浏览器多文件下载需用户允许）
    if (card.layers) {
      card.layers.items.forEach((it, i) => window.setTimeout(() => downloadGenCard(it.card), i * 300))
      return
    }
    // 「融合」笔划已成为图片内容的一部分：底图 + 线迹合成导出 PNG（修复融合后下载线迹消失）
    if (card.merged && card.merged.strokes.length) {
      void downloadMergedCard(card)
      return
    }
    const a = document.createElement('a')
    if (card.img) {
      a.href = card.img
      a.download = `${card.tag || '设计图'}.png`
      a.click()
      return
    }
    let svg: string
    if (card.coat) svg = renderToStaticMarkup(<CoatThumb spec={card.coat} />)
    else if (card.trim) svg = renderToStaticMarkup(<TrimThumb type={card.trim.type} fill={card.trim.fill} />)
    else {
      const p = genColors(card)
      svg = renderToStaticMarkup(<ModelFigure jacket={p.jacket} inner={p.inner} skirt={p.skirt} pants={p.pants} />)
    }
    if (!svg.includes('xmlns')) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
    const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    a.href = url
    a.download = `${card.tag || '设计图'}.svg`
    a.click()
    URL.revokeObjectURL(url)
  }

  // 含「融合」笔划卡片的合成导出：底图按原分辨率绘制，线迹按融合时坐标系等比放大（与画布 MergedOverlay 渲染一致）
  const downloadMergedCard = async (card: Card) => {
    const m = card.merged!
    try {
      let src: string
      let revoke: (() => void) | null = null
      if (card.img) {
        src = card.img
      } else {
        // 矢量卡片（AI 生成/素材）：渲染为 SVG 底图，给足融合区域 3 倍分辨率保证清晰度
        let svg: string
        if (card.coat) svg = renderToStaticMarkup(<CoatThumb spec={card.coat} />)
        else if (card.trim) svg = renderToStaticMarkup(<TrimThumb type={card.trim.type} fill={card.trim.fill} />)
        else {
          const p = genColors(card)
          svg = renderToStaticMarkup(<ModelFigure jacket={p.jacket} inner={p.inner} skirt={p.skirt} pants={p.pants} />)
        }
        if (!svg.includes('xmlns')) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
        svg = svg.replace('<svg', `<svg width="${Math.round(m.boxW * 3)}" height="${Math.round(m.boxH * 3)}"`)
        src = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
        revoke = () => URL.revokeObjectURL(src)
      }
      const img = await new Promise<HTMLImageElement>((res, rej) => {
        const el = document.createElement('img') // 注意：lucide 的 Image 图标会遮蔽全局 Image 构造器
        el.onload = () => res(el)
        el.onerror = rej
        el.src = src
      })
      const W = card.img ? img.naturalWidth || Math.round(m.boxW * 3) : Math.round(m.boxW * 3)
      const H = card.img ? img.naturalHeight || Math.round(m.boxH * 3) : Math.round(m.boxH * 3)
      const cv = document.createElement('canvas')
      cv.width = W
      cv.height = H
      const ctx = cv.getContext('2d')!
      ctx.drawImage(img, 0, 0, W, H)
      revoke?.()
      ctx.scale(W / m.boxW, H / m.boxH)
      m.strokes.forEach((st) => drawStrokeOn(ctx, st as PenStroke))
      const a = document.createElement('a')
      a.href = cv.toDataURL('image/png')
      a.download = `${card.tag || '设计图'}.png`
      a.click()
    } catch {
      showToast('导出失败，请重试')
    }
  }

  // 提取卡片图像作为参考图：位图直接用原图，矢量卡片渲染为 SVG 数据（与导出逻辑一致）
  const cardRefImage = (c: Card): string | null => {
    if (c.img) return c.img
    if (c.kind === 'frame') return null
    try {
      let svg: string
      if (c.coat) svg = renderToStaticMarkup(<CoatThumb spec={c.coat} />)
      else if (c.trim) svg = renderToStaticMarkup(<TrimThumb type={c.trim.type} fill={c.trim.fill} />)
      else {
        const p = genColors(c)
        svg = renderToStaticMarkup(<ModelFigure jacket={p.jacket} inner={p.inner} skirt={p.skirt} pants={p.pants} />)
      }
      if (!svg.includes('xmlns')) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
      return URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
    } catch {
      return null
    }
  }

  // 拖拽卡片作为参考图时的落点命中：生成占位图框（世界坐标）/ 原型图、灵感图槽位（屏幕坐标）
  const refDropTargetAt = (clientX: number, clientY: number, dragId: string): 'frame' | 'vframe' | 'proto' | 'inspo' | 'vstart' | 'vend' | 'bar' | null => {
    // 拖拽中画布图层会抬升到任务条之上，elementFromPoint 会被卡片挡住——改用几何包围盒判定
    const insideEl = (sel: string) => {
      const node = document.querySelector(sel)
      if (!node) return false
      const r = node.getBoundingClientRect()
      return clientX >= r.left && clientX <= r.right && clientY >= r.top && clientY <= r.bottom
    }
    if (insideEl('[data-refslot="proto"]')) return 'proto'
    if (insideEl('[data-refslot="inspo"]')) return 'inspo'
    if (insideEl('[data-refslot="vstart"]')) return 'vstart'
    if (insideEl('[data-refslot="vend"]')) return 'vend'
    if (insideEl('[data-genbar]')) return 'bar'
    const inCard = (cardId: string) => {
      const frame = cardsRef.current.find((c) => c.id === cardId)
      if (!frame || frame.id === dragId) return false
      const rect = containerRef.current?.getBoundingClientRect()
      if (!rect) return false
      const wx = (clientX - rect.left - viewRef.current.x) / viewRef.current.k
      const wy = (clientY - rect.top - viewRef.current.y) / viewRef.current.k
      return wx >= frame.x && wx <= frame.x + frame.w && wy >= frame.y && wy <= frame.y + frame.imgH
    }
    if (genPanel && inCard(genPanel.cardId)) return 'frame'
    if (vidPanel && inCard(vidPanel.cardId)) return 'vframe'
    return null
  }

  // 导出选中卡片：逐张下载（浏览器多文件下载需用户允许）
  const exportSel = () => {
    const sel = cardsRef.current.filter((c) => selected.includes(c.id))
    if (!sel.length) return
    sel.forEach((c, i) => window.setTimeout(() => downloadGenCard(c), i * 300))
    showToast(`正在导出 ${sel.length} 张卡片`)
  }

  // AI 结果卡片操作：头部菜单 + 选中态工具栏共用
  const genCardAction = (id: string, a: GenAction) => {
    const card = cardsRef.current.find((c) => c.id === id)
    if (!card) return
    if (a === 'selectAll') {
      setSelected(cardsRef.current.map((c) => c.id))
      return
    }
    if (a === 'delete') {
      deleteCards([id])
      return
    }
    if (a === 'duplicate') {
      pushCanvasHistory()
      setCards((cs) => [...cs, { ...card, id: `cp-${Date.now()}`, groupId: undefined, x: card.x + 40, y: card.y + 40 }])
      return
    }
    if (a === 'download') {
      downloadGenCard(card)
      return
    }
    if (a === 'detail') {
      setDetailId(id)
      return
    }
    // 再次生成：忙碌遮罩 → 切换配色模拟重新出图
    pushCanvasHistory()
    setCards((cs) => cs.map((c) => (c.id === id ? { ...c, frame: { ...(c.frame ?? { busy: false }), busy: true } } : c)))
    window.setTimeout(() => {
      setCards((cs) =>
        cs.map((c) =>
          c.id === id ? { ...c, palette: (c.palette ?? 0) + 1, ts: Date.now(), frame: c.frame ? { ...c.frame, busy: false } : undefined } : c,
        ),
      )
    }, 1600)
  }

  // 胶囊导航栏动作：卡片模块所有功能项去重后的统一入口，多选时批量作用于所有选中卡片
  const capsuleAction = (a: GenAction) => {
    const ids = selCards.map((c) => c.id)
    if (!ids.length) return
    if (a === 'selectAll') {
      setSelected(cardsRef.current.map((c) => c.id))
      return
    }
    if (a === 'delete') {
      deleteCards(ids)
      return
    }
    if (a === 'duplicate') {
      pushCanvasHistory()
      const ts = Date.now()
      setCards((cs) => [...cs, ...selCards.map((c, i) => ({ ...c, id: `cp-${ts}-${i}`, groupId: undefined, x: c.x + 40, y: c.y + 40 }))])
      return
    }
    if (a === 'download') {
      if (ids.length > 1) exportSel()
      else if (selCards[0]) downloadGenCard(selCards[0])
      return
    }
    if (a === 'detail' && ids.length === 1) {
      setDetailId(ids[0])
      return
    }
    if (a === 'regen' && ids.length === 1) genCardAction(ids[0], 'regen')
  }

  // 创建编组：为选中卡片分配同组 id，之后点选/拖拽任意一张即整组联动
  const groupSel = () => {
    const targets = selCards.filter((c) => c.kind !== 'frame')
    if (targets.length < 2) {
      showToast('请至少选择 2 张图片进行编组')
      return
    }
    pushCanvasHistory()
    const gid = `grp-${Date.now()}`
    const ids = targets.map((c) => c.id)
    setCards((cs) => cs.map((c) => (ids.includes(c.id) ? { ...c, groupId: gid } : c)))
    showToast(`已创建编组（${targets.length} 张图片），点选任意一张即可整组联动`)
  }

  // 解除编组：清除选中卡片的编组 id，恢复各自独立点选/拖拽
  const ungroupSel = () => {
    const ids = selCards.filter((c) => c.groupId).map((c) => c.id)
    if (!ids.length) return
    pushCanvasHistory()
    setCards((cs) => cs.map((c) => (ids.includes(c.id) ? { ...c, groupId: undefined } : c)))
    showToast('已解除编组')
  }

  // 合并图层：选中卡片按压平时的相对布局压平为一张合并卡（随合并卡整体移动/缩放/删除/下载）
  const flattenSel = () => {
    const targets = selCards.filter((c) => c.kind !== 'frame')
    if (targets.length < 2) {
      showToast('请至少选择 2 张图片进行合并')
      return
    }
    const x0 = Math.min(...targets.map((c) => c.x))
    const y0 = Math.min(...targets.map((c) => c.y))
    const x1 = Math.max(...targets.map((c) => c.x + c.w))
    const y1 = Math.max(...targets.map((c) => c.y + cardH(c)))
    const ids = targets.map((c) => c.id)
    const mergedCard: Card = {
      id: `mg-${Date.now()}`,
      tag: '合并图层',
      x: x0,
      y: y0,
      w: x1 - x0,
      imgH: y1 - y0,
      kind: 'gen',
      layers: { box: { w: x1 - x0, h: y1 - y0 }, items: targets.map((c) => ({ card: { ...c, groupId: undefined }, dx: c.x - x0, dy: c.y - y0 })) },
    }
    pushCanvasHistory()
    setCards((cs) => [...cs.filter((c) => !ids.includes(c.id)), mergedCard])
    setSelected([mergedCard.id])
    onMarksChange(marks.filter((m) => !ids.includes(m.cardId)))
    if (detailId && ids.includes(detailId)) setDetailId(null)
    showToast(`已合并 ${targets.length} 个图层为一张图片`)
  }

  // 右键功能卡片：右键点击图片弹出；未选中的图片右键后改为单选，已选中则保持当前选区
  const onContextMenu = (e: RMouseEvent) => {
    e.preventDefault()
    const target = e.target as HTMLElement
    const cardEl = target.closest('[data-card]') as HTMLElement | null
    if (!containerRef.current) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const wx = (x - viewRef.current.x) / viewRef.current.k
    const wy = (y - viewRef.current.y) / viewRef.current.k
    const pos = { x: Math.max(8, Math.min(x, rect.width - 192)), y: Math.max(8, Math.min(y, rect.height - 200)), wx, wy }
    if (!cardEl) {
      // 空白处右键：执行过「复制」后，在画布任意空白位置也可唤起功能卡片执行「粘贴到此处」
      if (clipboardRef.current.length) setCtxMenu({ ...pos, onCard: false })
      else setCtxMenu(null)
      return
    }
    const id = cardEl.id.replace('card-', '')
    if (!selected.includes(id)) setSelected([id])
    setCtxMenu({ ...pos, onCard: true })
  }

  // 右键功能卡片动作：复制 / 粘贴到此处 / 导出 / 删除
  const ctxAction = (a: 'copy' | 'paste' | 'export' | 'delete') => {
    const menu = ctxMenu
    setCtxMenu(null)
    if (a === 'copy') {
      clipboardRef.current = selCards.map((c) => ({ ...c }))
      showToast(`已复制 ${selCards.length} 张图片`)
      return
    }
    if (a === 'paste') {
      const clip = clipboardRef.current
      if (!clip.length || !menu) return
      const x0 = Math.min(...clip.map((c) => c.x))
      const y0 = Math.min(...clip.map((c) => c.y))
      const ts = Date.now()
      pushCanvasHistory()
      setCards((cs) => [
        ...cs,
        ...clip.map((c, i) => ({ ...c, id: `ps-${ts}-${i}`, groupId: undefined, x: menu.wx + (c.x - x0), y: menu.wy + (c.y - y0), ts })),
      ])
      showToast(`已粘贴 ${clip.length} 张图片`)
      return
    }
    if (a === 'export') {
      exportSel()
      return
    }
    capsuleAction('delete')
  }

  // 进入 AI 擦除：仅单选图片可用，唤起图片上方悬浮工具条（笔刷粗细 / 清空 / 取消 / 擦除）
  const enterAiErase = (cardId: string) => {
    // 与标注工具互斥：擦除模式的画布点击归涂抹蒙版
    setAiTool(null)
    setEraseMode(cardId)
    setEraseMasks([])
    eraseCommittedRef.current = []
    eraseDrawRef.current = null
    setEraseBusy(false)
    showToast('在图片上涂抹需要 AI 擦除的区域')
  }
  const cancelAiErase = () => {
    setEraseMode(null)
    setEraseMasks([])
    eraseCommittedRef.current = []
    eraseDrawRef.current = null
    setEraseBusy(false)
  }

  // 进入框选编辑：仅单选图片可用，标注工具菜单项高亮激活；在图片上拖拽框选区域，可多次执行
  const enterRegionEdit = (cardId: string) => {
    // 与点选编辑互斥：框选模式的画布点击归区域框选；完整释放点选编辑态，避免待定气泡/编辑条残留冲突
    setAiTool(null)
    setGenPickMode(false) // 与生成器「从画布中选择」互斥
    discardPointBubbleRef.current() // 丢弃未提交的待定点气泡（已提交标记保留）
    if (penOnRef.current) exitPen()
    if (eraseModeRef.current) cancelAiErase()
    setPanOn(false)
    setGenBarOn(false)
    setAiMenu(false)
    setRegionMode(cardId)
    regionDrawRef.current = null
    setRegionLive(null)
    showToast('在图片上框选需要修改的区域，可多次框选')
  }
  const exitRegionEdit = () => {
    setRegionMode(null)
    regionDrawRef.current = null
    setRegionLive(null)
  }
  // 框选编辑交互优化：标记带入对话框并发送（标记被清空）后，自动释放还原框选编辑态，无需再次点击退出
  useEffect(() => {
    if (cards.length > 0) markGuideSeen() // 画布首次出现内容后，新手引导永久不再显示
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cards.length])
  const prevMarksLenRef = useRef(marks.length)
  useEffect(() => {
    if (prevMarksLenRef.current > 0 && marks.length === 0 && regionModeRef.current) exitRegionEdit()
    prevMarksLenRef.current = marks.length
  }, [marks])
  const clearAiEraseMasks = () => {
    eraseCommittedRef.current = []
    eraseDrawRef.current = null
    setEraseMasks([])
  }
  // 执行 AI 擦除：位图卡片按蒙版做真实模糊修复（object-contain 映射回原图像素），矢量卡片模拟处理
  const runAiErase = () => {
    const id = eraseModeRef.current
    const card = id ? cardsRef.current.find((c) => c.id === id) : null
    if (!card) return
    const masks = eraseCommittedRef.current
    if (!masks.length) {
      showToast('请先在图片上涂抹要擦除的区域')
      return
    }
    pushCanvasHistory()
    setEraseBusy(true)
    // AI 生成结果作为一张新图片放到被执行图片的右侧水平位置（靠在一起），生成过程中带 loading 状态
    const nid = `er-${Date.now()}`
    setCards((cs) => [
      ...cs,
      {
        id: nid,
        tag: 'AI擦除',
        x: card.x + card.w + 40,
        y: card.y,
        w: card.w,
        imgH: card.imgH,
        kind: 'gen' as const,
        palette: (card.palette ?? 0) + 1,
        frame: { busy: true },
        ts: Date.now(),
      },
    ])
    window.setTimeout(() => {
      const finish = (img?: string) => {
        setCards((cs) => cs.map((c) => (c.id === nid ? { ...c, img: img ?? c.img, frame: undefined } : c)))
        showToast('已完成 AI 擦除，结果图已放到原图右侧')
      }
      if (!card.img) {
        finish()
        return
      }
      const im = new window.Image()
      im.onload = () => {
        const natW = im.naturalWidth
        const natH = im.naturalHeight
        const sc = Math.min(card.w / natW, card.imgH / natH) // object-contain 缩放比
        const dw = natW * sc
        const dh = natH * sc
        const dx = (card.w - dw) / 2
        const dy = (card.imgH - dh) / 2
        const cv = document.createElement('canvas')
        cv.width = natW
        cv.height = natH
        const ctx = cv.getContext('2d')!
        ctx.drawImage(im, 0, 0)
        // 蒙版画布：白色粗描边
        const mk = document.createElement('canvas')
        mk.width = natW
        mk.height = natH
        const mctx = mk.getContext('2d')!
        mctx.strokeStyle = '#fff'
        mctx.lineCap = 'round'
        mctx.lineJoin = 'round'
        masks.forEach((m) => {
          mctx.lineWidth = m.width / sc
          mctx.beginPath()
          m.points.forEach((pt, j) => {
            const px = (pt.x - dx) / sc
            const py = (pt.y - dy) / sc
            if (j === 0) mctx.moveTo(px, py)
            else mctx.lineTo(px, py)
          })
          if (m.points.length === 1) mctx.lineTo((m.points[0].x - dx) / sc + 0.01, (m.points[0].y - dy) / sc)
          mctx.stroke()
        })
        // 模糊副本按蒙版抠出并覆盖回原图（模拟 AI 修复填补）
        const bc = document.createElement('canvas')
        bc.width = natW
        bc.height = natH
        const bctx = bc.getContext('2d')!
        bctx.filter = 'blur(24px)'
        bctx.drawImage(im, 0, 0)
        bctx.filter = 'none'
        bctx.globalCompositeOperation = 'destination-in'
        bctx.drawImage(mk, 0, 0)
        ctx.drawImage(bc, 0, 0)
        finish(cv.toDataURL('image/png'))
      }
      im.onerror = () => finish()
      im.src = card.img
    }, 1400)
    cancelAiErase() // 结果卡片已创建并进入 loading，退出编辑态
  }

  // 胶囊导航 AI 功能（原型模拟）：背景移除 / 背面生成 / 款式提取 / 擦除（框选编辑已移至底部「标注工具」菜单）
  const capsuleAi = (a: 'bgRemove' | 'backView' | 'styleExtract' | 'erase') => {
    const targets = selCards.filter((c) => c.kind !== 'frame')
    if (!targets.length) return
    if (a === 'erase') {
      // AI 擦除（针对图片）：唤起专属悬浮工具条，涂抹蒙版后执行（不同于画笔模块的橡皮擦）
      enterAiErase(targets[0].id)
      return
    }
    pushCanvasHistory()
    const busyIds = targets.map((c) => c.id)
    setCards((cs) => cs.map((c) => (busyIds.includes(c.id) ? { ...c, frame: { ...(c.frame ?? { busy: false }), busy: true } } : c)))
    window.setTimeout(() => {
      const clearBusy = (cs: Card[]) => cs.map((c) => (busyIds.includes(c.id) ? { ...c, frame: c.frame ? { ...c.frame, busy: false } : undefined } : c))
      if (a === 'backView') {
        const ts = Date.now()
        setCards((cs) => [
          ...clearBusy(cs),
          ...targets.map((c, i) => ({
            id: `bv-${ts}-${i}`,
            tag: '背面生成',
            x: c.x + c.w + 40,
            y: c.y,
            w: c.w,
            imgH: c.imgH,
            kind: 'gen' as const,
            palette: (c.palette ?? 0) + 2,
            ts,
          })),
        ])
        showToast(`已生成 ${targets.length} 张背面视图`)
      } else if (a === 'styleExtract') {
        const ts = Date.now()
        setCards((cs) => [
          ...clearBusy(cs),
          ...targets.map((c, i) => ({
            id: `ex-${ts}-${i}`,
            tag: '款式提取',
            x: c.x + c.w + 40,
            y: c.y,
            w: c.w,
            imgH: c.imgH,
            kind: 'flat' as const,
            palette: (c.palette ?? 0) + 1,
            ts,
          })),
        ])
        showToast(`已提取 ${targets.length} 张款式图`)
      } else {
        // 背景移除：忙碌处理后图片区域切换为透明棋盘格（可见结果）
        setCards((cs) => clearBusy(cs).map((c) => (busyIds.includes(c.id) ? { ...c, noBg: true } : c)))
        showToast('背景移除完成')
      }
    }, 1500)
  }

  // 「生成图片」：在画布中央放置占位图框，并打开联动的提示词面板（已打开则闪烁提示）
  const startGenFrame = () => {
    setImportMenu(false)
    setAiMenu(false)
    setModeMenu(false)
    if (genPanel) {
      if (cardsRef.current.some((c) => c.id === genPanel.cardId)) {
        setGenPanelHidden(false) // 输入模块已隐藏则重新弹出
        setPanelPulse(true)
        window.setTimeout(() => setPanelPulse(false), 650)
        return
      }
      // 图框已被删除 / 撤销：失效引用复位，继续向下创建新图框（修复「只支持一次激活」）
      setGenPanel(null)
      setGenPanelExpanded(false)
      setGenPickMode(false)
    }
    // 与画笔 / 标注 / 任务模块互斥，保证点击逻辑不冲突
    if (penOnRef.current) exitPen()
    setAiTool(null)
    setGenBarOn(false)
    // 上传框固定为正方形（默认 427 = 640 减小三分之一），放置在画布可视区中央偏上：下方留出联动输入模块的空间
    const w = 427
    const imgH = 427
    const rect = containerRef.current?.getBoundingClientRect()
    const vw = rect?.width ?? 1200
    const vh = rect?.height ?? 800
    const cx = ((vw + leftOffset) / 2 - view.x) / view.k
    const at = { x: cx - w / 2, y: (vh * 0.42 - view.y) / view.k - imgH / 2 }
    const id = `frame-${Date.now()}`
    pushCanvasHistory()
    setCards((cs) => [...cs, { id, tag: '生成器', x: at.x, y: at.y, w, imgH, kind: 'frame' as const, frame: { busy: false } }])
    setGenPanel({ cardId: id, text: '', model: '画衣衣 Image 2.0', refs: [], count: '1张', ratio: '3:4' })
    setGenPanelHidden(false)
  }

  // 「视频生成器」：在画布中央放置占位图框，并打开联动的输入模块（UI 与交互逻辑跟「生成图片」模块保持一致）
  const startVideoFrame = () => {
    setImportMenu(false)
    setAiMenu(false)
    setModeMenu(false)
    if (vidPanel) {
      if (cardsRef.current.some((c) => c.id === vidPanel.cardId)) {
        setVidPanelHidden(false) // 输入模块已隐藏则重新弹出
        setPanelPulse(true)
        window.setTimeout(() => setPanelPulse(false), 650)
        return
      }
      // 图框已被删除 / 撤销：失效引用复位，继续向下创建新图框
      setVidPanel(null)
      setVidPanelExpanded(false)
    }
    // 与画笔 / 标注 / 任务模块 / 选图模式互斥，保证点击逻辑不冲突
    if (penOnRef.current) exitPen()
    setAiTool(null)
    setGenBarOn(false)
    setGenPickMode(false)
    // 上传框默认 16:9（与视频画幅一致），放置在画布可视区中央偏上：下方留出联动输入模块的空间
    const w = 512
    const imgH = 288
    const rect = containerRef.current?.getBoundingClientRect()
    const vw = rect?.width ?? 1200
    const vh = rect?.height ?? 800
    const cx = ((vw + leftOffset) / 2 - view.x) / view.k
    const at = { x: cx - w / 2, y: (vh * 0.42 - view.y) / view.k - imgH / 2 }
    const id = `vframe-${Date.now()}`
    pushCanvasHistory()
    setCards((cs) => [...cs, { id, tag: '视频生成器', x: at.x, y: at.y, w, imgH, kind: 'frame' as const, frame: { busy: false } }])
    setVidPanel({ cardId: id })
    setVidPanelHidden(false)
  }

  // 打开 AI 设计工具任务模块（底部导航 / 画布初始空态共用）：灵感设计 / 换面料 / 模特试衣
  const openAiTool = (name: string) => {
    setActiveTool(name)
    setGenBarOn(true) // 点击功能键，在无限画布中打开任务模块
    setGenBarExpanded(false) // 重新打开时回到锚定态
    setGenBarOff({ x: 0, y: 0 }) // 重新打开时回到默认居中位置
    genBatchRef.current = [] // 新一轮生成重新从任务条上方开始叠加
    // 与画笔 / 标注工具互斥：打开任务模块前退出画布工具，保证点击逻辑不冲突
    if (penOnRef.current) exitPen()
    setAiTool(null)
  }

  // 提交「生成图片」：图框进入生成态，完成后替换为 AI 结果卡片（有参考图则以其为结果）；「数量/比例」决定结果卡数量与画幅
  const sendGenFrame = () => {
    if (!genPanel || !genPanel.text.trim()) return
    const { cardId, text, model, refs, count, ratio } = genPanel
    setGenPanel(null)
    setGenPanelExpanded(false)
    setGenPickMode(false)
    setCards((cs) => cs.map((c) => (c.id === cardId ? { ...c, frame: { busy: true, prompt: text, model } } : c)))
    window.setTimeout(() => {
      const n = parseInt(count) || 1
      const [rw, rh] = ratio.split(':').map(Number)
      setCards((cs) => {
        const fr = cs.find((c) => c.id === cardId)
        if (!fr) return cs
        // 结果卡保持图框宽度，按所选比例推算高度；多张时从图框位置依次向右排开（间距与任务模块一致为 40）
        const imgH = Math.round((fr.w * (rh || 4)) / (rw || 3))
        const gap = 40
        const results = Array.from({ length: n }, (_, i) => ({
          id: i === 0 ? cardId : `gen-${Date.now()}-${i}`,
          kind: 'gen' as const,
          tag: '生成图片',
          x: fr.x + i * (fr.w + gap),
          y: fr.y,
          w: fr.w,
          imgH,
          img: refs[i] ?? refs[0] ?? undefined,
          palette: genCountRef.current++,
          ts: Date.now(),
          frame: undefined,
        }))
        return [...cs.filter((c) => c.id !== cardId), ...results]
      })
    }, 1800)
  }

  // 任务模块可提交条件：原型图 + 灵感图 + 设计描述齐备（视频生成已独立为「视频生成器」图框模块）
  const canSend = !!(prompt.trim() && protoImg && inspoImg)
  const generate = () => {
    if (!canSend || generating) return
    setGenerating(true)
    const n = parseInt(count) || 1
    const w = 320
    const [rw, rh] = ratio.split(':').map(Number)
    const imgH = Math.round((w * (rh || 4)) / (rw || 3))
    const gap = 40
    // 生成结果叠加：每批卡片水平居中于任务条正上方；图片与图片、图片与任务条间距统一为 40
    const total = w * n + gap * (n - 1)
    let at: { x: number; y: number }
    const barEl = document.querySelector('[data-genbar]')
    const cEl = containerRef.current
    if (barEl && cEl) {
      const cr = cEl.getBoundingClientRect()
      const br = barEl.getBoundingClientRect()
      const v = viewRef.current
      const barCX = (br.left + br.width / 2 - cr.left - v.x) / v.k
      const barTop = (br.top - cr.top - v.y) / v.k
      at = { x: barCX - total / 2, y: barTop - gap - imgH }
    } else {
      at = viewCenterWorld(total, imgH)
    }
    const shift = imgH + gap
    const prevIds = genBatchRef.current
    const batchIds = Array.from({ length: n }, (_, i) => `gen-${Date.now()}-${i}`)
    // 先落「正在生成」占位卡：任务执行过程在画布结果位同步可见，完成后原位替换为设计图
    setCards((cs) => [
      ...cs.map((c) => (prevIds.includes(c.id) ? { ...c, y: c.y - shift } : c)),
      ...batchIds.map((id, i) => ({
        id,
        tag: activeTool,
        x: at.x + i * (w + gap),
        y: at.y,
        w,
        imgH,
        kind: 'frame' as const,
        frame: { busy: true, model: '画衣衣 Image 2.0' },
      })),
    ])
    genBatchRef.current = batchIds
    window.setTimeout(() => {
      setCards((cs) =>
        cs.map((c) =>
          batchIds.includes(c.id)
            ? {
                id: c.id,
                tag: activeTool,
                x: c.x,
                y: c.y,
                w: c.w,
                imgH: c.imgH,
                kind: 'gen' as const,
                palette: genCountRef.current++,
                ts: Date.now(),
              }
            : c,
        ),
      )
      setGenerating(false) // 任务条保持开启，可继续上传图片生成；点击画布空白处自动收起
      showToast(`已生成 ${n} 张「${activeTool}」设计图`)
    }, 1800)
  }

  // 提交「视频生成」：运动描述即可生成（首帧 / 尾帧可选，控制起止画面）→ 画布先落「正在生成」占位（模型名 Video 1.0）；有首帧则以其为封面，无首帧用生成画面，均带播放键与时长角标
  // 提交「视频生成器」：图框进入生成态，完成后原位替换为视频结果卡（首帧为封面；画幅随所选比例）
  const sendVideoFrame = () => {
    if (!vidPanel || !videoPrompt.trim()) return
    const { cardId } = vidPanel
    const start = videoStart
    const dur = videoDur
    const [rw, rh] = videoRatio.split(':').map(Number)
    setVidPanel(null)
    setVidPanelExpanded(false)
    setCards((cs) => cs.map((c) => (c.id === cardId ? { ...c, frame: { busy: true, prompt: videoPrompt.trim(), model: vidModel } } : c)))
    window.setTimeout(() => {
      setCards((cs) =>
        cs.map((c) =>
          c.id === cardId
            ? {
                ...c,
                kind: 'gen' as const,
                tag: '视频生成',
                imgH: Math.round((c.w * (rh || 9)) / (rw || 16)), // 画幅跟随所选比例（宽度保持图框宽）
                img: start ?? undefined, // 首帧作为视频封面
                video: true,
                videoDur: dur,
                palette: genCountRef.current++,
                ts: Date.now(),
                frame: undefined,
              }
            : c,
        ),
      )
      showToast(`已生成 1 段「视频生成」视频（${dur}）`)
    }, 2200)
  }

  // 选中派生数据：选中卡片集合 + 整体包围盒（世界坐标，≥1 张即激活顶部胶囊功能导航栏）
  const selCards = cards.filter((c) => selected.includes(c.id))
  // 框选编辑开关（标注工具菜单入口）：需先在画布上单选一张图片；再次选择或激活其他工具时退出
  const toggleRegionEdit = () => {
    if (regionModeRef.current) {
      exitRegionEdit()
      return
    }
    const targets = selCards.filter((c) => c.kind !== 'frame')
    if (targets.length !== 1) {
      showToast('请先在画布上选中一张图片，再使用框选编辑')
      return
    }
    enterRegionEdit(targets[0].id)
  }
  toggleRegionRef.current = toggleRegionEdit

  // 点选编辑（新交互）：点选标记 = 无 w/h 的标记；框选标记 = 带 w/h（框选完成即自动带入 Agent 对话框）
  const pointMarks = marks.filter((m) => m.w == null).sort((a, b) => a.id - b.id)
  discardPointBubbleRef.current = () => {
    setPendingPoint(null)
    setEditingMarkId(null)
    setPendingNote('')
  }

  // 提交/关闭气泡：有待定点且有文本 → 生成编号标记；编辑已有标记且有文本 → 更新描述；空文本则丢弃待定/关闭编辑
  const closePointBubble = () => {
    const note = pendingNote.trim()
    if (pendingPoint && note) {
      onMarksChange([...marks, { id: ++markSeq.current, cardId: pendingPoint.cardId, dx: pendingPoint.dx, dy: pendingPoint.dy, note }])
      setRedoStack([]) // 新提交清空重做栈
    } else if (editingMarkId != null && note) {
      onMarksChange(marks.map((x) => (x.id === editingMarkId ? { ...x, note } : x)))
    }
    setPendingPoint(null)
    setEditingMarkId(null)
    setPendingNote('')
  }
  // Esc / 退出工具：丢弃待定点、关闭编辑（不提交）
  const discardPointBubble = () => {
    setPendingPoint(null)
    setEditingMarkId(null)
    setPendingNote('')
  }
  // 撤销：移除最后一个点选标记（可重做）
  const undoPointMark = () => {
    if (!pointMarks.length) return
    const last = pointMarks[pointMarks.length - 1]
    onMarksChange(marks.filter((m) => m.id !== last.id))
    setRedoStack((st) => [...st, last])
  }
  // 重做：恢复最近撤销的标记
  const redoPointMark = () => {
    if (!redoStack.length) return
    const m = redoStack[redoStack.length - 1]
    setRedoStack((st) => st.slice(0, -1))
    onMarksChange([...marks, m])
  }
  // 清除：移除全部点选标记（清空重做栈）
  const clearPointMarks = () => {
    onMarksChange(marks.filter((m) => m.w != null))
    setRedoStack([])
    discardPointBubble()
  }
  // 修改：确认后直接执行（不经过 Agent 对话）——在源图片右侧生成新的结果卡，先显示「修改中…」遮罩，完成后呈现修改结果
  const executePointEdits = () => {
    const bubbleNote = pendingNote.trim()
    let base = marks
    let pts = pointMarks
    if (pendingPoint && bubbleNote) {
      // 待定点有文本：视为即时提交（排在最后）
      const nm: Mark = { id: ++markSeq.current, cardId: pendingPoint.cardId, dx: pendingPoint.dx, dy: pendingPoint.dy, note: bubbleNote }
      base = [...marks, nm]
      pts = [...pts, nm]
    } else if (editingMarkId != null && bubbleNote) {
      // 编辑中的标记：以气泡文本为准
      base = marks.map((x) => (x.id === editingMarkId ? { ...x, note: bubbleNote } : x))
      pts = pts.map((x) => (x.id === editingMarkId ? { ...x, note: bubbleNote } : x))
    }
    const notes = pts.map((m) => (m.note || '').trim()).filter(Boolean)
    if (!notes.length) return
    const src = cardsRef.current.find((c) => c.id === pts[pts.length - 1].cardId) ?? cardsRef.current.find((c) => c.id === pts[0].cardId)
    onMarksChange(base.filter((m) => m.w != null))
    setRedoStack([])
    setPendingPoint(null)
    setEditingMarkId(null)
    setPendingNote('')
    if (!src) return
    // 结果卡：复制源卡放到其右侧，进入「修改中…」状态；完成后揭示结果（矢量生成卡换一个配色模拟修改）
    const nid = `mod-${Date.now()}`
    const nc: Card = {
      ...src,
      id: nid,
      groupId: undefined,
      x: src.x + src.w + 48,
      y: src.y,
      ts: Date.now(),
      simModify: true,
      frame: { ...(src.frame ?? { busy: false }), busy: true },
    }
    setCards((cs) => [...cs, nc])
    window.setTimeout(() => {
      setCards((cs) =>
        cs.map((c) =>
          c.id === nid
            ? {
                ...c,
                frame: { ...(c.frame ?? { busy: false }), busy: false },
                palette: c.kind === 'gen' && !c.img ? (c.palette ?? 0) + 1 : c.palette, // 修改结果：矢量卡换配色呈现差异
              }
            : c,
        ),
      )
    }, 2800)
  }

  // AI 部位识别（原型模拟）：按标记在图片上的相对位置推测部位候选，用户在状态栏中确认或自定义
  const partCandidates = (card: Card, m: Mark): string[] => {
    const cx = (m.dx + (m.w ?? 0) / 2) / card.w
    const cy = (m.dy + (m.h ?? 0) / 2) / card.imgH
    let part: string
    if (cy < 0.22) part = cx < 0.3 || cx > 0.7 ? '肩部' : '领口 / 领子'
    else if (cy < 0.52) part = cx < 0.25 || cx > 0.75 ? '袖子' : '前片 / 门襟'
    else if (cy < 0.78) part = cx < 0.25 || cx > 0.75 ? '袖口' : '腰部 / 口袋'
    else part = '下摆'
    return [part, '整体']
  }

  // 点选图片自动关联 Agent：单选/多选图片即刻同步为 Agent 对话框附件（位图引用原图 URL；矢量卡片即时渲染为 SVG；取消选择则移除）
  const selKey = selected.join(',')
  useEffect(() => {
    if (!onSendToAgent) return
    const targets = selCards.filter((c) => c.kind !== 'frame')
    const items = targets.map((c) => {
      if (c.img) return { name: `${c.tag}.png`, url: c.img }
      let svg: string
      if (c.coat) svg = renderToStaticMarkup(<CoatThumb spec={c.coat} />)
      else if (c.trim) svg = renderToStaticMarkup(<TrimThumb type={c.trim.type} fill={c.trim.fill} />)
      else {
        const p = genColors(c)
        svg = renderToStaticMarkup(<ModelFigure jacket={p.jacket} inner={p.inner} skirt={p.skirt} pants={p.pants} />)
      }
      if (!svg.includes('xmlns')) svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"')
      const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }))
      return { name: `${c.tag}.svg`, url }
    })
    onSendToAgent(items)
  }, [selKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const selBBox =
    selCards.length >= 1
      ? {
          x0: Math.min(...selCards.map((c) => c.x)),
          y0: Math.min(...selCards.map((c) => c.y)),
          x1: Math.max(...selCards.map((c) => c.x + c.w)),
          y1: Math.max(...selCards.map((c) => c.y + cardH(c))),
        }
      : null

  // 编组状态：选中卡片/笔划全部属于同一编组时，胶囊「创建编组」切换为「解除编组」
  const selGrouped = selCards.length >= 2 && selCards.every((c) => c.groupId && c.groupId === selCards[0].groupId)

  // 框选中的浮动笔划包围盒（世界坐标）：仅在未选中卡片时激活笔划胶囊导航栏（与框选图片一致）
  const selStrokes = strokes.filter((st) => selStrokeIds.includes(st.id) && st.points.length)
  const strokesGrouped = selStrokes.length >= 2 && selStrokes.every((st) => st.groupId && st.groupId === selStrokes[0].groupId)
  const strokeSelBBox =
    !selCards.length && selStrokes.length
      ? (() => {
          const xs = selStrokes.flatMap((st) => st.points.map((p) => p.x))
          const ys = selStrokes.flatMap((st) => st.points.map((p) => p.y))
          const pad = Math.max(...selStrokes.map((st) => st.width / 2)) + 6
          return { x0: Math.min(...xs) - pad, y0: Math.min(...ys) - pad, x1: Math.max(...xs) + pad, y1: Math.max(...ys) + pad }
        })()
      : null

  const SPACE_ITEMS = [
    { type: 'varr' as const, icon: Rows3, label: '垂直排列' },
    { type: 'harr' as const, icon: Columns3, label: '水平排列' },
    { type: 'grid' as const, icon: Grid2x2, label: '自动排列' },
  ]
  // 详情二级页当前卡片（随 cards 状态实时刷新，如「再次生成」后配色）
  const detailCard = detailId ? (cards.find((c) => c.id === detailId) ?? null) : null
  const detailColors = detailCard ? genColors(detailCard) : null
  const detailIsGen = detailCard ? detailCard.kind === 'gen' && !detailCard.img : false

  // ── 右下角控制条：取色 / 缩放 / 地图 派生值与处理器 ──
  const hsv = hexToHsv(canvasColor)
  const hueColor = hsvToHex(hsv.h, 100, 100)
  // 视口内是否还有节点（决定「回到节点」胶囊是否出现）
  const vpHasNode = (() => {
    const el = containerRef.current
    if (!el || !cards.length) return false
    const x0 = -view.x / view.k
    const y0 = -view.y / view.k
    const x1 = (el.clientWidth - view.x) / view.k
    const y1 = (el.clientHeight - view.y) / view.k
    return cards.some((c) => c.x < x1 && c.x + c.w > x0 && c.y < y1 && c.y + cardH(c) > y0)
  })()

  // 缩放到指定比例（以画布中心为锚点）
  const zoomTo = (k: number) => {
    zoomBy(k / view.k)
    setZoomMenu(false)
  }

  // 取色器：SV 面板拾取（按下后可拖动连续取色，保持当前色相）
  const svPick = (e: RPointerEvent) => {
    const el = e.currentTarget as HTMLElement
    const apply = (cx: number, cy: number) => {
      const r = el.getBoundingClientRect()
      const sat = Math.min(100, Math.max(0, ((cx - r.left) / r.width) * 100))
      const val = Math.min(100, Math.max(0, 100 - ((cy - r.top) / r.height) * 100))
      setCanvasColor((prev) => hsvToHex(hexToHsv(prev).h, sat, val))
    }
    apply(e.clientX, e.clientY)
    const move = (ev: PointerEvent) => apply(ev.clientX, ev.clientY)
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // 取色器：色相滑杆（保持当前饱和度 / 明度）
  const huePick = (e: RPointerEvent) => {
    const el = e.currentTarget as HTMLElement
    const apply = (cx: number) => {
      const r = el.getBoundingClientRect()
      const h = Math.min(360, Math.max(0, ((cx - r.left) / r.width) * 360))
      setCanvasColor((prev) => {
        const cur = hexToHsv(prev)
        // 当前为灰阶色（饱和度≈0）时，拖动色相条直接给足饱和/明度，让画布颜色立即可见
        const s2 = cur.s < 8 ? 100 : cur.s
        const v2 = cur.v < 8 ? 100 : cur.v
        return hsvToHex(h, s2, v2)
      })
    }
    apply(e.clientX)
    const move = (ev: PointerEvent) => apply(ev.clientX)
    const up = () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
  }

  // HEX 输入提交（非法输入回退为当前颜色）
  const commitHex = () => {
    if (/^[0-9a-fA-F]{6}$/.test(hexDraft)) setCanvasColor('#' + hexDraft.toUpperCase())
    else setHexDraft(canvasColor.replace('#', '').toUpperCase())
  }

  // 小地图导航：点击 / 拖拽将视口中心移动到对应世界坐标
  const mmNavTo = (clientX: number, clientY: number) => {
    const cv = mmCvRef.current
    const el = containerRef.current
    const g = mmGeom()
    if (!cv || !el || !g) return
    const r = cv.getBoundingClientRect()
    const wx = (clientX - r.left - g.ox) / g.sc
    const wy = (clientY - r.top - g.oy) / g.sc
    setView((v) => ({ ...v, x: el.clientWidth / 2 - wx * v.k, y: el.clientHeight / 2 - wy * v.k }))
  }
  const mmDown = (e: RPointerEvent) => {
    mmDragRef.current = true
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    mmNavTo(e.clientX, e.clientY)
  }
  const mmMove = (e: RPointerEvent) => {
    if (mmDragRef.current) mmNavTo(e.clientX, e.clientY)
  }
  const mmUp = () => {
    mmDragRef.current = false
  }

  async function saveProjectCanvas(exit: boolean) {
    if (!projectBridge || projectBusy) return
    if (cards.some(c => c.frame?.busy)) { showToast('请等待画布生成完成再保存'); return }
    setProjectBusy(true)
    try { if (await projectBridge.onSave(structuredClone({ cards, strokes, marks }))) { showToast('画布草稿已保存到本任务'); if (exit) projectBridge.onExit() } } catch { showToast('画布保存失败，请重试') } finally { setProjectBusy(false) }
  }
  async function archiveProjectSelection() {
    if (!projectBridge || projectBusy) return
    const targets = cards.filter(c => selected.includes(c.id) && c.kind !== 'frame')
    if (!targets.length) { showToast('请先选中需要归档的图片'); return }
    if (targets.some(c => c.frame?.busy)) { showToast('请等待所选图片生成完成'); return }
    setProjectBusy(true)
    const holder = document.createElement('div')
    holder.style.cssText = 'position:fixed;left:-12000px;top:0;pointer-events:none;'
    document.body.appendChild(holder)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const files = []
      for (const c of targets) {
        const node = document.createElement('div')
        node.style.cssText = `position:relative;width:${c.w}px;height:${c.imgH}px;overflow:hidden;`
        node.innerHTML = renderToStaticMarkup(<><CardImage card={c} />{c.merged && <MergedOverlay m={c.merged} />}</>)
        holder.appendChild(node)
        await Promise.all([...node.querySelectorAll('img')].map(im => im.decode()))
        const scale = Math.min(3, 2048 / Math.max(c.w, c.imgH))
        const cv = await html2canvas(node, { scale, useCORS: true, backgroundColor: null, logging: false })
        const ctx = cv.getContext('2d')
        if (!ctx) throw new Error('无法导出图片')
        ctx.scale(scale, scale); ctx.translate(-c.x, -c.y)
        strokes.forEach(st => drawStrokeOn(ctx, st))
        const blob = await new Promise<Blob>((resolve, reject) => cv.toBlob(b => b ? resolve(b) : reject(new Error('导出失败')), 'image/png'))
        files.push({ id: c.id, name: c.tag || '款式设计', blob })
        node.remove()
      }
      if (await projectBridge.onArchive(files)) showToast('所选图片已归入原任务的项目资产；新修订需手动采用')
    } catch { showToast('图片归档失败，请检查原图是否可读取后重试') } finally { holder.remove(); setProjectBusy(false) }
  }

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden touch-none select-none"
      style={{
        backgroundColor: canvasColor,
        backgroundImage: snapGrid
          ? `radial-gradient(circle, ${hexToHsv(canvasColor).v > 55 ? 'rgba(29,29,31,0.1)' : 'rgba(255,255,255,0.15)'} 1.08px, transparent 1.08px)` // 单个灰点直径加大一半：半径 0.72 → 1.08
          : undefined,
        backgroundSize: snapGrid ? `${GRID * view.k}px ${GRID * view.k}px` : undefined,
        backgroundPosition: snapGrid ? `${view.x}px ${view.y}px` : undefined,
        cursor: panning ? 'grabbing' : panOn || spaceDown ? 'grab' : eraseMode || regionMode ? 'crosshair' : 'default',
      }}
      onWheel={onWheel}
      onMouseDown={(e) => {
        // 阻止中键按下触发的浏览器自动滚动
        if (e.button === 1) e.preventDefault()
      }}
      onAuxClick={(e) => {
        if (e.button === 1) e.preventDefault()
      }}
      onPointerDown={onPointerDown}
      onContextMenu={onContextMenu}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDragEnter={(e) => {
        e.preventDefault()
        dragDepth.current += 1
        if (e.dataTransfer.types.includes('Files')) setFileDragOn(true)
        setDragOver(true)
      }}
      onDragOver={(e) => {
        e.preventDefault()
        // 本地文件拖入：实时更新落点预览位置（rAF 合帧，避免频繁重渲染）
        if (e.dataTransfer.types.includes('Files')) {
          const rect = containerRef.current?.getBoundingClientRect()
          if (rect) {
            const nx = e.clientX - rect.left
            const ny = e.clientY - rect.top
            cancelAnimationFrame(fileDropRaf.current)
            fileDropRaf.current = requestAnimationFrame(() => setFileDropAt({ x: nx, y: ny }))
          }
        }
      }}
      onDragLeave={() => {
        dragDepth.current -= 1
        if (dragDepth.current <= 0) {
          dragDepth.current = 0
          setDragOver(false)
          setFileDragOn(false)
          cancelAnimationFrame(fileDropRaf.current) // 先取消挂起的位置提交，避免移出后落点框被「复活」成幽灵框
          setFileDropAt(null)
        }
      }}
      onDrop={(e) => {
        e.preventDefault()
        dragDepth.current = 0
        setDragOver(false)
        setFileDragOn(false)
        cancelAnimationFrame(fileDropRaf.current) // 同上：松手后不得再有滞后的落点框提交
        setFileDropAt(null)
        const { wx, wy } = toWorld(e)
        // 素材库拖拽优先（款式/通用资产），其次本地图片文件
        const coat = e.dataTransfer.getData('application/x-hxy-coat')
        if (coat) {
          try {
            addCoatCard(JSON.parse(coat), { wx, wy })
          } catch {
            /* 非法数据忽略 */
          }
          return
        }
        const asset = e.dataTransfer.getData('application/x-hxy-asset')
        if (asset) {
          try {
            addAssetCard(JSON.parse(asset), { wx, wy })
          } catch {
            /* 非法数据忽略 */
          }
          return
        }
        // 「生成图片」占位图框：本地图片落到图框上 → 直接绑定为提示词面板的参考图
        if (genPanel && e.dataTransfer.files.length > 0) {
          const frameCard = cardsRef.current.find((c) => c.id === genPanel.cardId)
          const inFrame =
            frameCard && wx >= frameCard.x && wx <= frameCard.x + frameCard.w && wy >= frameCard.y && wy <= frameCard.y + frameCard.imgH
          if (inFrame) {
            const img = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'))
            if (img) {
              setGenPanel({ ...genPanel, refs: [...genPanel.refs, URL.createObjectURL(img)] })
              return
            }
          }
        }
        // 「视频生成器」图框：本地图片落到图框上 → 绑定为首帧（首帧已满则尾帧）
        if (vidPanel && e.dataTransfer.files.length > 0) {
          const frameCard = cardsRef.current.find((c) => c.id === vidPanel.cardId)
          const inFrame =
            frameCard && wx >= frameCard.x && wx <= frameCard.x + frameCard.w && wy >= frameCard.y && wy <= frameCard.y + frameCard.imgH
          if (inFrame) {
            const img = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith('image/'))
            if (img) {
              const url = URL.createObjectURL(img)
              if (!videoStart) setVideoStart(url)
              else setVideoEnd(url)
              return
            }
          }
        }
        addImageCards(Array.from(e.dataTransfer.files), { wx, wy })
      }}
    >
      {/* 图片导入：隐藏文件选择器 */}
      {projectBridge?.toolbar && createPortal(<div className="flex flex-wrap gap-2" onPointerDown={e => e.stopPropagation()} onWheel={e => e.stopPropagation()}><ProjectButton disabled={projectBusy} onClick={() => void saveProjectCanvas(false)}>保存画布草稿</ProjectButton><ProjectButton disabled={projectBusy || !selected.length} onClick={() => void archiveProjectSelection()}>归档选中图（{selected.length}）</ProjectButton><ProjectButton primary disabled={projectBusy} onClick={() => void saveProjectCanvas(true)}>{projectBridge.embedded ? '保存并收起' : '保存并返回任务'}</ProjectButton>{!projectBridge.embedded && <ProjectButton disabled={projectBusy} onClick={() => projectBridge.onDiscard()}>不保存退出</ProjectButton>}</div>, projectBridge.toolbar)}
      {projectBusy && <div className="absolute inset-0 z-50 bg-panel/50 flex items-center justify-center text-ink text-[13px]">正在保存文件，请稍候…</div>}
      <input
        ref={importInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addImageCards(Array.from(e.target.files || []))
          e.target.value = ''
        }}
      />
      {/* 「生成图片」参考图：隐藏文件选择器 */}
      <input
        ref={genFrameInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          // ➕ 号上传 = 作为「生成图片」模块的参考图（进入面板缩略图，与拖拽进面板一致）；画布上传请用底部导航栏「上传图片」
          const f = e.target.files?.[0]
          if (f && genPanel) setGenPanel({ ...genPanel, refs: [...genPanel.refs, URL.createObjectURL(f)] })
          e.target.value = ''
        }}
      />
      {/* 世界层 */}
      <style>{`@keyframes hxy-pop{0%{transform:scale(.55);opacity:0}100%{transform:scale(1);opacity:1}}@keyframes hxy-ghost-in{0%{transform:scale(.4) translateY(10px);opacity:0}100%{transform:scale(1) translateY(0);opacity:1}}.hxy-nobg{background-color:#fff;background-image:linear-gradient(45deg,#e4e4e7 25%,transparent 25%,transparent 75%,#e4e4e7 75%),linear-gradient(45deg,#e4e4e7 25%,transparent 25%,transparent 75%,#e4e4e7 75%);background-size:16px 16px;background-position:0 0,8px 8px}`}</style>
      <div
        className="absolute left-0 top-0 origin-top-left"
        style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.k})`, zIndex: cardDragging ? 30 : undefined }}
      >
        {/* 对齐参考线 */}
        {guides.v.map((x) => (
          <div key={`v${x}`} className="absolute w-px bg-pri" style={{ left: x, top: -5000, height: 10000 }} />
        ))}
        {guides.h.map((y) => (
          <div key={`h${y}`} className="absolute h-px bg-pri" style={{ top: y, left: -5000, width: 10000 }} />
        ))}
        {cards.map((c) => (
          <DesignCard
            key={c.id}
            card={c}
            selected={selected.includes(c.id)}
            panOn={panOn}
            cursor={aiTool === 'mark' ? 'crosshair' : undefined}
            refHint={(refDropHint === 'frame' && genPanel?.cardId === c.id) || (refDropHint === 'vframe' && vidPanel?.cardId === c.id)}
            ghosted={!!dragGhost && dragIds.includes(c.id)}
            eraseMasks={eraseMode === c.id ? eraseMasks : undefined}
          />
        ))}
        {/* 标记：点选=编号徽章（点击重新编辑描述）；框选=矩形选区 + 编号徽章（已自动带入 Agent 对话框，由输入区胶囊管理）。均跟随卡片拖动 */}
        {marks.map((m) => {
          const card = cards.find((c) => c.id === m.cardId)
          if (!card) return null
          // 框选编辑标记：矩形选区随卡片缩放，编号与输入区需求胶囊一一对应
          if (m.w != null && m.h != null) {
            const regionN = marks.filter((x) => x.w != null && x.id <= m.id).length
            return (
              <div
                key={m.id}
                className="absolute z-10 pointer-events-none"
                style={{
                  left: card.x + m.dx,
                  top: card.y + m.dy,
                  width: m.w,
                  height: m.h,
                  border: `${1.33 / view.k}px solid rgb(42 104 254)`,
                  background: 'rgba(42, 104, 254, 0.08)',
                }}
              >
                <span
                  className="absolute w-7 h-7 rounded-full bg-pri text-white text-[13px] font-semibold flex items-center justify-center shadow-[0_2px_10px_rgba(42,104,254,0.5)]"
                  style={{
                    left: 0,
                    top: 0,
                    // 反向缩放：编号徽章在任意缩放级别下保持恒定屏幕尺寸
                    transform: `translate(-50%, -50%) scale(${1 / view.k})`,
                  }}
                >
                  {regionN}
                </span>
              </div>
            )
          }
          const pointN = pointMarks.findIndex((x) => x.id === m.id) + 1
          return (
            <button
              key={m.id}
              data-nopan
              onClick={() => {
                // 点击编号徽章：重新打开就地气泡编辑该标记的描述
                closePointBubble()
                setEditingMarkId(m.id)
                setPendingNote(m.note ?? '')
                setPendingPoint(null)
              }}
              title="编辑该修改点"
              className={`absolute z-10 w-7 h-7 rounded-full bg-pri text-white text-[13px] font-semibold flex items-center justify-center shadow-[0_2px_10px_rgba(42,104,254,0.5)] ${m.id === editingMarkId ? 'ring-2 ring-pri/40' : ''}`}
              style={{
                left: card.x + m.dx,
                top: card.y + m.dy,
                // 反向缩放：标记在任意缩放级别下保持恒定屏幕尺寸，保证识别度
                transform: `translate(-50%, -50%) scale(${1 / view.k})`,
              }}
            >
              {pointN}
            </button>
          )
        })}
        {/* 待定点（点选编辑新交互）：蓝色圆点 + 就地输入气泡「请描述你想要的修改。」，↑/回车提交为编号标记 */}
        {(pendingPoint || editingMarkId != null) &&
          aiTool &&
          (() => {
            const pm = editingMarkId != null ? marks.find((x) => x.id === editingMarkId) : null
            const cardId = pendingPoint?.cardId ?? pm?.cardId
            const dx = pendingPoint?.dx ?? pm?.dx
            const dy = pendingPoint?.dy ?? pm?.dy
            const card = cards.find((c) => c.id === cardId)
            if (!card || dx == null || dy == null) return null
            // 气泡渲染在世界变换层内：使用世界坐标锚定圆点（垂直中心与圆点水平对齐），并以 1/k 反向缩放保持恒定屏幕尺寸
            const u = 1 / view.k
            const wx = card.x + dx
            const wy = card.y + dy
            const cw = containerRef.current?.getBoundingClientRect().width ?? 1200
            const ch = containerRef.current?.getBoundingClientRect().height ?? 800
            const flip = (wx + 18 * u + 320 * u) * view.k + view.x > cw - 8 // 右侧放不下时翻到圆点左侧
            const left = flip ? wx - (18 + 320) * u : wx + 18 * u
            const top = Math.min(Math.max(wy - 21 * u, (8 - view.y) * u), (ch - 60 - view.y) * u)
            const canCommit = !!pendingNote.trim()
            return (
              <>
                {pendingPoint && (
                  <span
                    className="absolute z-10 w-4 h-4 rounded-full bg-pri border-2 border-white shadow-[0_2px_10px_rgba(42,104,254,0.5)] pointer-events-none"
                    style={{ left: card.x + dx, top: card.y + dy, transform: `translate(-50%, -50%) scale(${1 / view.k})` }}
                  />
                )}
                <div
                  data-nopan
                  className="absolute z-30 flex items-center gap-2 w-[320px] bg-panel rounded-full border border-line shadow-[0_12px_48px_rgba(0,0,0,0.12)] pl-4 pr-1.5 py-1.5"
                  style={{ left, top, transform: `scale(${u})`, transformOrigin: 'top left' }}
                >
                  <input
                    autoFocus
                    value={pendingNote}
                    onChange={(e) => setPendingNote(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        closePointBubble() // 回车 = 提交
                      } else if (e.key === 'Escape') {
                        e.preventDefault()
                        discardPointBubble() // Esc = 丢弃/关闭
                      }
                    }}
                    placeholder="请描述你想要的修改。"
                    className="flex-1 min-w-0 h-7 text-[13px] outline-none placeholder:text-mut-3 bg-transparent"
                  />
                  <button
                    onClick={closePointBubble}
                    disabled={!canCommit}
                    title="提交该修改点"
                    className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                      canCommit ? 'bg-ink text-panel hover:opacity-90' : 'bg-fill text-mut-3 cursor-not-allowed'
                    }`}
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                </div>
              </>
            )
          })()}
        {/* 框选编辑：拖拽中的实时矩形预览（编号 = 下一个标记序号） */}
        {regionLive &&
          regionMode &&
          (() => {
            const card = cards.find((c) => c.id === regionMode)
            if (!card) return null
            return (
              <div
                className="absolute z-10 pointer-events-none"
                style={{
                  left: card.x + regionLive.x,
                  top: card.y + regionLive.y,
                  width: regionLive.w,
                  height: regionLive.h,
                  border: `${1.33 / view.k}px solid rgb(42 104 254)`,
                  background: 'rgba(42, 104, 254, 0.08)',
                }}
              >
                <div
                  className="absolute w-7 h-7 rounded-full bg-pri text-white text-[13px] font-semibold flex items-center justify-center shadow-[0_2px_10px_rgba(42,104,254,0.5)]"
                  style={{ left: 0, top: 0, transform: `translate(-50%, -50%) scale(${1 / view.k})` }}
                >
                  {marks.length + 1}
                </div>
              </div>
            )
          })()}
        {/* 框选矩形 */}
        {marquee && (
          <div
            className="absolute border border-pri bg-pri/10 rounded-sm pointer-events-none"
            style={{ left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h }}
          />
        )}
      </div>
      {/* 「画笔」绘制层：透明 Canvas 覆盖画布（编辑态捕获指针），笔划退出编辑后持久展示 */}
      <canvas
        ref={penCanvasRef}
        onPointerDown={penDown}
        onPointerMove={penMove}
        onPointerUp={penUp}
        onPointerCancel={penUp}
        onDoubleClick={commitBez} // 贝塞尔曲线：双击落笔
        className={`absolute inset-0 z-10 w-full h-full ${penOn ? 'pointer-events-auto cursor-crosshair' : 'pointer-events-none'}`}
        style={{ touchAction: 'none' }}
      />

      {/* 画布初始空态引导：居中提示 + 画衣衣业务功能入口（有内容 / 打开任务模块 / 进入画笔后自动隐藏） */}
      {!guideSeen && !cards.length && !strokes.length && !penOn && !genPanel && !vidPanel && !genBarOn && (
        <div
          className="absolute z-10 top-[46%] pointer-events-none"
          style={{ left: `calc(50% + ${leftOffset / 2}px)`, transform: 'translate(-50%, -50%)' }}
          data-nopan
        >
          <div className="flex max-w-[760px] flex-col items-center gap-5 text-center">
            <div>
              <div className="text-[20px] font-semibold text-ink">在左侧发送设计需求，或选择一个技能开始创作</div>
              <div className="mt-2 text-[13px] leading-relaxed text-mut">
                可上传款式图 / 面料图作为参考；生成任务会先显示「正在生成」loading，完成后结果自动落到画布。
              </div>
            </div>
            <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2">
              <button
                onClick={() => { markGuideSeen(); importInputRef.current?.click() }}
                className="h-9 px-4 rounded-full bg-panel border border-line shadow-[0_4px_16px_rgba(0,0,0,0.08)] flex items-center gap-1.5 text-[12.5px] text-ink hover:border-pri/40 hover:text-pri transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                上传素材
              </button>
              <button
                onClick={() => { markGuideSeen(); startGenFrame() }}
                className="h-9 px-4 rounded-full bg-panel border border-line shadow-[0_4px_16px_rgba(0,0,0,0.08)] flex items-center gap-1.5 text-[12.5px] text-ink hover:border-pri/40 hover:text-pri transition-colors"
              >
                <ImagePlus className="w-3.5 h-3.5" />
                生成图片
              </button>
              {TOOLS.map((t) => {
                const Icon = t.icon
                return (
                  <button
                    key={t.name}
                    onClick={() => { markGuideSeen(); openAiTool(t.name) }}
                    className="h-9 px-4 rounded-full bg-panel border border-line shadow-[0_4px_16px_rgba(0,0,0,0.08)] flex items-center gap-1.5 text-[12.5px] text-ink hover:border-pri/40 hover:text-pri transition-colors"
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {t.name}
                  </button>
                )
              })}
              <button
                onClick={() => { markGuideSeen(); startVideoFrame() }}
                className="h-9 px-4 rounded-full bg-panel border border-line shadow-[0_4px_16px_rgba(0,0,0,0.08)] flex items-center gap-1.5 text-[12.5px] text-ink hover:border-pri/40 hover:text-pri transition-colors"
              >
                <Clapperboard className="w-3.5 h-3.5" />
                视频生成
              </button>
            </div>
            <div className="max-w-[620px] text-[11.5px] leading-relaxed text-mut-2">
              操作提示：选中画布图片后可使用背景移除 / 局部截图 / 背面生成 / 款式提取；框选编辑位于底部「标注工具」菜单；画笔支持颜色、虚线与左右对称参考线。
            </div>
          </div>
        </div>
      )}

      {/* 选中态（点选/框选图片激活）：顶部胶囊功能导航栏 + 图片说明 + 选框/四角把手（屏幕坐标） */}
      {selBBox &&
        (() => {
          const sx = selBBox.x0 * view.k + view.x
          const sy = selBBox.y0 * view.k + view.y
          const sw = (selBBox.x1 - selBBox.x0) * view.k
          const sh = (selBBox.y1 - selBBox.y0) * view.k
          const single = selCards.length === 1 ? selCards[0] : null
          const capItem = 'h-8 px-2.5 rounded-full flex items-center gap-1.5 text-[12px] font-medium transition-colors shrink-0'
          // 边界自适应：胶囊 w-max 保证宽度恒为内容宽度（left 贴边时不被挤压）；水平方向按实测宽度夹取在
          // 「可视画布区」（左界 = 左侧 AI 面板占位 leftOffset，右界 = 舞台右缘），避免功能项被面板遮挡或超出屏幕；顶部空间不足时翻到选框下方
          const stageW = containerRef.current?.clientWidth ?? 0
          const capHalf = capsuleW / 2
          let capCx = sx + sw / 2
          if (capsuleW && stageW) capCx = Math.min(Math.max(capCx, leftOffset + capHalf + 8), stageW - capHalf - 8)
          const capTop = sy < 84 ? sy + sh + 10 : sy - 74
          return (
            <>
              {/* 胶囊功能导航栏：单选=背景移除/局部截图/背面生成/款式提取+擦除；多选=创建编组/合并图层/整理；下载（仅图标）置于最后；按住拖拽时收起，鼠标释放后再次弹出 */}
              {/* AI 擦除悬浮工具条（针对图片的专属编辑态，替代胶囊导航栏）：笔刷粗细滑杆 / 清空 / 取消 / 擦除 */}
              {!cardDragging && !groupResizing && eraseMode && single && eraseMode === single.id && (
                <div
                  ref={capsuleRefFn}
                  data-nopan
                  className="absolute z-30 w-max flex items-center gap-2 bg-panel rounded-full border border-line shadow-[0_8px_28px_rgba(0,0,0,0.12)] px-2.5 py-1.5"
                  style={{ left: capCx, top: capTop, transform: 'translateX(-50%)' }}
                >
                  <span className="w-7 h-7 rounded-full bg-pri flex items-center justify-center shrink-0">
                    <Eraser className="w-4 h-4 text-white" />
                  </span>
                  <input
                    type="range"
                    min={12}
                    max={72}
                    value={eraseBrush}
                    onChange={(ev) => setEraseBrush(Number(ev.target.value))}
                    title={`笔刷大小 ${eraseBrush}px`}
                    className="w-44 accent-pri cursor-pointer shrink-0"
                  />
                  <button
                    onClick={clearAiEraseMasks}
                    title="清空"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-ink-2 hover:bg-fill transition-colors shrink-0"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                  <button
                    onClick={cancelAiErase}
                    className="h-8 px-3.5 rounded-full border border-line text-[12.5px] font-medium text-ink hover:bg-fill transition-colors shrink-0"
                  >
                    取消
                  </button>
                  <button
                    onClick={runAiErase}
                    disabled={eraseBusy}
                    className="h-8 px-4 rounded-full bg-ink text-panel text-[12.5px] font-medium hover:opacity-90 transition-opacity shrink-0 flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {eraseBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    {eraseBusy ? '擦除中' : '擦除'}
                  </button>
                </div>
              )}
              {!cardDragging && !groupResizing && !(eraseMode && single && eraseMode === single.id) && (
                <div
                  ref={capsuleRefFn}
                  data-nopan
                  className="absolute z-30 w-max flex items-center gap-0.5 bg-panel rounded-full border border-line shadow-[0_8px_28px_rgba(0,0,0,0.12)] px-1.5 py-1"
                  style={{ left: capCx, top: capTop, transform: 'translateX(-50%)' }}
                >
                  {/* 单选专属功能项：框选/多选状态下禁止激活；视频卡仅保留局部截图 + 下载，隐藏背景移除 / 背面生成 / 款式提取 / 擦除（框选编辑已移至底部「标注工具」菜单） */}
                  {single && (
                    <>
                  {!single.video && (
                    <button onClick={() => capsuleAi('bgRemove')} className={`${capItem} text-ink-2 hover:bg-fill`}>
                      <ImageMinus className="w-4 h-4" />
                      背景移除
                    </button>
                  )}
                  <button
                    onClick={() => {
                      setShotMode(true)
                      showToast('局部截图：在画布上拖拽框选要截取的任意区域')
                    }}
                    title="截取画布任意区域，截图放置在被截取图片或区域的右侧"
                    className={`${capItem} ${shotMode ? 'bg-pri-soft text-pri' : 'text-ink-2 hover:bg-fill'}`}
                  >
                    <Crop className="w-4 h-4" />
                    局部截图
                  </button>
                  {!single.video && (
                    <>
                    <button onClick={() => capsuleAi('backView')} className={`${capItem} text-ink-2 hover:bg-fill`}>
                      <FlipHorizontal2 className="w-4 h-4" />
                      背面生成
                    </button>
                    <button onClick={() => capsuleAi('styleExtract')} className={`${capItem} text-ink-2 hover:bg-fill`}>
                      <Shirt className="w-4 h-4" />
                      款式提取
                    </button>
                    <div className="w-px h-5 bg-line mx-0.5" />
                    <button
                      onClick={() => capsuleAi('erase')}
                      title="擦除"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-ink-2 hover:bg-fill transition-colors shrink-0"
                    >
                      <Eraser className="w-4 h-4" />
                    </button>
                    </>
                  )}
                    </>
                  )}
                  {!single && (
                    <>
                      {/* 创建编组：同组卡片点选/拖拽时整组联动；已编组的选区再次点选时变为「解除编组」 */}
                      <button onClick={selGrouped ? ungroupSel : groupSel} className={`${capItem} text-ink-2 hover:bg-fill`}>
                        {selGrouped ? <Ungroup className="w-4 h-4" /> : <Group className="w-4 h-4" />}
                        {selGrouped ? '解除编组' : '创建编组'}
                      </button>
                      {/* 合并图层：选中的多张图片压平为一张合并卡（随合并卡整体移动/缩放/删除） */}
                      <button onClick={flattenSel} className={`${capItem} text-ink-2 hover:bg-fill`}>
                        <Layers className="w-4 h-4" />
                        合并图层
                      </button>
                      {/* 整理（二级菜单）：垂直排列 / 水平排列 / 自动排列 */}
                      <div className="relative">
                        <button
                          onClick={() => setSelMenu(selMenu === 'space' ? null : 'space')}
                          className={`${capItem} ${selMenu === 'space' ? 'bg-pri-soft text-pri' : 'text-ink-2 hover:bg-fill'}`}
                        >
                          <LayoutGrid className="w-4 h-4" />
                          整理
                          <ChevronDown className="w-3 h-3" />
                        </button>
                        {selMenu === 'space' && (
                          <div className="absolute left-0 top-10 z-40 w-40 bg-panel rounded-xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.12)] py-1.5">
                            {SPACE_ITEMS.map((it) => {
                              const Icon = it.icon
                              return (
                                <button
                                  key={it.type}
                                  onClick={() => {
                                    distribute(it.type)
                                    setSelMenu(null)
                                  }}
                                  className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-ink hover:bg-fill transition-colors"
                                >
                                  <Icon className="w-4 h-4 text-ink-3" />
                                  {it.label}
                                </button>
                              )
                            })}
                          </div>
                        )}
                      </div>
                    </>
                  )}
                  {/* 下载（仅图标）：排序放到最后面 */}
                  <button
                    onClick={() => capsuleAction('download')}
                    title="下载"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-ink-2 hover:bg-fill transition-colors shrink-0"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                </div>
              )}
              {/* 图片说明：名称 + 尺寸（参考附件样式） */}
              <div
                className="absolute z-30 pointer-events-none flex items-center gap-1.5 text-[12px] text-mut whitespace-nowrap"
                style={{ left: sx, top: sy - 26 }}
              >
                {single?.video ? <Clapperboard className="w-3.5 h-3.5" /> : <Image className="w-3.5 h-3.5" />}
                {single
                  ? `${single.tag}${single.video && single.videoDur ? ` · ${single.videoDur}` : ''} · ${Math.round(single.w)}×${Math.round(single.imgH)}`
                  : `已选中 ${selCards.length} 张图片`}
              </div>
              {/* 选框描边（多选；单选由卡片自身高亮描边呈现） */}
              {!single && (
                <div
                  className="absolute z-20 pointer-events-none border-[1.33px] border-pri"
                  style={{ left: sx, top: sy, width: sw, height: sh }}
                />
              )}
              {/* 四角把手：拖拽可整体等比放大/缩小选中卡片（卡片大小与卡片间距同步等比，无缩放限制） */}
              {!eraseMode && [
                { left: sx, top: sy },
                { left: sx + sw, top: sy },
                { left: sx, top: sy + sh },
                { left: sx + sw, top: sy + sh },
              ].map((p, i) => (
                <div
                  key={i}
                  data-gresize={i}
                  title="拖拽整体缩放"
                  className="absolute z-20 w-3.5 h-3.5 rounded-full bg-panel border-[1.33px] border-pri -translate-x-1/2 -translate-y-1/2 shadow-sm hover:scale-125 transition-transform"
                  style={{ left: p.left, top: p.top, cursor: i === 0 || i === 3 ? 'nwse-resize' : 'nesw-resize' }}
                />
              ))}
              {/* 数量角标（多选） */}
              {!single && (
                <div
                  className="absolute z-20 w-6 h-6 rounded-full bg-pri text-white text-[12px] font-medium flex items-center justify-center pointer-events-none -translate-x-1/2 -translate-y-1/2 shadow"
                  style={{ left: sx, top: sy + sh }}
                >
                  {selCards.length}
                </div>
              )}
            </>
          )
        })()}

      {/* 笔划选中态（画笔工具绘制的浮动笔划被点选/框选后激活）：顶部胶囊功能导航栏 + 说明，与框选图片一致 */}
      {strokeSelBBox &&
        (() => {
          const sx = strokeSelBBox.x0 * view.k + view.x
          const sy = strokeSelBBox.y0 * view.k + view.y
          const sw = (strokeSelBBox.x1 - strokeSelBBox.x0) * view.k
          const sh = (strokeSelBBox.y1 - strokeSelBBox.y0) * view.k
          const capItem = 'h-8 px-2.5 rounded-full flex items-center gap-1.5 text-[12px] font-medium transition-colors shrink-0'
          // 边界自适应：与图片胶囊一致——胶囊 w-max 保证宽度恒为内容宽度（left 贴边时不被挤压），
          // 水平夹取在「可视画布区」（左界 = 左侧 AI 面板占位 leftOffset，右界 = 舞台右缘），顶部空间不足时翻到选框下方
          const stageW = containerRef.current?.clientWidth ?? 0
          const capHalf = capsuleW / 2
          let capCx = sx + sw / 2
          if (capsuleW && stageW) capCx = Math.min(Math.max(capCx, leftOffset + capHalf + 8), stageW - capHalf - 8)
          const capTop = sy < 84 ? sy + sh + 10 : sy - 74
          const popCx = stageW ? Math.min(Math.max(capCx, leftOffset + 124), stageW - 124) : capCx
          return (
            <>
              <div
                ref={capsuleRefFn}
                data-nopan
                className="absolute z-30 w-max flex items-center gap-0.5 bg-panel rounded-full border border-line shadow-[0_8px_28px_rgba(0,0,0,0.12)] px-1.5 py-1"
                style={{ left: capCx, top: capTop, transform: 'translateX(-50%)' }}
              >
                {/* 已编组的笔划选区再次点选时，「创建编组」切换为「解除编组」 */}
                <button onClick={strokesGrouped ? strokeUngroupSel : strokeGroupSel} className={`${capItem} text-ink-2 hover:bg-fill`}>
                  {strokesGrouped ? <Ungroup className="w-4 h-4" /> : <Group className="w-4 h-4" />}
                  {strokesGrouped ? '解除编组' : '创建编组'}
                </button>
                <button onClick={() => mergePenIntoCards(selStrokeIdsRef.current)} className={`${capItem} text-ink-2 hover:bg-fill`}>
                  <Layers className="w-4 h-4" />
                  合并图层
                </button>
                {/* 组合：专为画笔线条设计——选中笔划合并为 PNG / JPG / SVG 图像卡嵌入画布（不自动下载） */}
                <button
                  onClick={() => setCombineFmt((v) => !v)}
                  title="将选中线条组合为一张图像卡"
                  className={`${capItem} ${combineFmt ? 'bg-pri-soft text-pri' : 'text-ink-2 hover:bg-fill'}`}
                >
                  <Combine className="w-4 h-4" />
                  组合
                </button>
                <div className="w-px h-5 bg-line mx-0.5" />
                <button
                  onClick={strokeDeleteSel}
                  title="删除"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-ink-2 hover:bg-fill transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div
                className="absolute z-30 pointer-events-none flex items-center gap-1.5 text-[12px] text-mut whitespace-nowrap"
                style={{ left: sx, top: sy - 26 }}
              >
                <PenLine className="w-3.5 h-3.5" />
                {`已选中 ${selStrokes.length} 条笔划`}
              </div>
              {/* 组合格式选择弹层：PNG / JPG / SVG，选定后自动合并导出并嵌入画布 */}
              {combineFmt && (
                <div
                  data-nopan
                  className="absolute z-40 w-60 bg-panel rounded-xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.14)] p-1.5"
                  style={{ left: popCx, top: capTop + 46, transform: 'translateX(-50%)' }}
                >
                  <div className="px-2.5 pt-1.5 pb-1.5 text-[11px] text-mut-2">组合 · 将 {selStrokes.length} 条笔划合并为图像卡</div>
                  {([
                    { fmt: 'png' as const, name: 'PNG', desc: '透明背景位图', icon: <Image className="w-4 h-4 text-ink-3 shrink-0" /> },
                    { fmt: 'jpg' as const, name: 'JPG', desc: '白底位图 · 体积小', icon: <FileImage className="w-4 h-4 text-ink-3 shrink-0" /> },
                    { fmt: 'svg' as const, name: 'SVG', desc: '矢量文件 · 无限缩放', icon: <Spline className="w-4 h-4 text-ink-3 shrink-0" /> },
                  ]).map((o) => (
                    <button
                      key={o.fmt}
                      onClick={() => combineStrokes(o.fmt)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-fill transition-colors text-left"
                    >
                      {o.icon}
                      <span className="text-[12.5px] font-medium text-ink w-9 shrink-0">{o.name}</span>
                      <span className="text-[11px] text-mut-2">{o.desc}</span>
                    </button>
                  ))}
                  <div className="px-2.5 pt-1.5 pb-1 text-[10.5px] text-mut-3 border-t border-line mt-1">仅组合并嵌入画布，下载请在卡片操作栏进行</div>
                </div>
              )}
            </>
          )
        })()}

      {/* 本地图片拖入落点预览：虚线框以光标为中心，松手后图片即以此为中心导入 */}
      {fileDropAt && (
        <div className="absolute z-40 pointer-events-none" style={{ left: fileDropAt.x - 160, top: fileDropAt.y - 160 }}>
          <div className="w-[320px] h-[320px] rounded-2xl border-2 border-dashed border-pri/70 bg-pri-soft/40 flex items-end justify-center pb-3">
            <span className="px-2.5 py-1 rounded-full bg-panel/95 border border-pri-line text-[11px] text-pri shadow-sm">松开鼠标 · 图片以此处为中心导入</span>
          </div>
        </div>
      )}

      {/* 拖拽上传缩略图：靠近功能模块时大图收缩为跟随光标的小图（缩放弹入动效），松手绑定后卡片弹回原位 */}
      {dragGhost && (
        <div className="absolute z-50 pointer-events-none" style={{ left: dragGhost.x - 32, top: dragGhost.y - 92 }}>
          <div
            className="w-16 h-20 rounded-lg overflow-hidden border-[1.5px] border-pri bg-panel shadow-[0_10px_28px_rgba(42,104,254,0.35)]"
            style={{ animation: 'hxy-ghost-in .18s ease-out' }}
          >
            <img src={dragGhost.url} alt="" className="w-full h-full object-cover" />
          </div>
        </div>
      )}

      {/* 右键功能卡片：复制 / 粘贴到此处 / 导出 / 删除（屏幕坐标，跟随右键位置） */}
      {ctxMenu && (
        <div
          data-nopan
          data-ctxmenu
          className="absolute z-40 w-44 bg-panel rounded-xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.12)] py-1.5"
          style={{ left: ctxMenu.x, top: ctxMenu.y }}
        >
          <button
            onClick={() => ctxAction('copy')}
            disabled={!ctxMenu.onCard}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors ${
              ctxMenu.onCard ? 'text-ink hover:bg-fill' : 'text-mut-3 cursor-not-allowed'
            }`}
          >
            <Copy className="w-4 h-4 text-ink-3" />
            复制
          </button>
          <button
            onClick={() => ctxAction('paste')}
            disabled={!clipboardRef.current.length}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors ${
              clipboardRef.current.length ? 'text-ink hover:bg-fill' : 'text-mut-3 cursor-not-allowed'
            }`}
          >
            <ClipboardPaste className="w-4 h-4 text-ink-3" />
            粘贴到此处
          </button>
          <button
            onClick={() => ctxAction('export')}
            disabled={!ctxMenu.onCard}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors ${
              ctxMenu.onCard ? 'text-ink hover:bg-fill' : 'text-mut-3 cursor-not-allowed'
            }`}
          >
            <Download className="w-4 h-4 text-ink-3" />
            导出
          </button>
          <div className="h-px bg-line my-1" />
          <button
            onClick={() => ctxAction('delete')}
            disabled={!ctxMenu.onCard}
            className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] transition-colors ${
              ctxMenu.onCard ? 'text-ink hover:bg-err-soft hover:text-err' : 'text-mut-3 cursor-not-allowed'
            }`}
          >
            <Trash2 className="w-4 h-4 text-ink-3" />
            删除
          </button>
        </div>
      )}

      {/* 局部截图：激活后画布任意位置拖拽框选，截取区域渲染为图片卡放到被截取区域右侧 */}
      {shotMode && (
        <div
          data-nopan
          className="absolute inset-0 z-40 cursor-crosshair"
          onMouseDown={shotMouseDown}
          onMouseMove={shotMouseMove}
          onMouseUp={shotMouseUp}
        >
          <div className="absolute inset-0 bg-ink/10" />
          <div className="absolute top-4 left-1/2 -translate-x-1/2 h-8 px-3.5 rounded-full bg-ink/85 text-panel text-[12px] flex items-center pointer-events-none whitespace-nowrap">
            拖拽框选要截取的区域，截图将放到该区域右侧 · Esc 取消
          </div>
          {shotRect &&
            (() => {
              const x = Math.min(shotRect.x0, shotRect.x1)
              const y = Math.min(shotRect.y0, shotRect.y1)
              const w = Math.abs(shotRect.x1 - shotRect.x0)
              const h = Math.abs(shotRect.y1 - shotRect.y0)
              return (
                <div className="absolute border border-dashed border-pri bg-pri/10 pointer-events-none" style={{ left: x, top: y, width: w, height: h }}>
                  <span className="absolute -top-6 left-0 h-5 px-1.5 rounded bg-pri text-white text-[10.5px] inline-flex items-center whitespace-nowrap">
                    {Math.round(w)} × {Math.round(h)}
                  </span>
                </div>
              )
            })()}
        </div>
      )}
      {/* 底部中央：生成输入条 + 工具栏（容器点击穿透，空白处不阻挡画布操作） */}
      {/* 「生成图片」输入模块：锚定在「生成器」图框正下方并随其拖动跟随移动；点击画布空白隐藏，点击图框再次弹出；支持放大为大对话框、从画布中选择参考图（多选） */}
      {genPanel && !genPanelHidden && (() => {
        const frame = cards.find((c) => c.id === genPanel.cardId)
        if (!frame) return null
        // 屏幕坐标锚定：图框底边中点 + 固定间距；拖动图框 / 平移缩放画布 → 模块同步跟随
        const sx = (frame.x + frame.w / 2) * view.k + view.x
        const sy = (frame.y + frame.imgH) * view.k + view.y + 14 * view.k
        const panelBody = (
          <div
            className={`bg-panel rounded-2xl border pointer-events-auto transition-colors select-none ${
              genPanelExpanded
                ? 'w-[min(880px,86%)] max-h-[76vh] overflow-y-auto p-5 pt-1 shadow-[0_24px_80px_rgba(0,0,0,0.28)]'
                : 'w-[440px] p-3.5 shadow-[0_8px_28px_rgba(0,0,0,0.12)]'
            } ${panelPulse ? 'border-pri ring-2 ring-pri/40' : 'border-line'}`}
          >
            <div className={`flex items-center justify-between ${genPanelExpanded ? 'pt-1' : ''}`}>
              <span className="text-[14px] font-semibold text-ink">生成图片</span>
              <div className="flex items-center gap-1">
                {/* 放大：弹出居中大对话框；「还原」返回图框下方锚定态 */}
                <button
                  onClick={() => setGenPanelExpanded((v) => !v)}
                  title={genPanelExpanded ? '还原' : '放大'}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-mut hover:bg-fill hover:text-ink transition-colors"
                >
                  {genPanelExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {/* 参考图行：已选图片从左侧起依次向右占位展示（逐张可移除），「从本地上传图片 / 从画布中选择」功能键让位至行尾 */}
            <div className="flex items-center flex-wrap gap-2.5 mt-2.5">
              {genPanel.refs.map((url) => (
                <div key={url} className="relative w-11 h-11 rounded-xl overflow-hidden border border-line">
                  <img src={url} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => setGenPanel({ ...genPanel, refs: genPanel.refs.filter((u) => u !== url) })}
                    className="absolute right-0.5 top-0.5 w-4 h-4 rounded-full bg-black/55 text-white flex items-center justify-center"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => genFrameInputRef.current?.click()}
                title="从本地上传图片"
                className="w-11 h-11 rounded-xl bg-fill flex items-center justify-center text-mut hover:text-ink hover:bg-line-soft transition-colors"
              >
                <ImagePlus className="w-[18px] h-[18px]" />
              </button>
              <button
                onClick={() => setGenPickMode((v) => !v)}
                title="从画布中选择"
                className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                  genPickMode ? 'bg-pri-soft text-pri ring-1 ring-pri/40' : 'bg-fill text-mut hover:text-ink hover:bg-line-soft'
                }`}
              >
                <SquareMousePointer className="w-[18px] h-[18px]" />
              </button>
            </div>
            <textarea
              autoFocus
              value={genPanel.text}
              onChange={(e) => setGenPanel({ ...genPanel, text: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendGenFrame()
                }
              }}
              placeholder="描述你想创建的内容…"
              rows={genPanelExpanded ? 8 : 3}
              className="mt-2.5 w-full resize-none text-[13px] outline-none placeholder:text-mut-3 bg-transparent leading-relaxed"
            />
            <div className="flex items-center gap-2 mt-1">
              {/* 数量 / 比例：与任务模块一致的功能键（数量决定结果卡张数，比例决定结果卡画幅） */}
              <MiniSelect value={genPanel.count} options={COUNTS} onChange={(v) => setGenPanel({ ...genPanel, count: v })} />
              <MiniSelect value={genPanel.ratio} options={RATIOS} onChange={(v) => setGenPanel({ ...genPanel, ratio: v })} />
              <div className="relative ml-auto">
                <button
                  onClick={() =>
                    setGenPanel({ ...genPanel, model: genPanel.model === '画衣衣 Image 2.0' ? '画衣衣 Image 1.5' : '画衣衣 Image 2.0' })
                  }
                  title="切换生图模型"
                  className="flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[12.5px] text-ink-2 hover:bg-fill transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-acc" />
                  {genPanel.model}
                  <ChevronDown className="w-3 h-3 text-mut-2" />
                </button>
              </div>
              <button
                title="语音输入（敬请期待）"
                className="w-8 h-8 rounded-full flex items-center justify-center text-mut-3 hover:bg-fill transition-colors"
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                onClick={sendGenFrame}
                title="生成"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  genPanel.text.trim() ? 'bg-ink text-panel hover:bg-ink/85' : 'bg-fill text-mut-3'
                }`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
        // 放大态：遮罩 + 居中大对话框（点击遮罩还原）；锚定态：图框正下方跟随
        return genPanelExpanded ? (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-ink/35"
            data-nopan
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setGenPanelExpanded(false)
            }}
          >
            {panelBody}
          </div>
        ) : (
          <div className="absolute z-30 pointer-events-none" style={{ left: sx, top: sy, transform: 'translateX(-50%)' }} data-nopan>
            {panelBody}
          </div>
        )
      })()}

      {/* 「视频生成器」输入模块：锚定在图框正下方并随其拖动跟随移动；点击画布空白隐藏，点击图框再次弹出；支持放大为大对话框（交互与「生成图片」模块保持一致） */}
      {vidPanel && !vidPanelHidden && (() => {
        const frame = cards.find((c) => c.id === vidPanel.cardId)
        if (!frame) return null
        // 屏幕坐标锚定：图框底边中点 + 固定间距；拖动图框 / 平移缩放画布 → 模块同步跟随
        const sx = (frame.x + frame.w / 2) * view.k + view.x
        const sy = (frame.y + frame.imgH) * view.k + view.y + 14 * view.k
        const panelBody = (
          <div
            className={`bg-panel rounded-2xl border pointer-events-auto transition-colors select-none ${
              vidPanelExpanded
                ? 'w-[min(880px,86%)] max-h-[76vh] overflow-y-auto p-5 pt-1 shadow-[0_24px_80px_rgba(0,0,0,0.28)]'
                : 'w-[440px] p-3.5 shadow-[0_8px_28px_rgba(0,0,0,0.12)]'
            } ${panelPulse ? 'border-pri ring-2 ring-pri/40' : 'border-line'}`}
          >
            <div className={`flex items-center justify-between ${vidPanelExpanded ? 'pt-1' : ''}`}>
              <span className="text-[14px] font-semibold text-ink">视频生成器</span>
              <div className="flex items-center gap-1">
                {/* 放大：弹出居中大对话框；「还原」返回图框下方锚定态 */}
                <button
                  onClick={() => setVidPanelExpanded((v) => !v)}
                  title={vidPanelExpanded ? '还原' : '放大'}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-mut hover:bg-fill hover:text-ink transition-colors"
                >
                  {vidPanelExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {/* 首帧 / 尾帧槽位：点击上传 / 拖入本地图片 / 拖入画布卡片；均可选，不上传则纯提示词生成 */}
            <div className="flex items-center gap-2.5 mt-2.5">
              <UploadSlot label="首帧" img={videoStart} onPick={setVideoStart} onClear={() => setVideoStart(null)} slotKey="vstart" dropHint={refDropHint === 'vstart'} />
              <ArrowLeftRight className="w-3.5 h-3.5 text-mut-3 shrink-0" />
              <UploadSlot label="尾帧" img={videoEnd} onPick={setVideoEnd} onClear={() => setVideoEnd(null)} slotKey="vend" dropHint={refDropHint === 'vend'} />
              <span className="text-[11px] text-mut-2 leading-snug ml-1">首帧 / 尾帧均可选<br />不上传则纯提示词生成</span>
            </div>
            <textarea
              value={videoPrompt}
              onChange={(e) => setVideoPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendVideoFrame()
                }
              }}
              placeholder="描述画面运动与镜头，如：模特缓步转身，裙摆自然飘动…"
              rows={vidPanelExpanded ? 8 : 3}
              className="mt-2.5 w-full resize-none text-[13px] outline-none placeholder:text-mut-3 bg-transparent leading-relaxed"
            />
            <div className="flex items-center gap-2 mt-1">
              {/* 时长 / 比例：与任务模块一致的功能键（比例决定结果视频画幅） */}
              <MiniSelect value={videoDur} options={VIDEO_DURS} onChange={setVideoDur} prefix={<Clapperboard className="w-3.5 h-3.5 text-ok" />} />
              <MiniSelect value={videoRatio} options={VIDEO_RATIOS} onChange={setVideoRatio} />
              <div className="relative ml-auto">
                <button
                  onClick={() => setVidModel((m) => (m === '画衣衣 Video 2.0' ? '画衣衣 Video 1.5' : '画衣衣 Video 2.0'))}
                  title="切换视频模型"
                  className="flex items-center gap-1.5 h-8 px-2.5 rounded-full text-[12.5px] text-ink-2 hover:bg-fill transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 text-acc" />
                  {vidModel}
                  <ChevronDown className="w-3 h-3 text-mut-2" />
                </button>
              </div>
              <button
                title="语音输入（敬请期待）"
                className="w-8 h-8 rounded-full flex items-center justify-center text-mut-3 hover:bg-fill transition-colors"
              >
                <Mic className="w-4 h-4" />
              </button>
              <button
                onClick={sendVideoFrame}
                title="生成"
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                  videoPrompt.trim() ? 'bg-ink text-panel hover:bg-ink/85' : 'bg-fill text-mut-3'
                }`}
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            </div>
          </div>
        )
        // 放大态：遮罩 + 居中大对话框（点击遮罩还原）；锚定态：图框正下方跟随
        return vidPanelExpanded ? (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-ink/35"
            data-nopan
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setVidPanelExpanded(false)
            }}
          >
            {panelBody}
          </div>
        ) : (
          <div className="absolute z-30 pointer-events-none" style={{ left: sx, top: sy, transform: 'translateX(-50%)' }} data-nopan>
            {panelBody}
          </div>
        )
      })()}

      {/* 「从画布中选择参考」引导条：激活后点击画布图片加入输入模块（多选），退出复原 */}
      {genPickMode && (
        <div
          className="absolute top-4 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2.5 bg-panel rounded-full border border-line shadow-[0_8px_28px_rgba(0,0,0,0.12)] pl-3.5 pr-1.5 py-1.5 pointer-events-auto"
          data-nopan
        >
          <Info className="w-4 h-4 text-pri" />
          <span className="text-[12.5px] text-ink whitespace-nowrap">从画布中选择参考</span>
          <button onClick={() => setGenPickMode(false)} className="h-7 px-3.5 rounded-full bg-ink text-panel text-[12px] hover:bg-ink/85 transition-colors">
            退出
          </button>
        </div>
      )}

      <div
        ref={stackRef}
        className={`absolute bottom-4 ${genBarOn ? 'z-30' : 'z-20'} flex flex-col items-center gap-2.5 pointer-events-none`} // AI 任务模块打开时抬升底部导航层级：黑色功能名称 / 菜单浮于模块上方，不被遮挡
        style={{ left: `calc(50% + ${leftOffset / 2}px)`, transform: 'translateX(-50%)' }} // 随 AI 对话栏缩小/放大/最小化自适应：始终在面板右侧剩余画布区域居中（面板收起时回到全画布居中）
        data-nopan
      >
        {/* 全局轻提示（任务冲突等） */}
        {toast && (
          <div className="pointer-events-auto px-3.5 py-2 rounded-full bg-ink/90 text-panel text-[12px] shadow-lg">{toast}</div>
        )}
        {/* 对称中线标定提示：引导先定准中线再画线 */}
        {penSym && symPlacing && (
          <div className="flex items-center gap-2 bg-ink text-panel text-[11.5px] pl-3.5 pr-2.5 py-1.5 rounded-full whitespace-nowrap shadow-lg pointer-events-auto">
            对称模式：移动鼠标预览中线，点击画布确定对称中线位置
            <button onClick={toggleSym} className="text-pri-line hover:text-panel transition-colors">
              退出
            </button>
          </div>
        )}

        {/* 点选编辑操作条（新交互）：计数 = 已提交修改点数量；撤销/重做/清除管理修改点；「修改」提交修改任务，结果图直接生成在原图旁边 */}
        {aiTool && (
          <div className="flex items-center gap-1 bg-panel rounded-full border border-line shadow-[0_4px_16px_rgba(0,0,0,0.10)] pl-3 pr-1.5 py-1.5 pointer-events-auto">
            <span title="已提交的修改点数量" className="flex items-center gap-1.5 h-7 px-2.5 rounded-full bg-fill text-[12.5px] text-ink font-medium">
              <PointPickIcon className="w-3.5 h-3.5 text-ink-3" />
              {pointMarks.length}
            </span>
            <div className="w-px h-4 bg-line mx-1" />
            <button
              onClick={undoPointMark}
              disabled={!pointMarks.length}
              title="撤销上一个修改点"
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                pointMarks.length ? 'text-ink hover:bg-fill' : 'text-mut-3 opacity-50 cursor-not-allowed'
              }`}
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redoPointMark}
              disabled={!redoStack.length}
              title="重做"
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                redoStack.length ? 'text-ink hover:bg-fill' : 'text-mut-3 opacity-50 cursor-not-allowed'
              }`}
            >
              <Redo2 className="w-4 h-4" />
            </button>
            <div className="w-px h-4 bg-line mx-1" />
            <button
              onClick={clearPointMarks}
              disabled={!pointMarks.length}
              className={`h-7 px-3 rounded-full text-[12.5px] transition-colors ${
                pointMarks.length ? 'text-ink hover:bg-fill' : 'text-mut-3 cursor-not-allowed'
              }`}
            >
              清除
            </button>
            <button
              onClick={executePointEdits}
              disabled={!pointMarks.length}
              title="修改：将全部修改点组合执行，结果图生成在原图旁边"
              className={`h-7 pl-3 pr-2 rounded-full text-[12.5px] font-medium transition-colors flex items-center gap-1.5 ${
                pointMarks.length ? 'bg-pri text-white hover:bg-pri-hover' : 'bg-pri-soft text-pri/50 cursor-not-allowed'
              }`}
            >
              修改
              <span className={`w-[18px] h-[18px] rounded-full flex items-center justify-center ${pointMarks.length ? 'bg-white/20' : 'bg-pri/10'}`}>
                <ArrowUp className="w-3 h-3" />
              </span>
            </button>
            <div className="w-px h-4 bg-line mx-1" />
            {/* 退出点选编辑：❌ 图标按钮，悬浮显示「退出」 */}
            <button
              onClick={() => activateTool(null)}
              title="退出"
              className="w-7 h-7 rounded-full flex items-center justify-center text-mut hover:text-ink hover:bg-fill transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* 框选编辑激活提示（行内展示，替代原胶囊按钮高亮态） */}
        {regionMode && (
          <div className="flex items-center gap-2 bg-ink text-panel text-[11.5px] pl-3.5 pr-2.5 py-1.5 rounded-full whitespace-nowrap shadow-lg pointer-events-auto">
            框选编辑：拖拽框选区域后自动带入 Agent 对话框，可多次框选
            <button onClick={() => exitRegionEdit()} className="text-pri-line hover:text-panel transition-colors">
              退出
            </button>
          </div>
        )}

        {/* 「画笔」工具面板：颜色 / 粗细 / 撤销重做 / 清空（二次确认）/ 取消 / 完成（自动保存） */}
        {penOn && (
          <div
            className="flex flex-wrap items-center justify-center gap-2 bg-panel rounded-[22px] border border-line shadow-[0_4px_16px_rgba(0,0,0,0.10)] pl-3.5 pr-2 py-1.5 pointer-events-auto"
            style={{ maxWidth: `calc(100vw - ${leftOffset}px - 24px)` }} // 窄屏+宽面板时自动折行，完整留在可视画布区内
          >
            {/* 工具切换：画笔 / 直线 / 曲线 / 橡皮擦（绘制中的直线会被取消；拖拽中忽略切换） */}
            <div className="flex items-center gap-0.5 bg-fill rounded-full p-0.5">
              {([
                { t: 'pen' as PenToolType, name: '画笔', Icon: PenLine },
                { t: 'pencil' as PenToolType, name: '铅笔', Icon: Pencil },
                { t: 'line' as PenToolType, name: '直线', Icon: Slash },
                { t: 'curve' as PenToolType, name: '曲线', Icon: Spline },
                { t: 'erase' as PenToolType, name: '橡皮擦', Icon: Eraser },
              ]).map(({ t, name, Icon }) => (
                <button
                  key={t}
                  onClick={() => switchPenTool(t)}
                  title={name}
                  className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                    penTool === t ? 'bg-panel text-pri shadow-sm' : 'text-ink-3 hover:text-ink'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              ))}
            </div>
            <div className="w-px h-4 bg-line" />
            {/* 颜色：橡皮擦模式下禁用（擦除无颜色语义） */}
            <div className={`flex items-center gap-1.5 transition-opacity ${penTool === 'erase' ? 'opacity-40 pointer-events-none' : ''}`}>
              {PEN_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setPenColor(c)}
                  title={`画笔颜色 ${c}`}
                  className={`w-5 h-5 rounded-full border transition-all ${
                    penColor === c ? 'ring-2 ring-pri ring-offset-1 ring-offset-panel scale-110 border-line-strong' : 'border-line-strong hover:scale-110'
                  }`}
                  style={{ background: c }}
                />
              ))}
              {/* 调色盘：自定义选色（选中自定义色时高亮此入口） */}
              <label
                title="调色盘：自定义颜色"
                className={`relative w-5 h-5 rounded-full border cursor-pointer transition-all overflow-hidden shrink-0 ${
                  PEN_COLORS.every((c) => c.toLowerCase() !== penColor.toLowerCase())
                    ? 'ring-2 ring-pri ring-offset-1 ring-offset-panel scale-110 border-line-strong'
                    : 'border-line-strong hover:scale-110'
                }`}
                style={{ background: 'conic-gradient(from 0deg, #F53F3F, #F5A623, #FDE047, #12B76A, #2E6BFF, #8B5CF6, #F53F3F)' }}
              >
                <input
                  type="color"
                  value={/^#[0-9a-fA-F]{6}$/.test(penColor) ? penColor.toLowerCase() : '#1b1b1f'}
                  onChange={(e) => setPenColor(e.target.value)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  title="调色盘：自定义颜色"
                />
              </label>
            </div>
            <div className="w-px h-4 bg-line" />
            <input
              type="range"
              min={2}
              max={16}
              step={1}
              value={penWidth}
              onChange={(e) => setPenWidth(Number(e.target.value))}
              title={penTool === 'erase' ? '橡皮擦大小（直径）' : penDash ? '线条粗细（虚线疏密随粗细自适应）' : '画笔粗细'}
              className="w-20 accent-pri"
            />
            <span className="text-[10.5px] text-mut w-7 text-center">{penWidth}px</span>
            {/* 虚线开关：仅对画笔/直线/曲线生效（橡皮擦无线条样式） */}
            <button
              onClick={() => setPenDash((v) => !v)}
              disabled={penTool === 'erase'}
              title={penDash ? '虚线：已开启' : '虚线：已关闭'}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors disabled:opacity-40 ${
                penDash && penTool !== 'erase' ? 'bg-pri-soft text-pri' : 'text-ink-3 hover:bg-fill'
              }`}
            >
              <DashIcon className="w-3.5 h-3.5" />
            </button>
            {/* 左右对称：以视口水平中线为轴镜像绘制（画笔/直线/曲线/橡皮擦均生效） */}
            <button
              onClick={toggleSym}
              title={penSym ? (symPlacing ? '左右对称：请点击画布确定中线' : '左右对称：已开启') : '左右对称：已关闭'}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${
                penSym ? 'bg-pri-soft text-pri' : 'text-ink-3 hover:bg-fill'
              }`}
            >
              <FlipHorizontal2 className="w-3.5 h-3.5" />
            </button>
            <div className="w-px h-4 bg-line" />
            <button
              onClick={undoPen}
              disabled={!pastStrokes.length}
              title="撤销上一笔"
              className="w-7 h-7 rounded-full flex items-center justify-center text-ink-3 hover:bg-fill disabled:text-mut-3 disabled:hover:bg-transparent transition-colors"
            >
              <Undo2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={redoPen}
              disabled={!futureStrokes.length}
              title="重做"
              className="w-7 h-7 rounded-full flex items-center justify-center text-ink-3 hover:bg-fill disabled:text-mut-3 disabled:hover:bg-transparent transition-colors"
            >
              <Redo2 className="w-3.5 h-3.5" />
            </button>
            <div className="relative">
              <button
                onClick={() => setPenClearAsk((v) => !v)}
                disabled={!strokes.length}
                title="清空全部笔划"
                className={`h-7 px-2 rounded-full flex items-center gap-1 text-[11.5px] transition-colors ${
                  penClearAsk ? 'bg-err-soft text-err font-medium' : 'text-ink-3 hover:bg-fill'
                } disabled:text-mut-3 disabled:hover:bg-transparent`}
              >
                <Trash2 className="w-3.5 h-3.5" />
                清空
              </button>
              {penClearAsk && (
                <div className="absolute bottom-full right-0 mb-2 w-56 bg-panel rounded-xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.12)] p-3 z-30">
                  <p className="text-[12.5px] text-ink font-medium">确定清空全部笔划吗？</p>
                  <p className="text-[11px] text-mut mt-1 leading-relaxed">清空后可通过「撤销」恢复</p>
                  <div className="flex justify-end gap-1.5 mt-2.5">
                    <button
                      onClick={() => setPenClearAsk(false)}
                      className="h-7 px-3 rounded-full text-[11.5px] text-mut hover:bg-fill transition-colors"
                    >
                      取消
                    </button>
                    <button
                      onClick={clearPen}
                      className="h-7 px-3 rounded-full text-[11.5px] bg-fill text-err font-medium hover:bg-err-soft transition-colors"
                    >
                      清空
                    </button>
                  </div>
                </div>
              )}
            </div>
            {/* 融合：把落在图片上的笔划写入图片卡片，成为图片内容的一部分（随图片整体保存/编辑） */}
            <button
              onClick={() => mergePenIntoCards()}
              disabled={!strokes.some((s) => s.tool !== 'erase')}
              title="融合：将落在图片上的笔划融入图片，随图片整体移动与保存"
              className="h-7 px-2 rounded-full flex items-center gap-1 text-[11.5px] text-ink-3 hover:bg-fill disabled:text-mut-3 disabled:hover:bg-transparent transition-colors"
            >
              <Combine className="w-3.5 h-3.5" />
              融合
            </button>
            <div className="w-px h-4 bg-line" />
            <button onClick={cancelPen} title="取消：放弃本次编辑的修改" className="h-7 px-2.5 rounded-full text-[11.5px] text-mut hover:bg-fill transition-colors">
              取消
            </button>
            <button
              onClick={togglePen}
              title="完成：自动保存并退出"
              className="h-7 px-3 rounded-full bg-pri text-white text-[11.5px] font-medium hover:bg-pri-hover transition-colors flex items-center gap-1"
            >
              <Check className="w-3.5 h-3.5" />
              完成
            </button>
          </div>
        )}

        {/* 画布底部导航栏（分段式按键：主图标=优先功能直接触发，菜单收进右侧独立 ⌄ 键；主键与 ⌄ 键各自独立悬浮与提示——悬浮主键显示「优先功能名称+快捷键」，悬浮 ⌄ 键显示菜单名称；⌄ 键在菜单展开时旋转为 ⌃ 并高亮；高亮逻辑统一——功能激活或菜单展开时主键 pri 高亮）：选择-图片-灵感设计-换面料-模特试衣-画笔-标注 */}
        <div className="relative pointer-events-auto">
          <div className="bg-panel rounded-full border border-line shadow-[0_4px_16px_rgba(0,0,0,0.08)] px-2.5 py-2 flex items-center gap-1">
            {/* 1. 选择：主键=选择模式（V），⌄=移动工具菜单（选择 V / 拖拽 H） */}
            <div className="relative flex items-center">
              <div className="relative group">
                <button
                  onClick={() => selectMode(false)}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    (!panOn && !aiTool && !penOn && !aiMenu && !importMenu && !genPanel) || modeMenu
                      ? 'bg-pri-soft text-pri'
                      : 'text-ink-3 hover:bg-fill hover:text-ink'
                  }`}
                >
                  {panOn ? <Hand className="w-4 h-4" /> : <MousePointer2 className="w-4 h-4" />}
                </button>
                {!modeMenu && (
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-ink text-panel text-[11.5px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center">
                    {panOn ? '拖拽' : '选择'}
                    {panOn && <span className="ml-1.5 text-panel/55">H</span>}
                    {!panOn && <span className="ml-1.5 text-panel/55">· Shift/Ctrl+点击 多选</span>}
                  </span>
                )}
              </div>
              <div className="relative group">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setModeMenu(!modeMenu)
                    setAiMenu(false)
                    setImportMenu(false)
                  }}
                  className={`w-5 h-9 rounded-full flex items-center justify-center transition-colors ${
                    modeMenu ? 'bg-fill text-ink' : 'text-mut hover:bg-fill hover:text-ink'
                  }`}
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${modeMenu ? 'rotate-180' : ''}`} />
                </button>
                {!modeMenu && (
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-ink text-panel text-[11.5px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center">移动工具</span>
                )}
              </div>
              {modeMenu && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-40 w-56 bg-panel rounded-xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.12)] py-1.5">
                  <button
                    onClick={() => selectMode(false)}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-ink hover:bg-fill transition-colors"
                  >
                    <MousePointer2 className="w-4 h-4 text-ink-3" />
                    选择
                    {!panOn && <Check className="w-3.5 h-3.5 text-pri ml-auto" />}
                  </button>
                  <button
                    onClick={() => selectMode(true)}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-ink hover:bg-fill transition-colors"
                  >
                    <Hand className="w-4 h-4 text-ink-3" />
                    拖拽
                    <span className="ml-auto flex items-center gap-1.5">
                      {panOn && <Check className="w-3.5 h-3.5 text-pri" />}
                      <kbd className="text-[10px] text-mut-2 bg-fill border border-line rounded px-1 py-px">H</kbd>
                    </span>
                  </button>
                </div>
              )}
            </div>
            {/* 2. 图片：主键=当前图片功能（默认生成图片），⌄=图片工具菜单（上传图片 / 生成图片）；主图标随菜单点选联动切换，点选哪个显示哪个（与标注工具一致） */}
            <div className="relative flex items-center">
              <div className="relative group">
                <button
                  onClick={() => (imgFn === 'gen' ? startGenFrame() : (setImportMenu(false), importInputRef.current?.click()))}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    (imgFn === 'gen' && genPanel) || importMenu ? 'bg-pri-soft text-pri' : 'text-ink-3 hover:bg-fill hover:text-ink'
                  }`}
                >
                  {imgFn === 'gen' ? <ImagePlus className="w-4 h-4" /> : <ImageUp className="w-4 h-4" />}
                </button>
                {!importMenu && (
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-ink text-panel text-[11.5px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center">{imgFn === 'gen' ? '生成图片' : '上传图片'}</span>
                )}
              </div>
              <div className="relative group">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setImportMenu(!importMenu)
                    setAiMenu(false)
                    setModeMenu(false)
                  }}
                  className={`w-5 h-9 rounded-full flex items-center justify-center transition-colors ${
                    importMenu ? 'bg-fill text-ink' : 'text-mut hover:bg-fill hover:text-ink'
                  }`}
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${importMenu ? 'rotate-180' : ''}`} />
                </button>
                {!importMenu && (
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-ink text-panel text-[11.5px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center">图片工具</span>
                )}
              </div>
              {importMenu && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-40 w-56 bg-panel rounded-xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.12)] py-1.5">
                  <button
                    onClick={() => {
                      setImgFn('upload') // 主键图标联动切换为「上传图片」
                      importInputRef.current?.click()
                      setImportMenu(false)
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-ink hover:bg-fill transition-colors"
                  >
                    <ImageUp className="w-4 h-4 text-ink-3" />
                    上传图片
                  </button>
                  <button
                    onClick={() => {
                      setImgFn('gen') // 主键图标联动切换为「生成图片」
                      startGenFrame()
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-ink hover:bg-fill transition-colors"
                  >
                    <ImagePlus className="w-4 h-4 text-pri" />
                    生成图片
                  </button>
                </div>
              )}
            </div>
            <div className="w-px h-4 bg-line mx-1" />
            {/* 3. AI 设计工具：灵感设计 / 换面料 / 模特试衣 / 视频生成，点击功能键在无限画布中打开对应任务模块 */}
            {TOOLS.map((t) => {
              const Icon = t.icon
              const active = activeTool === t.name && genBarOn // 仅当任务模块开启时高亮，避免与画笔 / 标注等激活态并存
              return (
                <div key={t.name} className="relative group">
                  <button
                    onClick={() => openAiTool(t.name)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                      active ? 'bg-pri-soft text-pri' : 'text-ink-3 hover:bg-fill hover:text-ink'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </button>
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-ink text-panel text-[11.5px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center">
                    {t.name}
                  </span>
                </div>
              )
            })}
            {/* 视频生成：独立「视频生成器」图框模块（交互与生成图片一致） */}
            <div className="relative group">
              <button
                onClick={startVideoFrame}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  vidPanel ? 'bg-pri-soft text-pri' : 'text-ink-3 hover:bg-fill hover:text-ink'
                }`}
              >
                <Clapperboard className="w-4 h-4" />
              </button>
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-ink text-panel text-[11.5px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center">
                视频生成
              </span>
            </div>
            <div className="w-px h-4 bg-line mx-1" />
            {/* 4. 画笔：自由画线标记（快捷键 E，再按/Esc 退出并自动保存） */}
            <div className="relative group">
              <button
                onClick={togglePen}
                className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  penOn ? 'bg-pri-soft text-pri' : 'text-ink-3 hover:bg-fill hover:text-ink'
                }`}
              >
                <PenLine className="w-4 h-4" />
              </button>
              <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-ink text-panel text-[11.5px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center">
                画笔
                <span className="ml-1.5 text-panel/55">E</span>
              </span>
            </div>
            {/* 5. 标注：主键=点选编辑（C，再按退出），⌄=标注工具菜单（点选编辑 C / 框选编辑 V）；分段式按键：主键与右侧 ⌄ 菜单键独立悬浮与提示（三个图标样式统一） */}
            <div className="relative flex items-center">
              <div className="relative group">
                <button
                  onClick={() => (regionModeRef.current ? exitRegionEdit() : activateTool(aiTool ? null : 'mark'))}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    aiTool || aiMenu || regionMode ? 'bg-pri-soft text-pri' : 'text-ink-3 hover:bg-fill hover:text-ink'
                  }`}
                >
                  {/* 主图标随功能选择状态联动切换：点选编辑=气泡双点（附件样式）/ 框选编辑=虚线框（与菜单内图标一致）；激活态再点主键退出当前工具 */}
                  {regionMode ? <SquareDashedMousePointer className="w-4 h-4" /> : <PointPickIcon className="w-4 h-4" />}
                </button>
                {!aiMenu && (
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-ink text-panel text-[11.5px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center">
                    {regionMode ? '框选编辑' : '点选编辑'}
                    <span className="ml-1.5 text-panel/55">{regionMode ? 'V' : 'C'}</span>
                  </span>
                )}
              </div>
              <div className="relative group">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setAiMenu(!aiMenu)
                    setImportMenu(false)
                    setModeMenu(false)
                  }}
                  className={`w-5 h-9 rounded-full flex items-center justify-center transition-colors ${
                    aiMenu ? 'bg-fill text-ink' : 'text-mut hover:bg-fill hover:text-ink'
                  }`}
                >
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${aiMenu ? 'rotate-180' : ''}`} />
                </button>
                {!aiMenu && (
                  <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-ink text-panel text-[11.5px] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 flex items-center">标注工具</span>
                )}
              </div>
              {aiMenu && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-40 w-52 bg-panel rounded-xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.12)] py-1.5">
                  <button
                    onClick={() => activateTool('mark')}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-ink hover:bg-fill transition-colors"
                  >
                    <PointPickIcon className="w-4 h-4 text-ink-3" />
                    点选编辑
                    <span className="ml-auto flex items-center gap-1.5">
                      {aiTool === 'mark' && <Check className="w-3.5 h-3.5 text-pri" />}
                      <kbd className="text-[10px] text-mut-2 bg-fill border border-line rounded px-1 py-px">C</kbd>
                    </span>
                  </button>
                  {/* 框选编辑（自图片胶囊导航迁入）：需先单选一张图片，激活态显示对勾 */}
                  <button
                    onClick={() => {
                      toggleRegionEdit()
                      setAiMenu(false)
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-ink hover:bg-fill transition-colors"
                  >
                    <SquareDashedMousePointer className="w-4 h-4 text-ink-3" />
                    框选编辑
                    <span className="ml-auto flex items-center gap-1.5">
                      {regionMode && <Check className="w-3.5 h-3.5 text-pri" />}
                      <kbd className="text-[10px] text-mut-2 bg-fill border border-line rounded px-1 py-px">V</kbd>
                    </span>
                  </button>
                  {(aiTool || regionMode) && (
                    <>
                      <div className="my-1 h-px bg-line-soft" />
                      <button
                        onClick={() => {
                          activateTool(null)
                          if (regionModeRef.current) exitRegionEdit()
                        }}
                        className="w-full flex items-center gap-2.5 px-3.5 py-2 text-[13px] text-mut hover:bg-fill transition-colors"
                      >
                        <X className="w-4 h-4" />
                        退出工具
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* AI 工具任务模块：根据底部导航栏 AI 功能键的触发出现在无限画布中（上传模块沿用「原型图 / 灵感图」），点击空白画布收起 */}
      {genBarOn && (() => {
        const barBody = (
          <div
            className={`bg-panel rounded-2xl border transition-colors select-none ${
              genBarExpanded
                ? 'w-[min(880px,86%)] max-h-[76vh] overflow-y-auto p-5 pt-1 shadow-[0_24px_80px_rgba(0,0,0,0.28)]'
                : 'w-[560px] p-3 pt-1 shadow-[0_6px_24px_rgba(0,0,0,0.08)]'
            } ${refDropHint === 'bar' ? 'border-pri ring-2 ring-pri/30' : 'border-line'}`}
            style={genBarExpanded ? undefined : { transform: `translate(${genBarOff.x}px, ${genBarOff.y}px)` }}
            data-nopan
            data-genbar
          >
            {/* 拖拽手柄（锚定态）：按住移动任务条位置 */}
            {!genBarExpanded && (
              <div
                className="flex items-center justify-center h-5 cursor-grab active:cursor-grabbing text-mut-3 hover:text-mut transition-colors"
                title="按住拖拽移动位置"
                onPointerDown={(e) => {
                  e.stopPropagation()
                  genBarDragRef.current = { x: e.clientX - genBarOff.x, y: e.clientY - genBarOff.y }
                  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
                }}
                onPointerMove={(e) => {
                  const d = genBarDragRef.current
                  if (d) setGenBarOff({ x: e.clientX - d.x, y: e.clientY - d.y })
                }}
                onPointerUp={() => {
                  genBarDragRef.current = null
                }}
                onPointerCancel={() => {
                  genBarDragRef.current = null
                }}
              >
                <GripHorizontal className="w-4 h-4" />
              </div>
            )}
            <div className={`flex items-center justify-between ${genBarExpanded ? 'pt-1' : ''}`}>
              <span className="text-[14px] font-semibold text-ink">{activeTool}</span>
              <div className="flex items-center gap-1">
                {/* 放大：弹出居中大对话框；「还原」返回底部锚定态（与生成图片模块放大交互一致） */}
                <button
                  onClick={() => setGenBarExpanded((v) => !v)}
                  title={genBarExpanded ? '还原' : '放大'}
                  className="w-7 h-7 rounded-md flex items-center justify-center text-mut hover:bg-fill hover:text-ink transition-colors"
                >
                  {genBarExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
            {/* 锚定态：槽位与输入区左右并排（紧凑）；放大态：上下堆叠，整体尺寸与「生成图片」放大功能框一致 */}
            <div className={genBarExpanded ? 'flex flex-col gap-2.5 mt-2' : 'flex items-stretch gap-3 mt-2'}>
              <div className="flex items-center gap-1.5 shrink-0">
                <UploadSlot label="原型图" img={protoImg} onPick={setProtoImg} onClear={() => setProtoImg(null)} slotKey="proto" dropHint={refDropHint === 'proto'} />
                <ArrowLeftRight className="w-3.5 h-3.5 text-mut-3" />
                <UploadSlot label="灵感图" img={inspoImg} onPick={setInspoImg} onClear={() => setInspoImg(null)} slotKey="inspo" dropHint={refDropHint === 'inspo'} />
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    generate()
                  }
                }}
                placeholder="保留原款廓形，应用灵感款设计"
                rows={genBarExpanded ? 8 : 2} // 放大态输入区高度与「生成图片」放大功能框一致
                className={`${genBarExpanded ? 'w-full' : 'flex-1'} resize-none text-[13px] outline-none placeholder:text-mut-3 pt-1 bg-transparent`}
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <MiniSelect value={mode} options={MODES} onChange={setMode} prefix={<Sparkles className="w-3.5 h-3.5 text-ok" />} />
              <MiniSelect value={count} options={COUNTS} onChange={setCount} />
              <MiniSelect value={ratio} options={RATIOS} onChange={setRatio} />
              <div className="flex-1" />
              <button
                onClick={generate}
                disabled={!canSend || generating}
                title="生成"
                className={`h-8 min-w-8 px-2 rounded-full flex items-center justify-center gap-1 transition-colors ${
                  canSend && !generating ? 'bg-ink text-panel hover:bg-ink/85' : 'bg-fill text-mut-3'
                }`}
              >
                {generating ? (
                  <span className="w-3.5 h-3.5 border-2 border-mut-3 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ArrowUp className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        )
        // 放大态：遮罩 + 居中大对话框（点击遮罩还原）；锚定态：底部工具栏上方居中
        return genBarExpanded ? (
          <div
            className="absolute inset-0 z-40 flex items-center justify-center bg-ink/35"
            data-nopan
            onPointerDown={(e) => {
              if (e.target === e.currentTarget) setGenBarExpanded(false)
            }}
          >
            {barBody}
          </div>
        ) : (
          <div
            className="absolute z-20"
            style={{ left: `calc(50% + ${leftOffset / 2}px)`, bottom: '80px', transform: 'translateX(-50%)' }} // 底部工具栏上方居中，与大导航栏同轴随面板状态自适应
            data-nopan
          >
            {barBody}
          </div>
        )
      })()}

      {/* 右下角控制条：画布颜色 · 地图模式 · 缩放（取色器 / 缩放菜单以弹层打开，小地图浮于上方） */}
      <div
        className="absolute right-4 bottom-5 z-20 flex items-center gap-1"
        data-nopan
        data-canvasbar
      >
        {/* 画布颜色 */}
        <button
          onClick={() => {
            setColorOpen((v) => !v)
            setZoomMenu(false)
          }}
          title="画布颜色"
          className="w-7 h-7 rounded-full flex items-center justify-center text-ink-2 hover:bg-fill transition-colors"
        >
          <span className="w-4 h-4 rounded-full border border-ink/25 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.35)]" style={{ backgroundColor: canvasColor }} />
        </button>
        {/* 地图模式 */}
        <button
          onClick={() => setMapOpen((v) => !v)}
          title="地图模式"
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors ${mapOpen ? 'bg-pri-soft text-pri' : 'text-ink-2 hover:bg-fill'}`}
        >
          <MapIcon className="w-3.5 h-3.5" />
        </button>
        {/* 网格吸附 */}
        <button
          onClick={() => setSnapGrid((v) => !v)}
          title={snapGrid ? '网格吸附已开启 · 点击关闭' : '网格吸附已关闭 · 点击开启'}
          className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
            snapGrid
              ? 'bg-pri text-white shadow-[0_2px_8px_rgba(42,104,254,0.45)] scale-105'
              : 'text-ink-2 hover:bg-fill'
          }`}
        >
          <Magnet className="w-3.5 h-3.5" />
        </button>
        <span className="w-px h-3.5 bg-ink/15 mx-1" />
        <button
          onClick={() => zoomBy(1 / 1.2)}
          title="缩小"
          className="w-7 h-7 rounded-full flex items-center justify-center text-ink-2 hover:bg-fill transition-colors"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
        {/* 百分比 + 快捷缩放菜单 */}
        <button
          onClick={() => {
            setZoomMenu((v) => !v)
            setColorOpen(false)
          }}
          title="缩放比例"
          className="h-7 px-1.5 rounded-full flex items-center gap-0.5 text-xs font-medium text-ink-2 hover:bg-fill transition-colors tabular-nums"
        >
          {Math.round(view.k * 100)}%
          <ChevronDown className={`w-3 h-3 text-mut transition-transform ${zoomMenu ? 'rotate-180' : ''}`} />
        </button>
        <button
          onClick={() => zoomBy(1.2)}
          title="放大"
          className="w-7 h-7 rounded-full flex items-center justify-center text-ink-2 hover:bg-fill transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {/* 取色器弹层：SV 面板 + 色相滑杆 + HEX 输入 + 预设色 */}
        {colorOpen && (
          <div className="absolute bottom-full right-0 mb-2 w-[248px] bg-panel rounded-2xl border border-line shadow-[0_8px_30px_rgba(0,0,0,0.12)] p-3" data-canvasbar>
            <div
              className="relative w-full h-[150px] rounded-xl overflow-hidden cursor-crosshair touch-none"
              style={{ background: `linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, ${hueColor})` }}
              onPointerDown={svPick}
            >
              <span
                className="absolute w-3.5 h-3.5 rounded-full border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,0.35)] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: `${hsv.s}%`, top: `${100 - hsv.v}%` }}
              />
            </div>
            <div
              className="relative mt-3 h-3 rounded-full cursor-pointer touch-none"
              style={{ background: 'linear-gradient(to right, #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 67%, #f0f 83%, #f00 100%)' }}
              onPointerDown={huePick}
            >
              <span
                className="absolute top-1/2 w-4 h-4 rounded-full border-2 border-white shadow-[0_1px_4px_rgba(0,0,0,0.35)] -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ left: `${(hsv.h / 360) * 100}%`, backgroundColor: hueColor }}
              />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg border border-line shrink-0" style={{ backgroundColor: canvasColor }} />
              <div className="flex-1 flex items-center h-8 px-2.5 rounded-lg border border-line focus-within:border-pri transition-colors">
                <span className="text-xs text-mut mr-1">#</span>
                <input
                  value={hexDraft}
                  onChange={(e) => setHexDraft(e.target.value.replace(/[^0-9a-fA-F]/g, '').slice(0, 6).toUpperCase())}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitHex()
                  }}
                  onBlur={commitHex}
                  placeholder="ECECEC"
                  className="w-full bg-transparent text-xs font-mono text-ink outline-none"
                />
              </div>
            </div>
            <div className="mt-2.5 flex items-center gap-1.5">
              {['#ECECEC', '#F5F5F4', '#FFFFFF', '#E8EEF9', '#2B2B2B', '#1D1D1F'].map((c) => (
                <button
                  key={c}
                  onClick={() => setCanvasColor(c)}
                  title={c}
                  className={`w-6 h-6 rounded-full border transition-transform hover:scale-110 ${canvasColor.toUpperCase() === c ? 'border-pri ring-2 ring-pri/25' : 'border-line'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        )}

        {/* 缩放快捷菜单 */}
        {zoomMenu && (
          <div className="absolute bottom-full right-0 mb-2 w-40 bg-panel rounded-xl border border-line shadow-[0_8px_30px_rgba(0,0,0,0.12)] py-1.5" data-canvasbar>
            <button
              onClick={() => {
                fitToIds(cards.map((c) => c.id))
                setZoomMenu(false)
              }}
              disabled={!cards.length}
              className="w-full px-3.5 py-2 text-left text-xs text-ink-2 hover:bg-fill transition-colors disabled:opacity-40 disabled:hover:bg-transparent"
            >
              适应内容
            </button>
            {[0.5, 1, 2].map((k) => (
              <button
                key={k}
                onClick={() => zoomTo(k)}
                className={`w-full px-3.5 py-2 text-left text-xs transition-colors hover:bg-fill ${Math.abs(view.k - k) < 0.01 ? 'text-pri font-medium' : 'text-ink-2'}`}
              >
                {k * 100}%
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 地图模式：画布内容缩略总览（蓝框为当前视口，点击 / 拖拽快速导航） */}
      {mapOpen && (
        <div
          className="absolute right-3 bottom-[68px] z-20 w-[232px] bg-panel rounded-2xl border border-line shadow-[0_8px_30px_rgba(0,0,0,0.10)] overflow-hidden"
          data-nopan
          data-canvasbar
        >
          <div className="relative w-full" style={{ height: MM_H }}>
            <canvas
              ref={mmCvRef}
              style={{ width: MM_W, height: MM_H }}
              className="absolute inset-0 cursor-crosshair touch-none"
              onPointerDown={mmDown}
              onPointerMove={mmMove}
              onPointerUp={mmUp}
            />
            {!cards.length && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 pointer-events-none">
                <Image className="w-5 h-5 text-mut-3" strokeWidth={1.5} />
                <span className="text-[10px] text-mut-2">画布暂无内容</span>
              </div>
            )}
          </div>
          <div className="px-3 py-2 border-t border-line text-[10px] leading-relaxed text-mut-2">地图模式 · 缩略总览画布内容，点击或拖拽快速导航</div>
        </div>
      )}

      {/* 底部胶囊：视口内无节点时提示回到节点（地图开启时隐藏，避免重叠） */}
      {!!cards.length && !vpHasNode && !mapOpen && (
        <div
          className="absolute z-20 flex items-center gap-2.5 bg-panel rounded-full border border-line shadow-[0_4px_16px_rgba(0,0,0,0.10)] pl-4 pr-1.5 py-1.5"
          style={{ left: `calc(50% + ${leftOffset / 2}px)`, transform: 'translateX(-50%)', bottom: genPanel ? 268 : genBarOn ? 132 : 84 }}
          data-nopan
        >
          <span className="text-xs text-mut-2 whitespace-nowrap">视口内无节点</span>
          <button
            onClick={() => fitToIds(cards.map((c) => c.id))}
            className="h-7 px-3.5 rounded-full bg-ink text-panel text-xs font-medium hover:bg-ink-2 transition-colors"
          >
            回到节点
          </button>
        </div>
      )}

      {/* 图 3：图片详情二级页面（全屏覆盖，Esc / X 返回画布） */}
      {detailCard && detailColors && (
        <div className="absolute inset-0 z-50 bg-panel flex" onPointerDown={(e) => e.stopPropagation()}>
          {/* 左侧缩略图列 */}
          <div className="w-[72px] shrink-0 border-r border-fill p-3 flex flex-col gap-2">
            <div className="w-12 h-16 rounded-md overflow-hidden border-2 border-ink bg-fill">
              <CardImage card={detailCard} />
            </div>
          </div>
          {/* 中间大图 */}
          <div className="flex-1 min-w-0 relative flex items-center justify-center p-8">
            <span className="absolute left-6 top-5 px-2 py-0.5 rounded-md border border-line bg-panel text-[11px] text-mut">
              {detailIsGen ? 'AI 生成' : detailCard.tag}
            </span>
            <div className="h-full aspect-[3/4] max-w-full bg-fill-2 rounded-2xl relative overflow-hidden">
              <CardImage card={detailCard} />
              {detailCard.merged && <MergedOverlay m={detailCard.merged} />}
              <span className="absolute right-3 bottom-2 text-[11px] text-mut-2/70">画衣衣</span>
            </div>
          </div>
          {/* 右上：信息开关 + 关闭 */}
          <div className="absolute right-4 top-4 flex items-center gap-2.5">
            <button
              onClick={() => setDetailInfo(!detailInfo)}
              className={`flex items-center gap-1 h-8 px-2.5 rounded-lg text-[12px] transition-colors ${
                detailInfo ? 'text-pri bg-pri-soft' : 'text-ink-2 hover:bg-fill'
              }`}
            >
              <Info className="w-3.5 h-3.5" />
              图片详细信息
            </button>
            <button
              onClick={() => setDetailId(null)}
              title="返回画布"
              className="w-8 h-8 rounded-lg border border-line flex items-center justify-center text-ink-2 hover:bg-fill transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          {/* 右侧信息面板 */}
          {detailInfo && (
            <div className="w-[320px] shrink-0 border-l border-fill px-7 pt-20 pb-7 overflow-y-auto">
              <div className="text-[18px] font-semibold text-ink">{detailIsGen ? '换面料' : detailCard.tag}</div>
              <span className="inline-block mt-2.5 px-2 py-0.5 rounded-md bg-fill text-[11px] text-ink-2">{kindLabel(detailCard)}</span>
              <div className="mt-4 flex items-start gap-3">
                {detailIsGen ? (
                  <>
                    <div className="w-[84px] h-[104px] rounded-lg border border-line bg-fill-2 flex items-center justify-center overflow-hidden">
                      <FlatCoatLarge className="h-[92%]" />
                    </div>
                    <div className="w-[84px] h-[104px] rounded-lg border border-line relative overflow-hidden" style={{ background: detailColors?.skirt }}>
                      <div className="absolute inset-0" style={FABRIC_TEXTURES.twill} />
                    </div>
                  </>
                ) : (
                  <div className="w-[84px] h-[104px] rounded-lg border border-line overflow-hidden">
                    <CardImage card={detailCard} />
                  </div>
                )}
              </div>
              <div className="mt-4 text-[12px] text-mut">生成时间：{fmtTime(detailCard.ts)}</div>
              <div className="my-6 border-t border-fill" />
              <button
                onClick={() => downloadGenCard(detailCard)}
                className="h-9 px-4 rounded-lg border border-line flex items-center gap-2 text-[13px] text-ink hover:bg-cvs transition-colors"
              >
                <Download className="w-4 h-4" />
                下载
              </button>
            </div>
          )}
        </div>
      )}

      {/* 素材库卡片拖入画布时的导入提示遮罩（本地文件拖拽改用跟随光标的落点框，二者不叠加） */}
      {dragOver && !fileDragOn && (
        <div className="absolute inset-3 z-40 rounded-2xl border-2 border-dashed border-pri bg-pri/5 flex items-center justify-center pointer-events-none">
          <div className="bg-panel rounded-full px-4 py-2.5 shadow-lg text-[13px] text-pri font-medium flex items-center gap-2">
            <ImagePlus className="w-4 h-4" />
            松开鼠标，添加到画布
          </div>
        </div>
      )}
    </div>
  )
}
