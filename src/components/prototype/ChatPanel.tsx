import { useEffect, useRef, useState, type ReactNode } from 'react'
import {
  Box,
  Check,
  ChevronDown,
  Clapperboard,
  Download,
  Expand,
  FileText,
  Hammer,
  HelpCircle,
  History,
  LayoutGrid,
  Loader2,
  MapPin,
  SquarePen,
  MessageCircleQuestion,
  PanelLeftClose,
  PanelLeftOpen,
  Paperclip,
  PlugZap,
  Plus,
  RotateCcw,
  Search,
  Send,
  Shrink,
  Smile,
  Sparkles,
  Star,
  Users,
  X,
  Zap,
} from 'lucide-react'
import type { Mark } from './types'
import { ModelFigure } from './artwork'
import { GEN_PALETTES } from './CanvasArea'
import logoUrl from '@/assets/logo.png'

/* ================= 数据模型 ================= */

interface Delivery {
  title: string
  views: { label: string; palette: number }[]
  docName: string
  docBody: string
  points: string[]
}

export type ChatItem =
  | { kind: 'user'; text: string }
  | { kind: 'ai'; text: string }
  | { kind: 'plan'; intro: string; steps: string[]; outro: string }
  | { kind: 'progress'; steps: { label: string; done: boolean }[]; done: boolean; status?: 'running' | 'paused' | 'waiting' }
  | { kind: 'delivery'; d: Delivery }
  | { kind: 'suggest'; items: string[] }
  | { kind: 'feedback' }
  | { kind: 'artifact'; id: string; title: string; detail: string }
  | { kind: 'execution'; title: string; detail: string; state: 'running' | 'done' }
  | { kind: 'ask'; context: string; question: string; options: string[]; multi?: boolean; preset?: number[]; answer?: string; skipped?: boolean } // 询问模式：推理中途的情景化提问卡片（multi 时选项可多选，preset 为推荐勾选项）

type Item = ChatItem
export interface ProjectAgentBridge {
  layout: 'full' | 'split'
  prepared?: boolean
  projectName: string
  taskName: string
  items: ChatItem[]
  busy: boolean
  draft?: string
  onDraftConsumed: () => void
  onSend: (text: string, mode: 'auto' | 'ask') => void
  onAnswer: (index: number, choices: number[], custom?: string) => void
  onSkip: (index: number) => void
  onStop: () => void
  onNew: () => void
  onHistory: () => void
  onCapabilities: () => void
  onReferences: () => void
  onUpload: (files: File[]) => void
  composerContext: ReactNode
  renderArtifact: (item: Extract<ChatItem, { kind: 'artifact' }>) => ReactNode
}

/* ================= 交付物内容生成 ================= */

const VIEW_LABELS = ['正面效果图', '侧面行走', '背面站立', '细节特写']

const SELL_POINTS = [
  '高腰垂坠廓形，视觉拉长下半身比例',
  '双面精纺面料，垂感与光泽感兼具',
  '低饱和卡其色系，适配秋冬通勤场景',
  '可拆卸腰带设计，一衣多穿',
]

/* —— 底部对话栏：技能 / 档位 / 预设（原型为前端模拟数据，接口字段与 PRD 对齐） —— */
interface Skill {
  id: string
  name: string
  icon: typeof Zap
  desc: string
  official: boolean
  prompt?: string // hasSubOptions === false 时点击直接填充
  sub?: { id: string; name: string; desc: string; prompt: string }[] // 含子选项时展开二级列表
}
const SKILLS: Skill[] = [
  {
    id: 'brand-visual', name: '品牌视觉全案', icon: Zap, official: true,
    desc: '一站式生成 Logo、VI、物料、IP 与品牌视觉延展',
    prompt: '请为当前品牌生成一套完整视觉全案：包含 Logo 演绎、VI 基础规范、秀场与电商物料、品牌 IP 形象及视觉延展，整体延续静奢通勤基调。',
  },
  {
    id: 'emoji', name: '创意表情包制作', icon: Smile, official: true,
    desc: '快速生成趣味表情包，让聊天更有表达力',
    prompt: '基于画布中的款式形象生成一套 9 宫格趣味表情包，风格可爱生动，适合社群传播与粉丝互动。',
  },
  {
    id: 'illustration', name: '插画与视觉叙事', icon: Clapperboard, official: true,
    desc: '用插画讲述品牌故事，强化情感连接',
    prompt: '用插画形式演绎本季设计灵感：以品牌故事为主线，绘制一组连贯的视觉叙事插画，强化情感连接。',
  },
  {
    id: 'material-video', name: '素材成片', icon: Box, official: true,
    desc: '将已有图片、视频等素材按顺序整理并合成为一段视频',
    sub: [
      { id: 'concat-video', name: '拼接视频', desc: '将多段视频稳健地拼接为一段', prompt: '请将上传的多段视频按场景顺序稳健拼接为一段完整视频，自动探测输入一致性并添加自然转场。' },
      { id: 'image-video', name: '图片成片', desc: '将图片素材合成为动态展示视频', prompt: '请将上传的图片素材按顺序合成为一段动态展示视频，添加平滑转场与节奏卡点，输出竖版 9:16。' },
    ],
  },
  {
    id: 'nb-pro', name: 'NB Pro 电商图', icon: Box, official: true,
    desc: '面向电商平台的高转化产品图生成',
    prompt: '请生成一张高转化电商产品图：纯白背景、产品居中、光线明亮均匀，突出材质细节与质感。',
  },
]

const MODELS = [
  { key: 'standard', name: 'Standard', rate: '0.59x', desc: '快速且高性价比的日常档位，速度、成本与质量的最佳平衡。' },
  { key: 'pro', name: 'Pro', rate: '2.00x', desc: '更强的推理能力和更长的上下文，适合复杂问题与生产级任务。' },
  { key: 'max', name: 'Max', rate: '2.20x', desc: '面向最具挑战性任务的顶级专家档，最高的推理与指令跟随能力。' },
  { key: 'hy3', name: 'Hy3', rate: '0.11x', tag: 'New', rec: true, desc: '混元具备推理能力增强的思考模型' },
  { key: 'flagship', name: '旗舰', rate: '3.00x', desc: '能力最强的满配旗舰版本，面向最复杂的全链路设计任务。' },
]

// 「自定义」模型选择：按能力强弱三档可选（能力强 → 更强 → 最强）
const CUSTOM_MODELS = [
  { key: 'pro', name: 'Pro', level: '能力强', desc: '更强的推理能力和更长的上下文，适合复杂设计任务与生产级交付。' },
  { key: 'max', name: 'Max', level: '能力更强', desc: '顶级推理与指令跟随能力，面向最具挑战性的设计任务。' },
  { key: 'flagship', name: '旗舰', level: '能力最强', desc: '全能力满配版本，复杂改款、系列企划一步到位。' },
]

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB 上传上限
const ACCEPT_EXT = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'txt', 'md', 'ppt', 'pptx', 'html']

const taskTitle = (text: string) => {
  const t = text.replace(/[。！？!?.，,]/g, '').trim()
  return t.length <= 12 ? t : t.slice(0, 12) + '…'
}

const buildDoc = (title: string, points: string[]) => `# ${title} — 设计说明文档

> 交付时间：${new Date().toLocaleString('zh-CN')} ｜ 画衣衣 · 交付物驱动型设计 Agent

## 一、趋势要点
- 2026 秋冬延续「静奢通勤」主线，低饱和大地色系持续走强
- 剪裁关键词：高腰线、垂坠感、微廓形，强调包容性与线条感
- 面料趋势：双面精纺、轻磨毛肌理、环保再生羊毛混纺

## 二、设计方案
本方案在保留原款核心 DNA 的基础上进行改款设计：
- 廓形：高腰宽腿剪裁，腰节线上移 2cm，优化身材比例
- 细节：可拆卸腰带 + 隐藏式侧袋，兼顾造型感与实用性
- 工艺：门襟暗扣 + 内里包边，提升成衣完成度

## 三、色彩与面料
- 主推色：浅卡其 / 燕麦米 / 雾灰蓝（附潘通色号建议）
- 面料：65% 羊毛 35% 再生涤纶双面精纺，克重 320g/m²

## 四、核心卖点
${points.map((p) => `- ${p}`).join('\n')}

## 五、搭配建议
- 通勤：同色系高领针织 + 尖头踝靴
- 休闲：宽松白衬衫 + 德训鞋
`

/* ================= 子组件 ================= */

/** 交付资源卡片（画廊 + 文档 + 卖点 + 底部双按钮） */
function DeliveryCard({
  d,
  onLocate,
  onDistill,
}: {
  d: Delivery
  /** 点击效果图：视野定位到画布中对应的交付卡片 */
  onLocate: (index: number) => void
  /** 沉淀为技能：把本次提示词工程一键封装为个人 Skill */
  onDistill?: () => void
}) {
  const galleryRef = useRef<HTMLDivElement>(null)

  const download = (name: string, blob: Blob) => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = name
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const downloadDoc = () => download(d.docName, new Blob([d.docBody], { type: 'text/markdown' }))

  const downloadImage = (i: number) => {
    const svg = galleryRef.current?.querySelectorAll('svg')[i]
    if (!svg) return
    const clone = svg.cloneNode(true) as SVGSVGElement
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg')
    download(`${d.title}-${d.views[i].label}.svg`, new Blob([clone.outerHTML], { type: 'image/svg+xml' }))
  }

  // 扁平化表达：去掉大卡片底与卡片套卡片，内容直接平铺在对话流中，仅用留白与细分隔组织层级
  return (
    <div className="w-full pt-1">
      {/* 标题行 */}
      <div className="flex items-center gap-1.5 pb-2.5">
        <span className="w-5 h-5 rounded-md bg-acc-soft flex items-center justify-center">
          <LayoutGrid className="w-3 h-3 text-acc" />
        </span>
        <span className="text-[12.5px] font-semibold text-ink truncate">{d.title}</span>
        <span className="ml-auto text-[10px] px-1.5 py-px rounded bg-ok-soft text-ok border border-ok-line shrink-0">已交付</span>
      </div>

      {/* 效果图：固定为初始默认尺寸（298px 内容宽 × 2 列），不随对话框放大/缩小改变 */}
      <div ref={galleryRef} className="grid grid-cols-2 gap-2 w-[298px] shrink-0">
        {d.views.map((v, i) => (
          <div key={i} className="group relative">
            <button onClick={() => onLocate(i)} title="点击定位到画布中的位置（已从画布删除则重新带入）" className="w-full text-left">
              <div className="aspect-[5/7] rounded-lg bg-fill-2 overflow-hidden flex items-end justify-center cursor-pointer ring-2 ring-transparent group-hover:ring-pri/50 transition-all">
                <ModelFigure {...GEN_PALETTES[v.palette % GEN_PALETTES.length]} className="h-full w-auto" />
              </div>
              <div className="mt-1 text-center text-[10px] text-mut group-hover:text-pri transition-colors">{v.label}</div>
            </button>
            <button
              onClick={() => downloadImage(i)}
              title="下载此图"
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-md bg-panel/90 border border-line flex items-center justify-center text-mut opacity-0 group-hover:opacity-100 hover:text-pri hover:border-pri/40 transition-all"
            >
              <Download className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>

      {/* 设计说明文档：独立小卡片，作为视觉区分和归类（交付图保持扁平）；交付范围不含文档时隐藏 */}
      {d.docName && (
      <div className="mt-3.5 rounded-lg border border-line bg-fill-2 p-2.5">
        <div className="flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-pri shrink-0" />
          <span className="text-[11.5px] font-medium text-ink truncate">{d.docName}</span>
          <button
            onClick={downloadDoc}
            title="下载 .md 文档"
            className="ml-auto w-6 h-6 rounded-md flex items-center justify-center text-mut hover:bg-panel hover:text-pri border border-transparent hover:border-line transition-all shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
          </button>
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-mut line-clamp-4 whitespace-pre-line">{d.docBody.slice(0, 200)}…</p>
      </div>
      )}

      {/* 沉淀为技能：结果满意时一键封装提示词工程为个人 Skill，自动装备并同步「选择技能」 */}
      {onDistill && (
        <div className="mt-4 pt-3 border-t border-line-soft flex items-center">
          <button
            onClick={onDistill}
            title="将本次任务的方法、流程与提示词沉淀为个人专属技能，保存至「我的技能」"
            className="h-7 px-3 rounded-full border border-line text-[11.5px] text-ink-2 hover:border-pri/50 hover:text-pri transition-colors flex items-center gap-1.5"
          >
            <Hammer className="w-3 h-3" />
            沉淀为技能
          </button>
          <span className="ml-2 text-[10.5px] text-mut-3 whitespace-nowrap">沉淀本次经验，下次一键调用</span>
        </div>
      )}

      {/* 核心卖点 */}
      <div className="mt-3.5">
        <div className="text-[11px] font-medium text-ink mb-1">核心卖点</div>
        <ul className="flex flex-col gap-1">
          {d.points.map((p, i) => (
            <li key={i} className="flex items-start gap-1.5 text-[11px] text-ink-3 leading-relaxed">
              <span className="mt-[5px] w-1 h-1 rounded-full bg-pri shrink-0" />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/** 星级反馈：点星后按分数引导填写（≤3 星含「问题类型」，≥4 星仅「留言」），参考反馈流附件图 1/2/3 */
const ISSUE_TYPES = ['效果图不理想', '文档内容不准确', '款式不符合需求', '生成速度慢', '其他']

function FeedbackRow() {
  const [rating, setRating] = useState(0)
  const [stage, setStage] = useState<'rate' | 'form' | 'done'>('rate')
  const [issue, setIssue] = useState('')
  const [issueOpen, setIssueOpen] = useState(false)
  const [msg, setMsg] = useState('')
  const [consent, setConsent] = useState(true)

  const stars = (cls: string) => (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button key={s} onClick={() => { setRating(s); setStage('form') }} title={`${s} 星`} className="p-0.5">
          <Star className={`${cls} transition-colors ${s <= rating ? 'fill-warn text-warn' : 'text-line-strong'}`} />
        </button>
      ))}
    </div>
  )

  // 图 1 初始行 / 提交后（含感谢）；点星可随时重新打开表单
  if (stage !== 'form')
    return (
      <div className="flex items-center gap-2 px-1">
        <span className="text-[11px] text-mut-2">这个结果怎么样？</span>
        {stars('w-3.5 h-3.5')}
        {stage === 'done' && <span className="text-[11px] text-ok">感谢反馈！</span>}
      </div>
    )

  // 表单：≤3 星 = 图 2（问题类型 + 留言）；≥4 星 = 图 3（仅留言）
  return (
    <div className="self-start w-full rounded-xl border border-line bg-panel p-3.5 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-semibold text-ink">这个结果怎么样？</span>
        {stars('w-4 h-4')}
      </div>
      {rating <= 3 && (
        <div className="relative">
          <p className="text-[12px] font-medium text-ink mb-1.5">问题类型 <span className="text-mut-2 font-normal">（可选）</span></p>
          <button
            onClick={() => setIssueOpen((v) => !v)}
            className="w-full h-9 px-3 rounded-lg bg-fill-2 flex items-center justify-between text-[12.5px]"
          >
            <span className={issue ? 'text-ink' : 'text-mut-2'}>{issue || '请选择'}</span>
            <ChevronDown className={`w-3.5 h-3.5 text-mut transition-transform ${issueOpen ? 'rotate-180' : ''}`} />
          </button>
          {issueOpen && (
            <div className="absolute left-0 right-0 bottom-full mb-1 z-40 bg-panel rounded-xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.12)] py-1">
              {ISSUE_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => { setIssue(t); setIssueOpen(false) }}
                  className="w-full px-3 py-2 text-left text-[12.5px] text-ink-2 hover:bg-fill transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
      <div>
        <p className="text-[12px] font-medium text-ink mb-1.5">留言 <span className="text-mut-2 font-normal">（可选）</span></p>
        <textarea
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          placeholder="额外反馈"
          rows={4}
          className="w-full resize-none rounded-lg bg-fill-2 px-3 py-2.5 text-[12.5px] outline-none placeholder:text-mut-2"
        />
      </div>
      <div className="flex items-center justify-between gap-2">
        <button onClick={() => setConsent((v) => !v)} className="flex items-center gap-1.5 text-[11.5px] text-ink-2 whitespace-nowrap">
          <span className={`w-4 h-4 rounded flex items-center justify-center border transition-colors ${consent ? 'bg-pri border-pri' : 'border-line-strong bg-panel'}`}>
            {consent && <Check className="w-3 h-3 text-white" />}
          </span>
          通过我的反馈帮助画衣衣改进
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setStage('rate')}
            className="h-8 px-3.5 rounded-lg border border-line text-[12.5px] text-ink-2 hover:bg-fill transition-colors"
          >
            跳过评论
          </button>
          <button
            onClick={() => setStage('done')}
            className="h-8 px-4 rounded-lg bg-pri text-white text-[12.5px] font-medium hover:bg-pri/90 transition-colors"
          >
            提交
          </button>
        </div>
      </div>
    </div>
  )
}

/** 询问模式 · 情景化提问卡片：推理开始产出结果时自动触发，等待用户选择后再继续交付（支持多选） */
/* ---- AI 文档式排版：加粗小标题 / 项目符号 / 色值代码片 ---- */
function renderInline(seg: string, kp: string): ReactNode[] {
  const out: ReactNode[] = []
  const re = /(\*\*[^*]+\*\*|#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b)/g
  let last = 0
  let m: RegExpExecArray | null
  let k = 0
  while ((m = re.exec(seg))) {
    if (m.index > last) out.push(seg.slice(last, m.index))
    const tok = m[0]
    if (tok.startsWith('**')) {
      out.push(<strong key={`${kp}-b${k++}`} className="font-semibold text-ink">{tok.slice(2, -2)}</strong>)
    } else {
      out.push(<code key={`${kp}-c${k++}`} className="mx-0.5 px-1.5 py-px rounded-md bg-fill text-[12px] leading-5 text-ink-2 font-medium">{tok}</code>)
    }
    last = m.index + tok.length
  }
  if (last < seg.length) out.push(seg.slice(last))
  return out
}

function AiRichText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`text-[13px] leading-[1.9] text-ink ${className}`}>
      {text.split('\n').map((ln, i) => {
        const t = ln.trim()
        if (!t) return <div key={i} className="h-1.5" />
        const bullet = /^[•·▪]\s*/.test(t) || /^[-–—]\s+/.test(t)
        if (bullet) {
          const body = t.replace(/^[•·▪]\s*/, '').replace(/^[-–—]\s+/, '')
          return (
            <div key={i} className="flex items-start gap-2">
              <span className="text-mut shrink-0">•</span>
              <span className="min-w-0">{renderInline(body, `l${i}`)}</span>
            </div>
          )
        }
        return <p key={i}>{renderInline(t, `l${i}`)}</p>
      })}
    </div>
  )
}

function AskCard({
  context,
  question,
  options,
  multi,
  preset,
  answer,
  skipped,
  onSubmit,
  onSkip,
}: {
  context: string // 触发说明（结合画布上下文的意图判断）
  question: string
  options: string[] // 之后固定追加「输入自定义回答…」
  multi?: boolean // 多选模式（交付范围类问题）
  preset?: number[] // 多选模式下的推荐勾选项
  answer?: string
  skipped?: boolean
  onSubmit: (choices: number[], customText?: string) => void
  onSkip: () => void
}) {
  const CUSTOM = options.length // 自定义回答固定为最后一个选项
  const all = [...options, '输入自定义回答…']
  const [open, setOpen] = useState(true)
  const [sel, setSel] = useState<number[]>(multi ? (preset ?? []) : [])
  const [custom, setCustom] = useState('')
  const answered = answer !== undefined || skipped
  const hasCustom = sel.includes(CUSTOM)
  const picked = sel.filter((j) => j !== CUSTOM)
  const canSubmit = picked.length > 0 || (hasCustom && custom.trim().length > 0)

  const toggle = (j: number) => {
    if (answered) return
    if (multi) {
      setSel((v) => (v.includes(j) ? v.filter((x) => x !== j) : [...v, j]))
    } else {
      setSel([j])
    }
  }

  return (
    <div className="self-start w-full">
      <p className="text-[12px] text-mut mb-1">深度思考</p>
      <AiRichText text={context} className="mb-2" />
      <div className="rounded-xl border border-line-soft bg-fill-2 overflow-hidden">
        {/* 可折叠标题行 */}
        <button onClick={() => setOpen((v) => !v)} className="w-full flex items-center gap-1.5 px-3 py-2.5 text-[12px] font-medium text-ink">
          <HelpCircle className="w-3.5 h-3.5 text-mut shrink-0" />
          问题
          {multi && !answered && <span className="text-[10px] px-1.5 py-px rounded bg-acc-soft text-acc border border-acc-line">可多选</span>}
          <ChevronDown className={`w-3.5 h-3.5 ml-auto text-mut transition-transform ${open ? '' : '-rotate-90'}`} />
        </button>
        {open && (
          <div className="px-3 pb-3">
            <div className="rounded-lg bg-panel border border-line-soft p-3">
              <p className="text-[12.5px] font-medium text-ink">{question}</p>
              <div className="mt-2.5 flex flex-col gap-1.5">
                {all.map((op, j) => {
                  const active = !answered && sel.includes(j)
                  return (
                    <div key={j}>
                      <button
                        disabled={answered}
                        onClick={() => toggle(j)}
                        className={`w-full flex items-center gap-2.5 rounded-lg border px-3 py-2 text-left text-[12.5px] transition-colors ${
                          active
                            ? 'bg-pri-soft border-pri-line text-pri'
                            : `bg-fill-2 border-transparent text-ink-2 ${answered ? 'cursor-default' : 'hover:border-line'}`
                        }`}
                      >
                        <span className={`text-[11px] font-semibold shrink-0 ${active ? 'text-pri' : 'text-mut'}`}>{String.fromCharCode(65 + j)}</span>
                        {op}
                        {multi && active && <Check className="w-3.5 h-3.5 ml-auto text-pri shrink-0" />}
                      </button>
                      {j === CUSTOM && active && (
                        <input
                          autoFocus
                          value={custom}
                          onChange={(e) => setCustom(e.target.value)}
                          placeholder="请输入你的回答…"
                          className="mt-1.5 w-full h-8 rounded-lg border border-pri-line bg-panel px-2.5 text-[12px] text-ink outline-none placeholder:text-mut-3"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
              {!answered ? (
                <div className="mt-3 flex justify-end gap-1.5">
                  <button onClick={onSkip} className="h-7 px-3.5 rounded-full text-[11.5px] text-mut bg-fill hover:bg-line-soft transition-colors">
                    跳过
                  </button>
                  <button
                    disabled={!canSubmit}
                    onClick={() => onSubmit(picked, hasCustom ? custom.trim() : undefined)}
                    className={`h-7 px-3.5 rounded-full text-[11.5px] font-medium transition-colors ${
                      canSubmit ? 'bg-pri text-white hover:bg-pri-deep' : 'bg-fill text-mut-3 cursor-not-allowed'
                    }`}
                  >
                    提交
                  </button>
                </div>
              ) : (
                <div className="mt-3 text-[11px] text-mut">{skipped ? '已跳过，按默认交付范围继续执行' : `已选择：${answer}`}</div>
              )}
            </div>
          </div>
        )}
      </div>
      {!answered && (
        <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-mut">
          <Loader2 className="w-3 h-3 animate-spin" />
          等待中……
        </div>
      )}
    </div>
  )
}

import { GLYPHS, PLATFORM_SKILLS, teamMemberOf, useSkillStore, type SkillEntry, type TeamMember } from './skills'
import { ConnectorLinkBar, ConnectorsModal } from './Connectors'
import { useScrollAxis, ScrollAxis } from './scrollBar'

/* ================= 主面板 ================= */

export default function ChatPanel({
  onBackHome,
  width,
  onWidthChange,
  minW = 280,
  maxW = 620,
  defaultW = 330,
  collapsed,
  onCollapsedChange,
  marks,
  onRemoveMark,
  onClearMarks,
  onDeliver,
  onOpenCanvas,
  initialTask,
  onInitialTaskConsumed,
  initialSkill,
  initialTeam,
  agentInbox,
  onAgentInboxConsumed,
  projectAgent,
}: {
  /** 返回 Agent 首页（原顶部导航栏的返回按钮，现融合到面板头部） */
  onBackHome?: () => void
  width: number
  onWidthChange: (w: number) => void
  minW?: number
  maxW?: number
  defaultW?: number
  collapsed: boolean
  onCollapsedChange: (v: boolean) => void
  marks: Mark[]
  onRemoveMark: (id: number) => void
  onClearMarks: () => void
  /** 任务交付：通知画布生成设计节点组（views 为各交付卡片的视角标签，与画廊图片同序） */
  onDeliver: (title: string, views: string[]) => void
  /** 视野定位：传索引定位到对应交付卡片，不传则定位整个节点组 */
  onOpenCanvas: (index?: number) => void
  /** 从 Agent 首页分配过来的任务：面板挂载后自动执行一次 */
  initialTask?: { text: string; autoSubmit: boolean } | null
  onInitialTaskConsumed?: () => void
  /** 技能页「使用」带过来的技能：自动选中至「选择技能」 */
  initialSkill?: { id: string; name: string } | null
  /** 首页「选择团队」带过来的团队快照：显示在对话框头部，成员可增减（R-02 会话快照） */
  initialTeam?: { name: string; members: TeamMember[] } | null
  /** 画布「发送至Agent」带过来的图片：自动追加为输入框附件 */
  agentInbox?: { ts: number; items: { name: string; url: string }[] } | null
  onAgentInboxConsumed?: () => void
  projectAgent?: ProjectAgentBridge
}) {
  // 文件名：点击激活「更改名称」（Enter/失焦确认，Esc 取消，空名回退）
  const [fileName, setFileName] = useState('未命名文件')
  const [convoTitle, setConvoTitle] = useState('新建对话') // 第二行对话标题：初始「新建对话」（不可点击），发送需求后自动提取首行文本重命名
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const commitName = () => {
    const v = nameDraft.trim()
    if (v) setFileName(v)
    setRenaming(false)
  }
  const [input, setInput] = useState('')
  const [localItems, setItems] = useState<Item[]>([])
  const items = projectAgent?.items ?? localItems
  // 历史对话：新建时把当前对话归档到这里，可从「历史」恢复
  const [convos, setConvos] = useState<Array<{ id: number; title: string; time: string; items: Item[] }>>([])
  const [histOpen, setHistOpen] = useState(false)
  const [localBusy, setBusy] = useState(false)
  const busy = projectAgent?.busy ?? localBusy
  const [mode, setMode] = useState<'auto' | 'ask'>(() => (localStorage.getItem('hyy-exec-mode') === 'ask' ? 'ask' : 'auto'))
  useEffect(() => {
    if (projectAgent?.draft !== undefined) {
      setInput(projectAgent.draft)
      if (projectAgent.prepared) setMode('auto')
      projectAgent.onDraftConsumed()
    }
  }, [projectAgent?.draft]) // eslint-disable-line react-hooks/exhaustive-deps
  // 底部对话栏（PRD）：执行模式与模型档位持久化用户偏好
  const [model, setModel] = useState(() => localStorage.getItem('hyy-model') || 'standard')
  const [mmMode, setMmMode] = useState<'自动' | '自定义'>('自动') // 多模态（展示用）
  const [skillId, setSkillId] = useState<string | null>(null)
  const [customTier, setCustomTier] = useState<string | null>(() => {
    const m = localStorage.getItem('hyy-model') // 与首页共享档位偏好（PRD 3.3 双向同步）
    return m && CUSTOM_MODELS.some((cm) => cm.key === m) ? m : null
  }) // 「自定义」里选中的模型档位
  const [attachments, setAttachments] = useState<{ id: number; name: string; size: number; preview?: string; agent?: boolean }[]>([])
  const [enhancing, setEnhancing] = useState(false)
  const [enhanced, setEnhanced] = useState(false) // 已增强：图标切换为「重新增强」
  const [openPop, setOpenPop] = useState<'skill' | 'mode' | 'preset' | 'model' | 'file' | 'team' | null>(null)
  /* —— 浮层统一滑动条：6px 浅灰移动轴（与本面板对话列表右侧移动轴同标准） —— */
  const teamPopAx = useScrollAxis()
  const skillListAx = useScrollAxis()
  const [skillQ, setSkillQ] = useState('')
  const [expandSkill, setExpandSkill] = useState<string | null>(null) // 技能子选项展开
  // 技能模块：已装备技能（共享仓库，双向同步技能页）+ 沉淀弹窗
  const { equippedSkills, addMine } = useSkillStore()
  // 团队模式：选择团队后发送指令进入本对话，头部显示团队信息（成员热插拔仅本次会话生效）
  const [team, setTeam] = useState<{ name: string; members: TeamMember[] } | null>(null)
  const removeTeamMember = (skillId: string) => {
    setTeam((t) => {
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
    setTeam((t) => (t && !t.members.some((m) => m.skillId === skillId) ? { ...t, members: [...t.members, teamMemberOf(skillId)] } : t))
    setOpenPop(null)
  }
  const [distill, setDistill] = useState<{ prompt: string; name: string; desc: string } | null>(null)
  const [toast, setToast] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  // 本地拖拽上传：把图片/文件直接拖入输入框即可作为附件（drag 计数避免子元素进出造成闪烁）
  const [dragOver, setDragOver] = useState(false)
  const [connOpen, setConnOpen] = useState(false) // 连接器（应用链接）设置弹窗
  // 应用接入条：可关闭（✕），关闭后底部工具栏出现「连接器」图标，点击恢复
  const [connBarClosed, setConnBarClosed] = useState(() => localStorage.getItem('hyy-connbar-closed') === '1')
  useEffect(() => localStorage.setItem('hyy-connbar-closed', connBarClosed ? '1' : '0'), [connBarClosed])
  const dragDepthRef = useRef(0)
  const taRef = useRef<HTMLTextAreaElement>(null)
  useEffect(() => localStorage.setItem('hyy-exec-mode', mode), [mode])
  useEffect(() => localStorage.setItem('hyy-model', model), [model])
  // 点击输入卡片外部时关闭所有浮层
  useEffect(() => {
    if (!openPop) return
    const onDown = (e: PointerEvent) => {
      if (!(e.target as HTMLElement).closest('[data-pop]')) setOpenPop(null)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [openPop])
  // 输入框高度自适应（含技能/预设/增强的 programmatic 填充），超出最大高度滚动
  useEffect(() => {
    const t = taRef.current
    if (!t) return
    t.style.height = 'auto'
    t.style.height = `${Math.min(t.scrollHeight, 176)}px`
  }, [input])
  const showToast = (msg: string) => {
    setToast(msg)
    timersRef.current.push(window.setTimeout(() => setToast(''), 2600))
  }
  const [animW, setAnimW] = useState(false)
  // 展开状态由实际宽度派生，避免与手动拖拽调宽失步（失步会导致按钮点击无响应）
  const expanded = width >= maxW - 24
  const listRef = useRef<HTMLDivElement>(null)
  const resizeRef = useRef<{ startX: number; startW: number } | null>(null)
  const prevWidthRef = useRef(defaultW)
  const timersRef = useRef<number[]>([])

  // 展开/还原面板宽度
  const toggleExpand = () => {
    setAnimW(true)
    window.setTimeout(() => setAnimW(false), 320)
    if (expanded) {
      const prev = prevWidthRef.current
      onWidthChange(prev >= minW && prev < maxW - 24 ? prev : defaultW)
    } else {
      prevWidthRef.current = width
      onWidthChange(maxW)
    }
  }

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' })
  }, [items, busy])

  useEffect(() => () => timersRef.current.forEach((t) => window.clearTimeout(t)), [])

  // Agent 首页分配的任务（PRD 3.2）：autoSubmit=true（模板/技能卡）直接发起；false（手动输入）仅填充并聚焦，等待手动发送
  const sendRef = useRef<(preset?: string) => void>(() => {})
  // 任务进行中收到自动提交（如标记状态栏「发送」）：挂起排队，当前任务结束后立即执行，需求不丢失
  const pendingAutoRef = useRef<string | null>(null)
  useEffect(() => {
    if (initialTask) {
      if (initialTask.autoSubmit) {
        if (busy) pendingAutoRef.current = initialTask.text
        else sendRef.current(initialTask.text)
      } else {
        setInput(initialTask.text)
        later(() => taRef.current?.focus(), 350)
      }
      if (initialSkill) setSkillId(initialSkill.id) // 技能页「使用」：技能随任务一并选中
      if (initialTeam) setTeam(initialTeam) // 首页「选择团队」：团队快照载入对话框头部
      onInitialTaskConsumed?.()
    }
  }, [initialTask]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!busy && pendingAutoRef.current != null) {
      const t = pendingAutoRef.current
      pendingAutoRef.current = null
      sendRef.current(t)
    }
  }, [busy])

  // 画布点选图片自动关联：选中的图片即刻同步为输入框附件（替换旧的画布关联附件，保留手动上传的附件；取消选择则移除）
  useEffect(() => {
    if (!agentInbox) return
    setAttachments((arr) => [
      ...arr.filter((a) => !a.agent),
      ...agentInbox.items.map((it, i) => ({ id: Date.now() + i, name: it.name, size: 0, preview: it.url, agent: true })),
    ])
    if (agentInbox.items.length && !collapsed) later(() => taRef.current?.focus(), 350)
    onAgentInboxConsumed?.()
  }, [agentInbox]) // eslint-disable-line react-hooks/exhaustive-deps

  const startResize = (e: React.PointerEvent) => {
    e.preventDefault()
    resizeRef.current = { startX: e.clientX, startW: width }
    document.body.style.cursor = 'col-resize'
    const onMove = (ev: PointerEvent) => {
      const r = resizeRef.current
      if (!r) return
      onWidthChange(Math.min(maxW, Math.max(minW, r.startW + (ev.clientX - r.startX))))
    }
    const onUp = () => {
      resizeRef.current = null
      document.body.style.cursor = ''
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  // 互斥逻辑：标记需求带入输入区后，点选图片自动关联的附件即时消失（标记已引用图片区域，二者不共存）
  useEffect(() => {
    if (marks.length) setAttachments((arr) => arr.filter((a) => !a.agent))
  }, [marks])

  const later = (fn: () => void, ms: number) => {
    timersRef.current.push(window.setTimeout(fn, ms))
  }

  /* —— 卡片右侧灰色上下移动轴：悬浮高亮，拖动它上下移动 AI 对话内容 —— */
  const [sb, setSb] = useState({ top: 0, h: 0, show: false })
  const [sbDrag, setSbDrag] = useState(false)
  const sbDragRef = useRef<{ startY: number; startTop: number } | null>(null)
  const syncSb = () => {
    const el = listRef.current
    if (!el) return
    const { scrollHeight: sh, clientHeight: ch, scrollTop: st } = el
    if (sh <= ch + 1) {
      setSb((s) => (s.show ? { top: 0, h: 0, show: false } : s))
      return
    }
    const h = Math.max(28, (ch / sh) * ch)
    const top = (st / (sh - ch)) * (ch - h)
    setSb((s) => (s.show && Math.abs(s.top - top) < 0.5 && Math.abs(s.h - h) < 0.5 ? s : { top, h, show: true }))
  }
  useEffect(() => {
    const el = listRef.current
    if (!el) return
    syncSb()
    const ro = new ResizeObserver(syncSb)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  useEffect(syncSb) // 消息/交付等内容变化后同步移动轴
  const startSbDrag = (e: React.PointerEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const el = listRef.current
    if (!el) return
    sbDragRef.current = { startY: e.clientY, startTop: el.scrollTop }
    setSbDrag(true)
    const onMove = (ev: PointerEvent) => {
      const d = sbDragRef.current
      if (!d) return
      const sh = el.scrollHeight
      const ch = el.clientHeight
      const hPx = Math.max(28, (ch / sh) * ch)
      el.scrollTop = d.startTop + ((ev.clientY - d.startY) * (sh - ch)) / (ch - hPx)
    }
    const onUp = () => {
      sbDragRef.current = null
      setSbDrag(false)
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
  }

  /* —— 交付物驱动型 Agent 流程：计划拆解 → 进度反馈 → 资源卡片交付 → 延伸建议 → 反馈 —— */
  // 询问模式：推理开始产出结果时，按情景自动触发提问卡片，等用户选择后再继续交付
  const askResumeRef = useRef<{ title: string } | null>(null)

  const PROG = ['调研 2026 秋冬流行趋势', '生成设计效果图', '撰写设计说明文档并交付']

  const completeStep = (i: number) => {
    setItems((m) =>
      m.map((it) =>
        it.kind === 'progress' && !it.done
          ? { ...it, steps: it.steps.map((s, j) => (j <= i ? { ...s, done: true } : s)) }
          : it,
      ),
    )
  }

  /** 情景化提问内容：根据指令特征自动判断要问什么（歧义澄清 / 交付范围确认） */
  const buildAsk = (text: string): { context: string; question: string; options: string[]; multi?: boolean; preset?: number[] } => {
    const t = text.trim()
    if (/^\d+$/.test(t)) {
      // 纯数字等歧义指令：单看字面无法确定意图，结合画布上下文追问
      return {
        context: `你输入了「${t}」，但单看这个数字我无法确定你想做什么。结合当前画布上下文，想跟你确认一下意图。`,
        question: `你说的「${t}」是想让我做什么？`,
        options: [`生成 ${t} 张设计图`, `引用画布中第 ${t} 个素材`, '其他含义'],
      }
    }
    if (t.length > 0 && t.length <= 2) {
      // 信息量过少的指令：澄清是新生成还是基于画布改款
      return {
        context: `你输入了「${t}」，信息量有点少，我担心理解出现偏差。结合当前画布上下文，想跟你确认一下意图。`,
        question: `你说的「${t}」是想让我做什么？`,
        options: ['按字面意思直接生成', '基于画布当前款式做改款', '其他含义'],
      }
    }
    // 常规任务：推理开始产出结果时，确认本次交付范围（独立可选项，支持多选）
    return {
      context: '收到！我已完成前期调研，即将开始产出结果。正式交付前，想跟你确认一下这次的交付范围，已按推荐勾选，可自由增删。',
      question: '这次任务你希望收到哪些交付物？',
      options: ['设计效果图（4 张视图）', '设计说明文档', '核心营销文案'],
      multi: true,
      preset: [0, 1], // 推荐：效果图 + 设计说明文档
    }
  }

  /** 交付资源卡片 + 画布同步（scope：按用户多选组合交付，null 走默认「效果图 + 文档」） */
  const deliverTask = (title: string, scope: { doc: boolean; copy: boolean } | null) => {
    const doc = scope?.doc ?? true
    const copy = scope?.copy ?? false
    const points = SELL_POINTS.slice(0, 4)
    const d: Delivery = {
      title,
      views: VIEW_LABELS.map((label, i) => ({ label, palette: i })),
      docName: doc ? `${title}-设计说明文档.md` : '',
      docBody: doc ? buildDoc(title, points) : '',
      points,
    }
    const extra: Item[] = copy
      ? [{ kind: 'ai', text: `另外，按你的选择附上一段核心营销文案：\n\n**「${title}」**\n${points[0]}，${points[2]}。这个秋冬，让通勤与松弛感同频。` }]
      : []
    const parts = ['4 张高质量设计效果图']
    if (doc) parts.push('设计说明文档')
    if (copy) parts.push('核心营销文案')
    const suggest = [
      ...(doc ? [] : ['补充生成设计说明文档']),
      '生成不同角度的模特展示图',
      ...(copy ? [] : ['生成此款的核心营销文案']),
      '基于此款做 A+ 详情页',
    ]
    setItems((m) => [
      ...m.map((it) => (it.kind === 'progress' ? { ...it, done: true } : it)),
      ...extra,
      { kind: 'ai', text: `设计任务已完成！\n\n**本次交付**\n${parts.map((pt) => `• ${pt}`).join('\n')}\n\n**资产归档**\n所有资产已同步归档，并在画布中生成了对应的设计节点组。` },
      { kind: 'delivery', d },
      { kind: 'suggest', items: suggest },
      { kind: 'feedback' },
    ])
    onDeliver(title, d.views.map((v) => v.label))
    setBusy(false)
  }

  /** 提问卡片：提交回答（多选数组 + 可含自定义回答），随后继续剩余步骤并按所选范围交付 */
  const answerAsk = (index: number, choices: number[], customText: string | undefined, multi: boolean) => {
    const r = askResumeRef.current
    askResumeRef.current = null
    setItems((arr) =>
      arr.map((it, j) => {
        if (j !== index || it.kind !== 'ask') return it
        const labels = choices.map((c) => it.options[c])
        if (customText) labels.push(`自定义：${customText}`)
        return { ...it, answer: labels.join(' + ') }
      }),
    )
    if (customText) setItems((arr) => [...arr, { kind: 'user', text: `补充要求：${customText}` }])
    if (!r) return
    // 多选（交付范围）：A=效果图（始终交付） B=设计说明文档 C=核心营销文案；单选（歧义澄清）走默认范围
    const scope = multi ? { doc: choices.includes(1), copy: choices.includes(2) } : null
    later(() => completeStep(1), 400)
    later(() => completeStep(2), 900)
    later(() => deliverTask(r.title, scope), 1500)
  }

  /** 提问卡片：跳过，按默认交付范围（效果图 + 文档）继续 */
  const skipAsk = (index: number) => {
    const r = askResumeRef.current
    askResumeRef.current = null
    setItems((arr) => arr.map((it, j) => (j === index && it.kind === 'ask' ? { ...it, skipped: true } : it)))
    if (!r) return
    later(() => completeStep(1), 400)
    later(() => completeStep(2), 900)
    later(() => deliverTask(r.title, null), 1500)
  }

  const runTask = (rawText: string, files: string[] = []) => {
    const text = rawText.trim()
    if ((!text && !files.length && !marks.length) || busy) return
    if (projectAgent) {
      const context = marks.map(m => `${m.part || '画布标记'}：${m.note || '按此位置修改'}`).join('；')
      projectAgent.onSend([text, context, files.length ? `画布参考：${files.join('、')}` : ''].filter(Boolean).join('\n'), mode)
      setInput(''); setAttachments([]); onClearMarks()
      return
    }
    // 标记需求：每个带入的标记 = 一个独立小需求（编号·部位：描述），多个表示多个需求同时执行
    const reqText = marks.map((m, i) => `${i + 1}·${m.part || '标记'}${m.note ? `：${m.note}` : ''}`).join('；')
    const fileSuffix = files.length ? `（附件：${files.join('、')}）` : ''
    const hadMarks = marks.length > 0
    const title = taskTitle(text || reqText || '附件素材任务')
    setItems((m) => [
      ...m,
      {
        kind: 'user',
        text:
          (text ? text + (reqText ? `（标记需求：${reqText}）` : '') : reqText ? `标记需求：${reqText}` : '上传附件素材') +
          fileSuffix,
      },
    ])
    setInput('')
    setAttachments([])
    setEnhanced(false)
    if (hadMarks) onClearMarks() // 发送后清除输入框中的标记
    setBusy(true)

    // 1) 计划拆解
    later(() => {
      setItems((m) => [
        ...m,
        {
          kind: 'plan',
          intro: hadMarks
            ? '没问题！我已结合你标记的位置信息锁定画面中的具体区域，将基于视觉识别进行精准修改。我将按照以下步骤进行：'
            : '没问题！我将基于画布中的款式为你完成本次设计任务。我将按照以下步骤进行：',
          steps: ['趋势研究：调研 2026 秋冬流行色彩、面料与剪裁趋势', '创意设计：结合趋势构思具有市场潜力的设计方案', '视觉呈现：生成高质量设计效果图', '设计说明：输出详细设计细节与搭配指南'],
          outro: '请稍等，我这就开始。',
        },
      ])
    }, 500)

    // 2) 进度轻量反馈
    later(() => {
      setItems((m) => [...m, { kind: 'progress', steps: PROG.map((label) => ({ label, done: false })), done: false }])
    }, 1300)

    if (mode === 'ask') {
      // 询问模式：完成前期调研后暂停 —— 推理开始产出结果时插入情景化提问卡片，等待用户选择
      later(() => completeStep(0), 2100)
      later(() => {
        askResumeRef.current = { title }
        setItems((m) => [...m, { kind: 'ask', ...buildAsk(text) }])
      }, 2700)
      return
    }

    // 自动模式：全流程免打扰，直接交付
    PROG.forEach((_, i) => later(() => completeStep(i), 2100 + i * 800))
    const DELIVER_AT = 2100 + PROG.length * 800 + 400
    later(() => deliverTask(title, null), DELIVER_AT)
  }
  // 建议卡片 / 延伸建议 / 首页任务：直接发起（开头不设确认环节；询问模式在推理中途提问）
  // 新建对话：当前对话非空则归档进历史，随后清空输入区与消息流
  const newConvo = () => {
    if (projectAgent) { projectAgent.onNew(); return }
    if (items.length) {
      const firstUser = items.find((m) => m.kind === 'user')
      const title = firstUser && 'text' in firstUser ? firstUser.text.slice(0, 18) : '未命名对话'
      const d = new Date()
      const time = `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      setConvos((cs) => [{ id: Date.now(), title, time, items }, ...cs])
    }
    setItems([])
    setInput('')
    setAttachments([])
    setHistOpen(false)
    setConvoTitle('新建对话')
  }

  // 恢复历史对话：当前对话先归档（若有内容），再载入所选对话
  const loadConvo = (id: number) => {
    const target = convos.find((c) => c.id === id)
    if (!target) return
    if (items.length) {
      const firstUser = items.find((m) => m.kind === 'user')
      const title = firstUser && 'text' in firstUser ? firstUser.text.slice(0, 18) : '未命名对话'
      const d = new Date()
      const time = `${d.getMonth() + 1}月${d.getDate()}日 ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      setConvos((cs) => [{ id: Date.now(), title, time, items }, ...cs.filter((c) => c.id !== id)])
    } else {
      setConvos((cs) => cs.filter((c) => c.id !== id))
    }
    setItems(target.items)
    setInput('')
    setAttachments([])
    setHistOpen(false)
    setConvoTitle(target.title)
  }

  const send = (preset?: string) => {
    const text = (preset ?? input).trim()
    if ((!text && !marks.length) || busy) return
    runTask(text)
  }
  sendRef.current = send

  // 发送按钮 / Enter：直接发起任务（开头不设确认环节；询问模式在推理中途提问）
  const handleSend = () => {
    const text = input.trim()
    if ((!text && !attachments.length && !marks.length) || busy) return
    // 对话标题：用户发送需求后，自动提取首行文本填充重命名（初始为「新建对话」）
    if (convoTitle === '新建对话' && text) {
      const firstLine = text.split('\n')[0].trim() || text
      setConvoTitle(firstLine.slice(0, 24))
    }
    runTask(text, attachments.map((a) => a.name))
  }

  // 技能点击：无子选项直接填充预设指令；含子选项则展开二级列表（PRD 3.1）
  const clickSkill = (sk: Skill) => {
    if (sk.sub) {
      setExpandSkill((v) => (v === sk.id ? null : sk.id))
      return
    }
    setInput(sk.prompt || '')
    // 保留已有附件（如画布关联的图片）：技能模块与内容同时存在，不自动提交
    setSkillId(sk.id)
    setOpenPop(null)
  }

  // 增强提示词：调用期间按钮加载态防重复点击；成功后替换输入内容（PRD 3.4）
  const enhance = () => {
    const t = input.trim()
    if (!t || enhancing) return
    if (projectAgent) { setInput(`${t}\n请结合当前项目背景和引用资料，说明依据，先给出可编辑的草稿，并保留待确认项。`); setEnhanced(true); return }
    setEnhancing(true)
    later(() => {
      setInput(
        `请生成一张${t.replace(/[。！？.!?，,]+$/,'')}的设计图，要求：纯白背景（#FFFFFF），产品居中放置，光线明亮均匀、柔和无明显阴影，色彩饱和度高且还原真实，构图简洁干净，突出产品本身细节与质感，整体风格专业、清晰、商业化，符合主流电商平台的视觉规范。`,
      )
      setEnhancing(false)
      setEnhanced(true)
    }, 900)
  }

  // 附件上传：前端校验类型与大小（≤50MB），违规阻止并提示（PRD 3.5 / 5）
  const pickFiles = (list: FileList | null) => {
    if (!list) return
    if (projectAgent) { projectAgent.onUpload(Array.from(list)); return }
    const next = [...attachments]
    for (const f of Array.from(list)) {
      const ext = f.name.split('.').pop()?.toLowerCase() || ''
      const okType = f.type.startsWith('image/') || f.type.startsWith('video/') || ACCEPT_EXT.includes(ext)
      if (!okType) {
        showToast(`「${f.name}」类型不支持：仅限图片 / 视频 / 文档`)
        continue
      }
      if (f.size > MAX_FILE_SIZE) {
        showToast(`「${f.name}」超过 50MB 上限，已阻止上传`)
        continue
      }
      next.push({ id: Date.now() + next.length, name: f.name, size: f.size, preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : undefined })
    }
    setAttachments(next)
  }

  // 项目菜单（LOGO 功能卡片）：首页 / 项目列表 / 新建项目 / 创建项目副本，收起与展开态共用
  const fileMenuItems = [
    { label: '首页', act: () => onBackHome?.() },
    { label: '项目列表', act: () => onBackHome?.() },
    { label: '新建项目', act: () => onBackHome?.() },
    { label: '创建项目副本', act: () => showToast(`已创建副本「${fileName} 副本」`) },
  ]
  const fileMenu = openPop === 'file' && (
    <div className="absolute left-0 top-full mt-2 z-50 w-44 rounded-xl bg-ink py-1.5 shadow-[0_12px_48px_rgba(0,0,0,0.28)]">
      {fileMenuItems.map((it) => (
        <button
          key={it.label}
          onClick={() => {
            setOpenPop(null)
            it.act()
          }}
          className="w-full px-4 py-2.5 text-left text-[13px] text-panel/90 hover:bg-white/10 transition-colors"
        >
          {it.label}
        </button>
      ))}
    </div>
  )

  /* 头部右侧操作组：新建 / 历史 / 展宽（普通头部与团队头部共用） */
  const headerActions = (
    <div className="shrink-0 flex items-center gap-1">
          <button
            onClick={newConvo}
            title="新建对话"
            aria-label="新建对话"
            className="w-7 h-7 rounded-md flex items-center justify-center text-mut hover:bg-fill hover:text-ink transition-colors"
          >
            <SquarePen className="w-4 h-4" />
          </button>
          <div className="relative">
            <button
              onClick={() => projectAgent ? projectAgent.onHistory() : setHistOpen(!histOpen)}
              title="历史对话"
              aria-label="历史对话"
              className={`w-7 h-7 rounded-md flex items-center justify-center transition-colors ${histOpen ? 'bg-fill text-ink' : 'text-mut hover:bg-fill hover:text-ink'}`}
            >
              <History className="w-4 h-4" />
            </button>
            {histOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setHistOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 z-50 w-60 bg-panel rounded-xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.12)] py-1.5">
                  <div className="px-3.5 py-1.5 text-[11px] text-mut-2">历史对话</div>
                  {convos.length === 0 && <div className="px-3.5 py-3 text-[12.5px] text-mut-3">暂无历史对话</div>}
                  {convos.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => loadConvo(c.id)}
                      className="w-full text-left px-3.5 py-2 hover:bg-fill transition-colors"
                    >
                      <div className="text-[12.5px] text-ink truncate">{c.title}</div>
                      <div className="text-[10.5px] text-mut-3 mt-0.5">{c.time}</div>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <button
            onClick={toggleExpand}
            title={expanded ? '还原面板宽度' : '展开面板'}
            className={projectAgent ? 'hidden' : 'w-7 h-7 rounded-md flex items-center justify-center text-mut hover:bg-fill hover:text-ink transition-colors'}
          >
            {expanded ? <Shrink className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
          </button>
        </div>
  )

  /* 收起态：胶囊导航条（保留 LOGO / 文件名 / 展开入口的信息露出，点击文件名或图标展开） */
  if (collapsed) {
    return (
      <div className="absolute left-2 top-2 z-30 h-12 pl-2.5 pr-1.5 bg-panel rounded-full border border-line shadow-[0_4px_20px_rgba(0,0,0,0.08)] flex items-center gap-2">
        <div className="relative shrink-0" data-pop>
          <button
            onClick={() => projectAgent ? onBackHome?.() : setOpenPop(openPop === 'file' ? null : 'file')}
            title={projectAgent ? '返回项目任务' : '项目菜单'}
            className="block w-7 h-7 rounded-full hover:opacity-70 transition-opacity"
          >
            <img src={logoUrl} alt="画衣衣" className="w-full h-full object-contain" />
          </button>
          {fileMenu}
        </div>
        <button
          onClick={() => onCollapsedChange(false)}
          title="展开 AI 对话"
          className="max-w-36 truncate text-[13.5px] font-semibold text-ink hover:text-pri transition-colors"
        >
          {projectAgent?.projectName ?? fileName}
        </button>
        <div className="w-px h-5 bg-line shrink-0" />
        <button
          onClick={() => onCollapsedChange(false)}
          title="展开 AI 对话"
          className="w-8 h-8 rounded-full flex items-center justify-center text-ink-3 hover:bg-fill hover:text-ink transition-colors shrink-0"
        >
          <PanelLeftOpen className="w-4 h-4" />
        </button>
      </div>
    )
  }

  /* 展开态：悬浮卡片 */
  return (
    <aside
      className={`absolute left-2 top-2 bottom-2 z-30 bg-panel rounded-xl border border-line shadow-[0_4px_20px_rgba(0,0,0,0.08)] flex flex-col ${
        animW ? 'transition-[width] duration-300 ease-in-out' : ''
      }`}
      style={{ width: projectAgent?.layout === 'full' ? 'calc(100% - 16px)' : width }}
      data-testid={projectAgent ? 'project-chat' : undefined}
    >
      {/* 调宽热区：面板右侧外边缘（隐形无灰色条），悬浮呈现 ↔ 拖拽光标，按住拖拽调宽 */}
      <div
        onPointerDown={startResize}
        hidden={projectAgent?.layout === 'full'}
        title="拖拽调整面板宽度"
        className="absolute right-0 top-0 bottom-0 w-[12px] -mr-[12px] cursor-col-resize z-40"
      />

      {/* 文件信息行：融合原顶部导航栏左侧功能（点击 LOGO 返回首页，点击文件名更改名称） */}
      <div className={projectAgent ? 'hidden' : 'h-11 shrink-0 flex items-center gap-2 pl-3.5 pr-2.5'}>
        <div className="relative shrink-0" data-pop>
          <button
            onClick={() => projectAgent ? onBackHome?.() : setOpenPop(openPop === 'file' ? null : 'file')}
            title={projectAgent ? '返回项目任务' : '项目菜单'}
            className="block rounded-md hover:opacity-70 transition-opacity"
          >
            <img src={logoUrl} alt="画衣衣" className="w-5 h-5 object-contain" />
          </button>
          {fileMenu}
        </div>
        {renaming ? (
          <input
            autoFocus
            onFocus={(e) => e.target.select()}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitName()
              if (e.key === 'Escape') setRenaming(false)
            }}
            style={{ width: `${Math.min(Math.max([...nameDraft].reduce((n, ch) => n + (ch.charCodeAt(0) > 255 ? 2 : 1), 0) + 2, 6), 44)}ch` }}
            className="max-w-full h-7 px-1.5 rounded-md border border-pri text-[13px] font-medium text-ink outline-none bg-panel"
          />
        ) : (
          <button
            onClick={() => {
              if (projectAgent) { onBackHome?.(); return }
              setNameDraft(fileName)
              setRenaming(true)
            }}
            title={projectAgent ? '返回项目任务' : '点击更改名称'}
            className="min-w-0 truncate text-left text-[13px] font-medium text-ink hover:text-pri transition-colors"
          >
            {projectAgent?.projectName ?? fileName}
          </button>
        )}
        <button
          onClick={() => onCollapsedChange(true)}
          title="收起面板"
          className="ml-auto w-7 h-7 rounded-md flex items-center justify-center text-mut hover:bg-fill hover:text-ink transition-colors shrink-0"
        >
          <PanelLeftClose className="w-4 h-4" />
        </button>
      </div>

      {/* 头部：选择团队后进入本对话 → 显示团队信息栏（团队名 + 使用 N 个 skills + 成员圆形叠排 + 追加/剔除）；否则保持对话标题行 */}
      {team ? (
        <div className="shrink-0 border-b border-line-soft pl-3.5 pr-2.5 pt-2.5 pb-3">
          <div className="flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-indigo-500 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4 text-white" />
            </span>
            <div className="flex-1 min-w-0 flex items-center gap-1.5">
              <span className="min-w-0 truncate text-[13.5px] font-semibold text-ink">{team.name}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-ok shrink-0" />
              <span className="text-[11px] text-mut-2 whitespace-nowrap">使用 {team.members.length} 个 skills 为你工作</span>
            </div>
            {headerActions}
          </div>
          <div className="mt-2.5 flex items-center">
            <span className="flex items-center">
              {team.members.slice(0, 6).map((m) => {
                const G = GLYPHS[m.glyph]
                return (
                  <span key={m.skillId} className="group/tag relative -ml-1.5 first:ml-0" title={`${m.name}（悬停可剔除）`}>
                    <span className={`block w-6 h-6 rounded-full bg-gradient-to-br ${m.tint} border-2 border-panel flex items-center justify-center`}>
                      <G className="w-3 h-3 text-white" />
                    </span>
                    <button
                      onClick={() => removeTeamMember(m.skillId)}
                      title="本次会话中剔除该技能"
                      className="absolute -top-1 -right-1 z-10 w-3.5 h-3.5 rounded-full bg-ink text-panel items-center justify-center hidden group-hover/tag:flex"
                    >
                      <X className="w-2 h-2" />
                    </button>
                  </span>
                )
              })}
              {team.members.length > 6 && (
                <span className="-ml-1.5 w-6 h-6 rounded-full bg-fill border-2 border-panel flex items-center justify-center text-[10px] font-medium text-mut">
                  +{team.members.length - 6}
                </span>
              )}
            </span>
            <span className="relative ml-2">
              <button
                data-pop
                onClick={() => setOpenPop(openPop === 'team' ? null : 'team')}
                title="追加技能（仅本次会话）"
                className={`w-6 h-6 rounded-full border border-dashed flex items-center justify-center transition-colors ${
                  openPop === 'team' ? 'border-pri bg-pri-soft text-pri' : 'border-line-strong text-mut hover:text-pri hover:border-pri/40'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
              {openPop === 'team' && (
                <div data-pop className="absolute top-full mt-1.5 left-0 z-40 w-64 bg-panel rounded-xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.12)] p-1.5">
                <div ref={teamPopAx.ref} onScroll={teamPopAx.sync} className="max-h-[248px] overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {PLATFORM_SKILLS.map((sk) => {
                    const added = team.members.some((m) => m.skillId === sk.id)
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
                setTeam(null)
                showToast('已退出团队模式')
              }}
              title="退出团队模式"
              className="ml-auto w-6 h-6 rounded-full flex items-center justify-center text-mut-3 hover:text-ink transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ) : (
        <div className="h-12 shrink-0 border-b border-line-soft flex items-center justify-between px-3.5">
          <div className="flex-1 min-w-0 flex items-center gap-2">
            <span className="min-w-0 truncate text-[13px] font-normal text-ink">{projectAgent?.taskName ?? convoTitle}</span>
          </div>
          {headerActions}
        </div>
      )}

      {/* 消息区 */}
      <div className="relative flex-1 min-h-0 flex flex-col">
        <div ref={listRef} onScroll={syncSb} className="flex-1 min-h-0 overflow-y-auto px-4 py-5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {/* 对话流 */}
        <div className={`flex min-h-full flex-col ${projectAgent ? 'gap-4 w-full max-w-[900px] mx-auto' : 'gap-3'}`}>
          {/* 空对话引导：按画衣衣业务场景给出入口与操作提示（点击仅填充输入框，用户可修改后再发送） */}
          {items.length === 0 && (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 py-8 text-center">
              <img src={logoUrl} alt="画衣衣" className="w-11 h-11 object-contain" />
              <div>
                <div className={`${projectAgent ? 'text-[22px]' : 'text-[17px]'} font-semibold text-ink`}>{projectAgent?.prepared ? '准备好了，开始这次任务吧' : projectAgent ? '今天，一起完成什么？' : '告诉我，你今天想设计什么款式？'}</div>
                <div className="mt-2 max-w-[300px] text-[12px] leading-relaxed text-mut">
                  {projectAgent?.prepared ? '提示词、引用资料和协作能力已放入输入框。可先调整，再点击发送。' : projectAgent ? '项目背景已带入。研究趋势、做企划、搜款搜料或设计改款，都可以从一句话开始。' : '在下方输入需求，或点一个场景快速开始；也可上传款式 / 面料图，配合画布标记点做精准修改。'}
                </div>
              </div>
              <div className={projectAgent?.prepared ? 'hidden' : `flex ${projectAgent ? 'max-w-[500px]' : 'max-w-[330px]'} flex-wrap items-center justify-center gap-2`}>
                {(projectAgent ? [
                  { label: '研究趋势', prompt: '结合项目背景和已有资料，整理本季趋势方向，生成一份可编辑的趋势报告' },
                  { label: '做企划 PPT', prompt: '围绕项目目标做一份服装企划 PPT，包含主题、色彩、面料和款式结构' },
                  { label: '搜款搜料', prompt: '先找内部相似款和面辅料，再补充外部参考，保留来源' },
                  { label: '设计改款', prompt: '基于项目中的参考图设计三个方向，保留款式细节并搭配面辅料' },
                ] : [
                  { label: '灵感设计', prompt: '设计一套 2026 秋冬静奢通勤女装，包含 3 套搭配与面料建议' },
                  { label: '换面料', prompt: '把画布中的款式替换为真丝缎面，保持廓形与工艺细节不变' },
                  { label: '营销套图', prompt: '基于当前款式生成亚马逊营销套图：1 张主图 + 3 张卖点图' },
                  { label: 'AI 打版', prompt: '基于画布中的款式生成打版结构图与尺寸表' },
                ]).map((q) => (
                  <button
                    key={q.label}
                    onClick={() => {
                      setInput(q.prompt)
                      later(() => taRef.current?.focus(), 60)
                    }}
                    className="h-9 px-3.5 rounded-full bg-panel border border-line shadow-[0_3px_12px_rgba(0,0,0,0.06)] text-[12.5px] text-ink hover:border-pri/45 hover:text-pri transition-colors"
                  >
                    {q.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          {items.map((m, i) => {
            switch (m.kind) {
              case 'user':
                return (
                  <div key={i} className="self-end max-w-[85%] bg-pri text-white text-[13px] rounded-2xl rounded-br-md px-3.5 py-2.5">
                    {m.text}
                  </div>
                )
              case 'ai':
                return (
                  <div key={i} className="self-start w-full max-w-[94%]">
                    {!projectAgent && <p className="text-[12px] text-mut mb-1">深度思考</p>}
                    <AiRichText text={m.text} />
                    {!projectAgent && <p className="mt-1 text-right text-[11px] text-mut">已回复</p>}
                  </div>
                )
              case 'plan':
                return (
                  <div key={i} className="self-start w-full text-[13px] leading-relaxed text-ink">
                    <p>{m.intro}</p>
                    <ol className="mt-2 flex flex-col gap-1.5">
                      {m.steps.map((s, j) => (
                        <li key={j} className="flex items-start gap-2">
                          <span className="mt-px w-[18px] h-[18px] rounded-full bg-acc-soft text-acc text-[10.5px] font-semibold flex items-center justify-center shrink-0">
                            {j + 1}
                          </span>
                          <span className="text-[12.5px] text-ink-2">{s}</span>
                        </li>
                      ))}
                    </ol>
                    <p className="mt-2">{m.outro}</p>
                  </div>
                )
              case 'progress':
                if (projectAgent) return null // Inline execution cards already show each step in project conversations.
                return (
                  <div key={i} className="self-start w-full rounded-xl border border-line-soft bg-fill-2 p-3">
                    <div className={`flex items-center gap-1.5 text-[12px] font-medium ${m.done ? 'text-ok' : 'text-ink'}`}>
                      {m.done ? <Check className="w-3.5 h-3.5" /> : m.status === 'paused' || m.status === 'waiting' ? <HelpCircle className="w-3.5 h-3.5 text-mut" /> : <Loader2 className="w-3.5 h-3.5 animate-spin text-acc" />}
                      {m.done ? '本轮执行完成' : m.status === 'paused' ? '已停止 · 可继续' : m.status === 'waiting' ? '等待你的补充' : '画衣衣 · 任务执行中'}
                    </div>
                    <ul className="mt-2 flex flex-col gap-1.5">
                      {m.steps.map((s, j) => (
                        <li key={j} className="flex items-center gap-2 text-[12px]">
                          {s.done ? (
                            <span className="w-4 h-4 rounded-full bg-ok flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </span>
                          ) : (
                            <span className="w-4 h-4 rounded-full border-[1.5px] border-line-strong flex items-center justify-center shrink-0">
                              {m.status !== 'paused' && m.status !== 'waiting' && j === m.steps.findIndex((x) => !x.done) && <Loader2 className="w-2.5 h-2.5 animate-spin text-acc" />}
                            </span>
                          )}
                          <span className={s.done ? 'text-mut' : 'text-ink'}>{s.label}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              case 'delivery': {
                // 回溯最近一条用户指令作为沉淀的提示词工程来源
                const src = items
                  .slice(0, i)
                  .reverse()
                  .find((x) => x.kind === 'user')
                const srcText = src && src.kind === 'user' ? src.text : ''
                return (
                  <DeliveryCard
                    key={i}
                    d={m.d}
                    onLocate={(idx) => onOpenCanvas(idx)}
                    onDistill={() =>
                      setDistill({
                        prompt: srcText,
                        name: srcText.slice(0, 12) + (srcText.length > 12 ? '…' : ''),
                        desc: `从「${m.d.title || '设计任务'}」沉淀的设计技能（方法流程 + 提示词）`,
                      })
                    }
                  />
                )
              }
              case 'suggest':
                return (
                  <div key={i} className="flex flex-col gap-1.5">
                    <span className="text-[11px] text-mut-2 px-1">延伸建议</span>
                    <div className="flex flex-wrap gap-1.5">
                      {m.items.map((s, j) => (
                        <button
                          key={j}
                          onClick={() => send(s)}
                          className="h-7 px-2.5 rounded-full border border-line text-[11.5px] text-ink-2 hover:border-pri/50 hover:text-pri bg-panel transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                )
              case 'ask':
                return (
                  <AskCard
                    key={i}
                    context={m.context}
                    question={m.question}
                    options={m.options}
                    multi={m.multi}
                    preset={m.preset}
                    answer={m.answer}
                    skipped={m.skipped}
                    onSubmit={(choices, custom) => projectAgent ? projectAgent.onAnswer(i, choices, custom) : answerAsk(i, choices, custom, !!m.multi)}
                    onSkip={() => projectAgent ? projectAgent.onSkip(i) : skipAsk(i)}
                  />
                )
              case 'artifact':
                return <div key={i}>{projectAgent?.renderArtifact(m)}</div>
              case 'execution':
                return <details key={i} open={m.state === 'running'} className="rounded-2xl bg-fill-2 px-4 py-3" data-testid="agent-execution"><summary className="cursor-pointer flex items-center gap-2 text-[12px]">{m.state === 'running' ? (busy ? <Loader2 size={14} className="animate-spin text-pri" /> : <HelpCircle size={14} className="text-mut" />) : <Check size={14} className="text-ok" />}<span className="flex-1">{m.title}</span><span className="text-[10px] text-mut">{m.state === 'running' ? busy ? '执行中' : '等待继续' : '已完成'}</span></summary><p className="text-[12px] text-ink-3 leading-6 mt-3 whitespace-pre-wrap">{m.detail}</p></details>
              case 'feedback':
                return <FeedbackRow key={i} />
            }
          })}
          {/* 思考状态（Manus 风格 Loading）：品牌行 + 「正在思考」跳动点；任务进度卡出现后由进度卡承接 */}
          {busy && !items.some((it) => it.kind === 'progress') && (
            <div className="self-start flex flex-col gap-1 px-1 py-1">
              <div className="flex items-center gap-1.5">
                <img src={logoUrl} alt="画衣衣" className="w-5 h-5 object-contain" />
                <span className="text-[13px] font-semibold text-ink">画衣衣</span>
                <span className="px-1.5 py-px rounded-md border border-line text-[10px] text-mut-2">Agent</span>
              </div>
              <div className="flex items-center gap-1 text-[12.5px] text-mut">
                画衣衣正在思考
                {[0, 1, 2].map((i) => (
                  <span key={i} className="w-1 h-1 rounded-full bg-mut-2 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                ))}
              </div>
            </div>
          )}
          {/* 工作中状态（Manus 风格 Loading）：进度卡出现后在对话流底部内联展示呼吸蓝点，随消息流自然排列，不悬浮遮挡 */}
          {busy && items.some((it) => it.kind === 'progress') && (
            <div className="self-start flex items-center gap-2 px-1 py-1 select-none">
              <span className="relative flex w-2.5 h-2.5">
                <span className="absolute inline-flex w-full h-full rounded-full bg-pri/50 animate-ping" />
                <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-pri" />
              </span>
              <span className="text-[12px] text-mut">工作中</span>
            </div>
          )}
        </div>
        </div>
        {/* 灰色上下移动轴：悬浮高亮，拖动它上下移动 AI 对话内容；位于卡片右侧内缘，与外缘调宽热区互不干扰 */}
        {sb.show && (
          <div
            onPointerDown={startSbDrag}
            title="拖拽滚动内容"
            className={`absolute right-0 w-[6px] rounded-full z-30 transition-colors duration-150 ${sbDrag ? 'bg-mut/60' : 'bg-line hover:bg-mut/45'}`}
            style={{ top: sb.top, height: sb.h }}
          />
        )}
      </div>

      {/* 输入区（底部对话栏 PRD：技能 / 模式 / 档位 / 预设 / 增强 / 附件 / 发送）；顶部无分割线，与对话列表自然衔接 */}
      <div className={`shrink-0 p-3 relative ${projectAgent ? 'w-full max-w-[924px] mx-auto' : ''}`}>
        {/* 全局轻提示（上传校验等） */}
        {toast && (
          <div className="absolute bottom-full left-3 mb-2 z-40 bg-ink text-panel text-[11.5px] px-3 py-1.5 rounded-full shadow-lg max-w-full truncate">
            {toast}
          </div>
        )}
        <div
          data-pop
          className={`rounded-3xl border bg-panel shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-colors p-2 flex flex-col gap-1 relative z-10 ${
            dragOver ? 'border-pri bg-pri-soft/40' : 'border-line focus-within:border-pri'
          }`}
          onDragEnter={(e) => {
            if (!e.dataTransfer.types.includes('Files')) return
            e.preventDefault()
            dragDepthRef.current += 1
            setDragOver(true)
          }}
          onDragOver={(e) => {
            if (e.dataTransfer.types.includes('Files')) e.preventDefault() // 必须阻止默认行为才能触发 drop
          }}
          onDragLeave={(e) => {
            if (!e.dataTransfer.types.includes('Files')) return
            dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
            if (!dragDepthRef.current) setDragOver(false)
          }}
          onDrop={(e) => {
            if (!e.dataTransfer.files.length) return
            e.preventDefault()
            dragDepthRef.current = 0
            setDragOver(false)
            pickFiles(e.dataTransfer.files) // 复用「+」上传的同一套校验（类型 / ≤50MB）
          }}
        >
          {/* 拖拽上传提示遮罩 */}
          {dragOver && (
            <div className="pointer-events-none absolute inset-0 z-20 rounded-xl border-2 border-dashed border-pri bg-pri-soft/60 flex items-center justify-center">
              <span className="text-[12.5px] font-medium text-pri">松开鼠标，上传图片 / 文件为附件</span>
            </div>
          )}
          {/* 技能选择浮层：搜索 + 列表 + 官方角标 + 子选项二级展开 */}
          {openPop === 'skill' && (
            <div className="absolute bottom-full left-0 right-0 mb-2 z-40 bg-panel rounded-xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.12)] p-2.5 max-h-72 flex flex-col">
              <div className="flex items-center gap-1.5 h-8 px-2.5 rounded-lg bg-fill-2 mb-1.5 shrink-0">
                <Search className="w-3.5 h-3.5 text-mut-3" />
                <input
                  value={skillQ}
                  onChange={(e) => setSkillQ(e.target.value)}
                  placeholder="搜索"
                  className="flex-1 min-w-0 bg-transparent outline-none text-[12px] placeholder:text-mut-3"
                />
              </div>
              {/* 列表整体为一个滚动区：已装备与技能列表不再分区滚动，统一由一根移动轴控制 */}
              <div className="relative flex-1 min-h-0 flex flex-col">
              <div ref={skillListAx.ref} onScroll={skillListAx.sync} className="flex-1 min-h-0 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden flex flex-col">
              {equippedSkills.length > 0 && (
                <>
                  <div className="text-[10.5px] text-mut-2 px-1 pb-1 shrink-0">我的技能（已装备）</div>
                  {equippedSkills
                      .filter((sk) => !skillQ || sk.name.includes(skillQ) || sk.desc.includes(skillQ))
                      .map((sk) => (
                        <button
                          key={sk.id}
                          onClick={() => {
                            setInput(sk.prompt)
                            setSkillId(sk.id)
                            setOpenPop(null)
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors ${
                            skillId === sk.id ? 'bg-pri-soft' : 'hover:bg-fill'
                          }`}
                        >
                          <Sparkles className={`w-4 h-4 shrink-0 ${skillId === sk.id ? 'text-pri' : 'text-ink-3'}`} />
                          <span className={`text-[12.5px] font-medium shrink-0 ${skillId === sk.id ? 'text-pri' : 'text-ink'}`}>{sk.name}</span>
                          <span className="text-[11px] text-mut truncate flex-1">{sk.desc}</span>
                          <span className="text-[10px] text-mut-2 shrink-0">{sk.source === 'mine' ? '自建' : '平台'}</span>
                        </button>
                      ))}
                </>
              )}
              <div className="text-[10.5px] text-mut-2 px-1 pb-1 shrink-0">技能</div>
                {SKILLS.filter((sk) => !skillQ || sk.name.includes(skillQ) || sk.desc.includes(skillQ)).map((sk) => (
                  <div key={sk.id}>
                    <button
                      onClick={() => clickSkill(sk)}
                      className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg text-left transition-colors ${
                        skillId === sk.id ? 'bg-pri-soft' : 'hover:bg-fill'
                      }`}
                    >
                      <sk.icon className={`w-4 h-4 shrink-0 ${skillId === sk.id ? 'text-pri' : 'text-ink-3'}`} />
                      <span className={`text-[12.5px] font-medium shrink-0 ${skillId === sk.id ? 'text-pri' : 'text-ink'}`}>{sk.name}</span>
                      <span className="text-[11px] text-mut truncate flex-1">{sk.desc}</span>
                      {sk.sub ? (
                        <ChevronDown className={`w-3.5 h-3.5 text-mut-3 shrink-0 transition-transform ${expandSkill === sk.id ? 'rotate-180' : ''}`} />
                      ) : (
                        sk.official && <span className="text-[10px] text-mut-2 shrink-0">官方</span>
                      )}
                    </button>
                    {sk.sub && expandSkill === sk.id &&
                      sk.sub.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => {
                            setInput(sub.prompt)
                            setSkillId(sub.id)
                            setOpenPop(null)
                          }}
                          className={`w-full flex items-center gap-2 pl-8 pr-2 py-2 rounded-lg text-left transition-colors ${
                            skillId === sub.id ? 'bg-pri-soft' : 'hover:bg-fill'
                          }`}
                        >
                          <span className={`text-[12.5px] font-medium shrink-0 ${skillId === sub.id ? 'text-pri' : 'text-ink'}`}>{sub.name}</span>
                          <span className="text-[11px] text-mut truncate flex-1">{sub.desc}</span>
                          <span className="text-[10px] text-mut-2 shrink-0">官方</span>
                        </button>
                      ))}
                  </div>
                ))}
              </div>
              <ScrollAxis ctl={skillListAx} rightClass="right-0.5" />
              </div>
            </div>
          )}


          {/* 「自定义」浮层：按能力强弱选择模型（Pro / Max / 旗舰） */}
          {openPop === 'preset' && (
            <div className="absolute bottom-full right-0 mb-2 z-40 w-64 bg-panel rounded-xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.12)] p-2">
              <div className="text-[10.5px] text-mut-2 px-1 pb-1">按能力强弱选择模型</div>
              {CUSTOM_MODELS.map((cm) => (
                <button
                  key={cm.key}
                  onClick={() => {
                    setCustomTier(cm.key)
                    setModel(cm.key) // 与档位面板共用同一份模型状态
                    setOpenPop(null)
                  }}
                  className={`w-full text-left rounded-lg p-2 transition-colors ${
                    customTier === cm.key ? 'bg-pri-soft' : 'hover:bg-fill'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-[12.5px] font-semibold ${customTier === cm.key ? 'text-pri' : 'text-ink'}`}>{cm.name}</span>
                    <span className={`text-[10px] px-1.5 py-px rounded ${customTier === cm.key ? 'bg-pri text-white' : 'bg-fill text-mut'}`}>{cm.level}</span>
                    {customTier === cm.key && <Check className="w-3.5 h-3.5 text-pri ml-auto" />}
                  </div>
                  <p className="text-[11px] text-mut mt-0.5 leading-relaxed">{cm.desc}</p>
                </button>
              ))}
            </div>
          )}

          {/* 模型档位浮层：倍率 / 描述 / 标签 + 多模态分段 */}
          {openPop === 'model' && (
            <div className="absolute bottom-full left-0 right-0 mb-2 z-40 bg-panel rounded-xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.12)] p-2">
              <div className="text-[10.5px] text-mut-2 px-1 pb-1">模式</div>
              {MODELS.map((mo) => (
                <div key={mo.key}>
                  {mo.rec && <div className="text-[10.5px] text-mut-2 px-1 pt-1.5 pb-1 border-t border-line-soft mt-1">推荐</div>}
                  <button
                    onClick={() => {
                      setModel(mo.key)
                      setOpenPop(null)
                    }}
                    className={`w-full text-left rounded-lg p-2 transition-colors ${
                      model === mo.key ? 'bg-pri text-white' : 'hover:bg-fill'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] font-semibold flex items-center gap-1.5">
                        {mo.name}
                        {mo.tag && (
                          <span className={`text-[9.5px] px-1 rounded ${model === mo.key ? 'bg-white/20 text-white' : 'bg-warn-soft text-warn'}`}>{mo.tag}</span>
                        )}
                      </span>
                      <span className={`text-[11px] ${model === mo.key ? 'text-white/85' : 'text-mut'}`}>{mo.rate}</span>
                    </div>
                    <p className={`text-[11px] mt-0.5 leading-relaxed ${model === mo.key ? 'text-white/80' : 'text-mut'}`}>{mo.desc}</p>
                  </button>
                </div>
              ))}
              <div className="flex items-center justify-between mt-1.5 pt-2 border-t border-line-soft px-1 pb-0.5">
                <span className="text-[12px] font-medium text-ink">多模态</span>
                <div className="flex bg-fill rounded-full p-0.5">
                  {(['自动', '自定义'] as const).map((v) => (
                    <button
                      key={v}
                      onClick={() => setMmMode(v)}
                      className={`h-6 px-2.5 rounded-full text-[11px] transition-colors ${
                        mmMode === v ? 'bg-panel text-ink shadow-sm font-medium' : 'text-mut'
                      }`}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {projectAgent?.composerContext}
          {/* 选中技能行：点击 chevron 打开模型档位（参考图 NB Pro 行） */}
          {skillId && (
            <div className="flex items-center gap-1.5 px-1 pt-0.5 pb-1">
              <span className="flex items-center gap-1.5 h-6 pl-2 pr-1 rounded-full bg-pri text-white shrink-0 select-none">
              <Zap className="w-3.5 h-3.5 shrink-0" />
              <span className="text-[12px] font-medium">
                {SKILLS.find((sk) => sk.id === skillId)?.name ||
                  SKILLS.flatMap((sk) => sk.sub || []).find((sub) => sub.id === skillId)?.name ||
                  equippedSkills.find((sk) => sk.id === skillId)?.name}
              </span>
              <button onClick={() => setSkillId(null)} title="取消技能选择" className="w-4 h-4 rounded-full flex items-center justify-center opacity-70 hover:opacity-100 hover:bg-white/20 transition-all">
                <X className="w-3 h-3" />
              </button>
              </span>
              <span className="text-[10.5px] text-mut-2">{MODELS.find((mo) => mo.key === model)?.name}</span>
              <button
                onClick={() => setOpenPop(openPop === 'model' ? null : 'model')}
                title="选择模型档位"
                className="ml-auto w-6 h-6 rounded-full bg-panel border border-line flex items-center justify-center text-mut hover:text-ink transition-colors"
              >
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${openPop === 'model' ? 'rotate-180' : ''}`} />
              </button>
            </div>
          )}

          {/* 附件列表：支持移除单个附件 */}
          {attachments.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap px-1 pt-0.5 pb-1">
              {attachments.map((a) => (
                <span key={a.id} className="flex items-center gap-1 h-6 pl-1 pr-1 rounded-md bg-fill-2 border border-line text-[11px] text-ink-2">
                  {a.preview ? (
                    <img src={a.preview} alt={a.name} className="w-4 h-4 rounded object-cover" />
                  ) : (
                    <Paperclip className="w-3 h-3 text-mut" />
                  )}
                  <span className="max-w-[96px] truncate">{a.name}</span>
                  <button
                    onClick={() => setAttachments((arr) => arr.filter((x) => x.id !== a.id))}
                    title="移除附件"
                    className="w-4 h-4 flex items-center justify-center text-mut-3 hover:text-ink transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* 标记需求胶囊卡片：每个标记 = 一个小需求（编号 + 部位：描述），多个 = 多个需求同时执行 */}
          {marks.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap px-1 pt-0.5 pb-1.5">
              <MapPin className="w-3.5 h-3.5 text-pri shrink-0" />
              {marks.map((m, i) => (
                <button
                  key={m.id}
                  onClick={() => onRemoveMark(m.id)}
                  title="点击移除该需求"
                  className="group flex items-center gap-1 h-6 pl-1 pr-1.5 rounded-md bg-pri-soft border border-pri-line text-pri text-[11px] hover:border-pri/40 transition-colors max-w-[240px]"
                >
                  <span className="w-4 h-4 rounded-full bg-pri text-white flex items-center justify-center text-[10px] font-medium shrink-0">
                    {i + 1}
                  </span>
                  <span className="truncate">
                    {m.part || '标记'}
                    {m.note ? `：${m.note}` : ''}
                  </span>
                  <X className="w-3 h-3 opacity-50 group-hover:opacity-100 shrink-0" />
                </button>
              ))}
              <button onClick={onClearMarks} className="ml-auto text-[11px] text-mut hover:text-ink transition-colors">
                清除
              </button>
            </div>
          )}

          {/* 多行输入框：高度自适应，超出滚动 */}
          <textarea
            ref={taRef}
            value={input}
            aria-label="Agent 需求输入"
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSend()
              }
            }}
            placeholder={busy ? '任务执行中，请稍候…' : '请输入您的需求…'}
            rows={3}
            className="w-full resize-none text-[13px] outline-none placeholder:text-mut-3 bg-transparent px-1.5 py-1.5 max-h-44 overflow-y-auto [scrollbar-width:thin]"
          />

          {/* 底部控制区 */}
          <div className="flex items-center gap-0.5">
            <input
              ref={fileRef}
              type="file"
              multiple
              accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.md,.ppt,.pptx,.html"
              className="hidden"
              onChange={(e) => {
                pickFiles(e.target.files)
                e.target.value = ''
              }}
            />
            <button onClick={() => fileRef.current?.click()} title="上传资源" className="w-8 h-8 rounded-lg flex items-center justify-center text-mut hover:bg-fill hover:text-ink transition-colors">
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => projectAgent ? projectAgent.onCapabilities() : setOpenPop(openPop === 'skill' ? null : 'skill')}
              title={projectAgent ? '选择技能、专家或专家团' : '选择技能'}
              aria-label={projectAgent ? '选择技能、专家或专家团' : '选择技能'}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                openPop === 'skill'
                  ? 'bg-pri-soft text-pri'
                  : skillId
                    ? 'text-pri hover:bg-pri-soft'
                    : 'text-mut hover:bg-fill hover:text-ink'
              }`}
            >
              <Hammer className="w-4 h-4" />
            </button>
            {projectAgent && <button onClick={projectAgent.onReferences} title="引用项目资料" className="w-8 h-8 rounded-lg flex items-center justify-center text-mut hover:bg-fill hover:text-ink"><Paperclip size={16} /></button>}
            {connBarClosed && (
              <button
                onClick={() => setConnBarClosed(false)}
                title="连接器（应用链接）"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-mut hover:bg-fill hover:text-ink transition-colors"
              >
                <PlugZap className="w-4 h-4" />
              </button>
            )}
            <div className="relative">
              <button
                onClick={() => setOpenPop(openPop === 'mode' ? null : 'mode')}
                title="执行模式"
                aria-label="执行模式"
                className={`flex items-center gap-1 h-8 px-2 rounded-lg text-[12px] whitespace-nowrap transition-colors ${
                  openPop === 'mode' ? 'bg-fill text-ink' : 'text-ink-3 hover:bg-fill'
                }`}
              >
                {/* 图标随当前模式同步切换：自动=闪电 / 询问=问号 */}
                {mode === 'auto' ? <Zap className="w-3.5 h-3.5 shrink-0" /> : <MessageCircleQuestion className="w-3.5 h-3.5 shrink-0" />}
                {mode === 'auto' ? '自动' : '询问'}
                <ChevronDown className={`w-3 h-3 text-mut-3 transition-transform ${openPop === 'mode' ? 'rotate-180' : ''}`} />
              </button>
              {/* 执行模式浮层：紧贴触发按钮正上方弹出（亲密性原则） */}
              {openPop === 'mode' && (
                <div className="absolute bottom-full left-0 mb-1.5 z-40 w-44 bg-panel rounded-xl border border-line shadow-[0_12px_48px_rgba(0,0,0,0.12)] p-1.5">
                  {([
                    { v: 'auto' as const, name: '自动执行', Icon: Zap },
                    { v: 'ask' as const, name: '询问执行', Icon: MessageCircleQuestion },
                  ]).map(({ v, name, Icon }) => (
                    <button
                      key={v}
                      onClick={() => {
                        setMode(v) // 立即生效，无需确认
                        setOpenPop(null)
                      }}
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
            <div className="flex-1" />
            <button
              onClick={() => setOpenPop(openPop === 'preset' ? null : 'preset')}
              title="自定义模型（按能力强弱）"
              className={`flex items-center gap-1 h-8 px-2 rounded-lg text-[12px] whitespace-nowrap transition-colors ${
                openPop === 'preset'
                  ? 'bg-acc-soft text-acc font-medium'
                  : customTier
                    ? 'text-acc font-medium hover:bg-acc-soft'
                    : 'text-ink hover:bg-fill'
              }`}
            >
              {customTier ? CUSTOM_MODELS.find((cm) => cm.key === customTier)?.name : 'Auto'}
              <ChevronDown className="w-3 h-3 shrink-0 opacity-70" />
            </button>
            <button
              onClick={enhance}
              disabled={!input.trim() || enhancing}
              title={enhanced ? '重新增强提示词' : '增强提示词'}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
                !input.trim() && !enhancing ? 'text-mut-3' : 'text-ink hover:bg-fill'
              }`}
            >
              {enhancing ? <Loader2 className="w-4 h-4 animate-spin" /> : enhanced ? <RotateCcw className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </button>
            <button
              onClick={busy && projectAgent ? projectAgent.onStop : handleSend}
              disabled={busy ? !projectAgent : (!input.trim() && !attachments.length && !marks.length)}
              title={busy && projectAgent ? '停止生成' : '发送'}
              aria-label={busy && projectAgent ? '停止生成' : '发送'}
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                (input.trim() || attachments.length || marks.length) && !busy ? 'bg-pri text-white hover:bg-pri-deep' : 'bg-fill text-mut-3'
              }`}
            >
              {busy && projectAgent ? <span className="w-3 h-3 bg-current rounded-sm" /> : busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
        {/* 应用链接条：与首页一致的叠加式连接器入口（可关闭，关闭后由工具栏「连接器」图标恢复） */}
        {!projectAgent && !connBarClosed && <ConnectorLinkBar onOpen={() => setConnOpen(true)} onClose={() => setConnBarClosed(true)} />}
      </div>

      {connOpen && <ConnectorsModal onClose={() => setConnOpen(false)} />}

      {/* ===== 沉淀为技能弹窗：提示词工程一键封装为个人 Skill（自动装备并同步「选择技能」） ===== */}
      {distill && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-6" onClick={() => setDistill(null)}>
          <div className="w-[440px] bg-panel rounded-2xl border border-line shadow-[0_24px_64px_rgba(0,0,0,0.18)] p-5" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center">
              <span className="text-[15px] font-semibold text-ink flex items-center gap-1.5">
                <Hammer className="w-4 h-4 text-pri" />
                沉淀为技能
              </span>
              <button onClick={() => setDistill(null)} className="ml-auto w-7 h-7 rounded-full flex items-center justify-center text-mut hover:bg-fill hover:text-ink transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="mt-1.5 text-[11.5px] text-mut">Skill 沉淀不只是保存提示词：本次任务的设计方法、交付标准与提示词将一起封装为可复用的个人技能，保存至「我的技能」并立即装备，下次同类任务一键调用</p>
            <div className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1.5">
                <span className="text-[11.5px] text-mut">技能名称</span>
                <input
                  value={distill.name}
                  onChange={(e) => setDistill({ ...distill, name: e.target.value })}
                  placeholder="为技能起个名字"
                  className="h-9 px-3 rounded-lg border border-line text-[13px] outline-none focus:border-pri bg-panel"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11.5px] text-mut">技能说明（用途 / 使用场景）</span>
                <input
                  value={distill.desc}
                  onChange={(e) => setDistill({ ...distill, desc: e.target.value })}
                  className="h-9 px-3 rounded-lg border border-line text-[13px] outline-none focus:border-pri bg-panel"
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-[11.5px] text-mut">技能指令（提示词）</span>
                <textarea
                  value={distill.prompt}
                  onChange={(e) => setDistill({ ...distill, prompt: e.target.value })}
                  rows={4}
                  className="px-3 py-2 rounded-lg border border-line text-[12.5px] leading-relaxed outline-none focus:border-pri resize-none bg-panel"
                />
              </label>
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setDistill(null)} className="h-8 px-4 rounded-full text-[12.5px] text-ink-2 hover:bg-fill transition-colors">
                取消
              </button>
              <button
                onClick={() => {
                  if (!distill.name.trim() || !distill.prompt.trim()) return
                  const sk: SkillEntry = {
                    id: `mine-${Date.now()}`,
                    name: distill.name.trim(),
                    desc: distill.desc.trim() || '个人沉淀技能',
                    prompt: distill.prompt,
                    source: 'mine',
                    created: Date.now(),
                  }
                  addMine(sk)
                  setSkillId(sk.id) // 立即可用：同步选中
                  setDistill(null)
                  showToast(`已沉淀为技能「${sk.name}」并自动装备，可在底部「选择技能」中随时调用`)
                }}
                disabled={!distill.name.trim() || !distill.prompt.trim()}
                className="h-8 px-4 rounded-full bg-ink text-panel text-[12.5px] hover:bg-ink/85 transition-colors disabled:opacity-40"
              >
                保存并装备
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  )
}
