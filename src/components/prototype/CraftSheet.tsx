import { useEffect, useRef, useState, type CSSProperties, type MouseEvent as ReactMouseEvent } from 'react'
import {
  ArrowLeft, ArrowUp, Calendar, Check, ChevronDown, Columns2, Download, GripVertical, HelpCircle, Search,
  BoxSelect, Calculator, ImagePlus, LayoutGrid, MapPin, PanelLeft, PanelRight, Pencil, Plus, Shirt, Sparkles, Trash2, Upload, X,
} from 'lucide-react'
import { getCanvasStyleAssets, subCanvasStyleAssets, type CanvasStyleAsset } from './types'
import coat1 from '@/assets/brandlib/coat1.png'
import coat2 from '@/assets/brandlib/coat2.png'
import coat3 from '@/assets/brandlib/coat3.png'
import coat4 from '@/assets/brandlib/coat4.png'
import coat5 from '@/assets/brandlib/coat5.png'

/* ============================================================
   创建工艺单（参照附件还原完整流程）
   阶段一：选择款式图弹窗——左侧工艺单信息（支持批量）+ 右侧项目资产（款式图片全部实时同步自无限画布，拖入/点选填入）
   阶段二：AI工艺单文件——工艺单文档（款号信息 / 正背面款式图钉注 / 尺码参数 /
           上传参考图 / 工艺说明（图上钉点联动）/ 面辅料）
   ============================================================ */

/* ---------- 项目资产（复用品牌库 / 平台生成图） ---------- */
interface Asset { id: string; img: string; name: string; keep?: boolean }
const ASSETS: Asset[] = [
  { id: 'a1', img: coat1, name: '翻领系带大衣' },
  { id: 'a2', img: coat2, name: '廓形呢料外套' },
  { id: 'a3', img: coat3, name: '短款双排扣大衣' },
  { id: 'a4', img: coat4, name: '中长款风衣外套' },
  { id: 'a5', img: coat5, name: '格纹拼接大衣' },
  { id: 'a6', img: '/samples/gen-look.png', name: '街头牛仔套装', keep: true },
  { id: 'a7', img: '/samples/gen-model.png', name: '针织连衣裙 LOOK' },
  { id: 'a8', img: '/samples/pf-techpack.png', name: '复古弯刀裤款式图', keep: true },
]

/* ---------- 数据模型 ---------- */
interface CraftRow {
  id: number
  part: string
  craft: string
  desc: string
  imgs: string[] // 标注配图（钉点弹窗内添加）
  pin?: { img: 'front' | 'back'; x: number; y: number } // 与款式图钉点联动
}
interface SizeRow { id: number; label: string; values: string[] } // values 与 sizeCols 一一对应
interface RefImg { img: string; tag: string } // 参考图 + 可编辑标注（如 标注 1）
interface Fabric {
  id: number; tag: string; part: string; desc: string
  price: string; usage: string; code: string; supplier: string; phone: string
  img: string | null // 面料图（点击上传 / 内容库中选）
}
interface Accessory {
  id: number; part: string; qty: string; desc: string
  price: string; unit: string; code: string; supplier: string; phone: string
  img: string | null // 辅料图（点击上传 / 内容库中选）
}
interface CostExtra { id: number; name: string; qty: string; price: string } // 自定义工艺费（个性化计价维度）
interface Sheet {
  front: string | null
  back: string | null
  imgH: { front: number; back: number } // 款式图高度（右下角手柄拖拽拉大/缩小）
  layout: 'A' | 'B' | 'C' // 排版：A 经典（图左参数右）/ B 侧栏（参数左图右，工艺区上移）/ C 通栏（大图置顶，参数横排）
  bleed: number // 出血位(mm)：A4 底框内工艺单内容与裁切边的距离，0–10 可调
  costAside: boolean // 价格核算模块位置：false=单内（随 PDF 下载）；true=右侧边栏（不计入 PDF）
  category: string // 品类：决定部位候选、工艺推荐与计价方式
  cost: { width: string; loss: string; seam: string; pocket: string } // 价格核算：幅宽(m)/损耗(%)/合缝单价(元/条)/口袋单价(元/个)
  extras: CostExtra[] // 自定义工艺费行（增删改）
  styleNo: string
  styleName: string
  patternNo: string
  date: string
  sizeEdit: boolean
  sizeCols: string[] // 尺码列（如 S / M，可增删列）
  sizes: SizeRow[]
  refs: RefImg[]
  crafts: CraftRow[]
  fabrics: Fabric[]
  accessories: Accessory[]
}

let uid = 1
const nid = () => uid++

const today = () => new Date().toISOString().slice(0, 10)

/* 样衣价格核算：关联版片的可追溯测算条件（原型演示数据） */
const PIECE_STATS = { pieces: 14, area: 1.68, seams: 22, pockets: 2 }

/* 钉点「输入选择框」部位候选（对齐附件下拉） */
const PART_SUGGESTIONS = ['下摆', '口袋', '帽子', '整体', '斜口袋', '滚边口袋', '腰带', '衣身', '袖口', '袖子', '裤耳', '里布', '门襟', '领子', '肩带']

/* 品类体系：部位候选、工艺推荐、计价预设均随品类切换 */
const CATEGORIES = ['大衣', '风衣', '西装', '衬衫', '连衣裙', '半裙', '裤装']
const CATEGORY_PARTS: Record<string, string[]> = {
  大衣: ['领子', '门襟', '口袋', '下摆', '袖口', '腰带', '衣身', '袖子', '里布', '整体'],
  风衣: ['领子', '门襟', '口袋', '下摆', '袖口', '腰带', '肩带', '衣身', '袖子', '整体'],
  西装: ['领子', '门襟', '口袋', '下摆', '袖口', '袖子', '里布', '整体'],
  衬衫: ['领子', '门襟', '袖口', '口袋', '下摆', '衣身', '整体'],
  连衣裙: ['领子', '袖子', '袖口', '裙摆', '腰部', '门襟', '衣身', '里布', '整体'],
  半裙: ['腰头', '裙摆', '门襟', '开衩', '裙身', '整体'],
  裤装: ['裤耳', '腰头', '门襟', '斜口袋', '滚边口袋', '裤脚', '裆长', '裤腿', '整体'],
}
/* 不同品类价格计算方式不同：合缝单价 / 口袋单价 / 默认损耗 */
const CATEGORY_PRESETS: Record<string, { seam: string; pocket: string; loss: string; note: string }> = {
  大衣: { seam: '3', pocket: '8', loss: '10', note: '呢料厚重，合缝与口袋工艺单价较高' },
  风衣: { seam: '2.8', pocket: '7', loss: '10', note: '防风面料，压线与袢带工艺较多' },
  西装: { seam: '3.5', pocket: '9', loss: '10', note: '精纺面料，归拔与衬布工艺要求高' },
  衬衫: { seam: '1.8', pocket: '4', loss: '8', note: '薄料快反，合缝单价较低' },
  连衣裙: { seam: '2', pocket: '6', loss: '8', note: '裙摆用料足，损耗较低' },
  半裙: { seam: '2', pocket: '5', loss: '8', note: '结构简洁，加工费较低' },
  裤装: { seam: '2.5', pocket: '5', loss: '12', note: '裁片小损耗偏高，口袋工艺单价低' },
}
/* 用户新增品类：入品类库并生成计价预设（原型模拟后端工艺库，按最接近品类调取工艺做法） */
const CUSTOM_CATEGORIES: string[] = []
const CUSTOM_PRESETS: Record<string, { seam: string; pocket: string; loss: string; note: string }> = {}
const allCategories = () => [...CATEGORIES, ...CUSTOM_CATEGORIES]
const presetOf = (cat: string) => CATEGORY_PRESETS[cat] ?? CUSTOM_PRESETS[cat]
const guessCategory = (name: string) =>
  name.includes('裤') ? '裤装' : name.includes('连衣裙') ? '连衣裙' : name.includes('衬衫') ? '衬衫' : name.includes('西装') ? '西装' : name.includes('风衣') ? '风衣' : name.includes('裙') ? '半裙' : '大衣'

const SIZE_LABELS = ['尺码', '腰围', '臀围', '膝围', '裤脚围', '腰高', '裤长', '档长', '前浪', '后浪', '前中下降', '臀围前后差', '腰头高度', '克夫宽度']

function makeSheet(base: Record<string, string>): Sheet {
  const sizeOf: Record<string, string> = {
    腰围: base.waist ?? '', 臀围: base.hip ?? '', 膝围: base.knee ?? '',
    裤脚围: base.hem ?? '', 腰高: base.rise ?? '', 裤长: base.length ?? '',
  }
  return {
    front: null,
    back: null,
    imgH: { front: 520, back: 520 },
    layout: 'A',
    bleed: 3,
    costAside: false,
    category: '大衣',
    cost: { width: '1.5', loss: '10', seam: '3', pocket: '8' },
    extras: [],
    styleNo: '',
    styleName: '',
    patternNo: '',
    date: today(),
    sizeEdit: false,
    sizeCols: ['S', 'M'],
    sizes: SIZE_LABELS.filter((l) => l !== '尺码').map((label) => ({ id: nid(), label, values: ['', sizeOf[label] ?? ''] })),
    refs: [],
    crafts: [],
    fabrics: [],
    accessories: [],
  }
}

/* ---------- 小部件：章节标题（圆点 + 文案 + 右侧操作） ---------- */
const SecHead = ({ title, help, action }: { title: string; help?: boolean; action?: React.ReactNode }) => (
  <div className="flex items-center gap-1.5">
    <span className="w-1.5 h-1.5 rounded-full bg-ink shrink-0" />
    <span className="text-[13.5px] font-semibold text-ink">{title}</span>
    {help && <HelpCircle className="w-3.5 h-3.5 text-mut-3" />}
    {action && <span className="ml-auto">{action}</span>}
  </div>
)

/* ---------- 小部件：文本输入（文档表格用，无边框融入） ---------- */
const DocInput = ({ value, onChange, placeholder, className = '' }: {
  value: string; onChange: (v: string) => void; placeholder?: string; className?: string
}) => (
  <input
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    className={`w-full bg-transparent outline-none text-[12.5px] text-ink placeholder:text-mut-3 ${className}`}
  />
)

/* ---------- 小部件：面辅料图（虚线上传框 / 已传预览） ---------- */
const ImgSlot = ({ label, img, onPick, onClear }: {
  label: string; img: string | null; onPick: (from: 'upload' | 'lib') => void; onClear: () => void
}) => (
  img ? (
    <div className="relative w-[190px] h-[185px] rounded-lg border border-line shrink-0 overflow-hidden group">
      <img src={img} alt={label} className="w-full h-full object-cover" />
      <button
        onClick={onClear}
        title={`移除${label}`}
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-panel/95 border border-line hidden group-hover:flex items-center justify-center text-mut hover:text-err transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  ) : (
    <div className="w-[190px] h-[185px] rounded-lg border border-dashed border-line-strong bg-fill/40 hover:border-pri/60 hover:bg-pri-soft/40 shrink-0 flex flex-col items-center justify-center gap-1.5 select-none transition-colors cursor-pointer group/slot">
      <Plus className="w-5 h-5 text-mut-3 group-hover/slot:text-pri transition-colors" strokeWidth={1.6} />
      <span className="text-[13px] font-medium text-ink group-hover/slot:text-pri transition-colors">{label}</span>
      <span className="text-[11.5px] text-mut">
        <button onClick={() => onPick('upload')} className="text-pri hover:underline">点击上传</button>
        {' '}或{' '}
        <button onClick={() => onPick('lib')} className="text-pri hover:underline">内容库中选</button>
      </span>
    </div>
  )
)

/* ---------- 小部件：参考图（带可编辑「标注」标签 + 删除） ---------- */
const RefThumb = ({ img, tag, onTag, onRemove }: {
  img: string; tag: string; onTag: (v: string) => void; onRemove: () => void
}) => {
  const [editing, setEditing] = useState(false)
  return (
    <div className="relative w-40 h-40 rounded-lg border border-line overflow-hidden group">
      <img src={img} alt={tag} className="w-full h-full object-cover" />
      {editing ? (
        <input
          autoFocus
          value={tag}
          onChange={(e) => onTag(e.target.value)}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => e.key === 'Enter' && setEditing(false)}
          className="absolute top-1.5 left-1.5 z-10 h-5 w-24 px-1.5 rounded bg-ink text-white text-[10px] outline-none"
        />
      ) : (
        <button
          onClick={() => setEditing(true)}
          title="点击编辑标注"
          className="absolute top-1.5 left-1.5 z-10 h-5 px-1.5 rounded bg-ink/90 text-white text-[10px] leading-none inline-flex items-center hover:bg-ink transition-colors"
        >
          {tag || '标注'}
        </button>
      )}
      <button
        onClick={onRemove}
        title="删除参考图"
        className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-panel/95 border border-line hidden group-hover:flex items-center justify-center text-mut hover:text-err transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

/* ---------- 小部件：价格单位下拉（元/个 ▾） ---------- */
const UNIT_OPTS = ['元/个', '元/米', '元/粒', '元/条']
const UnitSelect = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        className="px-2 h-9 inline-flex items-center gap-1 text-[11.5px] text-mut bg-fill border-l border-line hover:text-ink transition-colors"
      >
        {value}
        <ChevronDown className="w-3 h-3" />
      </button>
      {open && (
        <span className="absolute right-0 top-full mt-1 z-30 w-20 rounded-lg border border-line bg-panel py-1 block">
          {UNIT_OPTS.map((u) => (
            <button
              key={u}
              onMouseDown={(e) => { e.preventDefault(); onChange(u); setOpen(false) }}
              className={`w-full px-2.5 h-7 text-left text-[11.5px] block transition-colors ${u === value ? 'text-pri font-medium bg-pri-soft/60' : 'text-ink-2 hover:bg-fill'}`}
            >
              {u}
            </button>
          ))}
        </span>
      )}
    </span>
  )
}

/* ============================================================
   阶段一：创建工艺单弹窗（选择款式图）
   ============================================================ */
function PickStage({
  sheets,
  setSheets,
  addSheet,
  showToast,
  onCancel,
  onGenerate,
}: {
  sheets: Sheet[]
  setSheets: (fn: (s: Sheet[]) => Sheet[]) => void
  addSheet: () => void
  showToast: (m: string) => void
  onCancel: () => void
  onGenerate: () => void
}) {
  /* 项目资产：款式图片全部来源于无限画布（实时同步共享存储）；「保留款式」功能模块已全局去除 */
  const [assets, setAssets] = useState<CanvasStyleAsset[]>(() => getCanvasStyleAssets())
  useEffect(() => subCanvasStyleAssets(() => setAssets(getCanvasStyleAssets())), [])
  const usedImgs = sheets.flatMap((s) => [s.front, s.back]).filter(Boolean) as string[]
  const ready = sheets.every((s) => s.front && s.back)
  const anyImg = usedImgs.length > 0

  const assign = (si: number, side: 'front' | 'back', img: string, name?: string) =>
    setSheets((ss) => ss.map((s, i) => {
      if (i !== si) return s
      if (side === 'front' && name) {
        const cat = guessCategory(name)
        const preset = CATEGORY_PRESETS[cat]
        return { ...s, [side]: img, category: cat, styleName: s.styleName || name, cost: preset ? { ...s.cost, seam: preset.seam, pocket: preset.pocket, loss: preset.loss } : s.cost }
      }
      return { ...s, [side]: img }
    }))

  const clearSlot = (si: number, side: 'front' | 'back') =>
    setSheets((ss) => ss.map((s, i) => (i === si ? { ...s, [side]: null } : s)))

  const clearSheet = (si: number) =>
    setSheets((ss) => ss.map((s, i) => (i === si ? { ...s, front: null, back: null } : s)))

  /* 点选资产：依次填入第一张工艺单的空槽位（先正面后背面） */
  const pickAsset = (a: CanvasStyleAsset) => {
    for (let i = 0; i < sheets.length; i++) {
      if (!sheets[i].front) { assign(i, 'front', a.img, a.name); return }
      if (!sheets[i].back) { assign(i, 'back', a.img, a.name); return }
    }
    showToast('款式图槽位已选满，可删除后重选或增加工艺单')
  }

  /* 款式图槽位卡片 */
  const Slot = ({ si, side, label, ai }: { si: number; side: 'front' | 'back'; label: string; ai?: boolean }) => {
    const img = sheets[si][side]
    return (
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          const id = e.dataTransfer.getData('text/asset')
          const a = assets.find((x) => x.id === id)
          if (a) assign(si, side, a.img, a.name)
        }}
        className={`relative flex-1 h-[248px] rounded-xl border bg-white flex flex-col items-center justify-center gap-1.5 px-3 transition-colors ${
          img ? 'border-line' : 'border-dashed border-line-strong hover:border-pri/50'
        }`}
      >
        {img ? (
          <>
            <span className="absolute top-2 left-2 h-5 px-1.5 rounded bg-panel/95 border border-line text-[10px] text-mut inline-flex items-center">AI 生成</span>
            <button
              onClick={() => clearSlot(si, side)}
              title="移除款式图"
              className="absolute top-2 right-2 w-6 h-6 rounded-lg bg-panel/95 border border-line flex items-center justify-center text-mut hover:text-err transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
            <img src={img} alt={label} className="h-[150px] object-contain pointer-events-none" draggable={false} />
          </>
        ) : (
          <>
            <div className="relative">
              <Shirt className="w-14 h-14 text-line-strong" strokeWidth={1.2} />
              <span className="absolute -right-2 -bottom-1 w-5 h-5 rounded-full bg-mut-3 text-white flex items-center justify-center">
                <Plus className="w-3 h-3" />
              </span>
            </div>
            <div className="text-[13.5px] font-bold text-ink mt-1">{label}</div>
            <div className="text-[11.5px] text-mut">支持从右侧款式图拖入</div>
          </>
        )}
        <div className={`flex items-center justify-center gap-2 text-[11px] text-mut whitespace-nowrap ${img ? '' : 'mt-1.5'}`}>
          <button onClick={() => showToast('本地上传（原型演示）')} className="hover:text-pri transition-colors">本地上传</button>
          <span className="text-line">|</span>
          <button onClick={() => showToast('内容库中选择（原型演示）')} className="hover:text-pri transition-colors">内容库中选择</button>
          {ai && (
            <>
              <span className="text-line">|</span>
              <button onClick={() => showToast('AI生成背面图（原型演示）')} className="hover:text-pri transition-colors">AI生成</button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-ink/45" onClick={onCancel} />
      <button
        onClick={onCancel}
        title="关闭"
        className="absolute top-3 right-4 z-10 w-8 h-8 rounded-full flex items-center justify-center text-white/90 hover:text-white hover:bg-white/10 transition-colors"
      >
        <X className="w-5 h-5" />
      </button>
      <div className="absolute inset-x-3 top-12 bottom-3 rounded-2xl bg-panel border border-line flex overflow-hidden">
        {/* ===== 左：创建工艺单 ===== */}
        <div className="w-[420px] shrink-0 border-r border-line flex flex-col">
          <div className="h-14 px-5 flex items-center gap-3 border-b border-line shrink-0">
            <span className="text-[17px] font-bold text-ink">创建工艺单</span>
            <span className="ml-auto" />
            <button
              onClick={onCancel}
              className={`h-8 px-3.5 rounded-lg border text-[12.5px] transition-colors ${
                anyImg ? 'border-pri/60 text-pri hover:bg-pri-soft' : 'border-line text-mut hover:text-ink'
              }`}
            >
              取 消
            </button>
            <button
              onClick={() => ready && onGenerate()}
              disabled={!ready}
              className={`h-8 px-3.5 rounded-lg text-[12.5px] inline-flex items-center gap-1.5 transition-colors ${
                ready ? 'bg-pri text-white hover:bg-pri-hover' : 'bg-fill text-mut-3 cursor-not-allowed'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              生成工艺单
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            <div className="flex items-center">
              <span className="text-[14px] font-semibold text-ink">工艺单信息（支持批量）</span>
              <button
                onClick={addSheet}
                className="ml-auto text-[12.5px] text-pri inline-flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
                <Plus className="w-3.5 h-3.5" />
                增加工艺单
              </button>
            </div>
            {sheets.map((_, si) => (
              <div key={si} className={si > 0 ? 'mt-6 pt-5 border-t border-line-soft' : 'mt-4'}>
                <div className="flex items-center mb-2.5">
                  <span className="text-[12.5px] text-mut">
                    选择款式图{sheets.length > 1 ? `（工艺单 ${si + 1}）` : ''}
                  </span>
                  <button
                    onClick={() => clearSheet(si)}
                    title="清空款式图"
                    className="ml-auto w-6 h-6 rounded-md flex items-center justify-center text-mut-3 hover:text-err transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="flex gap-3">
                  <Slot si={si} side="front" label="款式正面图" />
                  <Slot si={si} side="back" label="款式背面图" ai />
                </div>
              </div>
            ))}
            <p className="mt-5 text-[11.5px] text-mut-3 leading-relaxed">
              从右侧「项目资产」点击或拖拽款式图至槽位；正、背面图齐全后即可生成工艺单。
            </p>
          </div>
        </div>
        {/* ===== 右：项目资产 ===== */}
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="h-14 px-5 flex items-center border-b border-line shrink-0">
            <span className="text-[17px] font-bold text-ink">项目资产</span>
          </div>
          <div className="flex-1 overflow-y-auto p-5">
            {assets.length === 0 ? (
              <div className="h-full min-h-[320px] flex flex-col items-center justify-center text-center gap-2.5">
                <Shirt className="w-11 h-11 text-line-strong" strokeWidth={1.2} />
                <div className="text-[13.5px] font-medium text-mut">无限画布上暂无款式图片</div>
                <div className="text-[11.5px] text-mut-3 leading-relaxed">此模块款式图片全部来源于无限画布<br />在画布中生成或导入款式图后，将自动同步显示在此处</div>
              </div>
            ) : (
            <div className="grid grid-cols-4 gap-4">
              {assets.map((a) => {
                const used = usedImgs.includes(a.img)
                return (
                  <div
                    key={a.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('text/asset', a.id)}
                    onClick={() => pickAsset(a)}
                    title={`${a.name}（点击填入 / 拖入槽位）`}
                    className={`relative rounded-xl border bg-white p-2 cursor-grab active:cursor-grabbing transition-colors hover:border-pri/50 ${
                      used ? 'border-pri/60' : 'border-line'
                    }`}
                  >
                    <span className="absolute top-3 left-3 z-10 h-5 px-1.5 rounded bg-panel/95 border border-line text-[10px] text-mut inline-flex items-center">画布同步</span>
                    {used && (
                      <span className="absolute top-3 right-3 z-10 h-5 px-1.5 rounded bg-pri text-white text-[10px] inline-flex items-center gap-0.5">
                        <Check className="w-3 h-3" />
                        已选
                      </span>
                    )}
                    <img src={a.img} alt={a.name} className="aspect-[4/3] w-full object-contain pointer-events-none" draggable={false} />
                    <div className="mt-1.5 flex items-center gap-1.5 px-0.5">
                      <span className="text-[11.5px] text-mut truncate">{a.name}</span>
                      <img src="/logo.png" alt="" className="w-3 h-3 ml-auto opacity-60" />
                    </div>
                  </div>
                )
              })}
            </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/* 钉点「输入选择框」：部位 / 工艺名称 / 标注说明 / 配图，内容实时同步到对应工艺说明行 */
/* 工艺库条目：部件 + 工艺名称 + 文本说明 + 图示 */
interface CraftLibItem { id: number; cat: string; part: string; name: string; desc: string; img: string }

/* 工艺库（原型内置种子数据 + 用户新增自生长，后续检索可见） */
const CRAFT_LIB: CraftLibItem[] = [
  { id: 1, cat: '大衣', part: '口袋', name: '双唇袋缝制', desc: '袋唇宽 1.2cm，双唇对齐不露毛边，袋口两端打枣加固。', img: coat2 },
  { id: 2, cat: '大衣', part: '口袋', name: '斜插袋缝制', desc: '袋口斜度与侧缝一致，袋布四周锁边，袋口压 0.6cm 明线。', img: coat3 },
  { id: 3, cat: '大衣', part: '口袋', name: '贴袋缝制', desc: '袋口折边 2.5cm 压双线，袋身三边压 0.1cm 明线，圆角顺直。', img: coat4 },
  { id: 4, cat: '大衣', part: '下摆', name: '卷边缝制', desc: '下摆折边 3cm，缲边线迹均匀，表面不透针迹。', img: coat1 },
  { id: 5, cat: '大衣', part: '下摆', name: '下摆开衩', desc: '衩长 12cm，衩口方正，里外层服贴不起翘。', img: coat5 },
  { id: 6, cat: '大衣', part: '袖口', name: '袖口滚边', desc: '滚边条 45° 斜裁，宽 0.8cm，包缝紧实无扭斜。', img: '/samples/gen-look.png' },
  { id: 7, cat: '大衣', part: '领子', name: '翻领缝制', desc: '领面衬烫平服，领尖对称，翻折线顺直自然外翻。', img: '/samples/gen-model.png' },
  { id: 8, cat: '大衣', part: '门襟', name: '隐藏式金属拉链缝制', desc: '拉链齿不外露，两边止口平齐，拉合顺滑无卡顿。', img: '/samples/pf-techpack.png' },
  { id: 9, cat: '大衣', part: '门襟', name: '明门襟压线', desc: '门襟宽 3cm，压 0.1+0.8cm 双明线，宽窄一致。', img: coat1 },
  { id: 10, cat: '大衣', part: '腰带', name: '腰带袢缝制', desc: '袢长 4cm 宽 1cm，两端套结固定，间距均匀。', img: coat2 },
  { id: 11, cat: '裤装', part: '斜口袋', name: '斜插袋缝制', desc: '袋口斜度与侧缝一致，袋布四周锁边，袋口压 0.6cm 明线。', img: '/samples/pf-techpack.png' },
  { id: 12, cat: '裤装', part: '裤脚', name: '裤脚卷边', desc: '卷边宽 4cm，缲边牢固，表面无针迹。', img: '/samples/gen-look.png' },
  { id: 13, cat: '裤装', part: '腰头', name: '腰头上腰', desc: '腰头净宽 3.5cm，上腰吃势均匀，两端对齐门襟。', img: coat3 },
  { id: 14, cat: '裤装', part: '裤耳', name: '裤耳套结加固', desc: '裤耳两端套结 3 道，间距均匀，受力处加衬布。', img: coat4 },
  { id: 15, cat: '连衣裙', part: '裙摆', name: '裙摆卷边', desc: '裙摆折边 2cm，卷边平顺不起浪。', img: '/samples/gen-model.png' },
  { id: 16, cat: '连衣裙', part: '门襟', name: '隐形拉链缝制', desc: '拉链隐于缝内，齿不外露，开合顺滑。', img: coat5 },
  { id: 17, cat: '衬衫', part: '袖口', name: '克夫缝制', desc: '克夫宽 5.5cm，衬布平服，扣眼锁缝整齐。', img: coat1 },
  { id: 18, cat: '衬衫', part: '门襟', name: '明门襟压线', desc: '门襟宽 2.5cm，压 0.1cm 单明线，顺直无弯曲。', img: coat2 },
  { id: 19, cat: '西装', part: '领子', name: '戗驳领缝制', desc: '驳头翻折自然，领嘴方正，串口顺直。', img: coat3 },
  { id: 20, cat: '西装', part: '口袋', name: '手巾袋缝制', desc: '袋唇宽 2.5cm，两端打枣，袋口平整。', img: coat4 },
  { id: 21, cat: '风衣', part: '肩带', name: '肩袢缝制', desc: '肩袢宽 3cm，压双明线，钉扣牢固。', img: coat5 },
  { id: 22, cat: '风衣', part: '腰带', name: '腰带袢缝制', desc: '袢长 5cm 宽 1.2cm，两端套结固定。', img: coat1 },
  { id: 23, cat: '半裙', part: '腰头', name: '裙腰缝制', desc: '腰头宽 3cm，上腰平服，后中装拉链。', img: '/samples/gen-look.png' },
  { id: 24, cat: '半裙', part: '裙摆', name: '裙摆压线', desc: '裙摆折边 3cm，压 0.6cm 明线一周。', img: '/samples/gen-model.png' },
]

/* 3.5 新增工艺模态框：名称 + 文本说明 + 图示上传（≤5MB，长边压缩 1024px），提交后入库并置顶 */
function AddCraftModal({
  cat, part, hasDesc, onPick, onClose, showToast,
}: {
  cat: string
  part: string
  hasDesc: boolean // 主界面标注说明已有内容 → 提交时需用户确认追加 / 覆盖
  onPick: (name: string, desc: string, mode: 'append' | 'overwrite') => void
  onClose: () => void
  showToast: (m: string) => void
}) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [img, setImg] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [busy, setBusy] = useState(false)
  const [askFill, setAskFill] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const valid = !!(name.trim() && desc.trim() && img)
  const dup = name.trim() ? CRAFT_LIB.find((it) => it.cat === cat && it.name === name.trim()) : undefined

  /* 图片读取与压缩：JPG/PNG 长边压至 1024px；SVG 直接转 DataURL */
  const pickFile = (file: File) => {
    if (!/^image\/(jpeg|png|svg\+xml)$/.test(file.type)) { showToast('仅支持 JPG / PNG / SVG 图片'); return }
    if (file.size > 5 * 1024 * 1024) { showToast('图片超过 5MB，请压缩后再上传'); return }
    if (file.type === 'image/svg+xml') {
      const r = new FileReader()
      r.onload = () => setImg(String(r.result))
      r.onerror = () => showToast('网络异常，请重试')
      r.readAsDataURL(file)
      return
    }
    const r = new FileReader()
    r.onload = () => {
      const im = new Image()
      im.onload = () => {
        const scale = Math.min(1, 1024 / Math.max(im.width, im.height))
        const cv = document.createElement('canvas')
        cv.width = Math.round(im.width * scale)
        cv.height = Math.round(im.height * scale)
        cv.getContext('2d')!.drawImage(im, 0, 0, cv.width, cv.height)
        setImg(cv.toDataURL('image/jpeg', 0.85))
      }
      im.onerror = () => showToast('网络异常，请重试')
      im.src = String(r.result)
    }
    r.onerror = () => showToast('网络异常，请重试')
    r.readAsDataURL(file)
  }

  /* 确定：如需确认回填方式先询问，否则直接提交 */
  const submit = () => {
    if (!valid || busy) return
    if (hasDesc && !askFill) { setAskFill(true); return }
    doCommit(hasDesc ? 'overwrite' : 'overwrite')
  }
  const doCommit = (mode: 'append' | 'overwrite') => {
    setBusy(true)
    window.setTimeout(() => { // 模拟异步上传至工艺库
      try {
        CRAFT_LIB.unshift({ id: Date.now(), cat, part: part || '整体', name: name.trim(), desc: desc.trim(), img: img! })
        onPick(name.trim(), desc.trim(), mode)
        setBusy(false)
        onClose()
        showToast('新增成功，已收入工艺库')
      } catch {
        setBusy(false)
        showToast('网络异常，请重试')
      }
    }, 600)
  }

  const labelCls = 'block text-[11.5px] text-mut mb-1'
  const fieldCls = 'w-full rounded-lg bg-fill px-3 text-[12.5px] text-ink outline-none border border-transparent focus:border-pri/60 focus:bg-panel placeholder:text-mut-3 transition-colors'
  return (
    <div className="fixed inset-0 z-[70] bg-ink/50 flex items-center justify-center p-6" onClick={onClose}>
      <div className="w-[440px] rounded-xl bg-panel border border-line" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center px-4 h-11 border-b border-line">
          <span className="text-[13.5px] font-semibold text-ink">新增工艺</span>
          <span className="ml-2 text-[11px] text-mut">归档至工艺库 · {cat}{part ? ` · 部件「${part}」` : ''}</span>
          <button onClick={onClose} title="关闭" className="ml-auto w-7 h-7 rounded-lg flex items-center justify-center text-mut hover:text-ink hover:bg-fill transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-4 space-y-3.5">
          <div>
            <span className={labelCls}>工艺名称 <span className="text-err">*</span></span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="如：隐藏式金属拉链缝制" className={fieldCls + ' h-9'} />
            {dup && (
              <div className="mt-1.5 flex items-center gap-2 rounded-md bg-warn-soft px-2.5 py-1.5 text-[11.5px] text-warn">
                该工艺已存在，是否直接选用？
                <button
                  onClick={() => { onPick(dup.name, dup.desc, hasDesc ? 'append' : 'overwrite'); onClose(); showToast('已选用工艺库现有工艺') }}
                  className="ml-auto h-6 px-2 rounded bg-warn/15 text-warn hover:bg-warn/25 transition-colors"
                >
                  直接选用
                </button>
              </div>
            )}
          </div>
          <div>
            <span className={labelCls}>文本说明 <span className="text-err">*</span></span>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={4} placeholder="详细描述该工艺的操作步骤或标准" className={fieldCls + ' py-2 leading-relaxed resize-none'} />
          </div>
          <div>
            <span className={labelCls}>图示上传 <span className="text-err">*</span><span className="ml-1 text-mut-3">JPG / PNG / SVG，≤ 5MB，长边自动压缩至 1024px</span></span>
            <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.svg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); e.target.value = '' }} />
            {img ? (
              <div className="flex items-center gap-3 rounded-lg border border-line p-2">
                <img src={img} alt="工艺图示预览" className="w-16 h-16 rounded-md object-cover border border-line" />
                <span className="text-[11.5px] text-mut flex-1">图示已就绪，将随工艺一并入库</span>
                <button onClick={() => setImg(null)} title="移除图示" className="w-7 h-7 rounded-lg flex items-center justify-center text-mut hover:text-err hover:bg-err/10 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) pickFile(f) }}
                className={`h-24 rounded-lg border border-dashed flex flex-col items-center justify-center gap-1.5 cursor-pointer transition-colors ${
                  dragOver ? 'border-pri bg-pri-soft/50' : 'border-line-strong bg-fill/40 hover:border-pri/60 hover:bg-pri-soft/40'
                }`}
              >
                <ImagePlus className="w-5 h-5 text-mut" />
                <span className="text-[12px] text-mut">点击或拖拽上传工艺图示</span>
              </div>
            )}
          </div>
        </div>
        <div className="px-4 py-3 border-t border-line flex items-center gap-2">
          {askFill ? (
            <>
              <span className="text-[11.5px] text-mut flex-1">标注说明已有内容，如何填入？</span>
              <button onClick={() => doCommit('append')} disabled={busy} className="h-8 px-3 rounded-lg border border-line text-[12.5px] text-ink-2 hover:border-pri/50 hover:text-pri transition-colors disabled:opacity-50">追加到末尾</button>
              <button onClick={() => doCommit('overwrite')} disabled={busy} className="h-8 px-3 rounded-lg bg-pri text-white text-[12.5px] hover:bg-pri-hover transition-colors disabled:opacity-50">{busy ? '上传中…' : '覆盖现有'}</button>
            </>
          ) : (
            <>
              <span className="text-[11px] text-mut-3 flex-1">提交后文本自动回填至标注说明，并置顶推荐列表</span>
              <button onClick={onClose} className="h-8 px-3 rounded-lg border border-line text-[12.5px] text-ink-2 hover:border-line-strong transition-colors">取消</button>
              <button
                onClick={submit}
                disabled={!valid || busy}
                title={valid ? '确定并上传至工艺库' : '请完善工艺信息'}
                className="h-8 px-4 rounded-lg bg-pri text-white text-[12.5px] font-medium hover:bg-pri-hover transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {busy ? '上传中…' : '确定'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

/* 钉点「输入选择框」：部位 + 工艺搜索（结果入推荐区）+ 标注说明 + 配图 */
function PinEditorCard({
  craft, cat, onCat, onPatch, onRemove, onClose, showToast,
}: {
  craft: CraftRow
  cat: string // 品类：部位候选与工艺推荐随品类匹配
  onCat: (c: string) => void
  onPatch: (patch: Partial<CraftRow>) => void
  onRemove: () => void
  onClose: () => void
  showToast: (m: string) => void
}) {
  const [listOpen, setListOpen] = useState(false)
  const [catOpen, setCatOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)
  const [preview, setPreview] = useState<CraftLibItem | null>(null)
  const p = craft.pin!
  const opts = (CATEGORY_PARTS[cat] ?? PART_SUGGESTIONS).filter((o) => !craft.part || o.includes(craft.part))
  const filled = !!(craft.part || craft.craft || craft.desc || craft.imgs.length)
  const partKey = craft.part.trim()
  const recs = partKey ? CRAFT_LIB.filter((it) => it.cat === cat && it.part === partKey) : []
  /* 工艺搜索：关键词命中名称 / 说明 / 部件，本品类优先，结果显示在下方工艺推荐区域 */
  const kw = craft.craft.trim().toLowerCase()
  const searched = kw
    ? CRAFT_LIB.filter((it) => `${it.name} ${it.desc} ${it.part}`.toLowerCase().includes(kw)).sort((a, b) => (b.cat === cat ? 1 : 0) - (a.cat === cat ? 1 : 0))
    : null
  const list = searched ?? recs
  const inputCls =
    'w-full h-9 px-3 rounded-lg bg-fill text-[12.5px] text-ink outline-none border border-transparent focus:border-pri/60 focus:bg-panel placeholder:text-mut-3 transition-colors'

  /* 选用推荐工艺：填入工艺名称，文本回填至标注说明（已有内容则追加） */
  const applyRec = (it: CraftLibItem) => {
    onPatch({ craft: it.name, desc: craft.desc ? `${craft.desc}\n${it.desc}` : it.desc })
    showToast('已填入工艺名称与说明，可继续微调')
  }

  return (
    <>
    <div
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      className={`absolute z-30 w-[340px] rounded-xl border border-line bg-panel text-left cursor-default ${
        p.x > 55 ? '-translate-x-[calc(100%+14px)]' : 'translate-x-[14px]'
      } ${p.y > 60 ? '-translate-y-[calc(100%-8px)]' : '-translate-y-2'}`}
      style={{ left: `${p.x}%`, top: `${p.y}%` }}
    >
      {/* 品类：可修改，切换后部位候选与工艺推荐按品类匹配 */}
      <div className="flex items-center gap-1.5 px-2 pt-2">
        <span className="text-[10.5px] text-mut shrink-0">品类</span>
        <div className="relative">
          <button
            onClick={() => setCatOpen((v) => !v)}
            onBlur={() => window.setTimeout(() => setCatOpen(false), 150)}
            className="h-7 px-2 rounded-md bg-fill text-[12px] text-ink inline-flex items-center gap-1 hover:bg-line-soft transition-colors"
          >
            {cat}
            <ChevronDown className="w-3 h-3 text-mut" />
          </button>
          {catOpen && (
            <div className="absolute left-0 top-full mt-1 z-40 w-24 rounded-lg border border-line bg-panel py-1">
              {allCategories().map((c) => (
                <button
                  key={c}
                  onMouseDown={(e) => { e.preventDefault(); onCat(c); setCatOpen(false); showToast(`已切换「${c}」，部位与工艺按该品类匹配`) }}
                  className={`w-full px-2.5 h-7 text-left text-[12px] transition-colors ${c === cat ? 'text-pri font-medium bg-pri-soft/60' : 'text-ink-2 hover:bg-fill hover:text-ink'}`}
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="ml-auto text-[10px] text-mut-3">切换品类后部位与工艺随之匹配</span>
      </div>
      {/* 行1：部位（输入选择框）+ 工艺搜索 + 删除 */}
      <div className="flex items-center gap-1.5 p-2">
        <div className="relative flex-1 min-w-0">
          <input
            value={craft.part}
            onChange={(e) => { onPatch({ part: e.target.value }); setListOpen(true) }}
            onFocus={() => setListOpen(true)}
            onBlur={() => window.setTimeout(() => setListOpen(false), 150)}
            placeholder="部位"
            className={inputCls}
          />
          {listOpen && opts.length > 0 && (
            <div className="absolute left-0 top-full mt-1 z-40 w-full max-h-52 overflow-y-auto rounded-lg border border-line bg-panel py-1">
              {opts.map((o) => (
                <button
                  key={o}
                  onMouseDown={(e) => { e.preventDefault(); onPatch({ part: o }); setListOpen(false) }}
                  className="w-full px-3 h-8 text-left text-[12.5px] text-ink-2 hover:bg-fill hover:text-ink transition-colors"
                >
                  {o}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-mut-3 pointer-events-none" />
          <input
            value={craft.craft}
            onChange={(e) => onPatch({ craft: e.target.value })}
            placeholder="搜索工艺关键词"
            title="输入关键词检索工艺库，结果显示在下方推荐区域"
            className={inputCls + ' pl-7'}
          />
        </div>
        <button
          onClick={onRemove}
          title="删除该钉点及对应工艺说明"
          className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center text-err/80 hover:text-err hover:bg-err/10 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
      <div className="mx-2 border-t border-line-soft" />
      {/* 工艺推荐：依据部件动态匹配，卡片流（图示 + 名称 + 说明） */}
      <div className="px-2 pt-2">
        <div className="flex items-center text-[10.5px] text-mut mb-1.5">
          {kw ? <>搜索结果 · “{craft.craft.trim()}”</> : <>工艺推荐 · {cat}{partKey ? ` · ${partKey}` : ''}</>}
          {(kw ? list.length > 0 : partKey && recs.length > 0) && <span className="ml-1 text-mut-3">{list.length} 条</span>}
          {partKey && (
            <button
              onClick={() => setAddOpen(true)}
              className="ml-auto inline-flex items-center gap-0.5 text-[10.5px] text-pri hover:opacity-80 transition-colors"
            >
              <Plus className="w-3 h-3" /> 新增工艺
            </button>
          )}
        </div>
        {kw && list.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line px-3 py-2.5 flex items-center gap-2">
            <span className="text-[11.5px] text-mut-3 flex-1">工艺库中未找到「{craft.craft.trim()}」，可新增工艺入库</span>
            <button
              onClick={() => setAddOpen(true)}
              className="h-7 px-2.5 rounded-md bg-pri text-white text-[11.5px] inline-flex items-center gap-1 hover:bg-pri-hover transition-colors shrink-0"
            >
              <Plus className="w-3 h-3" /> 新增工艺
            </button>
          </div>
        ) : !kw && !partKey ? (
          <div className="rounded-lg border border-dashed border-line px-3 py-2.5 text-center text-[11.5px] text-mut-3">
            先选择部位，自动匹配推荐工艺
          </div>
        ) : list.length > 0 ? (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {list.map((it) => (
              <div
                key={it.id}
                onClick={() => applyRec(it)}
                title="点击填入工艺名称与说明"
                className="w-28 shrink-0 rounded-lg border border-line bg-panel overflow-hidden cursor-pointer hover:border-pri/50 transition-colors"
              >
                <img
                  src={it.img}
                  alt={it.name}
                  onClick={(e) => { e.stopPropagation(); setPreview(it) }}
                  className="w-full h-16 object-cover cursor-zoom-in"
                />
                <div className="p-1.5">
                  <div className="text-[11px] font-medium text-ink truncate">{it.name}</div>
                  {!!kw && <div className="mt-0.5 text-[9.5px] text-mut-3">{it.cat} · {it.part}</div>}
                  <div className="mt-0.5 text-[10px] text-mut leading-snug line-clamp-2">{it.desc}</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-line px-3 py-2.5 flex items-center gap-2">
            <span className="text-[11.5px] text-mut-3 flex-1">当前部件暂无推荐工艺</span>
            <button
              onClick={() => setAddOpen(true)}
              className="h-7 px-2.5 rounded-md bg-pri text-white text-[11.5px] inline-flex items-center gap-1 hover:bg-pri-hover transition-colors shrink-0"
            >
              <Plus className="w-3 h-3" /> 新增工艺
            </button>
          </div>
        )}
      </div>
      <div className="mx-2 mt-1 border-t border-line-soft" />
      {/* 行2：标注说明 + 配图 + 提交 */}
      <div className="flex items-start gap-1.5 p-2">
        <div className="flex-1 min-w-0">
          <textarea
            value={craft.desc}
            onChange={(e) => onPatch({ desc: e.target.value })}
            placeholder="添加标注说明"
            rows={2}
            className="w-full px-1.5 py-1.5 bg-transparent text-[12.5px] leading-relaxed text-ink outline-none resize-none placeholder:text-mut-3"
          />
          {craft.imgs.length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-1.5 pb-1">
              {craft.imgs.map((im, i) => (
                <span key={i} className="relative w-11 h-11 rounded-md border border-line overflow-visible">
                  <img src={im} alt="" className="w-full h-full object-cover rounded-md" />
                  <button
                    onClick={() => onPatch({ imgs: craft.imgs.filter((_, j) => j !== i) })}
                    title="删除配图"
                    className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-ink text-white flex items-center justify-center hover:bg-err transition-colors"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-center gap-1 shrink-0 pt-0.5">
          <button
            onClick={() => onPatch({ imgs: [...craft.imgs, ASSETS[(craft.imgs.length * 3 + craft.id) % ASSETS.length].img] })}
            title="添加标注配图"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-mut hover:text-pri hover:bg-fill transition-colors"
          >
            <ImagePlus className="w-4 h-4" />
          </button>
          <button
            onClick={() => { onClose(); showToast('标注已保存，内容已同步到工艺说明') }}
            title="完成标注并同步工艺说明"
            className={`w-9 h-9 rounded-full flex items-center justify-center text-white transition-colors ${
              filled ? 'bg-pri hover:bg-pri-hover' : 'bg-mut-3 hover:bg-mut'}`}
          >
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
    {/* 大图 / 详细说明查看 */}
    {preview && (
      <div className="fixed inset-0 z-[70] bg-ink/60 flex items-center justify-center p-8" onClick={() => setPreview(null)}>
        <div className="w-[480px] rounded-xl bg-panel border border-line overflow-hidden" onClick={(e) => e.stopPropagation()}>
          <img src={preview.img} alt={preview.name} className="w-full max-h-[400px] object-contain bg-cvs" />
          <div className="p-4 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-semibold text-ink">{preview.name}</div>
              <div className="mt-1 text-[12.5px] leading-relaxed text-ink-2">{preview.desc}</div>
            </div>
            <button
              onClick={() => { applyRec(preview); setPreview(null) }}
              className="h-8 px-3 rounded-lg bg-pri text-white text-[12.5px] hover:bg-pri-hover transition-colors shrink-0"
            >
              选用该工艺
            </button>
          </div>
        </div>
      </div>
    )}
    {/* 新增工艺模态框 */}
    {addOpen && (
      <AddCraftModal
        cat={cat}
        part={partKey}
        hasDesc={!!craft.desc.trim()}
        onPick={(name, desc, mode) => onPatch({ craft: name, desc: mode === 'append' && craft.desc ? `${craft.desc}\n${desc}` : desc })}
        onClose={() => setAddOpen(false)}
        showToast={showToast}
      />
    )}
    </>
  )
}

/* 钉点上下文：DocStage 传给模块级 PinImageView（保持组件身份稳定，输入不丢焦） */
interface PinCtx {
  sheet: Sheet
  pinEditor: number | null
  pinArmed: 'front' | 'back' | null // 钉点模式激活于哪张图（点击钉点图标进入，放置后自动退出）
  setPinArmed: (v: 'front' | 'back' | null) => void
  selCraft: number | null
  update: (fn: (s: Sheet) => Sheet) => void
  setPinEditor: (v: number | null) => void
  addPin: (e: React.MouseEvent<HTMLDivElement>, img: 'front' | 'back') => void
  selectCraft: (id: number) => void
  removeCraft: (id: number) => void
  craftNo: (id: number) => number
  showToast: (m: string) => void
}

function PinImageView({ img, side, caption, boost = 0, ctx }: { img: string | null; side: 'front' | 'back'; caption: string; boost?: number; ctx: PinCtx }) {
  const { sheet, pinEditor, pinArmed, setPinArmed, selCraft, update, setPinEditor, addPin, selectCraft, removeCraft, craftNo, showToast } = ctx

    const h = sheet.imgH[side] + boost
    const editing = pinEditor != null ? sheet.crafts.find((c) => c.id === pinEditor && c.pin?.img === side) : undefined
    const armed = pinArmed === side // 钉点模式：点击右上角钉点图标激活（蓝色高亮），放置钉点或 Esc 后退出

    /* 钉点模式下按 Esc 退出 */
    useEffect(() => {
      if (!armed) return
      const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPinArmed(null) }
      document.addEventListener('keydown', onKey)
      return () => document.removeEventListener('keydown', onKey)
    }, [armed, setPinArmed])

    /* 拖拽右下角手柄：整体拉大 / 缩小图片 */
    const startResize = (e: React.PointerEvent<HTMLDivElement>) => {
      e.preventDefault()
      e.stopPropagation()
      const startY = e.clientY
      const startH = h
      const move = (ev: PointerEvent) => {
        const nh = Math.min(840, Math.max(320, Math.round(startH + ev.clientY - startY)))
        update((s) => ({ ...s, imgH: { ...s.imgH, [side]: nh } }))
      }
      const up = () => {
        document.removeEventListener('pointermove', move)
        document.removeEventListener('pointerup', up)
      }
      document.addEventListener('pointermove', move)
      document.addEventListener('pointerup', up)
    }

    return (
      <div className="flex-1 min-w-0">
        <div
          onClick={(e) => {
            if (!img) return
            if (pinEditor != null) { setPinEditor(null); return } // 点击空白处收起「输入选择框」
            if (!armed) { showToast('先点击右上角钉点图标激活，再点击款式图放置部位钉点'); return }
            addPin(e, side)
            setPinArmed(null) // 放置后自动退出钉点模式，高亮消失
          }}
          title={img ? (armed ? '钉点模式：点击款式图放置部位钉点，Esc 退出' : '悬停显示右上角钉点图标，点击激活后可在图上放置部位钉点') : undefined}
          style={{ height: h }}
          className={`group relative rounded-lg border bg-white transition-colors ${armed ? 'border-pri/60 cursor-crosshair' : 'border-line'}`}
        >
          {img ? (
            <img src={img} alt={caption} className="w-full h-full object-contain pointer-events-none rounded-lg" draggable={false} />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-mut-3">
              <Shirt className="w-12 h-12" strokeWidth={1.2} />
              <span className="text-[12px]">未选择{caption}</span>
            </div>
          )}
          {sheet.crafts.filter((c) => c.pin?.img === side).map((c) => (
            <button
              key={c.id}
              onClick={(e) => { e.stopPropagation(); selectCraft(c.id) }}
              title={c.part || `部位 ${craftNo(c.id)}`}
              className={`absolute -translate-x-1/2 -translate-y-full flex flex-col items-center transition-transform ${
                selCraft === c.id ? 'scale-110 z-10' : 'hover:scale-105'
              }`}
              style={{ left: `${c.pin!.x}%`, top: `${c.pin!.y}%` }}
            >
              <span className={`w-6 h-6 rounded-full text-white text-[11.5px] font-semibold flex items-center justify-center border-2 border-white ${
                selCraft === c.id ? 'bg-pri-hover' : 'bg-pri'
              }`}>
                {craftNo(c.id)}
              </span>
              <span className={`w-2 h-2 rotate-45 -mt-1 ${selCraft === c.id ? 'bg-pri-hover' : 'bg-pri'}`} />
            </button>
          ))}
          {/* 钉点「输入选择框」弹层：部位 / 工艺名称 / 标注说明 / 配图，实时同步工艺说明 */}
          {editing && editing.pin && (
            <PinEditorCard
              key={editing.id}
              craft={editing}
              cat={sheet.category}
              onCat={(c) =>
                update((s) => {
                  const preset = CATEGORY_PRESETS[c]
                  return { ...s, category: c, cost: preset ? { ...s.cost, seam: preset.seam, pocket: preset.pocket, loss: preset.loss } : s.cost }
                })
              }
              onPatch={(patch) =>
                update((s) => ({ ...s, crafts: s.crafts.map((x) => (x.id === editing.id ? { ...x, ...patch } : x)) }))
              }
              onRemove={() => removeCraft(editing.id)}
              onClose={() => setPinEditor(null)}
              showToast={showToast}
            />
          )}
          {/* 钉点激活按钮：悬停图片浮现（灰），点击进入钉点模式（蓝色高亮），放置钉点 / Esc / 再点一次退出 */}
          {img && (
            <button
              onClick={(e) => { e.stopPropagation(); setPinEditor(null); setPinArmed(armed ? null : side) }}
              title={armed ? '退出钉点模式' : '激活钉点：点击后可在款式图上放置部位钉点'}
              className={`absolute top-2 right-2 z-10 w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                armed
                  ? 'bg-pri text-white opacity-100'
                  : 'border border-line bg-panel/95 text-mut opacity-0 group-hover:opacity-100 hover:text-pri hover:border-pri/50'
              }`}
            >
              <MapPin className="w-4 h-4" />
            </button>
          )}
          {/* 钉点模式提示条 */}
          {armed && (
            <div className="absolute left-1/2 -translate-x-1/2 bottom-2 z-10 pointer-events-none h-6 px-2.5 rounded-full bg-ink/80 text-white text-[11px] inline-flex items-center gap-1 whitespace-nowrap">
              <MapPin className="w-3 h-3" />
              钉点模式：点击款式图放置部位钉点 · Esc 退出
            </div>
          )}
          {/* 拉大缩小手柄（拖拽） */}
          <div
            title="拖拽拉大 / 缩小图片"
            onPointerDown={startResize}
            onClick={(e) => e.stopPropagation()}
            className="absolute bottom-1.5 right-1.5 z-10 w-6 h-6 rounded-md flex items-center justify-center text-mut-3 hover:text-pri hover:bg-panel cursor-nwse-resize touch-none"
          >
            <svg className="w-3.5 h-3.5 pointer-events-none" viewBox="0 0 12 12">
              <path d="M2 10 L10 2 M6 11 L11 6" stroke="currentColor" strokeWidth="1.4" fill="none" />
            </svg>
          </div>
        </div>
        <div className="text-center text-[13px] text-ink mt-2.5">{caption}</div>
      </div>
    )
}

const NEXT_SIZE_COLS = ['S', 'M', 'L', 'XL', '2XL', '3XL']

function SizePanelView({ wide = false, sheet, update }: { wide?: boolean; sheet: Sheet; update: (fn: (s: Sheet) => Sheet) => void }) {

    const cols = sheet.sizeCols
    const setRow = (id: number, patch: Partial<SizeRow>) =>
      update((s) => ({ ...s, sizes: s.sizes.map((x) => (x.id === id ? { ...x, ...patch } : x)) }))
    const setCell = (id: number, ci: number, v: string) =>
      update((s) => ({ ...s, sizes: s.sizes.map((x) => (x.id === id ? { ...x, values: x.values.map((y, j) => (j === ci ? v : y)) } : x)) }))
    const addRow = () =>
      update((s) => ({ ...s, sizeEdit: true, sizes: [...s.sizes, { id: nid(), label: '新参数', values: s.sizeCols.map(() => '') }] }))
    const delRow = (id: number) => update((s) => ({ ...s, sizes: s.sizes.filter((x) => x.id !== id) }))
    const addCol = () =>
      update((s) => ({
        ...s, sizeEdit: true,
        sizeCols: [...s.sizeCols, NEXT_SIZE_COLS.find((c) => !s.sizeCols.includes(c)) ?? `码${s.sizeCols.length + 1}`],
        sizes: s.sizes.map((x) => ({ ...x, values: [...x.values, ''] })),
      }))
    const delCol = (ci: number) =>
      update((s) => ({
        ...s,
        sizeCols: s.sizeCols.filter((_, j) => j !== ci),
        sizes: s.sizes.map((x) => ({ ...x, values: x.values.filter((_, j) => j !== ci) })),
      }))
    const renameCol = (ci: number, v: string) =>
      update((s) => ({ ...s, sizeCols: s.sizeCols.map((c, j) => (j === ci ? v : c)) }))

    const labelW = wide ? 'w-[34%]' : cols.length > 1 ? 'w-[30%]' : 'w-[46%]'
    return (
      <div className={wide ? 'w-full' : 'w-[300px] shrink-0'}>
        <SecHead
          title="尺码参数 (CM)"
          action={
            <button
              onClick={() => update((s) => ({ ...s, sizeEdit: !s.sizeEdit }))}
              className={`inline-flex items-center gap-1 text-[12px] transition-colors ${sheet.sizeEdit ? 'text-pri font-medium' : 'text-pri hover:opacity-80'}`}
            >
              <Pencil className="w-3 h-3" />
              {sheet.sizeEdit ? '完成' : '编辑'}
            </button>
          }
        />
        <div className="mt-2.5 border border-line overflow-hidden text-[12px]">
          {/* 表头：尺码 | 各尺码列（编辑模式可改名 / 删列） */}
          <div className="flex h-9 border-b border-line bg-white">
            <span className={`${labelW} border-r border-line flex items-center justify-center text-ink-2 shrink-0`}>尺码</span>
            {cols.map((c, ci) => (
              <span key={ci} className="flex-1 min-w-0 flex items-center justify-center text-ink-2 border-l border-line relative group/col">
                {sheet.sizeEdit ? (
                  <input
                    value={c}
                    onChange={(e) => renameCol(ci, e.target.value)}
                    className="w-full h-full bg-transparent outline-none text-center text-[12px] text-ink"
                  />
                ) : (
                  c
                )}
                {sheet.sizeEdit && cols.length > 1 && (
                  <button
                    onClick={() => delCol(ci)}
                    title="删除该尺码列"
                    className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-err/10 text-err hidden group-hover/col:flex items-center justify-center"
                  >
                    <X className="w-2.5 h-2.5" />
                  </button>
                )}
              </span>
            ))}
          </div>
          <div className={wide ? 'grid grid-cols-4' : ''}>
            {sheet.sizes.map((r, i) => (
              <div
                key={r.id}
                className={`flex h-9 border-b border-line last:border-b-0 bg-white group/row ${
                  wide && i % 4 !== 3 ? 'border-r border-line' : ''
                }`}
              >
                <span className={`${labelW} border-r border-line flex items-center px-2 gap-1 text-ink-2 shrink-0`}>
                  <GripVertical className="w-3 h-3 text-mut-3 shrink-0" />
                  {sheet.sizeEdit ? (
                    <input
                      value={r.label}
                      onChange={(e) => setRow(r.id, { label: e.target.value })}
                      className="w-full min-w-0 bg-transparent outline-none text-[12px] text-ink"
                    />
                  ) : (
                    <span className="truncate">{r.label}</span>
                  )}
                  {sheet.sizeEdit && (
                    <button
                      onClick={() => delRow(r.id)}
                      title="删除该参数"
                      className="ml-auto w-4 h-4 shrink-0 rounded-full bg-err/10 text-err hidden group-hover/row:flex items-center justify-center"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </span>
                {cols.map((_, ci) => (
                  <span key={ci} className="flex-1 min-w-0 flex items-center px-2 justify-center border-l border-line">
                    {sheet.sizeEdit ? (
                      <input
                        value={r.values[ci] ?? ''}
                        onChange={(e) => setCell(r.id, ci, e.target.value)}
                        placeholder="—"
                        className="w-full bg-transparent outline-none text-[12px] text-ink text-center placeholder:text-mut-3"
                      />
                    ) : (
                      <span className={r.values[ci] ? 'text-ink' : 'text-mut-3'}>{r.values[ci] || '—'}</span>
                    )}
                  </span>
                ))}
              </div>
            ))}
          </div>
          {/* 底部：新增参数 / 新增尺码列 */}
          <div className="flex border-t border-line divide-x divide-line bg-white">
            <button onClick={addRow} className="flex-1 h-9 text-[12px] text-mut hover:text-pri transition-colors">
              +新增参数
            </button>
            <button onClick={addCol} className="flex-1 h-9 text-[12px] text-mut hover:text-pri transition-colors">
              +新增尺码
            </button>
          </div>
        </div>
      </div>
    )
}

/* ============================================================
   阶段二：AI工艺单文件（工艺单文档）
   ============================================================ */
/* ============================================================
   成衣价格核算模块（可整体在「单内」与「右侧边栏」间移动）
   单内：默认位置，随 PDF 一起下载；侧边栏：功能完全不变，不计入 PDF
   ============================================================ */
function CostModule({ sheet, update, showToast, aside = false, entering = false, onToggleAside }: {
  sheet: Sheet
  update: (fn: (s: Sheet) => Sheet) => void
  showToast: (m: string) => void
  aside?: boolean // 侧边模式：仅压缩行宽与间距，所有功能不变
  entering?: boolean // 飞回动效进行中：先隐身，幽灵卡片到位后淡入
  onToggleAside: () => void
}) {
  /* 样衣价格核算：版片测算 → 面料/辅料/加工费 → 合计 */
  const num = (v: string) => parseFloat(v) || 0
  const costW = num(sheet.cost.width) || 1.5
  const costLoss = num(sheet.cost.loss)
  const suggestUsage = +(PIECE_STATS.area / costW * (1 + costLoss / 100)).toFixed(2)
  const fabricSubs = sheet.fabrics.map((f) => num(f.price) * num(f.usage || String(suggestUsage)))
  const accSubs = sheet.accessories.map((a) => num(a.price) * num(a.qty))
  const seamSub = PIECE_STATS.seams * num(sheet.cost.seam)
  const pocketSub = PIECE_STATS.pockets * num(sheet.cost.pocket)
  const fabricTotal = fabricSubs.reduce((t, x) => t + x, 0)
  const accTotal = accSubs.reduce((t, x) => t + x, 0)
  const extraSubs = sheet.extras.map((x) => num(x.qty) * num(x.price))
  const workTotal = seamSub + pocketSub + extraSubs.reduce((t, x) => t + x, 0)
  const grandTotal = fabricTotal + accTotal + workTotal
  const yuan = (n: number) => `¥${n.toFixed(2)}`

  /* 新增品类：入库 → 调取对应工艺做法计价（模拟后端工艺库）→ 自动选中并重算 */
  const [addingCat, setAddingCat] = useState(false)
  const [newCat, setNewCat] = useState('')
  const confirmAddCat = () => {
    const name = newCat.trim()
    setAddingCat(false)
    setNewCat('')
    if (!name) return
    if (allCategories().includes(name)) {
      showToast(`「${name}」已在品类库中，直接选择即可`)
      return
    }
    const ref = guessCategory(name) // 按名称匹配最接近的工艺做法
    const rp = CATEGORY_PRESETS[ref]
    CUSTOM_CATEGORIES.push(name)
    CUSTOM_PRESETS[name] = { ...rp, note: `新增品类 · 已调取工艺库「${ref}」工艺做法计价` }
    update((s) => ({ ...s, category: name, cost: { ...s.cost, seam: rp.seam, pocket: rp.pocket, loss: rp.loss } }))
    showToast(`已新增「${name}」品类，并调取对应工艺做法计算单价`)
  }

  /* 模块主体：单内 / 侧边两种位置共用，仅通过 aside 压缩尺寸 */
  const body = (
    <>
              {/* 品类：与上方工艺单标注联动，不同品类计价方式不同 */}
              <div className="flex items-center gap-2.5">
                <span className="text-[12px] text-ink-2 shrink-0">品类</span>
                <div className="flex flex-wrap gap-1.5">
                  {allCategories().map((c) => (
                    <button
                      key={c}
                      onClick={() => {
                        const preset = presetOf(c)
                        update((s) => ({ ...s, category: c, cost: preset ? { ...s.cost, seam: preset.seam, pocket: preset.pocket, loss: preset.loss } : s.cost }))
                        showToast(`已切换「${c}」品类，按该品类计价方式重算`)
                      }}
                      className={`h-7 px-2.5 rounded-full border text-[12px] transition-colors ${
                        sheet.category === c ? 'bg-pri text-white border-pri' : 'bg-panel border-line text-ink-2 hover:border-pri/50 hover:text-pri'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                  {addingCat ? (
                    <span className="inline-flex items-center gap-1 h-7">
                      <input
                        autoFocus
                        value={newCat}
                        onChange={(e) => setNewCat(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') confirmAddCat(); if (e.key === 'Escape') { setAddingCat(false); setNewCat('') } }}
                        onBlur={confirmAddCat}
                        placeholder="新品类名称"
                        className="h-7 w-24 px-2.5 rounded-full border border-pri/50 bg-panel text-[12px] text-ink outline-none placeholder:text-mut-3"
                      />
                    </span>
                  ) : (
                    <button
                      onClick={() => setAddingCat(true)}
                      title="新增品类：入库后调取对应工艺做法计算单价"
                      className="h-7 px-2.5 rounded-full border border-dashed border-line text-[12px] text-mut hover:border-pri/50 hover:text-pri transition-colors inline-flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> 新增品类
                    </button>
                  )}
                </div>
                <span className="ml-auto text-[11px] text-mut-3">{presetOf(sheet.category)?.note ?? '自定义品类暂按大衣计价'}</span>
              </div>
              {/* 测算依据：版片数量 / 面积 / 合缝 / 口袋 + 幅宽损耗 */}
              <div className="mt-3 rounded-lg border border-line-soft bg-fill/50 px-4 py-3">
                <div className="flex items-center gap-1.5 text-[11.5px] text-mut">
                  <Calculator className="w-3.5 h-3.5" />
                  测算依据：来自关联版片的数量、面积与合缝测算（可追溯）
                  <span className="ml-auto">关联版片：{sheet.patternNo || '未关联 · 演示数据'}</span>
                </div>
                <div className={`mt-2.5 grid gap-3 ${aside ? 'grid-cols-3' : 'grid-cols-6'}`}>
                  {([
                    ['版片数量', `${PIECE_STATS.pieces} 片`],
                    ['版片总面积', `${PIECE_STATS.area} ㎡`],
                    ['合缝', `${PIECE_STATS.seams} 条`],
                    ['口袋', `${PIECE_STATS.pockets} 个`],
                  ] as const).map(([label, val]) => (
                    <div key={label} className="rounded-md border border-line bg-panel px-2 py-1.5 text-center">
                      <div className="text-[10.5px] text-mut">{label}</div>
                      <div className="text-[13px] font-semibold text-ink mt-0.5">{val}</div>
                    </div>
                  ))}
                  {([
                    ['幅宽 (m)', 'width', '1.5'],
                    ['损耗 (%)', 'loss', '10'],
                  ] as const).map(([label, key, ph]) => (
                    <label key={key} className="rounded-md border border-line bg-panel px-2 py-1.5 text-center block">
                      <span className="text-[10.5px] text-mut">{label}</span>
                      <input
                        value={sheet.cost[key]}
                        onChange={(e) => update((s) => ({ ...s, cost: { ...s.cost, [key]: e.target.value } }))}
                        placeholder={ph}
                        title="点击修改，全模块自动重算"
                        className="w-full bg-transparent outline-none text-center text-[13px] font-semibold text-ink mt-0.5 placeholder:text-mut-3 border-b border-dashed border-line-strong"
                      />
                    </label>
                  ))}
                </div>
              </div>

              {/* 面料费用：与面料卡双向同步，行内即改即算（统一交互） */}
              <div className="mt-4 flex items-center text-[11.5px] text-mut">
                面料费用（用量、单价取自面料卡，即改即算）
                <span className="ml-auto text-[10.5px] text-mut-3">增删面料请用上方「补充面料」卡片</span>
              </div>
              {sheet.fabrics.length === 0 && (
                <div className="mt-2 py-3 text-center text-[12px] text-mut-3 border border-dashed border-line rounded-lg">
                  暂无面料，点击上方「补充面料」后自动纳入核算
                </div>
              )}
              {sheet.fabrics.map((f, fi) => (
                <div key={f.id} className={`flex items-center ${aside ? 'gap-1.5' : 'gap-3'} h-12 border-b border-line-soft last:border-b-0`}>
                  <span className={`${aside ? 'w-12 text-[12px]' : 'w-16 text-[12.5px]'} shrink-0 font-medium text-ink`}>{f.tag}</span>
                  <span className={`shrink-0 h-5 ${aside ? 'px-1' : 'px-1.5'} rounded bg-fill text-[10.5px] text-mut inline-flex items-center`}>来源：面料卡</span>
                  <span className="flex-1" />
                  <span
                    className={`flex h-8 ${aside ? 'w-20' : 'w-24'} rounded-md border border-line overflow-hidden shrink-0`}
                    title={`建议用量 = 版片总面积 ${PIECE_STATS.area}㎡ ÷ 幅宽 ${costW}m × (1+损耗 ${costLoss}%) ≈ ${suggestUsage} 米；填入后以面料卡用量为准`}
                  >
                    <DocInput
                      value={f.usage}
                      onChange={(v) => update((s) => ({ ...s, fabrics: s.fabrics.map((x) => (x.id === f.id ? { ...x, usage: v } : x)) }))}
                      placeholder={`${suggestUsage}`}
                      className="h-8 px-2"
                    />
                    <span className="px-1.5 h-8 inline-flex items-center text-[11px] text-mut bg-fill border-l border-line shrink-0">米</span>
                  </span>
                  {!aside && !f.usage && <span className="text-[10.5px] text-mut-3 shrink-0 -ml-1.5">版片建议</span>}
                  <span className="text-mut-3 text-[12px]">×</span>
                  <span className={`flex h-8 ${aside ? 'w-24' : 'w-28'} rounded-md border border-line overflow-hidden shrink-0`}>
                    <DocInput
                      value={f.price}
                      onChange={(v) => update((s) => ({ ...s, fabrics: s.fabrics.map((x) => (x.id === f.id ? { ...x, price: v } : x)) }))}
                      placeholder="单价"
                      className="h-8 px-2"
                    />
                    <span className="px-1.5 h-8 inline-flex items-center text-[11px] text-mut bg-fill border-l border-line shrink-0">元/米</span>
                  </span>
                  <span className="text-mut-3 text-[12px]">=</span>
                  <span className={`${aside ? 'w-16 text-[12px]' : 'w-20 text-[13px]'} text-right font-semibold text-ink shrink-0`}>{yuan(fabricSubs[fi])}</span>
                  <span className={`${aside ? 'w-5' : 'w-6'} shrink-0`} />
                </div>
              ))}
              {/* 辅料费用：与辅料卡双向同步，行内即改即算（统一交互） */}
              <div className="mt-4 flex items-center text-[11.5px] text-mut">
                辅料费用（数量、单价取自辅料卡，即改即算）
                <span className="ml-auto text-[10.5px] text-mut-3">增删辅料请用上方「补充辅料」卡片</span>
              </div>
              {sheet.accessories.length === 0 && (
                <div className="mt-2 py-3 text-center text-[12px] text-mut-3 border border-dashed border-line rounded-lg">
                  暂无辅料，点击上方「补充辅料」后自动纳入核算
                </div>
              )}
              {sheet.accessories.map((a, ai) => (
                <div key={a.id} className={`flex items-center ${aside ? 'gap-1.5' : 'gap-3'} h-12 border-b border-line-soft last:border-b-0`}>
                  <span className={`${aside ? 'w-12 text-[12px]' : 'w-16 text-[12.5px]'} shrink-0 font-medium text-ink`}>辅料{ai + 1}</span>
                  <span className={`shrink-0 h-5 ${aside ? 'px-1' : 'px-1.5'} rounded bg-fill text-[10.5px] text-mut inline-flex items-center`}>
                    来源：辅料卡{a.part ? ` · ${a.part}` : ''}
                  </span>
                  <span className="flex-1" />
                  <span className={`flex h-8 ${aside ? 'w-20' : 'w-24'} rounded-md border border-line overflow-hidden shrink-0`}>
                    <DocInput
                      value={a.qty}
                      onChange={(v) => update((s) => ({ ...s, accessories: s.accessories.map((x) => (x.id === a.id ? { ...x, qty: v } : x)) }))}
                      placeholder="数量"
                      className="h-8 px-2"
                    />
                    <span className="px-1.5 h-8 inline-flex items-center text-[11px] text-mut bg-fill border-l border-line shrink-0">个</span>
                  </span>
                  <span className="text-mut-3 text-[12px]">×</span>
                  <span className={`flex h-8 ${aside ? 'w-24' : 'w-28'} rounded-md border border-line overflow-hidden shrink-0`}>
                    <DocInput
                      value={a.price}
                      onChange={(v) => update((s) => ({ ...s, accessories: s.accessories.map((x) => (x.id === a.id ? { ...x, price: v } : x)) }))}
                      placeholder="单价"
                      className="h-8 px-2"
                    />
                    <span className="px-1.5 h-8 inline-flex items-center text-[11px] text-mut bg-fill border-l border-line shrink-0">{a.unit}</span>
                  </span>
                  <span className="text-mut-3 text-[12px]">=</span>
                  <span className={`${aside ? 'w-16 text-[12px]' : 'w-20 text-[13px]'} text-right font-semibold text-ink shrink-0`}>{yuan(accSubs[ai])}</span>
                  <span className={`${aside ? 'w-5' : 'w-6'} shrink-0`} />
                </div>
              ))}
              {/* 加工费：合缝 / 口袋按版片测算条数计；支持自定义工艺费（增删改） */}
              <div className="mt-4 text-[11.5px] text-mut">加工费（数量由版片合缝、口袋测算得出，可新增个性化工艺费）</div>
              {([
                ['合缝加工', '版片合缝测算', `${PIECE_STATS.seams} 条`, 'seam', '元/条', seamSub],
                ['口袋加工', '版片口袋测算', `${PIECE_STATS.pockets} 个`, 'pocket', '元/个', pocketSub],
              ] as const).map(([name, src, count, key, unit, sub]) => (
                <div key={key} className={`flex items-center ${aside ? 'gap-1.5' : 'gap-3'} h-12 border-b border-line-soft last:border-b-0`}>
                  <span className={`${aside ? 'w-12 text-[12px]' : 'w-16 text-[12.5px]'} shrink-0 font-medium text-ink`}>{name}</span>
                  <span className={`shrink-0 h-5 ${aside ? 'px-1' : 'px-1.5'} rounded bg-fill text-[10.5px] text-mut inline-flex items-center`}>来源：{src}</span>
                  <span className="flex-1" />
                  <span className="text-[12px] text-ink-2 shrink-0">{count} ×</span>
                  <span className={`flex h-8 ${aside ? 'w-24' : 'w-28'} rounded-md border border-line overflow-hidden shrink-0`}>
                    <DocInput
                      value={sheet.cost[key]}
                      onChange={(v) => update((s) => ({ ...s, cost: { ...s.cost, [key]: v } }))}
                      placeholder="单价"
                      className="h-8 px-2"
                    />
                    <span className="px-1.5 h-8 inline-flex items-center text-[11px] text-mut bg-fill border-l border-line shrink-0">{unit}</span>
                  </span>
                  <span className="text-mut-3 text-[12px]">=</span>
                  <span className={`${aside ? 'w-16 text-[12px]' : 'w-20 text-[13px]'} text-right font-semibold text-ink shrink-0`}>{yuan(sub)}</span>
                  <span className={`${aside ? 'w-5' : 'w-6'} shrink-0`} />
                </div>
              ))}
              {/* 自定义工艺费行：与系统行同款交互——名称/数量无边框即改，单价同款输入框，行尾常驻 × 删除 */}
              {sheet.extras.map((x, xi) => (
                <div key={x.id} className={`flex items-center ${aside ? 'gap-1.5' : 'gap-3'} h-12 border-b border-line-soft`}>
                  <span className={`${aside ? 'w-12' : 'w-16'} shrink-0`}>
                    <DocInput
                      value={x.name}
                      onChange={(v) => update((s) => ({ ...s, extras: s.extras.map((y) => (y.id === x.id ? { ...y, name: v } : y)) }))}
                      placeholder="工艺名称"
                      className="h-8 text-[12.5px] font-medium text-ink placeholder:font-normal placeholder:text-mut-3"
                    />
                  </span>
                  <span className={`shrink-0 h-5 ${aside ? 'px-1' : 'px-1.5'} rounded bg-pri-soft text-[10.5px] text-pri inline-flex items-center`}>来源：自定义</span>
                  <span className="flex-1" />
                  <span className={`flex h-8 ${aside ? 'w-20' : 'w-24'} rounded-md border border-line overflow-hidden shrink-0`}>
                    <DocInput
                      value={x.qty}
                      onChange={(v) => update((s) => ({ ...s, extras: s.extras.map((y) => (y.id === x.id ? { ...y, qty: v } : y)) }))}
                      placeholder="数量"
                      className="h-8 px-2"
                    />
                    <span className="px-1.5 h-8 inline-flex items-center text-[11px] text-mut bg-fill border-l border-line shrink-0">项</span>
                  </span>
                  <span className="text-mut-3 text-[12px]">×</span>
                  <span className={`flex h-8 ${aside ? 'w-24' : 'w-28'} rounded-md border border-line overflow-hidden shrink-0`}>
                    <DocInput
                      value={x.price}
                      onChange={(v) => update((s) => ({ ...s, extras: s.extras.map((y) => (y.id === x.id ? { ...y, price: v } : y)) }))}
                      placeholder="单价"
                      className="h-8 px-2"
                    />
                    <span className="px-1.5 h-8 inline-flex items-center text-[11px] text-mut bg-fill border-l border-line shrink-0">元/项</span>
                  </span>
                  <span className="text-mut-3 text-[12px]">=</span>
                  <span className={`${aside ? 'w-16 text-[12px]' : 'w-20 text-[13px]'} text-right font-semibold text-ink shrink-0`}>{yuan(extraSubs[xi])}</span>
                  <button
                    onClick={() => update((s) => ({ ...s, extras: s.extras.filter((y) => y.id !== x.id) }))}
                    title="删除该工艺费"
                    className="w-6 h-6 rounded-full flex items-center justify-center text-mut-3 hover:text-err hover:bg-err/10 transition-colors shrink-0"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button
                onClick={() => update((s) => ({ ...s, extras: [...s.extras, { id: nid(), name: '', qty: '', price: '' }] }))}
                className="mt-1.5 w-full h-9 rounded-lg border border-dashed border-line-strong text-[12px] text-mut hover:border-pri/60 hover:text-pri hover:bg-pri-soft/30 transition-colors inline-flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                新增工艺费（个性化计价项）
              </button>

              {/* 合计 */}
              <div className={`mt-4 rounded-lg border border-pri/30 bg-pri-soft/50 px-4 py-3 flex items-center gap-2 text-[12.5px] text-ink-2 ${aside ? 'flex-wrap' : ''}`}>
                <span>面料 {yuan(fabricTotal)}</span>
                <span className="text-mut-3">+</span>
                <span>辅料 {yuan(accTotal)}</span>
                <span className="text-mut-3">+</span>
                <span>加工费 {yuan(workTotal)}</span>
                <span className="ml-auto text-[12px] text-mut">样衣估价</span>
                <span className="text-[20px] font-bold text-pri leading-none">{yuan(grandTotal)}</span>
              </div>
              <div className="mt-2 text-[11px] text-mut-3">
                价格来源明确：单价取自面料 / 辅料卡片，用量由关联版片的数量、面积与合缝测算得出；合缝 / 口袋为版片测算项（可改单价），自定义工艺费可增删改，修改任一处即自动重算，全程可追溯。
              </div>
    </>
  )

  if (aside) {
    return (
      <div className="px-4 py-4">
        <div className="mb-3 rounded-lg border border-warn/30 bg-warn/5 px-3 py-2 text-[11px] leading-relaxed text-mut">
          侧边呈现模式：功能与单内完全一致；下载 PDF 时不包含此模块
        </div>
        {body}
      </div>
    )
  }
  return (
    <div data-cost-indoc className={`border-t border-line-doc order-7${entering ? ' opacity-0 transition-opacity duration-200' : ' cost-module-anim'}`}>
      <div className="relative h-10 bg-fill border-b border-line-doc flex items-center justify-center text-[13px] font-medium tracking-[0.4em] text-ink-2">
        成衣价格核算
        <button
          onClick={onToggleAside}
          title="移至右侧边栏呈现：功能不变，下载 PDF 时不包含此模块"
          className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 h-7 px-2.5 rounded-md border border-line bg-panel text-[11.5px] tracking-normal text-ink-2 hover:border-pri/50 hover:text-pri transition-colors"
        >
          <PanelRight className="w-3.5 h-3.5" />移到侧边
        </button>
      </div>
      <div className="px-7 py-5">{body}</div>
    </div>
  )
}

/* 侧边栏卡片初始大小与位置：每次移到侧边均恢复此默认值——自动适应空间布局：
   宽度按视口减去工艺单占位（1050）与两侧留白自适应（360–560 区间），工艺单相应左移让出空间 */
const defaultPanelRect = () => {
  const width = Math.min(560, Math.max(360, window.innerWidth - 1050 - 72))
  return {
    left: window.innerWidth - width - 24,
    top: 84,
    width,
    height: window.innerHeight - 108,
  }
}

function DocStage({
  sheets,
  setSheets,
  showToast,
  onBack,
}: {
  sheets: Sheet[]
  setSheets: (fn: (s: Sheet[]) => Sheet[]) => void
  showToast: (m: string) => void
  onBack: () => void
}) {
  const [active, setActive] = useState(0)
  const [selCraft, setSelCraft] = useState<number | null>(null)
  const [pinEditor, setPinEditor] = useState<number | null>(null) // 钉点「输入选择框」打开中的工艺行 id
  const [pinArmed, setPinArmed] = useState<'front' | 'back' | null>(null) // 钉点模式：激活中才可点击款式图放置钉点
  const [bleedOpen, setBleedOpen] = useState(false) // 出血位调节弹层

  /* 价格核算位置切换：单内（随 PDF 下载）⇄ 右侧边栏（不计入 PDF），功能完全不变
     飞入飞出动效：幽灵卡片按源位置 → 目标位置飞行（移到侧边由大到小，放回单内由小到大） */
  const [flight, setFlight] = useState<{
    from: { x: number; y: number; w: number; h: number }
    to: { x: number; y: number; w: number; h: number }
    dir: 'aside' | 'back'
  } | null>(null)
  const toggleCostAside = () => {
    if (flight) return // 动效进行中忽略重复点击
    const rectOf = (sel: string) => {
      const r = document.querySelector(sel)?.getBoundingClientRect()
      return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null
    }
    if (!sheet.costAside) {
      const from = rectOf('[data-cost-indoc]')
      if (from) {
        const target = defaultPanelRect() // 移到侧边：恢复初始大小与位置（自适应空间布局）
        setPanelRect(target)
        setPanelDocked(true) // 恢复吸附：工艺单左移让位
        setFlight({ from, to: { x: target.left, y: target.top, w: target.width, h: target.height }, dir: 'aside' })
        showToast('价格核算已移至右侧边栏，工艺单已左移让位；下载 PDF 时不包含此模块')
        update((st) => ({ ...st, costAside: true }))
        window.setTimeout(() => setFlight(null), 400)
        return
      }
    } else {
      const from = rectOf('[data-cost-panel]')
      const to = rectOf('[data-cost-placeholder]')
      if (from && to) {
        setFlight({ from, to, dir: 'back' })
        showToast('价格核算已放回单内，将随 PDF 一起下载')
        update((st) => ({ ...st, costAside: false }))
        window.setTimeout(() => setFlight(null), 400)
        return
      }
    }
    /* 兜底：无法测量时直接切换 */
    showToast(sheet.costAside ? '价格核算已放回单内，将随 PDF 一起下载' : '价格核算已移至右侧边栏，下载 PDF 时不包含此模块')
    update((st) => ({ ...st, costAside: !st.costAside }))
  }

  /* 侧边栏卡片：标题栏拖拽移动（限制在可视范围内）＋ 左下角拉大缩小 */
  const [panelRect, setPanelRect] = useState(() => defaultPanelRect())
  /* 吸附布局：移到侧边后工艺单自动左移让位、卡片自适应右侧空间；用户拖拽移动卡片后解除吸附，文档回中 */
  const [panelDocked, setPanelDocked] = useState(true)
  const panelDragRef = useRef<{ mode: 'move' | 'resize' | 'resize-r'; sx: number; sy: number; rect: typeof panelRect } | null>(null)
  const onPanelMouseDown = (e: ReactMouseEvent, mode: 'move' | 'resize' | 'resize-r') => {
    e.preventDefault()
    if (mode === 'move') setPanelDocked(false) // 手动移动卡片 = 解除吸附，工艺单回到居中
    panelDragRef.current = { mode, sx: e.clientX, sy: e.clientY, rect: { ...panelRect } }
    const onMove = (ev: MouseEvent) => {
      const d = panelDragRef.current
      if (!d) return
      const dx = ev.clientX - d.sx
      const dy = ev.clientY - d.sy
      if (d.mode === 'move') {
        /* 移动范围：横向至少保留 120px 可见，纵向不越过顶栏、不拖出底部 */
        const left = Math.min(Math.max(d.rect.left + dx, -(d.rect.width - 120)), window.innerWidth - 120)
        const maxTop = Math.max(52, window.innerHeight - d.rect.height - 8)
        const top = Math.min(Math.max(d.rect.top + dy, 52), maxTop)
        setPanelRect({ ...d.rect, left, top })
      } else if (d.mode === 'resize-r') {
        /* 右下角缩放：右缘 / 底边跟随鼠标（左缘与顶边固定），限制最小/最大尺寸且不超出屏幕 */
        const width = Math.min(Math.max(d.rect.width + dx, 360), window.innerWidth - d.rect.left - 8)
        const height = Math.min(Math.max(d.rect.height + dy, 320), window.innerHeight - d.rect.top - 8)
        setPanelRect({ ...d.rect, width, height })
      } else {
        /* 左下角缩放：左边缘跟随鼠标（右缘固定），向下拖变高；限制最小/最大尺寸且不超出屏幕 */
        const dl = Math.min(Math.max(dx, 8 - d.rect.left), d.rect.width - 360)
        const height = Math.min(Math.max(d.rect.height + dy, 320), window.innerHeight - d.rect.top - 8)
        setPanelRect({ ...d.rect, left: d.rect.left + dl, width: d.rect.width - dl, height })
      }
    }
    const onUp = () => {
      panelDragRef.current = null
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }
  const [pdfBusy, setPdfBusy] = useState(false)
  const docRef = useRef<HTMLDivElement>(null)
  const sheet = sheets[active]
  /* 工艺单左移让位量：吸附态下文档区右侧让出卡片宽度 + 间距，卡片随缩放实时适配空间 */
  const dockPad = sheet.costAside && panelDocked ? panelRect.width + 24 : 0

  const update = (fn: (s: Sheet) => Sheet) => setSheets((ss) => ss.map((s, i) => (i === active ? fn(s) : s)))

  /* 钉点编号 = 其工艺说明行的序号 */
  const craftNo = (id: number) => sheet.crafts.findIndex((c) => c.id === id) + 1

  /* 点击款式图：添加钉点并联动新增工艺说明行 */
  const addPin = (e: React.MouseEvent<HTMLDivElement>, img: 'front' | 'back') => {
    const r = e.currentTarget.getBoundingClientRect()
    const x = +(((e.clientX - r.left) / r.width) * 100).toFixed(1)
    const y = +(((e.clientY - r.top) / r.height) * 100).toFixed(1)
    const id = nid()
    update((s) => ({ ...s, crafts: [...s.crafts, { id, part: '', craft: '', desc: '', imgs: [], pin: { img, x, y } }] }))
    setSelCraft(id)
    setPinEditor(id)
    showToast('已添加部位钉点，请在弹窗中完善并同步工艺说明')
  }

  const removeCraft = (id: number) => {
    update((s) => ({ ...s, crafts: s.crafts.filter((c) => c.id !== id) }))
    setSelCraft((v) => (v === id ? null : v))
    setPinEditor((v) => (v === id ? null : v))
  }

  const selectCraft = (id: number) => {
    setSelCraft(id)
    setPinEditor(id) // 点击钉点：打开「输入选择框」
    document.getElementById(`craft-row-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  const pinCtx: PinCtx = { sheet, pinEditor, pinArmed, setPinArmed, selCraft, update, setPinEditor, addPin, selectCraft, removeCraft, craftNo, showToast }

  /* 导出 A4 幅面 PDF：整单按 A4 宽度等比缩放，超出部分自动分页 */
  const exportPdf = async () => {
    if (pdfBusy || !docRef.current) return
    setPinEditor(null) // 收起弹层，保持版面干净
    setPinArmed(null) // 退出钉点模式，避免提示条进入 PDF
    setPdfBusy(true) // pdf-shot：隐藏按钮/手柄等交互控件
    showToast('正在生成 A4 工艺单 PDF…')
    await new Promise((r) => window.setTimeout(r, 120))
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import('html2canvas'), import('jspdf')])
      const canvas = await html2canvas(docRef.current!, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
      const pageW = 210
      const pageH = 297
      const slicePx = (pageH / pageW) * canvas.width // 一页对应的画布像素高度
      let y = 0
      let first = true
      while (y < canvas.height) {
        const h = Math.min(slicePx, canvas.height - y)
        const part = document.createElement('canvas')
        part.width = canvas.width
        part.height = Math.ceil(h)
        const cx = part.getContext('2d')!
        cx.fillStyle = '#ffffff'
        cx.fillRect(0, 0, part.width, part.height)
        cx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)
        if (!first) pdf.addPage()
        pdf.addImage(part.toDataURL('image/jpeg', 0.92), 'JPEG', 0, 0, pageW, (h / canvas.width) * pageW)
        y += h
        first = false
      }
      const name = `工艺单${sheet.styleNo ? `-${sheet.styleNo}` : ''}${sheet.styleName ? `-${sheet.styleName}` : ''}.pdf`
      /* 自建下载锚点，确保中文文件名生效 */
      const blob = pdf.output('blob')
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = name
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      showToast('PDF 已下载（A4 幅面）')
    } catch (err) {
      console.error(err)
      showToast('PDF 导出失败，请重试')
    } finally {
      setPdfBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-cvs flex flex-col">
      {/* ===== 顶栏 ===== */}
      <div className="h-14 shrink-0 bg-panel border-b border-line flex items-center px-4 gap-2.5">
        <button
          onClick={onBack}
          title="返回工作台"
          className="w-8 h-8 rounded-lg flex items-center justify-center text-mut hover:text-ink hover:bg-fill transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <img src="/logo.png" alt="画衣衣" className="w-7 h-7 rounded-lg" />
        <button className="flex items-center gap-1 text-[14px] font-medium text-ink hover:text-pri transition-colors">
          AI工艺单文件
          <ChevronDown className="w-3.5 h-3.5 text-mut" />
        </button>
        <span className="ml-auto" />
        {/* 排版切换：图片区 / 参数区 / 工艺区 / 面辅料区以不同位置与大小排列 */}
        <div className="flex items-center gap-1.5 mr-1">
          <span className="text-[11.5px] text-mut mr-0.5">排版</span>
          {([
            ['A', '经典', Columns2, '排版A：图片左 · 参数右'],
            ['B', '侧栏', PanelLeft, '排版B：参数左 · 图片右，工艺区上移'],
            ['C', '通栏', LayoutGrid, '排版C：大图置顶 · 参数横排四列'],
          ] as const).map(([k, label, Icon, tip]) => (
            <button
              key={k}
              onClick={() => update((s) => ({ ...s, layout: k }))}
              title={tip}
              className={`h-8 px-2.5 rounded-lg border text-[12px] inline-flex items-center gap-1.5 transition-colors ${
                sheet.layout === k ? 'bg-pri text-white border-pri' : 'bg-panel border-line text-ink-2 hover:border-pri/50 hover:text-pri'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
        {/* 出血位：白色底框为 A4 宽度（210mm≈1050px，5px/mm），工艺单内容距裁切边留出出血位，大小可调 */}
        <div className="relative mr-1">
          <button
            onClick={() => setBleedOpen((v) => !v)}
            title="出血位：工艺单内容距 A4 裁切边的距离，点击调节大小"
            className={`h-8 px-2.5 rounded-lg border text-[12px] inline-flex items-center gap-1.5 transition-colors ${
              bleedOpen ? 'bg-pri text-white border-pri' : 'bg-panel border-line text-ink-2 hover:border-pri/50 hover:text-pri'
            }`}
          >
            <BoxSelect className="w-3.5 h-3.5" />
            出血 {sheet.bleed}mm
            <ChevronDown className="w-3 h-3 opacity-60" />
          </button>
          {bleedOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setBleedOpen(false)} />
              <div className="absolute right-0 top-10 z-50 w-64 rounded-xl border border-line bg-panel p-3.5">
                <div className="flex items-center text-[12.5px] font-medium text-ink">
                  出血位（裁切安全边距）
                  <span className="ml-auto text-pri font-semibold">{sheet.bleed}mm</span>
                </div>
                <input
                  type="range" min={0} max={10} step={1} value={sheet.bleed}
                  onChange={(e) => update((s) => ({ ...s, bleed: +e.target.value }))}
                  className="mt-3 w-full accent-pri"
                />
                <div className="mt-1.5 flex gap-1.5">
                  {[0, 3, 5, 8, 10].map((v) => (
                    <button
                      key={v}
                      onClick={() => update((s) => ({ ...s, bleed: v }))}
                      className={`flex-1 h-7 rounded-md border text-[11.5px] transition-colors ${
                        sheet.bleed === v ? 'bg-pri text-white border-pri' : 'border-line text-ink-2 hover:border-pri/50 hover:text-pri'
                      }`}
                    >
                      {v}mm
                    </button>
                  ))}
                </div>
                <div className="mt-3 border-t border-line-soft pt-2.5 text-[11px] leading-relaxed text-mut-3">
                  白色底框为 A4 宽度（210mm）；红色虚线为出血参考线，工艺单内容距裁切边 {sheet.bleed}mm，导出 PDF 同步生效。
                </div>
              </div>
            </>
          )}
        </div>
        <button
          onClick={exportPdf}
          disabled={pdfBusy}
          title={pdfBusy ? '正在生成 PDF…' : '下载工艺单（A4 幅面 PDF）'}
          className="w-9 h-9 rounded-lg border border-line flex items-center justify-center text-mut hover:text-ink hover:border-line-strong transition-colors disabled:opacity-50"
        >
          <Download className={`w-4 h-4${pdfBusy ? ' animate-bounce' : ''}`} />
        </button>
        <button
          onClick={() => showToast('样衣下单已提交，工厂将在 24h 内响应（原型演示）')}
          className="h-9 px-4 rounded-lg bg-pri text-white text-[13px] font-medium hover:bg-pri-hover transition-colors"
        >
          下单样衣
        </button>
      </div>

      {/* ===== 文档区 ===== */}
      <div className="flex-1 overflow-y-auto overflow-x-auto">
        {sheets.length > 1 && (
          <div className="w-max min-w-full mx-auto pt-5 transition-[padding] duration-300" style={{ paddingLeft: 24, paddingRight: 24 + dockPad }}>
            <div className="w-[1050px] flex items-center gap-2">
            {sheets.map((s, i) => (
              <button
                key={i}
                onClick={() => { setActive(i); setSelCraft(null) }}
                className={`h-8 px-3.5 rounded-full border text-[12.5px] transition-colors ${
                  active === i ? 'bg-ink text-panel border-ink' : 'bg-panel border-line text-ink-2 hover:border-ink/40'
                }`}
              >
                工艺单 {i + 1}{s.styleName ? ` · ${s.styleName}` : ''}
              </button>
            ))}
            </div>
          </div>
        )}
        <div className="w-max min-w-full mx-auto pt-5 pb-24 transition-[padding] duration-300" style={{ paddingLeft: 24, paddingRight: 24 + dockPad }}>
          <div ref={docRef} className={`relative w-[1050px] max-w-full mx-auto bg-panel${pdfBusy ? ' pdf-shot' : ''}`}>
            {/* 出血位参考线：仅在激活右上角出血功能键时亮起（红色虚线框标示内容安全区），导出 PDF 时隐藏 */}
            {sheet.bleed > 0 && bleedOpen && (
              <div className="bleed-guide pointer-events-none absolute z-10 border border-dashed border-err/60" style={{ inset: sheet.bleed * 5 }}>
                <span className="absolute -top-0.5 left-2 -translate-y-full rounded bg-panel px-1 text-[10px] text-err/80">出血 {sheet.bleed}mm</span>
              </div>
            )}
            {/* 出血位内边距：工艺单内容整体内缩 bleed mm */}
            <div style={{ padding: sheet.bleed * 5 }}>
            {/* 文头 */}
            <div className="flex items-center px-7 pt-5">
              <span className="flex items-center gap-1.5">
                <img src="/logo.png" alt="" className="w-5 h-5 rounded" />
                <span className="text-[11px] font-semibold text-ink leading-none">画衣衣</span>
              </span>
              <span className="ml-auto text-[11px] tracking-[0.3em] text-mut">工 艺 单 信 息</span>
            </div>
            <div className="mx-7 mt-4 border-b border-dashed border-line" />
            <h1 className="text-center text-[24px] font-bold text-ink py-6">工艺单</h1>

            {/* ===== 闭集外框：款号信息 → 款式图/参数 → 参考图 → 工艺说明 → 面辅料 ===== */}
            <div className="border border-line-doc flex flex-col">
            {/* 款号信息表（与闭集外框齐平） */}
            <div className="grid grid-cols-[76px_1fr_76px_1fr_88px_1fr_70px_1fr] border-b border-line-doc">
              <div className="h-11 flex items-center justify-center border-r border-line-doc bg-fill text-[12.5px] font-medium text-ink-2">款号</div>
              <div className="h-11 flex items-center px-3 border-r border-line-doc">
                <DocInput value={sheet.styleNo} onChange={(v) => update((s) => ({ ...s, styleNo: v }))} placeholder="请输入款号" />
              </div>
              <div className="h-11 flex items-center justify-center border-r border-line-doc bg-fill text-[12.5px] font-medium text-ink-2">款名</div>
              <div className="h-11 flex items-center px-3 border-r border-line-doc">
                <DocInput value={sheet.styleName} onChange={(v) => update((s) => ({ ...s, styleName: v }))} placeholder="请输入款名" />
              </div>
              <div className="h-11 flex items-center justify-center border-r border-line-doc bg-fill text-[12.5px] font-medium text-ink-2">关联版片</div>
              <div className="h-11 flex items-center pl-3 pr-2 border-r border-line-doc gap-1">
                <DocInput value={sheet.patternNo} onChange={(v) => update((s) => ({ ...s, patternNo: v }))} placeholder="请输入关联版号" />
                <button onClick={() => showToast('从打版文件关联版片（原型演示）')} title="关联版片" className="shrink-0 text-pri hover:text-pri-hover transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="h-11 flex items-center justify-center border-r border-line-doc bg-fill text-[12.5px] font-medium text-ink-2">日期</div>
              <div className="h-11 flex items-center pl-3 pr-2 gap-1">
                <DocInput value={sheet.date} onChange={(v) => update((s) => ({ ...s, date: v }))} placeholder="YYYY-MM-DD" />
                <Calendar className="w-3.5 h-3.5 shrink-0 text-mut-3" />
              </div>
            </div>

            {/* 款式图 + 尺码参数（三种排版：A 经典 / B 侧栏 / C 通栏） */}
            {sheet.layout === 'C' ? (
              <>
                <div className="flex gap-5 px-7 pt-5">
                  <PinImageView ctx={pinCtx} img={sheet.front} side="front" caption="款式正面图" boost={70} />
                  <PinImageView ctx={pinCtx} img={sheet.back} side="back" caption="款式背面图" boost={70} />
                </div>
                <div className="px-7 pb-5 mt-4">
                  <SizePanelView wide sheet={sheet} update={update} />
                </div>
              </>
            ) : (
              <div className="flex gap-5 px-7 py-5">
                {sheet.layout === 'B' && <SizePanelView sheet={sheet} update={update} />}
                <PinImageView ctx={pinCtx} img={sheet.front} side="front" caption="款式正面图" />
                <PinImageView ctx={pinCtx} img={sheet.back} side="back" caption="款式背面图" />
                {sheet.layout === 'A' && <SizePanelView sheet={sheet} update={update} />}
              </div>
            )}

            {/* 上传参考图 */}
            <div className={`px-7 py-5 ${sheet.layout === 'B' ? 'order-5' : 'order-4'}`}>
              <SecHead title="上传参考图" help />
              <div className="mt-3 flex items-start gap-3">
                {sheet.refs.map((r, i) => (
                  <RefThumb
                    key={i}
                    img={r.img}
                    tag={r.tag}
                    onTag={(v) => update((s) => ({ ...s, refs: s.refs.map((x, j) => (j === i ? { ...x, tag: v } : x)) }))}
                    onRemove={() => update((s) => ({ ...s, refs: s.refs.filter((_, j) => j !== i) }))}
                  />
                ))}
                {sheet.refs.length < 3 && (
                  <button
                    onClick={() => update((s) => ({ ...s, refs: [...s.refs, { img: ASSETS[(s.refs.length + 5) % ASSETS.length].img, tag: `标注 ${s.refs.length + 1}` }] }))}
                    className="w-40 h-40 rounded-lg border border-dashed border-line-strong flex flex-col items-center justify-center gap-1.5 text-mut hover:border-pri/50 hover:text-ink transition-colors"
                  >
                    <Plus className="w-5 h-5 text-mut-3" />
                    <span className="text-[12.5px] text-ink">添加参考图 ({sheet.refs.length}/3)</span>
                    <span className="text-[11.5px] text-pri">点击上传</span>
                  </button>
                )}
              </div>
            </div>

            {/* 工艺说明（与款式图钉点联动） */}
            <div className={`px-7 py-5 ${sheet.layout === 'B' ? 'order-4' : 'order-5'}`}>
              <SecHead
                title="工艺说明"
                action={
                  <button
                    onClick={() => update((s) => ({ ...s, crafts: [...s.crafts, { id: nid(), part: '', craft: '', desc: '', imgs: [] }] }))}
                    className="h-8 px-3 rounded-lg border border-line text-[12px] text-ink-2 inline-flex items-center gap-1.5 hover:border-pri/50 hover:text-pri transition-colors"
                  >
                    <Pencil className="w-3 h-3" />
                    增加工艺说明
                  </button>
                }
              />
              <div className="mt-3">
                <div className="grid grid-cols-[72px_1fr_1fr_1.4fr] text-[12px] font-medium text-ink-2 pb-2 border-b border-line">
                  <span className="px-2">序号</span>
                  <span className="px-2">部位</span>
                  <span className="px-2">工艺</span>
                  <span className="px-2">说明</span>
                </div>
                {sheet.crafts.length === 0 && (
                  <div className="border-b border-line py-6 text-center text-[12px] text-mut-3">
                    点击上方款式图添加部位钉点，或点击「增加工艺说明」手动添加
                  </div>
                )}
                {sheet.crafts.map((c, i) => (
                  <div
                    key={c.id}
                    id={`craft-row-${c.id}`}
                    onClick={() => setSelCraft(c.id)}
                    className={`grid grid-cols-[72px_1fr_1fr_1.4fr] items-center border-b border-line min-h-11 transition-colors group ${
                      selCraft === c.id ? 'bg-pri-soft/60' : 'hover:bg-fill/60'
                    }`}
                  >
                    <span className="px-2 flex items-center gap-1 text-[12.5px] text-ink-2">
                      <GripVertical className="w-3 h-3 text-mut-3 shrink-0" />
                      {i + 1}
                      {c.pin && <span className="w-1.5 h-1.5 rounded-full bg-pri shrink-0" title="已关联款式图钉点" />}
                      {c.imgs.length > 0 && <span className="text-[10px] leading-none text-pri shrink-0" title="含标注配图">图×{c.imgs.length}</span>}
                    </span>
                    <span className="px-2">
                      <DocInput value={c.part} onChange={(v) => update((s) => ({ ...s, crafts: s.crafts.map((x) => (x.id === c.id ? { ...x, part: v } : x)) }))} placeholder="点击输入" />
                    </span>
                    <span className="px-2">
                      <DocInput value={c.craft} onChange={(v) => update((s) => ({ ...s, crafts: s.crafts.map((x) => (x.id === c.id ? { ...x, craft: v } : x)) }))} placeholder="点击输入" />
                    </span>
                    <span className="px-2 flex items-center gap-1">
                      <DocInput value={c.desc} onChange={(v) => update((s) => ({ ...s, crafts: s.crafts.map((x) => (x.id === c.id ? { ...x, desc: v } : x)) }))} placeholder="点击输入" />
                      <button
                        onClick={(e) => { e.stopPropagation(); removeCraft(c.id) }}
                        title="删除该条工艺说明"
                        className="w-6 h-6 rounded-md hidden group-hover:flex items-center justify-center text-mut-3 hover:text-err transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* 面辅料 */}
            <div className="border-t border-line-doc order-6">
              <div className="h-10 bg-fill border-b border-line-doc flex items-center justify-center text-[13px] font-medium tracking-[0.4em] text-ink-2">面辅料</div>
              <div className="px-7 py-5">
                <SecHead
                  title="面料"
                  action={
                    <button
                      onClick={() => update((s) => ({
                        ...s,
                        fabrics: [...s.fabrics, { id: nid(), tag: `${'ABCDEFGH'[s.fabrics.length] ?? '?'}料`, part: '', desc: '', price: '', usage: '', code: '', supplier: '', phone: '', img: null }],
                      }))}
                      className="h-8 px-3 rounded-lg border border-line text-[12px] text-ink-2 inline-flex items-center gap-1.5 hover:border-pri/50 hover:text-pri transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      补充面料
                    </button>
                  }
                />
                {sheet.fabrics.map((f) => (
                  <div key={f.id} className="mt-4 flex gap-5">
                    {/* 面料图：虚线上传框 / 已传预览 */}
                    <ImgSlot
                      label="面料图"
                      img={f.img}
                      onPick={(from) => update((s) => ({ ...s, fabrics: s.fabrics.map((x) => (x.id === f.id ? { ...x, img: ASSETS[(f.id + (from === 'lib' ? 3 : 0)) % ASSETS.length].img } : x)) }))}
                      onClear={() => update((s) => ({ ...s, fabrics: s.fabrics.map((x) => (x.id === f.id ? { ...x, img: null } : x)) }))}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <span className="text-[13px] font-semibold text-ink">{f.tag}</span>
                        <button
                          onClick={() => update((s) => ({ ...s, fabrics: s.fabrics.filter((x) => x.id !== f.id) }))}
                          title="删除面料"
                          className="ml-auto w-6 h-6 rounded-md flex items-center justify-center text-err/80 hover:text-err transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="mt-2.5 flex gap-4">
                        <label className="w-[220px] shrink-0 block">
                          <span className="text-[12px] text-ink-2">使用部位</span>
                          <span className="mt-1.5 block h-9 px-2.5 rounded-md border border-line">
                            <DocInput value={f.part} onChange={(v) => update((s) => ({ ...s, fabrics: s.fabrics.map((x) => (x.id === f.id ? { ...x, part: v } : x)) }))} placeholder="使用部位" className="h-9" />
                          </span>
                        </label>
                        <label className="flex-1 min-w-0 block">
                          <span className="text-[12px] text-ink-2">面料描述</span>
                          <span className="mt-1.5 block h-9 px-2.5 rounded-md border border-line">
                            <DocInput value={f.desc} onChange={(v) => update((s) => ({ ...s, fabrics: s.fabrics.map((x) => (x.id === f.id ? { ...x, desc: v } : x)) }))} placeholder="面料描述" className="h-9" />
                          </span>
                        </label>
                      </div>
                      <div className="mt-3 grid grid-cols-5 gap-4">
                        {([
                          ['价格', 'price', '请输入', '元/米'],
                          ['面料用量', 'usage', '请输入', '米'],
                          ['物料编号', 'code', '请输入', ''],
                          ['供应商名称', 'supplier', '请输入', ''],
                          ['联系方式', 'phone', '请输入', ''],
                        ] as const).map(([label, key, ph, unit]) => (
                          <label key={key} className="min-w-0 block">
                            <span className="text-[12px] text-ink-2">{label}</span>
                            <span className="mt-1.5 flex h-9 rounded-md border border-line overflow-hidden">
                              <DocInput
                                value={f[key]}
                                onChange={(v) => update((s) => ({ ...s, fabrics: s.fabrics.map((x) => (x.id === f.id ? { ...x, [key]: v } : x)) }))}
                                placeholder={ph}
                                className="h-9 px-2.5"
                              />
                              {unit && <span className="px-2 h-9 inline-flex items-center text-[11.5px] text-mut bg-fill border-l border-line shrink-0">{unit}</span>}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="border-t border-line px-7 py-5">
                <SecHead
                  title="辅料"
                  action={
                    <button
                      onClick={() => update((s) => ({ ...s, accessories: [...s.accessories, { id: nid(), part: '', qty: '', desc: '', price: '', unit: '元/个', code: '', supplier: '', phone: '', img: null }] }))}
                      className="h-8 px-3 rounded-lg border border-line text-[12px] text-ink-2 inline-flex items-center gap-1.5 hover:border-pri/50 hover:text-pri transition-colors"
                    >
                      <Pencil className="w-3 h-3" />
                      补充辅料
                    </button>
                  }
                />
                {sheet.accessories.map((a, i) => (
                  <div key={a.id} className="mt-4 flex gap-5">
                    {/* 辅料图：虚线上传框 / 已传预览 */}
                    <ImgSlot
                      label="辅料图"
                      img={a.img}
                      onPick={(from) => update((s) => ({ ...s, accessories: s.accessories.map((x) => (x.id === a.id ? { ...x, img: ASSETS[(a.id + 5 + (from === 'lib' ? 3 : 0)) % ASSETS.length].img } : x)) }))}
                      onClear={() => update((s) => ({ ...s, accessories: s.accessories.map((x) => (x.id === a.id ? { ...x, img: null } : x)) }))}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <span className="text-[13px] font-semibold text-ink">辅料{i + 1}</span>
                        <button
                          onClick={() => update((s) => ({ ...s, accessories: s.accessories.filter((x) => x.id !== a.id) }))}
                          title="删除辅料"
                          className="ml-auto w-6 h-6 rounded-md flex items-center justify-center text-err/80 hover:text-err transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="mt-2.5 grid grid-cols-[1fr_1fr_1.4fr] gap-4">
                        {([
                          ['使用部位', 'part', '使用部位'],
                          ['使用数量', 'qty', '请输入'],
                          ['辅料描述', 'desc', '辅料描述'],
                        ] as const).map(([label, key, ph]) => (
                          <label key={key} className="min-w-0 block">
                            <span className="text-[12px] text-ink-2">{label}</span>
                            <span className="mt-1.5 block h-9 px-2.5 rounded-md border border-line">
                              <DocInput
                                value={a[key]}
                                onChange={(v) => update((s) => ({ ...s, accessories: s.accessories.map((x) => (x.id === a.id ? { ...x, [key]: v } : x)) }))}
                                placeholder={ph}
                                className="h-9"
                              />
                            </span>
                          </label>
                        ))}
                      </div>
                      <div className="mt-3 grid grid-cols-4 gap-4">
                        <label className="min-w-0 block">
                          <span className="text-[12px] text-ink-2">价格</span>
                          <span className="mt-1.5 flex h-9 rounded-md border border-line overflow-hidden">
                            <DocInput
                              value={a.price}
                              onChange={(v) => update((s) => ({ ...s, accessories: s.accessories.map((x) => (x.id === a.id ? { ...x, price: v } : x)) }))}
                              placeholder="请输入"
                              className="h-9 px-2.5"
                            />
                            <UnitSelect
                              value={a.unit}
                              onChange={(v) => update((s) => ({ ...s, accessories: s.accessories.map((x) => (x.id === a.id ? { ...x, unit: v } : x)) }))}
                            />
                          </span>
                        </label>
                        {([
                          ['物料编号', 'code', '请输入'],
                          ['供应商名称', 'supplier', '请输入'],
                          ['联系方式', 'phone', '请输入'],
                        ] as const).map(([label, key, ph]) => (
                          <label key={key} className="min-w-0 block">
                            <span className="text-[12px] text-ink-2">{label}</span>
                            <span className="mt-1.5 block h-9 px-2.5 rounded-md border border-line">
                              <DocInput
                                value={a[key]}
                                onChange={(v) => update((s) => ({ ...s, accessories: s.accessories.map((x) => (x.id === a.id ? { ...x, [key]: v } : x)) }))}
                                placeholder={ph}
                                className="h-9"
                              />
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 成衣价格核算：默认在单内（随 PDF 下载）；移至侧边后功能不变、不计入 PDF */}
            {!sheet.costAside && (
              <CostModule sheet={sheet} update={update} showToast={showToast} entering={flight?.dir === 'back'} onToggleAside={toggleCostAside} />
            )}
            {sheet.costAside && (
              <div data-cost-placeholder className="pdf-hide cost-module-anim border-t border-line-doc order-7 px-7 py-4 flex items-center gap-2 text-[12px] text-mut-3">
                <Calculator className="w-3.5 h-3.5 shrink-0" />
                成衣价格核算已移至右侧边栏呈现，功能完全不变；下载 PDF 时将不包含此模块
                <button onClick={toggleCostAside} className="ml-auto shrink-0 text-pri hover:underline">放回原位</button>
              </div>
            )}
            </div>
            </div>
          </div>
        </div>
      </div>

      {/* 价格核算侧边栏：移出单外呈现（在文档截图范围之外，不计入 PDF） */}
      {sheet.costAside && (
        <div
          data-cost-panel
          className={`fixed z-30 flex flex-col rounded-xl border border-line-doc bg-panel transition-opacity duration-200${flight?.dir === 'aside' ? ' opacity-0' : ' opacity-100'}`}
          style={{ left: panelRect.left, top: panelRect.top, width: panelRect.width, height: panelRect.height }}
        >
          <div
            onMouseDown={(e) => onPanelMouseDown(e, 'move')}
            title="按住拖拽移动卡片"
            className="h-11 px-4 border-b border-line flex items-center gap-2 shrink-0 cursor-move select-none"
          >
            <span
              title="按住拖拽移动卡片"
              className="p-0.5 -ml-1 rounded text-mut-3 hover:text-pri transition-colors cursor-move shrink-0"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </span>
            <Calculator className="w-4 h-4 text-pri" />
            <span className="text-[13px] font-medium text-ink">成衣价格核算</span>
            <span className="h-5 px-1.5 rounded bg-warn/10 text-warn text-[10.5px] inline-flex items-center">侧边呈现 · 不计入 PDF</span>
            <button
              onMouseDown={(e) => e.stopPropagation()}
              onClick={toggleCostAside}
              className="ml-auto h-7 px-2.5 rounded-md border border-line text-[11.5px] text-ink-2 hover:border-pri/50 hover:text-pri transition-colors"
            >
              放回单内
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pb-5">
            <CostModule sheet={sheet} update={update} showToast={showToast} aside onToggleAside={toggleCostAside} />
          </div>
          {/* 左下角缩放手柄：向左 / 向下拖拽拉大卡片，反向缩小 */}
          <div
            onMouseDown={(e) => onPanelMouseDown(e, 'resize')}
            title="拖拽拉大 / 缩小卡片"
            className="absolute left-1 bottom-1 w-5 h-5 cursor-nesw-resize flex items-center justify-center rounded text-mut-3 hover:text-pri transition-colors"
          >
            <svg viewBox="0 0 10 10" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M9 1 L1 9 M9 5 L5 9" />
            </svg>
          </div>
          {/* 右下角缩放手柄：向右 / 向下拖拽拉大卡片，反向缩小（与左下角同功能） */}
          <div
            onMouseDown={(e) => onPanelMouseDown(e, 'resize-r')}
            title="拖拽拉大 / 缩小卡片"
            className="absolute right-1 bottom-1 w-5 h-5 cursor-nwse-resize flex items-center justify-center rounded text-mut-3 hover:text-pri transition-colors"
          >
            <svg viewBox="0 0 10 10" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M1 1 L9 9 M5 1 L9 5" />
            </svg>
          </div>
        </div>
      )}

      {/* 模块迁移飞行动效：幽灵卡片由源位置飞向目标位置（移到侧边=由大到小，放回单内=由小到大） */}
      {flight && (
        <div
          className="cost-flight fixed z-[60] pointer-events-none rounded-xl border border-pri/40 bg-panel overflow-hidden"
          style={{
            left: flight.from.x,
            top: flight.from.y,
            width: flight.from.w,
            height: flight.from.h,
            '--fx': `${flight.to.x}px`,
            '--fy': `${flight.to.y}px`,
            '--fw': `${flight.to.w}px`,
            '--fh': `${flight.to.h}px`,
          } as CSSProperties}
        >
          <div className="h-10 shrink-0 bg-fill border-b border-line-doc flex items-center justify-center text-[13px] font-medium tracking-[0.4em] text-ink-2">成衣价格核算</div>
          <div className="p-4 space-y-2.5 opacity-70">
            <div className="h-6 rounded-md bg-fill" />
            <div className="h-6 rounded-md bg-fill" />
            <div className="h-6 rounded-md bg-fill" />
            <div className="h-9 rounded-lg border border-pri/30 bg-pri-soft/50" />
          </div>
        </div>
      )}
    </div>
  )
}

/* ============================================================
   入口：创建工艺单流程（弹窗选图 → 工艺单文档）
   ============================================================ */
export default function CraftSheetFlow({
  showToast,
  baseParams,
  onClose,
}: {
  showToast: (m: string) => void
  baseParams: Record<string, string>
  onClose: () => void
}) {
  const [stage, setStage] = useState<'pick' | 'doc'>('pick')
  const [sheets, setSheetsRaw] = useState<Sheet[]>(() => [makeSheet(baseParams)])
  const setSheets = (fn: (s: Sheet[]) => Sheet[]) => setSheetsRaw(fn)

  if (stage === 'doc') {
    return <DocStage sheets={sheets} setSheets={setSheets} showToast={showToast} onBack={onClose} />
  }
  return (
    <PickStage
      sheets={sheets}
      setSheets={setSheets}
      addSheet={() => setSheetsRaw((ss) => [...ss, makeSheet(baseParams)])}
      showToast={showToast}
      onCancel={onClose}
      onGenerate={() => {
        setStage('doc')
        showToast(`已生成 ${sheets.length} 份工艺单，可继续编辑完善`)
      }}
    />
  )
}
