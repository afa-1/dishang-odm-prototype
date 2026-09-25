import { useMemo, useState } from 'react'
import { ChevronDown, Gem, Layers, Lightbulb, Search, Shirt, UserRound } from 'lucide-react'
import { TopRightBar } from './TopRightBar'
import { CoatThumb, FABRIC_TEXTURES, ModelFigure, TrimThumb, type CoatSpec, type TrimType } from './artwork'

/* ================= 数据 ================= */

type Scope = '公共' | '品牌' | '我的'

interface Item extends CoatSpec {
  name: string
  len: 'long' | 'short'
  scope: Scope
  shoulder: string
  sleeve: string
  collar: string
}

const ITEMS: Item[] = [
  { name: '系带风衣 驼色', variant: 'trench', fill: '#b08968', stroke: '#8a6a4e', len: 'long', scope: '品牌', shoulder: '正肩', sleeve: '长袖', collar: '西装领' },
  { name: '系带风衣 焦糖', variant: 'trench', fill: '#a5774c', stroke: '#7d5a39', len: 'long', scope: '品牌', shoulder: '正肩', sleeve: '长袖', collar: '西装领' },
  { name: '竖纹衬衫大衣', variant: 'wool', fill: '#c4a877', stroke: '#9d8257', len: 'long', scope: '公共', shoulder: '插肩', sleeve: '长袖', collar: '西装领' },
  { name: '菱格大衣 黑', variant: 'quilted', fill: '#2e2e33', stroke: '#17171b', len: 'long', scope: '品牌', shoulder: '落肩', sleeve: '长袖', collar: '立领' },
  { name: '菱格大衣 米', variant: 'quilted', fill: '#d9cdb4', stroke: '#b3a687', len: 'long', scope: '公共', shoulder: '落肩', sleeve: '长袖', collar: '立领' },
  { name: '束腰棉服 白', variant: 'quilted', fill: '#ece7db', stroke: '#c6bfae', len: 'long', scope: '我的', shoulder: '正肩', sleeve: '长袖', collar: '立领' },
  { name: '西装领大衣 驼', variant: 'wool', fill: '#b08968', stroke: '#8a6a4e', len: 'long', scope: '品牌', shoulder: '正肩', sleeve: '长袖', collar: '西装领' },
  { name: '双排扣大衣 棕', variant: 'wool', fill: '#96684a', stroke: '#744e35', len: 'long', scope: '品牌', shoulder: '正肩', sleeve: '长袖', collar: '西装领' },
  { name: '拼色运动夹克', variant: 'hooded', fill: '#e8e8e4', stroke: '#b9b9b2', len: 'short', scope: '公共', shoulder: '落肩', sleeve: '长袖', collar: '连帽' },
  { name: '运动夹克 荧光黄', variant: 'hooded', fill: '#e6df4f', stroke: '#b8b23a', len: 'short', scope: '公共', shoulder: '落肩', sleeve: '长袖', collar: '连帽' },
  { name: '连帽羽绒服 橄榄', variant: 'puffer', fill: '#77734f', stroke: '#5a5739', len: 'short', scope: '公共', shoulder: '落肩', sleeve: '长袖', collar: '连帽' },
  { name: '连帽羽绒服 深褐', variant: 'puffer', fill: '#5f5a42', stroke: '#45422e', len: 'short', scope: '我的', shoulder: '落肩', sleeve: '长袖', collar: '连帽' },
  { name: '收腰棉服 奶白', variant: 'quilted', fill: '#e9e4d8', stroke: '#c4bda9', len: 'long', scope: '公共', shoulder: '正肩', sleeve: '九分袖', collar: '立领' },
  { name: '立领棉服 米白', variant: 'puffer', fill: '#e5e0d4', stroke: '#c0b9a4', len: 'long', scope: '公共', shoulder: '正肩', sleeve: '长袖', collar: '立领' },
  { name: '格纹大衣 棕', variant: 'trench', fill: '#a98a5f', stroke: '#84683f', len: 'long', scope: '品牌', shoulder: '插肩', sleeve: '长袖', collar: '西装领' },
  { name: '皮风衣 黑', variant: 'trench', fill: '#3b3b40', stroke: '#232327', len: 'long', scope: '品牌', shoulder: '正肩', sleeve: '长袖', collar: '西装领' },
  { name: '菱格大衣 苔绿', variant: 'quilted', fill: '#6b7052', stroke: '#50553c', len: 'long', scope: '品牌', shoulder: '落肩', sleeve: '长袖', collar: '立领' },
  { name: '菱格大衣 浅驼', variant: 'quilted', fill: '#c9b48e', stroke: '#a48f68', len: 'long', scope: '公共', shoulder: '插肩', sleeve: '长袖', collar: '立领' },
  { name: '皮风衣 黑 2', variant: 'wool', fill: '#343438', stroke: '#1e1e22', len: 'long', scope: '我的', shoulder: '正肩', sleeve: '长袖', collar: '西装领' },
  { name: '面包羽绒服 粉', variant: 'puffer', fill: '#f2a7bd', stroke: '#d3849e', len: 'short', scope: '我的', shoulder: '落肩', sleeve: '长袖', collar: '立领' },
  { name: '短款羽绒服 玫粉', variant: 'puffer', fill: '#ee93ae', stroke: '#cc6f8e', len: 'short', scope: '我的', shoulder: '落肩', sleeve: '长袖', collar: '连帽' },
  { name: '毛呢大衣 灰', variant: 'wool', fill: '#9b9da2', stroke: '#787a80', len: 'long', scope: '品牌', shoulder: '正肩', sleeve: '长袖', collar: '立领' },
  { name: '单排扣大衣 奶白', variant: 'wool', fill: '#e7e2d6', stroke: '#c2bba9', len: 'long', scope: '公共', shoulder: '正肩', sleeve: '长袖', collar: '西装领' },
  { name: '皮毛一体 米白', variant: 'fur', fill: '#f0ebdf', stroke: '#8a6a52', len: 'short', scope: '我的', shoulder: '落肩', sleeve: '九分袖', collar: '毛领' },
]

interface Fabric {
  name: string
  fill: string
  tex: string
  scope: Scope
}
const FABRICS: Fabric[] = [
  { name: '双面呢', fill: '#b08968', tex: 'plain', scope: '品牌' },
  { name: '斜纹软呢', fill: '#96684a', tex: 'twill', scope: '品牌' },
  { name: '人字纹呢', fill: '#8a7a5f', tex: 'herringbone', scope: '公共' },
  { name: '灯芯绒', fill: '#a5774c', tex: 'cord', scope: '公共' },
  { name: '华夫格', fill: '#d9cdb4', tex: 'waffle', scope: '我的' },
  { name: '法兰绒', fill: '#9b9da2', tex: 'plain', scope: '公共' },
  { name: '粗花呢', fill: '#6b7052', tex: 'tweed', scope: '品牌' },
  { name: '针织罗纹', fill: '#c4a877', tex: 'rib', scope: '我的' },
  { name: '防风尼龙', fill: '#5b6068', tex: 'plain', scope: '公共' },
  { name: '羊羔绒', fill: '#ece7db', tex: 'shearling', scope: '我的' },
  { name: '水洗牛仔', fill: '#5a6f8f', tex: 'denim', scope: '品牌' },
  { name: 'PU 皮革', fill: '#2e2e33', tex: 'plain', scope: '我的' },
]

interface Trim {
  name: string
  trimType: TrimType
  fill: string
  scope: Scope
}
const TRIMS: Trim[] = [
  { name: '树脂纽扣', trimType: 'button', fill: '#8a6a4e', scope: '公共' },
  { name: '金属四合扣', trimType: 'snap', fill: '#b8b2a4', scope: '品牌' },
  { name: '牛角扣', trimType: 'toggle', fill: '#96684a', scope: '品牌' },
  { name: '拉链', trimType: 'zipper', fill: '#a5a39a', scope: '公共' },
  { name: '抽绳扣', trimType: 'cordlock', fill: '#7a7f87', scope: '我的' },
  { name: '织带', trimType: 'strap', fill: '#5a6f8f', scope: '品牌' },
  { name: '魔术贴', trimType: 'velcro', fill: '#6b7052', scope: '公共' },
  { name: '贴布绣', trimType: 'patch', fill: '#a5774c', scope: '我的' },
]

interface Model {
  name: string
  jacket: string
  inner: string
  skirt: string
  pants?: boolean
  scope: Scope
}
const MODELS: Model[] = [
  { name: '通勤模特 A', jacket: '#f5f3ee', inner: '#2e4a7a', skirt: '#b5c4de', pants: true, scope: '公共' },
  { name: '街拍模特 B', jacket: '#e9d8c8', inner: '#5a4632', skirt: '#cbb491', scope: '品牌' },
  { name: '秀场模特 C', jacket: '#dfe6df', inner: '#40513f', skirt: '#8ea78e', pants: true, scope: '品牌' },
  { name: '休闲模特 D', jacket: '#f2e6dd', inner: '#7a2430', skirt: '#d9c8a4', scope: '我的' },
  { name: '极简模特 E', jacket: '#e5e0d4', inner: '#4a4f57', skirt: '#9b9da2', pants: true, scope: '公共' },
  { name: '甜酷模特 F', jacket: '#f2a7bd', inner: '#ffffff', skirt: '#d3849e', scope: '我的' },
]

interface Inspo {
  name: string
  img: string
  tags: string[]
  scope: Scope
}
// 灵感采集：与个人工作台「灵感采集」文件夹同源的灵感图片素材
const INSPO: Inspo[] = [
  { name: '秀场廓形参考', img: '/samples/pf-trend.png', tags: ['秀场', '廓形'], scope: '我的' },
  { name: '风衣企划氛围图', img: '/samples/pf-plan.png', tags: ['企划'], scope: '我的' },
  { name: '爆款单品拆解', img: '/samples/pf-hit.png', tags: ['爆款'], scope: '我的' },
  { name: '面料肌理参考', img: '/samples/pf-fabric.png', tags: ['面料'], scope: '公共' },
  { name: '细节工艺放大', img: '/samples/pf-detail.png', tags: ['工艺'], scope: '品牌' },
]

const MAIN_TABS: Scope[] = ['公共', '品牌', '我的']
const SUB_TABS = [
  { name: '款式', icon: Shirt },
  { name: '灵感采集', icon: Lightbulb },
  { name: '面料', icon: Layers },
  { name: '辅料', icon: Gem },
  { name: '模特', icon: UserRound },
]
// 款式属性筛选（四个维度全部生效）
const FILTERS: Record<string, string[]> = {
  廓形: ['全部', '长款', '短款'],
  肩型: ['全部', '正肩', '落肩', '插肩'],
  袖型: ['全部', '长袖', '九分袖'],
  领型: ['全部', '西装领', '连帽', '立领', '毛领'],
}
/* ================= 组件 ================= */

export default function LeftPanel({
  collapsed: outerCollapsed,
  onCollapsedChange,
}: {
  collapsed?: boolean
  onCollapsedChange?: (v: boolean) => void
} = {}) {
  const [mainTab, setMainTab] = useState<Scope>('品牌')
  const [subTab, setSubTab] = useState('款式')
  const [keyword, setKeyword] = useState('')
  const [openFilter, setOpenFilter] = useState<string | null>(null)
  const [filters, setFilters] = useState<Record<string, string>>({ 廓形: '全部', 肩型: '全部', 袖型: '全部', 领型: '全部' })
  // 收起状态支持外部受控（AI 对话「查看我的资产库」可自动展开）
  const [innerCollapsed, setInnerCollapsed] = useState(false)
  const collapsed = outerCollapsed ?? innerCollapsed
  const setCollapsed = (v: boolean) => {
    if (onCollapsedChange) onCollapsedChange(v)
    else setInnerCollapsed(v)
  }

  // 款式：主标签（库归属）+ 搜索 + 四维属性筛选联动
  const list = useMemo(() => {
    return ITEMS.filter((it) => {
      if (it.scope !== mainTab) return false
      if (keyword && !it.name.includes(keyword)) return false
      if (filters['廓形'] !== '全部' && it.len !== (filters['廓形'] === '长款' ? 'long' : 'short')) return false
      if (filters['肩型'] !== '全部' && it.shoulder !== filters['肩型']) return false
      if (filters['袖型'] !== '全部' && it.sleeve !== filters['袖型']) return false
      if (filters['领型'] !== '全部' && it.collar !== filters['领型']) return false
      return true
    })
  }, [mainTab, keyword, filters])

  // 其余子品类：主标签（库归属）+ 搜索
  const byScopeKeyword = <T extends { name: string; scope: Scope }>(arr: T[]) =>
    arr.filter((it) => it.scope === mainTab && (!keyword || it.name.includes(keyword)))
  const fabricList = useMemo(() => byScopeKeyword(FABRICS), [mainTab, keyword])
  const trimList = useMemo(() => byScopeKeyword(TRIMS), [mainTab, keyword])
  const modelList = useMemo(() => byScopeKeyword(MODELS), [mainTab, keyword])
  const inspoList = useMemo(() => byScopeKeyword(INSPO), [mainTab, keyword])

  // 拖拽负载：统一资产通道（面料/辅料/模特），款式沿用 coat 通道
  const dragAsset = (payload: object) => (e: React.DragEvent) => {
    e.dataTransfer.setData('application/x-hxy-asset', JSON.stringify(payload))
    e.dataTransfer.effectAllowed = 'copy'
  }

  const activeCount =
    subTab === '款式' ? list.length : subTab === '灵感采集' ? inspoList.length : subTab === '面料' ? fabricList.length : subTab === '辅料' ? trimList.length : modelList.length

  return (
    <>
      <TopRightBar libraryOpen={!collapsed} onToggleLibrary={() => setCollapsed(!collapsed)} />
      {!collapsed && (
        /* 展开态：完整面板 */
        <aside className="absolute right-3 top-[68px] bottom-3 z-20 w-[292px]">
          <div className="h-full w-full bg-panel rounded-2xl border border-line shadow-[0_8px_30px_rgba(0,0,0,0.06)] flex flex-col overflow-hidden">
          {/* 面板头部：主标签（参照左侧 Agent 版块：头部 + 分隔线 + 内容的一体结构） */}
          <div className="flex items-center gap-1.5 px-3 h-12 shrink-0 border-b border-line-soft">
            <div className="flex-1 grid grid-cols-3 bg-fill rounded-full p-0.5">
              {MAIN_TABS.map((t) => (
                <button
                  key={t}
                  onClick={() => setMainTab(t)}
                  className={`h-7 rounded-full text-[13px] transition-colors ${
                    mainTab === t ? 'bg-panel shadow-sm font-medium text-ink' : 'text-ink-3 hover:text-ink-2'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* 子标签 */}
          <div className="flex items-center gap-1 px-3 mt-3">
            {SUB_TABS.map((t) => (
              <button
                key={t.name}
                onClick={() => setSubTab(t.name)}
                className={`px-2.5 h-7 rounded-md text-[13px] transition-colors ${
                  subTab === t.name ? 'bg-fill font-medium text-ink' : 'text-mut hover:text-ink-2'
                }`}
              >
                {t.name}
              </button>
            ))}
          </div>

          {/* 搜索 */}
          <div className="flex items-center gap-2 px-3 mt-2.5">
            <div className="flex-1 h-8 rounded-lg border border-line flex items-center px-2.5 gap-2 focus-within:border-pri transition-colors">
              <input
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder={`搜索${subTab}`}
                className="flex-1 min-w-0 text-[13px] outline-none placeholder:text-mut-3"
              />
            </div>
            <button className="w-8 h-8 shrink-0 rounded-lg border border-line flex items-center justify-center text-ink-3 hover:bg-fill">
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* 款式属性筛选（仅款式类目展示） */}
          {subTab === '款式' && (
            <div className="flex items-center gap-3 px-3 mt-2.5 pb-1 relative">
              {Object.keys(FILTERS).map((name) => (
                <div key={name} className="relative">
                  <button
                    onClick={() => setOpenFilter(openFilter === name ? null : name)}
                    className={`flex items-center gap-1 text-[13px] transition-colors ${
                      filters[name] !== '全部' || openFilter === name ? 'text-pri' : 'text-ink-3 hover:text-ink'
                    }`}
                  >
                    {filters[name] !== '全部' ? filters[name] : name}
                    <ChevronDown className="w-3.5 h-3.5" />
                  </button>
                  {openFilter === name && (
                    <div className="absolute left-0 top-7 z-30 w-24 bg-panel rounded-lg border border-line shadow-lg py-1">
                      {FILTERS[name].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => {
                            setFilters((f) => ({ ...f, [name]: opt }))
                            setOpenFilter(null)
                          }}
                          className={`w-full text-left px-3 py-1.5 text-[12px] hover:bg-fill ${
                            filters[name] === opt ? 'text-pri font-medium' : 'text-ink-2'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 子品类内容区（均可拖拽至无限画布）：与上方导航控制区同属一个面板整体 */}
          <div className="flex-1 min-h-0 overflow-y-auto mt-2.5 px-3 pb-3 [scrollbar-width:thin]">
            {activeCount === 0 ? (
              <div className="h-full flex items-center justify-center text-[12px] text-mut-3">暂无匹配{subTab}</div>
            ) : subTab === '款式' ? (
              <div className="grid grid-cols-3 gap-2">
                {list.map((it, i) => (
                  <button
                    key={i}
                    title={`${it.name}（拖拽到画布添加）`}
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('application/x-hxy-coat', JSON.stringify(it))
                      e.dataTransfer.effectAllowed = 'copy'
                    }}
                    className="group rounded-lg bg-fill-2 hover:bg-fill border border-transparent hover:border-pri-line transition-colors p-1 cursor-grab active:cursor-grabbing"
                  >
                    <CoatThumb spec={it} className="w-full h-auto pointer-events-none" />
                  </button>
                ))}
              </div>
            ) : subTab === '灵感采集' ? (
              <div className="grid grid-cols-2 gap-2">
                {inspoList.map((m, i) => (
                  <button
                    key={i}
                    title={`${m.name}（拖拽到画布添加）`}
                    draggable
                    onDragStart={dragAsset({ cat: 'inspo', name: m.name, img: m.img })}
                    className="group cursor-grab active:cursor-grabbing text-left"
                  >
                    <div className="w-full aspect-[4/5] rounded-lg overflow-hidden border border-black/5 group-hover:ring-2 group-hover:ring-pri/40 transition-all bg-fill-2">
                      <img src={m.img} alt={m.name} className="w-full h-full object-cover pointer-events-none" />
                    </div>
                    <div className="mt-1 text-[10.5px] text-ink-3 text-center">{m.name}</div>
                    <div className="mt-0.5 flex flex-wrap justify-center gap-1">
                      {m.tags.map((t) => (
                        <span key={t} className="h-4 px-1.5 rounded bg-pri-soft text-pri text-[9.5px] inline-flex items-center">{t}</span>
                      ))}
                    </div>
                  </button>
                ))}
              </div>
            ) : subTab === '面料' ? (
              <div className="grid grid-cols-3 gap-2">
                {fabricList.map((f, i) => (
                  <button
                    key={i}
                    title={`${f.name}（拖拽到画布添加）`}
                    draggable
                    onDragStart={dragAsset({ cat: 'fabric', name: f.name, fill: f.fill, tex: f.tex })}
                    className="group cursor-grab active:cursor-grabbing"
                  >
                    <div
                      className="w-full aspect-square rounded-lg relative overflow-hidden border border-black/5 group-hover:ring-2 group-hover:ring-pri/40 transition-all"
                      style={{ background: f.fill }}
                    >
                      <div className="absolute inset-0 pointer-events-none" style={FABRIC_TEXTURES[f.tex]} />
                    </div>
                    <div className="mt-1 text-[10.5px] text-ink-3 text-center">{f.name}</div>
                  </button>
                ))}
              </div>
            ) : subTab === '辅料' ? (
              <div className="grid grid-cols-3 gap-2">
                {trimList.map((t, i) => (
                  <button
                    key={i}
                    title={`${t.name}（拖拽到画布添加）`}
                    draggable
                    onDragStart={dragAsset({ cat: 'trim', name: t.name, trimType: t.trimType, fill: t.fill })}
                    className="group cursor-grab active:cursor-grabbing"
                  >
                    <div className="w-full aspect-square rounded-lg bg-fill-2 border border-transparent group-hover:border-pri-line group-hover:bg-fill flex items-center justify-center transition-colors">
                      <TrimThumb type={t.trimType} fill={t.fill} className="w-11 h-11 pointer-events-none" />
                    </div>
                    <div className="mt-1 text-[10.5px] text-ink-3 text-center">{t.name}</div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {modelList.map((m, i) => (
                  <button
                    key={i}
                    title={`${m.name}（拖拽到画布添加）`}
                    draggable
                    onDragStart={dragAsset({ cat: 'model', name: m.name, model: { jacket: m.jacket, inner: m.inner, skirt: m.skirt, pants: m.pants } })}
                    className="group cursor-grab active:cursor-grabbing"
                  >
                    <div className="w-full h-32 rounded-lg bg-fill-2 border border-transparent group-hover:ring-2 group-hover:ring-pri/40 overflow-hidden flex items-end justify-center transition-all">
                      <ModelFigure jacket={m.jacket} inner={m.inner} skirt={m.skirt} pants={m.pants} className="h-full w-auto pointer-events-none" />
                    </div>
                    <div className="mt-1 text-[10.5px] text-ink-3 text-center">{m.name}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
          </div>
        </aside>
      )}
    </>
  )
}
