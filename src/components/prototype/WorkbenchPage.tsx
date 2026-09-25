/**
 * 个人工作台：任务接收 / 灵感素材管理 / 趋势存档 / 作品集展示 / 算力监控 一站式面板。
 * 布局：页头（标题 + 右上角算力状态下拉）→ 顶部 KPI 卡片区（今日任务 / 样衣进度 / 本周效率）
 * → 中间 Tab 切换区（灵感 | 趋势 | 作品集）+ 搜索与操作；任务/样衣点击打开右侧抽屉。
 */
import { useRef, useState } from 'react'
import {
  CalendarCheck2,
  Check,
  ChevronDown,
  Download,
  FileText,
  FolderPlus,
  Image as ImageIcon,
  Loader2,
  MoreHorizontal,
  Package,
  Pencil,
  Presentation,
  Scissors,
  Search,
  Sparkles,
  Tag,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react'
import html2canvas from 'html2canvas'
import { USER } from './SettingsContent'
import coat1 from '@/assets/brandlib/coat1.png'
import coat2 from '@/assets/brandlib/coat2.png'
import coat4 from '@/assets/brandlib/coat4.png'

/* ================= 数据 ================= */

interface Task {
  id: string
  title: string
  from: string
  due: string
  done: boolean
}

const INIT_TASKS: Task[] = [
  { id: 't1', title: '26SS 风衣系列企划草图', from: '设计总监', due: '今天 18:00', done: false },
  { id: 't2', title: '外贸大单快反改款（3 色）', from: '业务部 · 王敏', due: '明天 12:00', done: false },
  { id: 't3', title: '详情页主图精修确认', from: '电商运营', due: '今天 20:00', done: false },
  { id: 't4', title: '面料智库色卡归档', from: '自己创建', due: '周五', done: false },
  { id: 't5', title: '秀场趋势解读笔记整理', from: 'AI Agent 收录', due: '周二', done: true },
  { id: 't6', title: '成本核价表复核', from: '供应链', due: '昨天', done: true },
]

interface SampleOrder {
  id: string
  name: string
  factory: string
  status: '打样中' | '待确认' | '已完成'
  eta: string
}

const SAMPLE_ORDERS: SampleOrder[] = [
  { id: 's1', name: '束腰双面呢大衣', factory: '杭州 · 锦绣制衣', status: '打样中', eta: '预计 08-28 出样' },
  { id: 's2', name: '黑色菱格皮衣长外套', factory: '广州 · 联合皮具', status: '打样中', eta: '预计 08-30 出样' },
  { id: 's3', name: '竖条绗缝衬衫式长外套', factory: '杭州 · 锦绣制衣', status: '待确认', eta: '样衣已寄出，待签收' },
  { id: 's4', name: '牛角扣菱格连帽大衣', factory: '苏州 · 恒泰服饰', status: '已完成', eta: '08-18 已入库' },
]

interface InspoImg {
  id: string
  name: string
  img: string
  folder: string
  tags: string[]
}

const INIT_FOLDERS = ['未分类', '灵感采集', '面料参考']
const INIT_IMAGES: InspoImg[] = [
  { id: 'm1', name: '秀场廓形参考', img: '/samples/pf-trend.png', folder: '灵感采集', tags: ['秀场', '廓形'] },
  { id: 'm2', name: '风衣企划氛围图', img: '/samples/pf-plan.png', folder: '灵感采集', tags: ['企划'] },
  { id: 'm3', name: '面料肌理参考', img: '/samples/pf-fabric.png', folder: '面料参考', tags: ['面料'] },
  { id: 'm4', name: '细节工艺放大', img: '/samples/pf-detail.png', folder: '面料参考', tags: ['工艺'] },
  { id: 'm5', name: '爆款单品拆解', img: '/samples/pf-hit.png', folder: '灵感采集', tags: ['爆款'] },
  { id: 'm6', name: '超模上身效果', img: '/samples/gen-model.png', folder: '未分类', tags: [] },
]

interface TrendFile {
  id: string
  name: string
  cat: string
  kind: 'pdf' | 'ppt' | 'word' | 'img'
  src: 'AI' | '手动'
  date: string
  size: string
}

const INIT_TREND_CATS = ['秀场报告', '趋势分析', '竞品调研']
const INIT_TREND_FILES: TrendFile[] = [
  { id: 'f1', name: '26SS 四大秀场趋势汇总', cat: '秀场报告', kind: 'pdf', src: 'AI', date: '08-22', size: '4.2 MB' },
  { id: 'f2', name: '静奢风色彩企划', cat: '趋势分析', kind: 'ppt', src: 'AI', date: '08-21', size: '8.6 MB' },
  { id: 'f3', name: '竞品秋季上新调研', cat: '竞品调研', kind: 'word', src: '手动', date: '08-19', size: '1.1 MB' },
  { id: 'f4', name: '风衣廓形演变图集', cat: '趋势分析', kind: 'img', src: '手动', date: '08-17', size: '12.4 MB' },
]

interface Work {
  id: string
  name: string
  img: string
  date: string
}

const INIT_WORKS: Work[] = [
  { id: 'w1', name: '束腰双面呢大衣 · 定稿', img: coat1, date: '08-22' },
  { id: 'w2', name: '毛领绗缝束腰大衣 · 定稿', img: coat2, date: '08-20' },
  { id: 'w3', name: '黑色菱格皮衣长外套 · 定稿', img: coat4, date: '08-18' },
  { id: 'w4', name: 'AI 超模上身图 · 风衣', img: '/samples/gen-model.png', date: '08-15' },
]

/* 算力详情（右上角下拉） */
const QUOTA = { left: '826.25', total: '1,000', used: '173.75', imgs: 126, avg: '8.2 s' }

const KIND_ICON: Record<TrendFile['kind'], { icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  pdf: { icon: FileText, cls: 'text-rose-500 bg-rose-50' },
  ppt: { icon: Presentation, cls: 'text-acc bg-acc-soft' },
  word: { icon: FileText, cls: 'text-pri bg-pri-soft' },
  img: { icon: ImageIcon, cls: 'text-emerald-600 bg-emerald-50' },
}

/* ================= 主组件 ================= */

const WB_NAME_KEY = 'hyy-workbench-name'

export default function WorkbenchPage({ showToast }: { showToast: (m: string) => void }) {
  const [tab, setTab] = useState<'inspo' | 'trend' | 'works'>('inspo')
  const [kw, setKw] = useState('')
  const [quotaOpen, setQuotaOpen] = useState(false)
  const [drawer, setDrawer] = useState<'task' | 'sample' | null>(null)
  const [menuFor, setMenuFor] = useState<string | null>(null) // 'img:m1' / 'work:w1' / 'file:f1'

  /* ----- 任务 / 样衣 ----- */
  const [tasks, setTasks] = useState(INIT_TASKS)
  const doingCount = tasks.filter((tk) => !tk.done).length
  const samplingCount = SAMPLE_ORDERS.filter((so) => so.status === '打样中').length

  /* ----- 灵感：文件夹 / 图片 / 打标 ----- */
  const [folders, setFolders] = useState(INIT_FOLDERS)
  const [folder, setFolder] = useState('全部')
  const [images, setImages] = useState(INIT_IMAGES)
  const [tagFor, setTagFor] = useState<string | null>(null)
  const [tagText, setTagText] = useState('')
  const [addingFolder, setAddingFolder] = useState(false)
  const [renaming, setRenaming] = useState<string | null>(null)
  const imgFileRef = useRef<HTMLInputElement>(null)

  /* ----- 趋势：分类 / 文件 ----- */
  const [trendCats, setTrendCats] = useState(INIT_TREND_CATS)
  const [trendCat, setTrendCat] = useState('全部')
  const [trendFiles, setTrendFiles] = useState(INIT_TREND_FILES)
  const [addingCat, setAddingCat] = useState(false)
  const [renamingCat, setRenamingCat] = useState<string | null>(null)
  const trendFileRef = useRef<HTMLInputElement>(null)

  /* ----- 作品集 ----- */
  const [works, setWorks] = useState(INIT_WORKS)
  const workFileRef = useRef<HTMLInputElement>(null)

  /* ----- 截图工具 ----- */
  const [shooting, setShooting] = useState(false)
  const [shot, setShot] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [shotSource, setShotSource] = useState<{ url: string; w: number; h: number } | null>(null) // 真实屏幕捕捉画面（空=回退页面截取）
  const [shotNote, setShotNote] = useState<string | null>(null) // 回退原因提示（蒙层内展示）
  const [capturing, setCapturing] = useState(false)
  const dragStart = useRef<{ x: number; y: number } | null>(null)

  const k = kw.trim().toLowerCase()
  const showImages = images.filter(
    (m) => (folder === '全部' || m.folder === folder) && (!k || m.name.toLowerCase().includes(k) || m.tags.some((tg) => tg.toLowerCase().includes(k))),
  )
  const showTrendFiles = trendFiles.filter(
    (f) => (trendCat === '全部' || f.cat === trendCat) && (!k || f.name.toLowerCase().includes(k) || f.cat.toLowerCase().includes(k)),
  )
  const showWorks = works.filter((w) => !k || w.name.toLowerCase().includes(k))

  /* ----- 灵感操作 ----- */
  const addFolder = (name: string) => {
    const n = name.trim()
    if (!n) return
    if (folders.includes(n)) { showToast(`文件夹「${n}」已存在`); return }
    setFolders((fs) => [...fs, n])
    setFolder(n)
    showToast(`已新建文件夹「${n}」`)
  }
  const renameFolder = (oldName: string, name: string) => {
    const n = name.trim()
    setRenaming(null)
    if (!n || n === oldName) return
    if (folders.includes(n)) { showToast(`文件夹「${n}」已存在`); return }
    setFolders((fs) => fs.map((f) => (f === oldName ? n : f)))
    setImages((list) => list.map((m) => (m.folder === oldName ? { ...m, folder: n } : m)))
    if (folder === oldName) setFolder(n)
    showToast(`已重命名为「${n}」`)
  }
  const delFolder = (name: string) => {
    setFolders((fs) => fs.filter((f) => f !== name))
    setImages((list) => list.map((m) => (m.folder === name ? { ...m, folder: '未分类' } : m)))
    if (folder === name) setFolder('全部')
    showToast(`已删除文件夹「${name}」，图片移至未分类`)
  }
  const uploadImages = (files: FileList) => {
    const arr = Array.from(files).slice(0, 10) // 并发上限 10 张
    if (!arr.length) return
    const target = folder === '全部' ? '未分类' : folder
    setImages((list) => [
      ...arr.map((f, i) => ({ id: `m${Date.now()}_${i}`, name: f.name.replace(/\.[^.]+$/, ''), img: URL.createObjectURL(f), folder: target, tags: [] })),
      ...list,
    ])
    showToast(`已上传 ${arr.length} 张图片至「${target}」`)
  }
  const addTag = (id: string) => {
    const tg = tagText.trim()
    if (!tg) { setTagFor(null); return }
    setImages((list) => list.map((m) => (m.id === id && !m.tags.includes(tg) ? { ...m, tags: [...m.tags, tg] } : m)))
    setTagText('')
    setTagFor(null)
    showToast(`已添加标签「${tg}」`)
  }
  const moveToWorks = (m: InspoImg) => {
    setWorks((ws) => [{ id: `w${Date.now()}`, name: m.name, img: m.img, date: '今天' }, ...ws])
    setMenuFor(null)
    showToast(`「${m.name}」已移入作品集`)
  }

  /* ----- 趋势操作 ----- */
  const addTrendCat = (name: string) => {
    const n = name.trim()
    if (!n) return
    if (trendCats.includes(n)) { showToast(`分类「${n}」已存在`); return }
    setTrendCats((cs) => [...cs, n])
    setTrendCat(n)
    showToast(`已新建分类「${n}」`)
  }
  const uploadTrendFiles = (files: FileList) => {
    const arr = Array.from(files)
    if (!arr.length) return
    const target = trendCat === '全部' ? trendCats[0] : trendCat
    const kindOf = (name: string): TrendFile['kind'] => {
      const ext = name.split('.').pop()?.toLowerCase() ?? ''
      if (ext === 'pdf') return 'pdf'
      if (ext === 'ppt' || ext === 'pptx') return 'ppt'
      return ['jpg', 'jpeg', 'png', 'webp'].includes(ext) ? 'img' : 'word'
    }
    setTrendFiles((list) => [
      ...arr.map((f, i) => ({
        id: `f${Date.now()}_${i}`,
        name: f.name.replace(/\.[^.]+$/, ''),
        cat: target,
        kind: kindOf(f.name),
        src: '手动' as const,
        date: '今天',
        size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
      })),
      ...list,
    ])
    showToast(`已上传 ${arr.length} 个文件至「${target}」`)
  }

  /* ----- 截图工具：真实屏幕捕捉（任意网页/窗口/桌面）→ 蒙层十字选区 → 确认保存 → 存入灵感「截图」文件夹 ----- */
  const startShot = async () => {
    setShotNote(null)
    setShot(null)
    // 真实浏览器独立窗口：调起系统级屏幕选择器（可截取任意网页 / 应用窗口 / 整个桌面）
    // 注意：内嵌 iframe 预览会被浏览器 Permissions-Policy（display-capture）拦截，需显式探测并告知原因
    const inIframe = window.self !== window.top
    if (!navigator.webdriver && !inIframe && navigator.mediaDevices?.getDisplayMedia) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false })
        const video = document.createElement('video')
        video.srcObject = stream
        video.muted = true
        await video.play()
        await new Promise((r) => window.setTimeout(r, 120)) // 等待首帧稳定
        const canvas = document.createElement('canvas')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d')!.drawImage(video, 0, 0)
        stream.getTracks().forEach((tr) => tr.stop())
        setShotSource({ url: canvas.toDataURL('image/png'), w: canvas.width, h: canvas.height })
        setShooting(true)
        return
      } catch {
        setShotNote('未获得屏幕捕捉授权，已切换为页面截取模式 · 重新点击截图并允许授权即可捕捉任意网页 / 桌面')
      }
    } else {
      setShotNote(
        inIframe
          ? '当前预览为内嵌环境，浏览器安全策略未开放跨屏捕捉，已切换为页面截取 · 在独立窗口打开即可截取任意网页 / 桌面'
          : '当前浏览器不支持屏幕捕捉，已切换为页面截取模式',
      )
    }
    setShotSource(null)
    setShooting(true)
  }
  const confirmShot = () => {
    const r = shot
    const src = shotSource
    setShooting(false)
    setShot(null)
    setShotSource(null)
    setShotNote(null)
    if (!r || r.w < 20 || r.h < 20) return
    setCapturing(true)
    window.setTimeout(async () => {
      let url = '/samples/gen-look.png'
      try {
        if (src) {
          // 真实屏幕画面：按显示缩放比反推源图像素坐标裁剪
          const vw = window.innerWidth
          const vh = window.innerHeight
          const scale = Math.min(vw / src.w, vh / src.h)
          const dl = (vw - src.w * scale) / 2
          const dt = (vh - src.h * scale) / 2
          const img = new Image()
          img.src = src.url
          await img.decode()
          const sx = Math.max(0, (r.x - dl) / scale)
          const sy = Math.max(0, (r.y - dt) / scale)
          const sw = Math.min(src.w - sx, r.w / scale)
          const sh = Math.min(src.h - sy, r.h / scale)
          const canvas = document.createElement('canvas')
          canvas.width = Math.round(sw)
          canvas.height = Math.round(sh)
          canvas.getContext('2d')!.drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
          url = canvas.toDataURL('image/png')
        } else {
          const canvas = await html2canvas(document.body, {
            x: r.x + window.scrollX,
            y: r.y + window.scrollY,
            width: r.w,
            height: r.h,
            windowWidth: document.documentElement.clientWidth,
            windowHeight: document.documentElement.clientHeight,
          })
          url = canvas.toDataURL('image/png')
        }
      } catch {
        /* 原型环境回退示例图 */
      }
      setFolders((fs) => (fs.includes('截图') ? fs : [...fs, '截图']))
      setImages((list) => [
        { id: `m${Date.now()}`, name: `截图 ${new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`, img: url, folder: '截图', tags: [] },
        ...list,
      ])
      showToast('已存入，可打标')
      setCapturing(false)
    }, 80)
  }

  /** 工作台名称个性化：默认同步用户昵称「XX 的工作台」，点击可改名并本地持久化（不影响导航栏「个人工作台」） */
  const [wbName, setWbName] = useState(() => localStorage.getItem(WB_NAME_KEY) || `${USER.name} 的工作台`)
  const [wbEditing, setWbEditing] = useState(false)
  const [wbDraft, setWbDraft] = useState('')
  const saveWbName = () => {
    const v = wbDraft.trim()
    const name = v || `${USER.name} 的工作台`
    setWbName(name)
    localStorage.setItem(WB_NAME_KEY, name)
    setWbEditing(false)
    showToast('工作台名称已更新')
  }

  return (
    <div className="max-w-[1360px] mx-auto px-10 pt-8 pb-16" onClick={() => { setMenuFor(null); setQuotaOpen(false) }}>
      {/* ===== 页头：标题 + 右上角算力状态（复用全局剩余额度，点击下拉详情） ===== */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            {/* 同步用户头像 */}
            <div className="w-10 h-10 rounded-full bg-pri text-white flex items-center justify-center text-[16px] font-bold shadow-[0_6px_16px_rgba(42,104,254,0.28)] select-none">
              {USER.name[0]}
            </div>
            {wbEditing ? (
              <input
                autoFocus
                value={wbDraft}
                onChange={(e) => setWbDraft(e.target.value)}
                onBlur={saveWbName}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') saveWbName()
                  if (e.key === 'Escape') setWbEditing(false)
                }}
                placeholder={`${USER.name} 的工作台`}
                className="text-[24px] font-bold text-ink tracking-wide bg-transparent outline-none border-b-2 border-pri w-[320px] placeholder:text-mut-3"
              />
            ) : (
              <h1
                onClick={() => {
                  setWbDraft(wbName)
                  setWbEditing(true)
                }}
                title="点击改名"
                className="group text-[24px] font-bold text-ink tracking-wide cursor-pointer flex items-center gap-2"
              >
                {wbName}
                <Pencil className="w-4 h-4 text-mut-3 opacity-0 group-hover:opacity-100 transition-opacity" />
              </h1>
            )}
          </div>
          <p className="mt-1 ml-[52px] text-[13px] text-mut">任务接收 · 灵感素材 · 趋势存档 · 作品集 · 算力监控，一站式面板</p>
        </div>
        <div className="relative" onClick={(e) => e.stopPropagation()}>
          <button
            onClick={() => setQuotaOpen((v) => !v)}
            className="h-10 px-4 rounded-full border border-line bg-panel flex items-center gap-2 text-[13px] text-ink hover:border-ink-3 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-acc" />
            剩余额度 <span className="font-semibold tabular-nums">{QUOTA.left}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-mut transition-transform ${quotaOpen ? 'rotate-180' : ''}`} />
          </button>
          {quotaOpen && (
            <div className="absolute right-0 top-full mt-2 z-40 w-64 rounded-xl border border-line bg-panel shadow-[0_12px_48px_rgba(0,0,0,0.12)] p-4">
              <div className="text-[12.5px] font-semibold text-ink">算力详情</div>
              <div className="mt-3 space-y-2.5 text-[12.5px]">
                {[
                  ['已消耗算力', QUOTA.used],
                  ['总额度', QUOTA.total],
                  ['生成图片总数', `${QUOTA.imgs} 张`],
                  ['单图平均耗时', QUOTA.avg],
                ].map(([label, val]) => (
                  <div key={label} className="flex items-center justify-between">
                    <span className="text-mut">{label}</span>
                    <span className="text-ink font-medium tabular-nums">{val}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 h-1.5 rounded-full bg-fill overflow-hidden">
                <div className="h-full rounded-full bg-[linear-gradient(90deg,#FFB13D,#FF7A1A)]" style={{ width: '17.4%' }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ===== 顶部 KPI 卡片区 ===== */}
      <div className="mt-6 grid grid-cols-3 gap-5">
        <button
          onClick={() => setDrawer('task')}
          className="rounded-xl border border-line bg-panel px-5 py-5 flex items-center gap-4 text-left transition-all hover:border-pri/40 hover:shadow-[0_10px_28px_rgba(42,104,254,0.10)]"
        >
          <span className="w-11 h-11 rounded-lg bg-pri-soft text-pri flex items-center justify-center shrink-0"><CalendarCheck2 className="w-5 h-5" /></span>
          <span className="min-w-0">
            <span className="block text-[13px] text-mut">今日任务</span>
            <span className="block mt-1 text-[22px] font-bold text-ink tabular-nums leading-none">
              {doingCount}<span className="text-[14px] font-normal text-mut-2"> / {tasks.length}</span>
            </span>
            <span className="block mt-1.5 text-[11.5px] text-mut-2">进行中 / 总数 · 点击查看清单</span>
          </span>
        </button>
        <button
          onClick={() => setDrawer('sample')}
          className="rounded-xl border border-line bg-panel px-5 py-5 flex items-center gap-4 text-left transition-all hover:border-pri/40 hover:shadow-[0_10px_28px_rgba(42,104,254,0.10)]"
        >
          <span className="w-11 h-11 rounded-lg bg-[#F1EBFF] text-[#7C5CFC] flex items-center justify-center shrink-0"><Package className="w-5 h-5" /></span>
          <span className="min-w-0">
            <span className="block text-[13px] text-mut">样衣下单进度</span>
            <span className="block mt-1 text-[22px] font-bold text-ink tabular-nums leading-none">
              {samplingCount}<span className="text-[14px] font-normal text-mut-2"> 款</span>
            </span>
            <span className="block mt-1.5 text-[11.5px] text-mut-2">打样中 · 点击查看状态</span>
          </span>
        </button>
        <div className="rounded-xl border border-line bg-panel px-5 py-5 flex items-center gap-4">
          <span className="w-11 h-11 rounded-lg bg-[#E9F8EF] text-[#22A06B] flex items-center justify-center shrink-0"><TrendingUp className="w-5 h-5" /></span>
          <span className="min-w-0">
            <span className="block text-[13px] text-mut">本周效率</span>
            <span className="block mt-1 text-[22px] font-bold text-ink tabular-nums leading-none">87%</span>
            <span className="mt-1.5 inline-flex items-center gap-1 text-[11.5px] text-[#22A06B]"><TrendingUp className="w-3 h-3" />较上周 +5%</span>
          </span>
        </div>
      </div>

      {/* ===== Tab 切换区 + 搜索 + 操作 ===== */}
      <div className="mt-8 flex items-center gap-3">
        <div className="inline-flex bg-fill rounded-full p-1 text-[14px]">
          {([
            ['inspo', '灵感'],
            ['trend', '趋势'],
            ['works', '作品集'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              onClick={() => { setTab(key); setMenuFor(null) }}
              className={`h-10 px-5 rounded-full inline-flex items-center transition-colors ${tab === key ? 'bg-ink text-panel font-medium shadow-sm' : 'text-ink-3 hover:text-ink'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2.5">
          <div className="w-60 h-10 rounded-full border border-line bg-panel flex items-center px-3.5 gap-2 focus-within:border-pri transition-colors">
            <Search className="w-4 h-4 text-mut-2 shrink-0" />
            <input
              value={kw}
              onChange={(e) => setKw(e.target.value)}
              placeholder="按文件名 / 标签检索"
              className="flex-1 min-w-0 bg-transparent outline-none text-[13px] placeholder:text-mut-3"
            />
          </div>
          {tab === 'inspo' && (
            <>
              <button
                onClick={startShot}
                className="h-10 px-4 rounded-full border border-line bg-panel text-[13px] text-ink inline-flex items-center gap-1.5 hover:border-ink-3 transition-colors"
              >
                <Scissors className="w-4 h-4" />截图
              </button>
              <button
                onClick={() => imgFileRef.current?.click()}
                className="h-10 px-4 rounded-full border border-line bg-panel text-[13px] text-ink inline-flex items-center gap-1.5 hover:border-ink-3 transition-colors"
              >
                <Upload className="w-4 h-4" />上传图片
              </button>
              <button
                onClick={() => setAddingFolder(true)}
                className="h-10 px-4 rounded-full bg-pri text-white text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-pri/90 transition-colors"
              >
                <FolderPlus className="w-4 h-4" />新建文件夹
              </button>
              <input
                ref={imgFileRef}
                type="file"
                accept=".jpg,.jpeg,.png,.webp"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files?.length) uploadImages(e.target.files); e.target.value = '' }}
              />
            </>
          )}
          {tab === 'trend' && (
            <>
              <button
                onClick={() => trendFileRef.current?.click()}
                className="h-10 px-4 rounded-full border border-line bg-panel text-[13px] text-ink inline-flex items-center gap-1.5 hover:border-ink-3 transition-colors"
              >
                <Upload className="w-4 h-4" />上传文件
              </button>
              <button
                onClick={() => setAddingCat(true)}
                className="h-10 px-4 rounded-full bg-pri text-white text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-pri/90 transition-colors"
              >
                <FolderPlus className="w-4 h-4" />新建分类
              </button>
              <input
                ref={trendFileRef}
                type="file"
                accept=".pdf,.ppt,.pptx,.doc,.docx,image/*"
                multiple
                className="hidden"
                onChange={(e) => { if (e.target.files?.length) uploadTrendFiles(e.target.files); e.target.value = '' }}
              />
            </>
          )}
          {tab === 'works' && (
            <>
              <button
                onClick={() => workFileRef.current?.click()}
                className="h-10 px-4 rounded-full bg-pri text-white text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-pri/90 transition-colors"
              >
                <Upload className="w-4 h-4" />上传作品
              </button>
              <input
                ref={workFileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={(e) => {
                  const arr = Array.from(e.target.files ?? [])
                  if (arr.length) {
                    setWorks((ws) => [...arr.map((f, i) => ({ id: `w${Date.now()}_${i}`, name: f.name.replace(/\.[^.]+$/, ''), img: URL.createObjectURL(f), date: '今天' })), ...ws])
                    showToast(`已上传 ${arr.length} 件作品`)
                  }
                  e.target.value = ''
                }}
              />
            </>
          )}
        </div>
      </div>

      {/* ===== 灵感 Tab（默认）：文件夹管理 + 图片网格 + 打标 ===== */}
      {tab === 'inspo' && (
        <>
          {/* 文件夹胶囊行 */}
          <div className="mt-5 flex items-center gap-2 flex-wrap">
            {['全部', ...folders].map((f) =>
              renaming === f ? (
                <input
                  key={f}
                  autoFocus
                  defaultValue={f}
                  onKeyDown={(e) => { if (e.key === 'Enter') renameFolder(f, (e.target as HTMLInputElement).value); if (e.key === 'Escape') setRenaming(null) }}
                  onBlur={(e) => renameFolder(f, e.target.value)}
                  className="h-9 w-28 px-3 rounded-full border border-pri bg-panel text-[13px] outline-none"
                />
              ) : (
                <button
                  key={f}
                  onClick={() => setFolder(f)}
                  className={`h-9 px-4 rounded-full border text-[13px] inline-flex items-center gap-1.5 transition-colors ${
                    folder === f ? 'border-pri text-pri bg-panel font-medium' : 'border-line bg-panel text-ink hover:border-ink-3'
                  }`}
                >
                  {f}
                  {folder === f && f !== '全部' && f !== '未分类' && (
                    <span className="flex items-center gap-0.5 ml-0.5">
                      <span
                        role="button"
                        title="重命名"
                        onClick={(e) => { e.stopPropagation(); setRenaming(f) }}
                        className="w-4.5 h-4.5 w-[18px] h-[18px] rounded-full flex items-center justify-center hover:bg-pri-soft"
                      >
                        <Pencil className="w-3 h-3" />
                      </span>
                      <span
                        role="button"
                        title="删除文件夹"
                        onClick={(e) => { e.stopPropagation(); delFolder(f) }}
                        className="w-[18px] h-[18px] rounded-full flex items-center justify-center hover:bg-pri-soft"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    </span>
                  )}
                </button>
              ),
            )}
            {addingFolder && (
              <input
                autoFocus
                placeholder="文件夹名称，回车确认"
                onKeyDown={(e) => { if (e.key === 'Enter') { addFolder((e.target as HTMLInputElement).value); setAddingFolder(false) } if (e.key === 'Escape') setAddingFolder(false) }}
                onBlur={() => setAddingFolder(false)}
                className="h-9 w-40 px-3.5 rounded-full border border-pri bg-panel text-[13px] outline-none placeholder:text-mut-3"
              />
            )}
          </div>

          {/* 图片网格 */}
          {showImages.length > 0 ? (
            <div className="mt-5 grid grid-cols-4 gap-5">
              {showImages.map((m) => (
                <div key={m.id} className="group">
                  <div className="relative">
                    {/* 悬停光晕：卡片底部暖橙光斑（参照附件卡片效果；全局无投影规范，用模糊光斑代替阴影） */}
                    <div
                      className="pointer-events-none absolute -inset-x-4 -bottom-6 top-1/2 rounded-[32px] opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-2xl"
                      style={{ background: 'radial-gradient(65% 85% at 50% 100%, rgba(255,122,26,0.48), rgba(255,177,61,0.20) 50%, transparent 75%)' }}
                    />
                    <div className="relative rounded-xl border border-line bg-panel overflow-hidden transition-all duration-300 group-hover:-translate-y-1.5 group-hover:border-[rgba(255,122,26,0.55)]">
                    <img src={m.img} alt={m.name} className="w-full aspect-[4/3] object-cover transition-transform duration-500 group-hover:scale-[1.05]" draggable={false} />
                    {/* 悬停光晕：卡片内底部暖橙渐变上泛 */}
                    <div
                      className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                      style={{ background: 'radial-gradient(90% 65% at 50% 110%, rgba(255,122,26,0.30), rgba(255,177,61,0.12) 45%, transparent 70%)' }}
                    />
                    {/* 悬浮操作：打标 + 更多 */}
                    <div className="absolute right-2 top-2 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); setTagFor(m.id); setTagText('') }}
                        title="添加标签"
                        className="w-7 h-7 rounded-lg bg-black/55 backdrop-blur text-white flex items-center justify-center hover:bg-black/70"
                      >
                        <Tag className="w-3.5 h-3.5" />
                      </button>
                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === `img:${m.id}` ? null : `img:${m.id}`) }}
                          title="更多"
                          className="w-7 h-7 rounded-lg bg-black/55 backdrop-blur text-white flex items-center justify-center hover:bg-black/70"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                        {menuFor === `img:${m.id}` && (
                          <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-full mt-1 z-40 w-32 rounded-xl border border-line bg-panel shadow-lg py-1">
                            <button onClick={() => moveToWorks(m)} className="w-full px-3.5 h-8 text-left text-[12.5px] text-ink-2 hover:bg-fill">移至作品集</button>
                            <button
                              onClick={() => { setImages((list) => list.filter((x) => x.id !== m.id)); setMenuFor(null); showToast(`已删除「${m.name}」`) }}
                              className="w-full px-3.5 h-8 text-left text-[12.5px] text-[#F05252] hover:bg-fill"
                            >
                              删除
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                    {/* 打标胶囊输入框：回车生成蓝色 Tag */}
                    {tagFor === m.id && (
                      <div className="absolute inset-x-2 bottom-2" onClick={(e) => e.stopPropagation()}>
                        <input
                          autoFocus
                          value={tagText}
                          onChange={(e) => setTagText(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') addTag(m.id); if (e.key === 'Escape') setTagFor(null) }}
                          placeholder="输入标签，回车生成"
                          className="w-full h-8 px-3 rounded-full bg-panel/95 backdrop-blur border border-pri text-[12px] outline-none shadow-lg placeholder:text-mut-3"
                        />
                      </div>
                    )}
                    </div>
                  </div>
                  <div className="mt-2 flex items-center gap-2">
                    <span className="text-[13px] text-ink truncate">{m.name}</span>
                    <span className="text-[11px] text-mut-3 shrink-0">{m.folder}</span>
                  </div>
                  {m.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {m.tags.map((tg) => (
                        <span key={tg} className="h-5 px-2 rounded-full bg-pri-soft text-pri text-[10.5px] font-medium inline-flex items-center">{tg}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-24 flex flex-col items-center justify-center text-center">
              <span className="w-14 h-14 rounded-2xl bg-pri-soft text-pri flex items-center justify-center"><ImageIcon className="w-7 h-7" /></span>
              <p className="mt-4 text-[14px] text-ink-2">{k ? `未找到与「${kw}」相关的图片` : '该文件夹暂无图片'}</p>
              <p className="mt-1.5 text-[12.5px] text-mut-2">可点击右上角「上传图片」或使用截图工具采集灵感</p>
            </div>
          )}
        </>
      )}

      {/* ===== 趋势 Tab：分类管理 + 文件卡片列表 ===== */}
      {tab === 'trend' && (
        <>
          <div className="mt-5 flex items-center gap-2 flex-wrap">
            {['全部', ...trendCats].map((c) =>
              renamingCat === c ? (
                <input
                  key={c}
                  autoFocus
                  defaultValue={c}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      const n = (e.target as HTMLInputElement).value.trim()
                      setRenamingCat(null)
                      if (n && n !== c && !trendCats.includes(n)) {
                        setTrendCats((cs) => cs.map((x) => (x === c ? n : x)))
                        setTrendFiles((list) => list.map((f) => (f.cat === c ? { ...f, cat: n } : f)))
                        if (trendCat === c) setTrendCat(n)
                        showToast(`已重命名为「${n}」`)
                      }
                    }
                    if (e.key === 'Escape') setRenamingCat(null)
                  }}
                  onBlur={() => setRenamingCat(null)}
                  className="h-9 w-28 px-3 rounded-full border border-pri bg-panel text-[13px] outline-none"
                />
              ) : (
                <button
                  key={c}
                  onClick={() => setTrendCat(c)}
                  className={`h-9 px-4 rounded-full border text-[13px] inline-flex items-center gap-1.5 transition-colors ${
                    trendCat === c ? 'border-pri text-pri bg-panel font-medium' : 'border-line bg-panel text-ink hover:border-ink-3'
                  }`}
                >
                  {c}
                  {trendCat === c && c !== '全部' && (
                    <span className="flex items-center gap-0.5 ml-0.5">
                      <span role="button" title="重命名" onClick={(e) => { e.stopPropagation(); setRenamingCat(c) }} className="w-[18px] h-[18px] rounded-full flex items-center justify-center hover:bg-pri-soft">
                        <Pencil className="w-3 h-3" />
                      </span>
                      <span
                        role="button"
                        title="删除分类"
                        onClick={(e) => {
                          e.stopPropagation()
                          setTrendCats((cs) => cs.filter((x) => x !== c))
                          setTrendFiles((list) => list.filter((f) => f.cat !== c))
                          if (trendCat === c) setTrendCat('全部')
                          showToast(`已删除分类「${c}」及其中文件`)
                        }}
                        className="w-[18px] h-[18px] rounded-full flex items-center justify-center hover:bg-pri-soft"
                      >
                        <X className="w-3 h-3" />
                      </span>
                    </span>
                  )}
                </button>
              ),
            )}
            {addingCat && (
              <input
                autoFocus
                placeholder="分类名称，回车确认"
                onKeyDown={(e) => { if (e.key === 'Enter') { addTrendCat((e.target as HTMLInputElement).value); setAddingCat(false) } if (e.key === 'Escape') setAddingCat(false) }}
                onBlur={() => setAddingCat(false)}
                className="h-9 w-36 px-3.5 rounded-full border border-pri bg-panel text-[13px] outline-none placeholder:text-mut-3"
              />
            )}
            <span className="ml-auto text-[11.5px] text-mut-3">AI Agent 对话结果自动收录 · 支持 PDF / PPT / Word / 图片</span>
          </div>

          {showTrendFiles.length > 0 ? (
            <div className="mt-5 grid grid-cols-2 gap-4">
              {showTrendFiles.map((f) => {
                const KI = KIND_ICON[f.kind]
                return (
                  <div key={f.id} className="rounded-xl border border-line bg-panel px-4 py-4 flex items-center gap-3.5 hover:border-pri/40 transition-colors">
                    <span className={`w-11 h-11 rounded-lg flex items-center justify-center shrink-0 ${KI.cls}`}>
                      <KI.icon className="w-5 h-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13.5px] font-medium text-ink truncate">{f.name}</div>
                      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-mut-2">
                        <span className="h-5 px-2 rounded-full bg-fill text-ink-3 inline-flex items-center">{f.cat}</span>
                        <span className={`h-5 px-2 rounded-full inline-flex items-center ${f.src === 'AI' ? 'bg-pri-soft text-pri' : 'bg-fill text-ink-3'}`}>
                          {f.src === 'AI' ? 'AI 收录' : '手动上传'}
                        </span>
                        <span>{f.date} · {f.size}</span>
                      </div>
                    </div>
                    <div className="relative shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === `file:${f.id}` ? null : `file:${f.id}`) }}
                        title="更多"
                        className="w-8 h-8 rounded-lg text-ink-3 hover:bg-fill flex items-center justify-center"
                      >
                        <MoreHorizontal className="w-4 h-4" />
                      </button>
                      {menuFor === `file:${f.id}` && (
                        <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-full mt-1 z-40 w-32 rounded-xl border border-line bg-panel shadow-lg py-1">
                          <button
                            onClick={() => { setMenuFor(null); showToast(`已开始下载「${f.name}」`) }}
                            className="w-full px-3.5 h-8 text-left text-[12.5px] text-ink-2 hover:bg-fill flex items-center gap-2"
                          >
                            <Download className="w-3.5 h-3.5" />下载
                          </button>
                          <button
                            onClick={() => { setTrendFiles((list) => list.filter((x) => x.id !== f.id)); setMenuFor(null); showToast(`已删除「${f.name}」`) }}
                            className="w-full px-3.5 h-8 text-left text-[12.5px] text-[#F05252] hover:bg-fill flex items-center gap-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" />删除
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="mt-24 flex flex-col items-center justify-center text-center">
              <span className="w-14 h-14 rounded-2xl bg-pri-soft text-pri flex items-center justify-center"><FileText className="w-7 h-7" /></span>
              <p className="mt-4 text-[14px] text-ink-2">{k ? `未找到与「${kw}」相关的文件` : '该分类暂无趋势文件'}</p>
              <p className="mt-1.5 text-[12.5px] text-mut-2">AI Agent 对话结果会自动收录，也可手动上传</p>
            </div>
          )}
        </>
      )}

      {/* ===== 作品集 Tab：公开板块 ===== */}
      {tab === 'works' && (
        <>
          <div className="mt-5 flex items-center gap-2 text-[12px] text-mut">
            <span className="h-5 px-2 rounded-full bg-[#E9F8EF] text-[#22A06B] inline-flex items-center font-medium">公开板块</span>
            老板与销售可查看此板块，请保持作品为高完成度稿件
          </div>
          {showWorks.length > 0 ? (
            <div className="mt-4 grid grid-cols-4 gap-5">
              {showWorks.map((w, wi) => (
                <div key={w.id} className="group">
                  <div className="relative rounded-xl bg-white border border-line-soft overflow-hidden transition-shadow group-hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)]">
                    <img src={w.img} alt={w.name} className="w-full aspect-[3/4] object-contain" draggable={false} />
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="relative">
                        <button
                          onClick={(e) => { e.stopPropagation(); setMenuFor(menuFor === `work:${w.id}` ? null : `work:${w.id}`) }}
                          title="更多"
                          className="w-7 h-7 rounded-lg bg-black/55 backdrop-blur text-white flex items-center justify-center hover:bg-black/70"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </button>
                        {menuFor === `work:${w.id}` && (
                          <div onClick={(e) => e.stopPropagation()} className="absolute right-0 top-full mt-1 z-40 w-32 rounded-xl border border-line bg-panel shadow-lg py-1">
                            <button
                              onClick={() => {
                                if (wi === 0) { setMenuFor(null); return }
                                setWorks((ws) => { const arr = [...ws]; const idx = arr.findIndex((x) => x.id === w.id);[arr[idx - 1], arr[idx]] = [arr[idx], arr[idx - 1]]; return arr })
                                setMenuFor(null)
                                showToast(`「${w.name}」已上移`)
                              }}
                              className="w-full px-3.5 h-8 text-left text-[12.5px] text-ink-2 hover:bg-fill"
                            >
                              上移
                            </button>
                            <button
                              onClick={() => {
                                setWorks((ws) => { const arr = [...ws]; const idx = arr.findIndex((x) => x.id === w.id); if (idx < arr.length - 1) [arr[idx], arr[idx + 1]] = [arr[idx + 1], arr[idx]]; return arr })
                                setMenuFor(null)
                                showToast(`「${w.name}」已下移`)
                              }}
                              className="w-full px-3.5 h-8 text-left text-[12.5px] text-ink-2 hover:bg-fill"
                            >
                              下移
                            </button>
                            <button
                              onClick={() => { setWorks((ws) => ws.filter((x) => x.id !== w.id)); setMenuFor(null); showToast(`「${w.name}」已移出作品集`) }}
                              className="w-full px-3.5 h-8 text-left text-[12.5px] text-[#F05252] hover:bg-fill"
                            >
                              移除
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2.5 text-[13px] text-ink truncate">{w.name}</div>
                  <div className="mt-0.5 text-[11.5px] text-mut-3">{w.date}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-24 flex flex-col items-center justify-center text-center">
              <span className="w-14 h-14 rounded-2xl bg-pri-soft text-pri flex items-center justify-center"><ImageIcon className="w-7 h-7" /></span>
              <p className="mt-4 text-[14px] text-ink-2">{k ? `未找到与「${kw}」相关的作品` : '作品集暂无内容'}</p>
              <p className="mt-1.5 text-[12.5px] text-mut-2">可从灵感模块「移至作品集」或本地上传高完成度稿件</p>
            </div>
          )}
        </>
      )}

      {/* ===== 右侧抽屉：任务清单 / 样衣清单 ===== */}
      {drawer && (
        <div className="fixed inset-0 z-50" onClick={() => setDrawer(null)}>
          <div className="absolute inset-0 bg-ink/20" />
          <div
            className="absolute right-0 top-0 h-full w-[400px] bg-panel border-l border-line shadow-[0_0_48px_rgba(0,0,0,0.16)] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-14 shrink-0 border-b border-line-soft flex items-center justify-between px-5">
              <span className="text-[15px] font-semibold text-ink">{drawer === 'task' ? '任务清单' : '样衣清单'}</span>
              <button onClick={() => setDrawer(null)} title="关闭" className="w-8 h-8 rounded-lg text-ink-3 hover:bg-fill flex items-center justify-center">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {drawer === 'task' &&
                tasks.map((tk) => (
                  <button
                    key={tk.id}
                    onClick={() => {
                      setTasks((list) => list.map((x) => (x.id === tk.id ? { ...x, done: !x.done } : x)))
                      showToast(tk.done ? `「${tk.title}」已标记为进行中` : `已完成「${tk.title}」`)
                    }}
                    className="w-full rounded-xl border border-line bg-panel px-4 py-3.5 flex items-center gap-3 text-left hover:border-pri/40 transition-colors"
                  >
                    <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors ${tk.done ? 'bg-pri border-pri text-white' : 'border-line hover:border-pri'}`}>
                      {tk.done && <Check className="w-3 h-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-[13.5px] truncate ${tk.done ? 'text-mut line-through' : 'text-ink'}`}>{tk.title}</span>
                      <span className="block mt-1 text-[11.5px] text-mut-2">{tk.from} · 截止 {tk.due}</span>
                    </span>
                  </button>
                ))}
              {drawer === 'sample' &&
                SAMPLE_ORDERS.map((so) => (
                  <div key={so.id} className="rounded-xl border border-line bg-panel px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] text-ink truncate flex-1">{so.name}</span>
                      <span
                        className={`h-5.5 h-[22px] px-2 rounded-full text-[11px] font-medium inline-flex items-center shrink-0 ${
                          so.status === '打样中' ? 'bg-pri-soft text-pri' : so.status === '待确认' ? 'bg-acc-soft text-acc' : 'bg-[#E9F8EF] text-[#22A06B]'
                        }`}
                      >
                        {so.status}
                      </span>
                    </div>
                    <div className="mt-1 text-[11.5px] text-mut-2">{so.factory} · {so.eta}</div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* ===== 截图工具：页面蒙层 + 十字选区 ===== */}
      {shooting && (
        <div
          className="fixed inset-0 z-[60] cursor-crosshair select-none"
          style={{ background: shotSource ? 'rgba(0,0,0,0.78)' : 'rgba(0,0,0,0.35)' }}
          onMouseDown={(e) => { dragStart.current = { x: e.clientX, y: e.clientY }; setShot({ x: e.clientX, y: e.clientY, w: 0, h: 0 }) }}
          onMouseMove={(e) => {
            const st = dragStart.current
            if (!st) return
            setShot({ x: Math.min(st.x, e.clientX), y: Math.min(st.y, e.clientY), w: Math.abs(e.clientX - st.x), h: Math.abs(e.clientY - st.y) })
          }}
          onMouseUp={() => { dragStart.current = null }}
        >
          {shotSource && (() => {
            const vw = window.innerWidth
            const vh = window.innerHeight
            const scale = Math.min(vw / shotSource.w, vh / shotSource.h)
            return (
              <img
                src={shotSource.url}
                alt="屏幕捕捉画面"
                draggable={false}
                className="absolute"
                style={{ left: (vw - shotSource.w * scale) / 2, top: (vh - shotSource.h * scale) / 2, width: shotSource.w * scale, height: shotSource.h * scale }}
              />
            )
          })()}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 h-9 px-4 rounded-full bg-ink/80 text-white text-[12.5px] flex items-center gap-3">
            {shotSource ? '已捕捉屏幕画面，拖拽框选要保存的区域' : (shotNote ?? '拖拽框选要截取的区域')}
            <button onClick={() => { setShooting(false); setShot(null); setShotNote(null) }} className="text-white/70 hover:text-white">ESC 取消</button>
          </div>
          {shot && shot.w > 4 && shot.h > 4 && (
            <div className="absolute border-2 border-pri bg-pri/10" style={{ left: shot.x, top: shot.y, width: shot.w, height: shot.h }}>
              <div className="absolute -bottom-10 right-0 flex items-center gap-2" onMouseDown={(e) => e.stopPropagation()}>
                <button onClick={() => { setShooting(false); setShot(null); setShotNote(null) }} className="h-8 px-3.5 rounded-lg bg-panel border border-line text-[12.5px] text-ink-2 hover:text-ink">取消</button>
                <button onClick={confirmShot} className="h-8 px-3.5 rounded-lg bg-pri text-white text-[12.5px] font-medium hover:bg-pri/90">确认保存</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 截图保存中提示 */}
      {capturing && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[70] bg-ink text-panel text-[12px] px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />正在保存截图…
        </div>
      )}
    </div>
  )
}
