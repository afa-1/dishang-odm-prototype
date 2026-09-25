/* ================= 技能市场页（参照附件形式重构） =================
 * 顶部：专家 / 技能 / 连接器 分段 Tab + 搜索技能 + 我安装的 + 添加技能
 * 技能：精选技能（换一换）→ 推荐 / 套件 子 Tab → 分类标签 → 四列技能卡
 * 点击技能卡片 → 技能详情页（说明 / 示例提示词 / 交付示例 / 相关技能）
 * 全局相关性：安装状态接入全局技能仓库（与首页对话框「选择技能」双向同步）；
 * 连接器 Tab 复用连接器面板；专家 Tab 联动 AI 版师独立页面 */

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  BadgeCheck,
  Check,
  ChevronLeft,
  Download,
  Github,
  Images,
  Layers,
  Lightbulb,
  Link2,
  Play,
  Plus,
  RefreshCw,
  Search,
  Terminal,
  Upload,
  UserRound,
  Users,
  X,
  Zap,
} from 'lucide-react'
import { GLYPHS, LS_MY_TEAMS, OFFICIAL_TEAMS, PLATFORM_SKILLS, loadMyTeams, teamMemberOf, useSkillStore, type SkillEntry, type Team } from './skills'
import { ConnectorsPanel } from './Connectors'

/* ---------- 技能分类（推荐区标签筛选） ---------- */
const SKILL_CAT: Record<string, string> = {
  'pf-hit': '趋势洞察',
  'pf-trade': '电商运营',
  'pf-fabric': '面料工艺',
  'pf-plan': '设计创作',
  'pf-techpack': '效率工具',
  'pf-detail': '电商运营',
  'pf-cost': '效率工具',
  'pf-trend': '趋势洞察',
}
const CATS = ['全部', '设计创作', '趋势洞察', '面料工艺', '电商运营', '效率工具']

/* ---------- 套件 ---------- */
interface Suite {
  id: string
  name: string
  desc: string
  skillIds: string[]
  tint: string
}
const SUITES: Suite[] = [
  { id: 'st-dev', name: '新款开发套件', desc: '从趋势选款、系列企划到工艺单输出，一站式完成新款开发闭环。', skillIds: ['pf-hit', 'pf-plan', 'pf-techpack'], tint: 'from-violet-400 to-purple-600' },
  { id: 'st-ec', name: '电商上架套件', desc: '详情页套版、成本核价与多市场适配联动，加速新品上架节奏。', skillIds: ['pf-detail', 'pf-cost', 'pf-trade'], tint: 'from-sky-400 to-blue-600' },
  { id: 'st-trend', name: '趋势研究套件', desc: '秀场趋势解读 × 面料智库 × 爆款推导，让设计决策有据可依。', skillIds: ['pf-trend', 'pf-fabric', 'pf-hit'], tint: 'from-amber-400 to-orange-500' },
]

/* ---------- 技能图标：浅色底 + 彩色图形（附件规格） ---------- */
const SOFT_ICON: Record<string, { bg: string; fg: string }> = {
  'pf-hit': { bg: '#FFF1E8', fg: '#F06423' },
  'pf-trade': { bg: '#EAF3FF', fg: '#2A68FE' },
  'pf-fabric': { bg: '#F1EBFF', fg: '#7C5CFC' },
  'pf-plan': { bg: '#E7F8F0', fg: '#12A566' },
  'pf-techpack': { bg: '#FFF6E5', fg: '#E8A13D' },
  'pf-detail': { bg: '#FFEFF5', fg: '#EC4D8A' },
  'pf-cost': { bg: '#EEF9EA', fg: '#4CAF50' },
  'pf-trend': { bg: '#EEF0FF', fg: '#5B6CFF' },
}

import loeweImg from '@/assets/experts/loewe.png'
import loropianaImg from '@/assets/experts/loropiana.png'
import cucinelliImg from '@/assets/experts/cucinelli.png'
import chanelImg from '@/assets/experts/chanel.png'
import hermesImg from '@/assets/experts/hermes.png'
import balenciagaImg from '@/assets/experts/balenciaga.png'
import miumiuImg from '@/assets/experts/miumiu.png'
import maxmaraImg from '@/assets/experts/maxmara.png'
import therowImg from '@/assets/experts/therow.png'
import celineImg from '@/assets/experts/celine.png'
import lemaireImg from '@/assets/experts/lemaire.png'
import monclerImg from '@/assets/experts/moncler.png'

/* ---------- 设计专家：每一个专家代表一个品牌视角，给出符合其品牌风格的标准定义；点击卡片调用对应品牌专家为设计进行风格把控 ---------- */
interface BrandExpert {
  brand: string
  name: string
  desc: string // 品牌视角的风格标准定义
  uses: string // 调用量
  img: string
  prompt: string // 调用后代入输入框的专家指令
  examples: string[] // 详情页「试试这些提示词」：符合该品牌业务逻辑的专家指令
}
const BRAND_EXPERTS: BrandExpert[] = [
  {
    brand: 'loewe',
    name: 'LOEWE 风格设计师',
    desc: '以 LOEWE 的品牌视角把控设计：几何拼色与手工艺革趣，结构玩味而克制，材质即语言，定义"匠心顽趣"的标准。',
    uses: '1.6k',
    img: loeweImg,
    prompt: '调用 LOEWE 风格设计师：以 LOEWE 品牌视角为我的设计做风格把控——几何结构、拼色皮革工艺与克制的玩趣感，输出符合其风格标准的设计方案',
    examples: ['以 LOEWE 视角检查这套早秋新品：几何拼色与皮革工艺是否到位，输出风格调整建议', '按 LOEWE「匠心顽趣」标准，为我的夹克设计 3 个材质玩趣的细节方案'],
  },
  {
    brand: 'loropiana',
    name: 'Loro Piana 风格设计师',
    desc: '以 Loro Piana 的品牌视角把控设计：顶级羊绒与无声的奢华，无 Logo 的质感表达，定义"静奢本源"的标准。',
    uses: '1.2k',
    img: loropianaImg,
    prompt: '调用 Loro Piana 风格设计师：以 Loro Piana 品牌视角为我的设计做风格把控——顶级天然材质、无标识的静奢质感与柔和大地色系，输出符合其风格标准的设计方案',
    examples: ['以 Loro Piana 视角把控这套羊绒大衣：材质质感与无 Logo 表达是否足够「静奢」', '按 Loro Piana 标准，为秋冬系列推荐顶级天然面料组合与大地色系配色'],
  },
  {
    brand: 'cucinelli',
    name: 'Brunello Cucinelli 风格设计师',
    desc: '以 Brunello Cucinelli 的品牌视角把控设计：人文主义剪裁与灰调儒雅，柔软结构西装，定义"温和奢华"的标准。',
    uses: '986',
    img: cucinelliImg,
    prompt: '调用 Brunello Cucinelli 风格设计师：以其品牌视角为我的设计做风格把控——柔软剪裁、灰米色调与人文儒雅气质，输出符合其风格标准的设计方案',
    examples: ['以 Brunello Cucinelli 视角审视这套西装：柔软剪裁与灰调儒雅是否成立', '按「温和奢华」标准，为我的商务系列输出灰米色调的色彩与材质方案'],
  },
  {
    brand: 'chanel',
    name: 'CHANEL 风格设计师',
    desc: '以 CHANEL 的品牌视角把控设计：斜纹软呢与黑白秩序，珍珠、山茶花与解放女性的剪裁，定义"经典优雅"的标准。',
    uses: '2.4k',
    img: chanelImg,
    prompt: '调用 CHANEL 风格设计师：以 CHANEL 品牌视角为我的设计做风格把控——斜纹软呢、黑白配色、珍珠与山茶花元素的优雅秩序，输出符合其风格标准的设计方案',
    examples: ['以 CHANEL 视角把控这件外套：斜纹软呢与黑白秩序是否符合「经典优雅」', '按 CHANEL 标准，为这套裙装设计珍珠与山茶花元素的细节点缀方案'],
  },
  {
    brand: 'hermes',
    name: 'Hermès 风格设计师',
    desc: '以 Hermès 的品牌视角把控设计：马具工艺与丝巾叙事，橙盒里的法式隽永，定义"手工艺传承"的标准。',
    uses: '2.1k',
    img: hermesImg,
    prompt: '调用 Hermès 风格设计师：以 Hermès 品牌视角为我的设计做风格把控——马具皮革工艺、丝巾印花叙事与隽永法式配色，输出符合其风格标准的设计方案',
    examples: ['以 Hermès 视角审视这组丝巾印花：马具工艺叙事与法式配色是否到位', '按 Hermès「手工艺传承」标准，为皮具系列输出工艺细节与橙盒色系点缀方案'],
  },
  {
    brand: 'balenciaga',
    name: 'Balenciaga 风格设计师',
    desc: '以 Balenciaga 的品牌视角把控设计：超大廓形与街头颠覆，雕塑感剪裁碰撞亚文化，定义"先锋廓形"的标准。',
    uses: '1.8k',
    img: balenciagaImg,
    prompt: '调用 Balenciaga 风格设计师：以 Balenciaga 品牌视角为我的设计做风格把控——超大廓形、雕塑感剪裁与街头先锋表达，输出符合其风格标准的设计方案',
    examples: ['以 Balenciaga 视角把控这套廓形：超大比例与街头表达是否够「先锋」', '按 Balenciaga 标准，为我的卫衣系列设计雕塑感廓形与亚文化图形方案'],
  },
  {
    brand: 'miumiu',
    name: 'Miu Miu 风格设计师',
    desc: '以 Miu Miu 的品牌视角把控设计：学院叛逆与甜酷混搭，低腰、褶皱与蝴蝶结的少女心解构，定义"俏皮书卷"的标准。',
    uses: '1.5k',
    img: miumiuImg,
    prompt: '调用 Miu Miu 风格设计师：以 Miu Miu 品牌视角为我的设计做风格把控——学院风叛逆、甜酷混搭与蝴蝶结褶皱细节，输出符合其风格标准的设计方案',
    examples: ['以 Miu Miu 视角检查这套少女系新品：低腰、褶皱与蝴蝶结的「俏皮书卷」感是否成立', '按 Miu Miu 标准，为学院风系列输出甜酷混搭的配色与细节方案'],
  },
  {
    brand: 'maxmara',
    name: 'Max Mara 风格设计师',
    desc: '以 Max Mara 的品牌视角把控设计：驼色大衣与权力套装，为职业女性而生的隽永剪裁，定义"意式干练"的标准。',
    uses: '1.3k',
    img: maxmaraImg,
    prompt: '调用 Max Mara 风格设计师：以 Max Mara 品牌视角为我的设计做风格把控——驼色系、大衣廓形与职业女性的隽永剪裁，输出符合其风格标准的设计方案',
    examples: ['以 Max Mara 视角审视这件驼色大衣：剪裁与面料是否达到「意式干练」标准', '按 Max Mara 标准，为职业女性系列设计权力套装的廓形与色彩方案'],
  },
  {
    brand: 'therow',
    name: 'The Row 风格设计师',
    desc: '以 The Row 的品牌视角把控设计：极简廓形与隐秘奢华，去装饰的顶级面料与完美比例，定义"无声极简"的标准。',
    uses: '1.1k',
    img: therowImg,
    prompt: '调用 The Row 风格设计师：以 The Row 品牌视角为我的设计做风格把控——极简廓形、完美比例与去装饰化的顶级面料质感，输出符合其风格标准的设计方案',
    examples: ['以 The Row 视角把控这套极简新品：廓形与面料比例是否足够「无声极简」', '按 The Row 标准，为基础款系列输出去装饰化的剪裁与顶级面料建议'],
  },
  {
    brand: 'celine',
    name: 'CELINE 风格设计师',
    desc: '以 CELINE 的品牌视角把控设计：法式 effortless 与布尔乔亚摇滚，西装、牛仔与凯旋门的巴黎日常，定义"巴黎酷感"的标准。',
    uses: '1.9k',
    img: celineImg,
    prompt: '调用 CELINE 风格设计师：以 CELINE 品牌视角为我的设计做风格把控——法式 effortless、西装与牛仔的巴黎酷感混搭，输出符合其风格标准的设计方案',
    examples: ['以 CELINE 视角审视这套法式新品：effortless 与布尔乔亚摇滚的平衡是否到位', '按 CELINE「巴黎酷感」标准，为西装与牛仔组合输出搭配与细节方案'],
  },
  {
    brand: 'lemaire',
    name: 'LEMAIRE 风格设计师',
    desc: '以 LEMAIRE 的品牌视角把控设计：大地色系与游牧式叠穿，可颂包般的柔软建筑感，定义"松弛诗意"的标准。',
    uses: '1.4k',
    img: lemaireImg,
    prompt: '调用 LEMAIRE 风格设计师：以 LEMAIRE 品牌视角为我的设计做风格把控——大地色系、松弛叠穿与柔软建筑感廓形，输出符合其风格标准的设计方案',
    examples: ['以 LEMAIRE 视角把控这套大地色新品：游牧式叠穿与柔软建筑感是否成立', '按 LEMAIRE「松弛诗意」标准，为我的系列设计可颂包式柔软廓形方案'],
  },
  {
    brand: 'moncler',
    name: 'Moncler 风格设计师',
    desc: '以 Moncler 的品牌视角把控设计：高山羽绒与机能奢华，亮面绗缝碰撞雪地基因，定义"山野机能"的标准。',
    uses: '1.7k',
    img: monclerImg,
    prompt: '调用 Moncler 风格设计师：以 Moncler 品牌视角为我的设计做风格把控——亮面绗缝羽绒、机能细节与高山户外基因，输出符合其风格标准的设计方案',
    examples: ['以 Moncler 视角审视这件羽绒服：高山机能与奢华质感是否兼顾', '按 Moncler「山野机能」标准，为冬季外套系列输出亮面绗缝与雪地配色方案'],
  },
]

/** 设计专家卡：左侧品牌视觉图 + 名称/两行风格定义/底部信息行；点击进入专家详情页，右下角安装/移除 */
function ExpertCard({
  e,
  installed,
  onToggle,
  onOpen,
}: {
  e: BrandExpert
  installed: boolean
  onToggle: () => void
  onOpen: () => void
}) {
  return (
    <div
      onClick={onOpen}
      className="group relative flex gap-3.5 rounded-2xl border border-line-soft bg-panel p-4 text-left cursor-pointer transition-colors hover:border-pri/40"
    >
      <img src={e.img} alt={e.name} className="w-[84px] h-[84px] rounded-xl object-cover shrink-0" />
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-ink group-hover:text-pri transition-colors">{e.name}</span>
        <span className="mt-1.5 block text-[12px] text-mut leading-relaxed line-clamp-2">{e.desc}</span>
        <span className="mt-2 flex items-center gap-1.5 text-[11.5px] text-mut-2">
          画衣衣 官方 ·
          <Users className="w-3 h-3" />
          {e.uses}
        </span>
      </span>
      <button
        onClick={(ev) => {
          ev.stopPropagation()
          onToggle()
        }}
        title={installed ? '移除技能' : '安装技能'}
        className={`absolute bottom-3 right-3 w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors ${
          installed ? 'bg-pri-soft text-pri' : 'bg-fill text-ink-3 hover:bg-pri hover:text-white'
        }`}
      >
        {installed ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>
    </div>
  )
}

/** 技能卡：参照「专家」模块设计专家卡片形式——左侧大图标块 + 名称/两行说明/底部信息行；
 * 功能不变：点击卡片进入详情，右上角安装/移除按钮保留 */
function SkillCard({
  s,
  installed,
  onToggle,
  onUse,
}: {
  s: SkillEntry
  installed: boolean
  onToggle: () => void
  onUse: () => void
}) {
  const Glyph = GLYPHS[s.glyph ?? 'mine']
  const soft = SOFT_ICON[s.id] ?? { bg: '#F2F3F5', fg: '#64748B' }
  const cat = SKILL_CAT[s.id] ?? '我的技能'
  return (
    <div
      onClick={onUse}
      className="group relative flex gap-3.5 rounded-2xl border border-line-soft bg-panel p-4 cursor-pointer transition-colors hover:border-pri/40"
    >
      {s.samples?.[0] ? (
        <img src={s.samples[0]} alt={s.name} className="w-[84px] h-[84px] rounded-xl object-cover shrink-0" />
      ) : (
        <div className="w-[84px] h-[84px] rounded-xl flex items-center justify-center shrink-0" style={{ background: soft.bg, color: soft.fg }}>
          <Glyph className="w-9 h-9" />
        </div>
      )}
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold text-ink truncate group-hover:text-pri transition-colors">{s.name}</span>
        <span className="mt-1.5 block text-[12px] text-mut leading-relaxed line-clamp-2">{s.desc}</span>
        <span className="mt-2 flex items-center gap-1.5 text-[11.5px] text-mut-2">
          {s.source === 'platform' ? '画衣衣 官方' : '我的技能'} · {cat}
          {s.version ? ` · v${s.version}` : ''}
        </span>
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onToggle()
        }}
        title={installed ? '移除技能' : '安装技能'}
        className={`absolute bottom-3 right-3 w-8 h-8 rounded-[10px] flex items-center justify-center transition-colors ${
          installed ? 'bg-pri-soft text-pri' : 'bg-fill text-ink-3 hover:bg-pri hover:text-white'
        }`}
      >
        {installed ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
      </button>
    </div>
  )
}

export default function SkillsPage({
  onBack: _onBack,
  onUseSkill,
  onUseTeam,
  showToast,
}: {
  onBack: () => void
  /** 使用技能：带入 Agent 对话框即时体验 */
  onUseSkill: (s: SkillEntry, prompt?: string) => void
  /** 使用团队：回到首页并加载「当前团队」状态栏（会话快照） */
  onUseTeam: (t: Team) => void
  showToast: (t: string) => void
}) {
  void _onBack
  const { isEquipped, equip, unequip, addMine, removeMine, equippedSkills } = useSkillStore()

  const [tab, setTab] = useState<'expert' | 'team' | 'skill' | 'conn'>('skill')
  const [sub, setSub] = useState<'rec' | 'suite'>('rec')
  const [cat, setCat] = useState('全部')
  const [q, setQ] = useState('')
  const [installedOnly, setInstalledOnly] = useState(false)
  const [featOffset, setFeatOffset] = useState(0)
  /** 添加技能：上传自定义 skill 弹窗（文件 / GitHub / npx 三种接入方式） */
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploadTab, setUploadTab] = useState<'file' | 'github' | 'npx'>('file')
  const [uploadUrl, setUploadUrl] = useState('')
  const skillFileRef = useRef<HTMLInputElement>(null)

  /** 上传完成：登记到「我安装的」库并自动装备（与安装技能同逻辑） */
  const registerCustomSkill = (name: string, via: string) => {
    addMine({ id: `custom-${Date.now()}`, name, desc: `通过${via}上传的自定义 skill`, prompt: '', source: 'mine' })
    setUploadOpen(false)
    setUploadUrl('')
    showToast(`已上传「${name}」，可在「我安装的」与首页对话框「选择技能」中调用`)
  }
  const onSkillFile = (f: File | undefined) => {
    if (!f) return
    registerCustomSkill(f.name.replace(/\.(md|zip)$/i, ''), '文件')
  }
  const onSkillUrl = () => {
    const v = uploadUrl.trim()
    if (!v) {
      showToast('请先粘贴 GitHub 仓库地址或 npx 包名')
      return
    }
    const name = v.replace(/\/+$/, '').split('/').pop() || v
    registerCustomSkill(name, uploadTab === 'github' ? ' GitHub ' : ' npx ')
  }
  /** 技能详情页：点击卡片进入 */
  const [detail, setDetail] = useState<SkillEntry | null>(null)
  const [expertDetail, setExpertDetail] = useState<BrandExpert | null>(null) // 设计专家详情页（表现形式同技能详情页）

  /* ===== 团队 Tab 状态（PRD：AI Skill 团队板块） ===== */
  /** 子 Tab：官方团队 / 我的团队 */
  const [teamSub, setTeamSub] = useState<'official' | 'mine'>('official')
  /** 我的团队：localStorage 持久化 */
  const [myTeams, setMyTeams] = useState<Team[]>(loadMyTeams)
  /** 团队详情视图 */
  const [teamDetail, setTeamDetail] = useState<Team | null>(null)
  /** 团队编辑草稿：null=未在编辑；id 为空串=新建 */
  const [teamDraft, setTeamDraft] = useState<Team | null>(null)
  /** 添加技能选择器：开关 + 搜索词 */
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickQ, setPickQ] = useState('')

  /* 我的团队变更即持久化（原型态：跟随当前浏览器环境） */
  useEffect(() => {
    try {
      localStorage.setItem(LS_MY_TEAMS, JSON.stringify(myTeams))
    } catch {
      /* 存储不可用时仅保留会话内状态 */
    }
  }, [myTeams])

  const openTeamDetail = (t: Team) => {
    setTeamDetail(t)
    window.scrollTo({ top: 0 })
  }
  /** 新建团队：空白草稿进入编辑器（R-05：至少 1 个技能才可保存） */
  const startCreateTeam = () => {
    setTeamDraft({ id: '', name: '', desc: '', official: false, members: [], cat: 'design' })
    setPickerOpen(true)
    setPickQ('')
  }
  const startEditTeam = (t: Team) => {
    setTeamDraft({ ...t, members: [...t.members] })
    setTeamDetail(null)
    setPickerOpen(false)
    setPickQ('')
  }
  /** 添加技能到草稿（全局技能库选择；已在团队中的不可重复添加） */
  const draftAdd = (skillId: string) => {
    if (!teamDraft) return
    if (teamDraft.members.some((m) => m.skillId === skillId)) return
    setTeamDraft({ ...teamDraft, members: [...teamDraft.members, teamMemberOf(skillId)] })
  }
  /** 从草稿移除技能：仅剩 1 个时不可再删（需提示） */
  const draftRemove = (skillId: string) => {
    if (!teamDraft) return
    if (teamDraft.members.length <= 1) {
      showToast('团队至少需要保留 1 个技能')
      return
    }
    setTeamDraft({ ...teamDraft, members: teamDraft.members.filter((m) => m.skillId !== skillId) })
  }
  /** 保存团队：名称必填 + 至少 1 个技能（R-05） */
  const saveTeam = () => {
    if (!teamDraft) return
    if (!teamDraft.name.trim()) {
      showToast('请为团队命名')
      return
    }
    if (teamDraft.members.length === 0) {
      showToast('团队至少需要 1 个技能才能保存')
      return
    }
    const t: Team = { ...teamDraft, name: teamDraft.name.trim(), id: teamDraft.id || `my-${Date.now()}` }
    setMyTeams((list) => (list.some((x) => x.id === t.id) ? list.map((x) => (x.id === t.id ? t : x)) : [...list, t]))
    setTeamDraft(null)
    setTeamSub('mine')
    showToast(`团队「${t.name}」已保存`)
  }

  /* 进入/切换详情时回到顶部 */
  useEffect(() => {
    if (detail) window.scrollTo({ top: 0 })
  }, [detail])

  /** 精选技能：轮换展示 */
  const featured = useMemo(() => {
    const list = PLATFORM_SKILLS
    return Array.from({ length: 4 }, (_, i) => list[(featOffset + i) % list.length])
  }, [featOffset])

  /** 推荐区：分类 + 搜索 + 仅看已安装 */
  const filtered = useMemo(() => {
    const base = installedOnly ? equippedSkills : PLATFORM_SKILLS
    return base.filter(
      (s) =>
        (installedOnly || cat === '全部' || SKILL_CAT[s.id] === cat) &&
        (!q.trim() || s.name.includes(q.trim()) || s.desc.includes(q.trim()))
    )
  }, [installedOnly, equippedSkills, cat, q])

  /** 安装/移除设计专家：与技能卡功能一致——写入全局技能库，进入「我安装的」与首页对话框「选择技能」 */
  const toggleExpertInstall = (e: BrandExpert) => {
    const id = `brand-${e.brand}`
    if (isEquipped(id)) {
      removeMine(id)
      showToast(`已移除「${e.name}」`)
    } else {
      addMine({ id, name: e.name, desc: e.desc, prompt: e.prompt, source: 'platform', samples: [e.img] })
      showToast(`已安装「${e.name}」，可在「我安装的」与首页对话框「选择技能」中调用`)
    }
  }

  /** 安装/移除技能：真实功能模块——写入全局技能库，首页/画布对话框「选择技能」即可调用 */
  const toggleInstall = (s: SkillEntry) => {
    if (isEquipped(s.id)) {
      unequip(s.id)
      showToast(`已移除「${s.name}」`)
    } else {
      equip(s.id)
      showToast(`已安装「${s.name}」，可在首页对话框「选择技能」中调用`)
    }
  }

  /* ===== 我安装的：独立页面（参照附件：返回链接 + 大标题 + 空态居中） ===== */
  if (installedOnly && !detail) {
    return (
      <div className="max-w-[1360px] min-h-[calc(100vh-64px)] mx-auto px-10 pt-8 pb-16 flex flex-col">
        <button
          onClick={() => setInstalledOnly(false)}
          className="w-fit inline-flex items-center gap-1 text-[14px] text-ink-2 hover:text-ink transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          全部技能
        </button>
        <h1 className="mt-10 text-[28px] font-bold text-ink tracking-wide">我安装的</h1>
        {equippedSkills.length > 0 ? (
          <div className="mt-6 grid grid-cols-3 gap-5">
            {equippedSkills.map((s) => (
              <SkillCard key={s.id} s={s} installed onToggle={() => toggleInstall(s)} onUse={() => setDetail(s)} />
            ))}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <span className="text-[14px] text-ink-2">还没有安装任何技能</span>
          </div>
        )}
      </div>
    )
  }

  /* ===== 技能详情页：点击卡片进入（含说明 / 示例提示词 / 交付示例 / 相关技能） ===== */
  if (detail) {
    const dGlyph = GLYPHS[detail.glyph ?? 'mine']
    const dSoft = SOFT_ICON[detail.id] ?? { bg: '#F2F3F5', fg: '#64748B' }
    const dCat = SKILL_CAT[detail.id] ?? '我的技能'
    const installed = isEquipped(detail.id)
    const examples = detail.examples?.length ? detail.examples : [detail.prompt]
    const related = PLATFORM_SKILLS.filter((x) => x.id !== detail.id && SKILL_CAT[x.id] === SKILL_CAT[detail.id])
    const relatedList = (related.length ? related : PLATFORM_SKILLS.filter((x) => x.id !== detail.id)).slice(0, 4)
    return (
      <div className="max-w-[1360px] mx-auto px-10 pt-8 pb-16">
        <button
          onClick={() => setDetail(null)}
          className="w-fit inline-flex items-center gap-1 text-[14px] text-ink-2 hover:text-ink transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          {installedOnly ? '我安装的' : '全部技能'}
        </button>

        {/* 头部信息卡 */}
        <div className="mt-6 rounded-3xl border border-line bg-panel p-8 flex items-center gap-6">
          <div className="w-16 h-16 rounded-[18px] flex items-center justify-center shrink-0" style={{ background: dSoft.bg, color: dSoft.fg }}>
            {(() => { const G = dGlyph; return <G className="w-8 h-8" /> })()}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[26px] font-bold text-ink tracking-wide">{detail.name}</h1>
              {detail.version && <span className="h-6 px-2.5 rounded-md bg-fill text-[12px] text-ink-2 inline-flex items-center">v{detail.version}</span>}
              <span className="h-6 px-2.5 rounded-md bg-pri-soft text-pri text-[12px] inline-flex items-center">{dCat}</span>
              <span className="h-6 px-2.5 rounded-md bg-fill text-[12px] text-ink-2 inline-flex items-center">
                {detail.source === 'platform' ? '平台技能' : '我的技能'}
              </span>
            </div>
            <p className="mt-2.5 text-[14px] text-mut leading-[1.8]">{detail.desc}</p>
          </div>
          <div className="ml-auto flex flex-col gap-2.5 shrink-0">
            <button
              onClick={() => onUseSkill(detail)}
              className="h-11 px-6 rounded-full bg-ink text-panel text-[14px] font-medium inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Play className="w-4 h-4" />
              使用技能
            </button>
            <button
              onClick={() => toggleInstall(detail)}
              className={`h-11 px-6 rounded-full border text-[14px] inline-flex items-center justify-center gap-2 transition-colors ${
                installed ? 'border-pri/50 bg-pri-soft text-pri' : 'border-line text-ink hover:border-ink'
              }`}
            >
              {installed ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {installed ? '已安装' : '安装技能'}
            </button>
          </div>
        </div>

        {/* 试试这些提示词 */}
        <div className="mt-10">
          <h2 className="text-[18px] font-bold text-ink inline-flex items-center gap-2">
            <Lightbulb className="w-[18px] h-[18px] text-acc" />
            试试这些提示词
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3.5">
            {examples.map((ex) => (
              <button
                key={ex}
                onClick={() => onUseSkill(detail, ex)}
                className="group rounded-2xl border border-line bg-panel px-5 py-4 text-left text-[13.5px] text-ink-2 leading-[1.75] transition-all hover:border-pri/40 hover:shadow-[0_10px_28px_rgba(42,104,254,0.10)]"
              >
                <span className="flex items-center gap-2">
                  <span className="flex-1 line-clamp-2">{ex}</span>
                  <ArrowUpRight className="w-4 h-4 shrink-0 text-mut-3 group-hover:text-pri transition-colors" />
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 交付示例 */}
        {detail.samples && detail.samples.length > 0 && (
          <div className="mt-10">
            <h2 className="text-[18px] font-bold text-ink inline-flex items-center gap-2">
              <Images className="w-[18px] h-[18px] text-pri" />
              交付示例
            </h2>
            <div className="mt-4 grid grid-cols-3 gap-5">
              {detail.samples.slice(0, 3).map((src) => (
                <div key={src} className="rounded-2xl border border-line overflow-hidden bg-panel">
                  <img src={src} alt={`${detail.name} 示例`} className="w-full aspect-[4/3] object-cover" loading="lazy" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 相关技能 */}
        <div className="mt-10">
          <h2 className="text-[18px] font-bold text-ink">相关技能</h2>
          <div className="mt-4 grid grid-cols-3 gap-5">
            {relatedList.map((r) => (
              <SkillCard key={r.id} s={r} installed={isEquipped(r.id)} onToggle={() => toggleInstall(r)} onUse={() => setDetail(r)} />
            ))}
          </div>
        </div>
      </div>
    )
  }

  /* ===== 设计专家详情页：表现形式与「技能」板块技能详情页一致，提示词等内容按品牌专家业务逻辑规划 ===== */
  if (expertDetail) {
    const e = expertDetail
    const installed = isEquipped(`brand-${e.brand}`)
    const entry: SkillEntry = { id: `brand-${e.brand}`, name: e.name, desc: e.desc, prompt: e.prompt, source: 'platform', samples: [e.img] }
    const relatedExperts = BRAND_EXPERTS.filter((x) => x.brand !== e.brand).slice(0, 3)
    return (
      <div className="max-w-[1360px] mx-auto px-10 pt-8 pb-16">
        <button
          onClick={() => setExpertDetail(null)}
          className="w-fit inline-flex items-center gap-1 text-[14px] text-ink-2 hover:text-ink transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
          设计专家
        </button>

        {/* 头部信息卡 */}
        <div className="mt-6 rounded-3xl border border-line bg-panel p-8 flex items-center gap-6">
          <img src={e.img} alt={e.name} className="w-16 h-16 rounded-[18px] object-cover shrink-0" />
          <div className="min-w-0">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-[26px] font-bold text-ink tracking-wide">{e.name}</h1>
              <span className="h-6 px-2.5 rounded-md bg-pri-soft text-pri text-[12px] inline-flex items-center">品牌专家</span>
              <span className="h-6 px-2.5 rounded-md bg-fill text-[12px] text-ink-2 inline-flex items-center">画衣衣 官方</span>
              <span className="h-6 px-2.5 rounded-md bg-fill text-[12px] text-ink-2 inline-flex items-center gap-1">
                <Users className="w-3 h-3" />
                {e.uses}
              </span>
            </div>
            <p className="mt-2.5 text-[14px] text-mut leading-[1.8]">{e.desc}</p>
          </div>
          <div className="ml-auto flex flex-col gap-2.5 shrink-0">
            <button
              onClick={() => onUseSkill(entry, e.prompt)}
              className="h-11 px-6 rounded-full bg-ink text-panel text-[14px] font-medium inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
            >
              <Play className="w-4 h-4" />
              调用专家
            </button>
            <button
              onClick={() => toggleExpertInstall(e)}
              className={`h-11 px-6 rounded-full border text-[14px] inline-flex items-center justify-center gap-2 transition-colors ${
                installed ? 'border-pri/50 bg-pri-soft text-pri' : 'border-line text-ink hover:border-ink'
              }`}
            >
              {installed ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {installed ? '已安装' : '安装技能'}
            </button>
          </div>
        </div>

        {/* 试试这些提示词：品牌视角的风格把控指令 */}
        <div className="mt-10">
          <h2 className="text-[18px] font-bold text-ink inline-flex items-center gap-2">
            <Lightbulb className="w-[18px] h-[18px] text-acc" />
            试试这些提示词
          </h2>
          <div className="mt-4 grid grid-cols-2 gap-3.5">
            {e.examples.map((ex) => (
              <button
                key={ex}
                onClick={() => onUseSkill(entry, ex)}
                className="group rounded-2xl border border-line bg-panel px-5 py-4 text-left text-[13.5px] text-ink-2 leading-[1.75] transition-all hover:border-pri/40 hover:shadow-[0_10px_28px_rgba(42,104,254,0.10)]"
              >
                <span className="flex items-center gap-2">
                  <span className="flex-1 line-clamp-2">{ex}</span>
                  <ArrowUpRight className="w-4 h-4 shrink-0 text-mut-3 group-hover:text-pri transition-colors" />
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* 交付示例 */}
        <div className="mt-10">
          <h2 className="text-[18px] font-bold text-ink inline-flex items-center gap-2">
            <Images className="w-[18px] h-[18px] text-pri" />
            交付示例
          </h2>
          <div className="mt-4 grid grid-cols-3 gap-5">
            {[e.img, '/samples/gen-look.png', '/samples/gen-model.png'].map((src) => (
              <div key={src} className="rounded-2xl border border-line overflow-hidden bg-panel">
                <img src={src} alt={`${e.name} 示例`} className="w-full aspect-[4/3] object-cover" loading="lazy" />
              </div>
            ))}
          </div>
        </div>

        {/* 相关专家 */}
        <div className="mt-10">
          <h2 className="text-[18px] font-bold text-ink">相关专家</h2>
          <div className="mt-4 grid grid-cols-3 gap-5">
            {relatedExperts.map((r) => (
              <ExpertCard
                key={r.brand}
                e={r}
                installed={isEquipped(`brand-${r.brand}`)}
                onToggle={() => toggleExpertInstall(r)}
                onOpen={() => setExpertDetail(r)}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  const installSuite = (suite: Suite) => {
    const all = suite.skillIds.every((id) => isEquipped(id))
    if (all) {
      suite.skillIds.forEach((id) => unequip(id))
      showToast(`已移除套件「${suite.name}」`)
    } else {
      suite.skillIds.forEach((id) => equip(id))
      showToast(`套件「${suite.name}」已一键安装 ${suite.skillIds.length} 个技能`)
    }
  }

  return (
    <div className="max-w-[1360px] mx-auto px-10 pt-8 pb-16">
      {/* ===== 顶栏：分段 Tab + 搜索 + 我安装的 + 添加技能 ===== */}
      <div className="flex items-center gap-3">
        <div className="inline-flex bg-fill rounded-full p-1 text-[14px]">
          {([
            ['expert', '专家', UserRound],
            ['team', '团队', Users],
            ['skill', '技能', Zap],
            ['conn', '连接器', Link2],
          ] as const).map(([k, label, Icon]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`h-10 px-4 rounded-full inline-flex items-center gap-1.5 transition-colors ${
                tab === k ? 'bg-ink text-panel font-medium shadow-sm' : 'text-ink-3 hover:text-ink'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
        {tab === 'skill' && (
          <div className="ml-auto flex items-center gap-2.5">
            <div className="flex items-center gap-2 h-11 w-[340px] px-4 rounded-xl bg-fill focus-within:ring-2 focus-within:ring-pri/15 transition-shadow">
              <Search className="w-4 h-4 text-mut-3 shrink-0" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="搜索技能"
                className="flex-1 min-w-0 bg-transparent outline-none text-[13px] placeholder:text-mut-3"
              />
            </div>
            <button
              onClick={() => setInstalledOnly((v) => !v)}
              className={`h-11 px-4 rounded-xl border text-[13.5px] inline-flex items-center gap-1.5 transition-colors ${
                installedOnly ? 'border-pri/50 bg-pri-soft text-pri font-medium' : 'border-line bg-panel text-ink-2 hover:border-pri/40 hover:text-pri'
              }`}
            >
              <Download className="w-4 h-4" />
              我安装的
            </button>
            <button
              onClick={() => {
                setUploadTab('file')
                setUploadUrl('')
                setUploadOpen(true)
              }}
              className="h-11 px-4 rounded-xl bg-ink text-white text-[13.5px] font-medium inline-flex items-center gap-1.5 hover:bg-ink/85 transition-colors"
            >
              <Plus className="w-4 h-4" />
              添加技能
            </button>
          </div>
        )}
      </div>

      {/* ===== 专家 Tab：联动 AI 版师 ===== */}
      {tab === 'expert' && (
        <>
          {/* ===== 设计专家：一个专家代表一个品牌视角，点击卡片调用对应品牌专家进行风格把控 ===== */}
          <div className="mt-8">
            <h2 className="text-[24px] font-bold text-ink tracking-wide">设计专家</h2>
            <p className="mt-2 text-[13.5px] text-mut leading-relaxed max-w-[640px]">
              每一个专家代表一个品牌，从品牌的视角给出符合其品牌风格的标准定义。想要设计出某个品牌的风格，即可调用对应的品牌专家为你的设计进行风格把控。
            </p>
            <div className="mt-5 grid grid-cols-3 gap-4">
              {BRAND_EXPERTS.map((e) => (
                <ExpertCard
                  key={e.brand}
                  e={e}
                  installed={isEquipped(`brand-${e.brand}`)}
                  onToggle={() => toggleExpertInstall(e)}
                  onOpen={() => setExpertDetail(e)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* ===== 团队 Tab：官方团队 / 我的团队（PRD 4.1-4.3：列表 + 详情 + 编辑器） ===== */}
      {tab === 'team' && (
        <>
          {teamDraft ? (
            /* —— 团队编辑器：新建 / 编辑我的团队 —— */
            <div className="mt-6 max-w-[860px]">
              <button
                onClick={() => setTeamDraft(null)}
                className="w-fit inline-flex items-center gap-1 text-[14px] text-ink-2 hover:text-ink transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                返回团队列表
              </button>
              <h2 className="mt-5 text-[24px] font-bold text-ink tracking-wide">{teamDraft.id ? '编辑团队' : '新建团队'}</h2>

              <div className="mt-6 rounded-3xl border border-line bg-panel p-7">
                <label className="block text-[13px] font-medium text-ink">团队名称</label>
                <input
                  value={teamDraft.name}
                  onChange={(e) => setTeamDraft({ ...teamDraft, name: e.target.value })}
                  maxLength={20}
                  placeholder="例如：胶囊系列突击队"
                  className="mt-2 w-full h-11 px-4 rounded-xl border border-line bg-panel text-[14px] outline-none focus:border-pri transition-colors placeholder:text-mut-3"
                />

                <label className="mt-5 block text-[13px] font-medium text-ink">团队描述</label>
                <textarea
                  value={teamDraft.desc}
                  onChange={(e) => setTeamDraft({ ...teamDraft, desc: e.target.value })}
                  rows={2}
                  placeholder="一句话说明这个团队帮你完成什么"
                  className="mt-2 w-full px-4 py-3 rounded-xl border border-line bg-panel text-[14px] outline-none focus:border-pri transition-colors resize-none placeholder:text-mut-3"
                />

                <div className="mt-6 flex items-center justify-between">
                  <span className="text-[13px] font-medium text-ink">
                    成员技能
                    <span className="ml-1.5 text-[12px] font-normal text-mut-2">按添加顺序串行执行，至少 1 个</span>
                  </span>
                  <button
                    onClick={() => setPickerOpen((v) => !v)}
                    className={`h-9 px-4 rounded-full border text-[12.5px] inline-flex items-center gap-1.5 transition-colors ${
                      pickerOpen ? 'border-pri/50 bg-pri-soft text-pri' : 'border-line text-ink hover:border-ink'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    添加技能
                  </button>
                </div>

                {/* 添加技能：全局技能库选择器（搜索） */}
                {pickerOpen && (
                  <div className="mt-3 rounded-2xl border border-line bg-fill/50 p-3">
                    <div className="flex items-center gap-2 h-10 px-3.5 rounded-xl bg-panel border border-line-soft">
                      <Search className="w-4 h-4 text-mut-3 shrink-0" />
                      <input
                        value={pickQ}
                        onChange={(e) => setPickQ(e.target.value)}
                        placeholder="搜索技能库，点击添加为团队成员"
                        className="flex-1 min-w-0 bg-transparent outline-none text-[13px] placeholder:text-mut-3"
                      />
                    </div>
                    <div className="mt-2.5 max-h-[240px] overflow-y-auto [scrollbar-width:thin] space-y-1">
                      {PLATFORM_SKILLS.filter((x) => !pickQ.trim() || x.name.includes(pickQ.trim()) || x.desc.includes(pickQ.trim())).map((x) => {
                        const added = teamDraft.members.some((m) => m.skillId === x.id)
                        const G = GLYPHS[x.glyph ?? 'mine']
                        return (
                          <button
                            key={x.id}
                            disabled={added}
                            onClick={() => draftAdd(x.id)}
                            className="w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-panel disabled:opacity-45 disabled:hover:bg-transparent"
                          >
                            <span className={`w-8 h-8 rounded-lg bg-gradient-to-br ${x.tint ?? 'from-slate-400 to-slate-600'} text-white flex items-center justify-center shrink-0`}>
                              <G className="w-4 h-4" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block text-[13px] font-medium text-ink">{x.name}</span>
                              <span className="block text-[11.5px] text-mut truncate">{x.desc}</span>
                            </span>
                            {added ? (
                              <span className="inline-flex items-center gap-1 text-[11.5px] text-mut-2 shrink-0">
                                <Check className="w-3.5 h-3.5" />
                                已添加
                              </span>
                            ) : (
                              <Plus className="w-4 h-4 text-mut-2 shrink-0" />
                            )}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* 成员清单：序号即工作流执行顺序；悬停显示移除（剩 1 个不可删） */}
                <div className="mt-3 space-y-2.5">
                  {teamDraft.members.map((m, i) => {
                    const G = GLYPHS[m.glyph]
                    return (
                      <div key={m.skillId} className="group flex items-center gap-3.5 rounded-2xl border border-line-soft bg-panel p-3.5">
                        <span className="w-7 h-7 rounded-full bg-ink text-panel text-[12px] font-medium flex items-center justify-center shrink-0">{i + 1}</span>
                        <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${m.tint} text-white flex items-center justify-center shrink-0`}>
                          <G className="w-5 h-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-bold text-ink">{m.name}</span>
                          <span className="mt-0.5 block text-[12px] text-mut truncate">{m.desc}</span>
                        </span>
                        <button
                          onClick={() => draftRemove(m.skillId)}
                          title="移出团队"
                          className="w-7 h-7 rounded-full flex items-center justify-center text-mut-3 opacity-0 group-hover:opacity-100 hover:bg-err/10 hover:text-err transition-all shrink-0"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )
                  })}
                  {teamDraft.members.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-line-strong py-8 text-center text-[12.5px] text-mut-2">
                      还没有成员技能，点击右上角「添加技能」开始组建团队
                    </div>
                  )}
                </div>

                <div className="mt-7 flex items-center gap-2.5">
                  <button
                    onClick={saveTeam}
                    className="h-10 px-6 rounded-full bg-ink text-panel text-[13.5px] font-medium inline-flex items-center gap-1.5 hover:bg-ink/85 transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    保存团队
                  </button>
                  <button
                    onClick={() => setTeamDraft(null)}
                    className="h-10 px-5 rounded-full border border-line text-[13.5px] text-ink hover:border-ink transition-colors"
                  >
                    取消
                  </button>
                </div>
              </div>
            </div>
          ) : teamDetail ? (
            /* —— 团队详情：成员清单 + 工作流预览 —— */
            <div className="mt-6">
              <button
                onClick={() => setTeamDetail(null)}
                className="w-fit inline-flex items-center gap-1 text-[14px] text-ink-2 hover:text-ink transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
                团队列表
              </button>

              <div className="mt-5 rounded-3xl border border-line bg-panel p-8 flex items-center gap-6">
                <span className="w-16 h-16 rounded-[18px] bg-pri-soft text-pri flex items-center justify-center shrink-0">
                  <Users className="w-8 h-8" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-[26px] font-bold text-ink tracking-wide">{teamDetail.name}</h1>
                    {teamDetail.official && (
                      <span className="h-6 px-2.5 rounded-md bg-pri-soft text-pri text-[12px] inline-flex items-center gap-1">
                        <BadgeCheck className="w-3.5 h-3.5" />
                        官方团队
                      </span>
                    )}
                    <span className="h-6 px-2.5 rounded-md bg-fill text-[12px] text-ink-2 inline-flex items-center">{teamDetail.members.length} 个成员技能</span>
                    {teamDetail.users && <span className="h-6 px-2.5 rounded-md bg-fill text-[12px] text-ink-2 inline-flex items-center">{teamDetail.users} 人在用</span>}
                  </div>
                  <p className="mt-2.5 text-[14px] text-mut leading-[1.8]">{teamDetail.desc}</p>
                </div>
                <div className="ml-auto flex flex-col gap-2.5 shrink-0">
                  <button
                    onClick={() => onUseTeam(teamDetail)}
                    className="h-11 px-6 rounded-full bg-ink text-panel text-[14px] font-medium inline-flex items-center gap-2 hover:opacity-90 transition-opacity"
                  >
                    <Play className="w-4 h-4" />
                    使用此团队
                  </button>
                  {!teamDetail.official && (
                    <button
                      onClick={() => startEditTeam(teamDetail)}
                      className="h-11 px-6 rounded-full border border-line text-[14px] text-ink hover:border-ink transition-colors"
                    >
                      编辑团队
                    </button>
                  )}
                </div>
              </div>

              {/* 工作流预览：成员按执行顺序编号（R-01 串行） */}
              <div className="mt-8 max-w-[860px]">
                <h2 className="text-[18px] font-bold text-ink">工作流预览</h2>
                <p className="mt-1 text-[12.5px] text-mut-2">下达指令后，成员技能将按以下顺序串行接力执行</p>
                <div className="mt-4 space-y-3">
                  {teamDetail.members.map((m, i) => {
                    const G = GLYPHS[m.glyph]
                    return (
                      <div key={m.skillId} className="flex items-center gap-4 rounded-2xl border border-line-soft bg-panel p-4">
                        <span className="w-7 h-7 rounded-full bg-ink text-panel text-[12px] font-medium flex items-center justify-center shrink-0">{i + 1}</span>
                        <span className={`w-10 h-10 rounded-xl bg-gradient-to-br ${m.tint} text-white flex items-center justify-center shrink-0`}>
                          <G className="w-5 h-5" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14px] font-bold text-ink">{m.name}</span>
                          <span className="mt-0.5 block text-[12px] text-mut line-clamp-1">{m.desc}</span>
                        </span>
                        {i < teamDetail.members.length - 1 && <span className="text-[12px] text-mut-3 shrink-0">完成后交接 ↓</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : (
            /* —— 团队列表：官方团队 / 我的团队 —— */
            <div className="mt-8">
              {/* 子 Tab（右侧：我的团队=新建团队入口） */}
              <div className="flex items-center justify-between gap-4">
              <div className="inline-flex bg-fill rounded-full p-1 text-[13.5px]">
                {([
                  ['official', '官方团队'],
                  ['mine', myTeams.length ? `我的团队 ${myTeams.length}` : '我的团队'],
                ] as const).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setTeamSub(k)}
                    className={`h-9 px-4 rounded-full transition-colors ${teamSub === k ? 'bg-panel text-ink font-medium shadow-sm' : 'text-ink-3 hover:text-ink'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              {teamSub === 'mine' && (
                <button
                  onClick={startCreateTeam}
                  className="h-10 px-5 rounded-full bg-ink text-panel text-[13.5px] font-medium inline-flex items-center gap-1.5 hover:bg-ink/85 transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" />
                  新建团队
                </button>
              )}
              </div>

              {teamSub === 'official' ? (
                <div className="mt-5 grid grid-cols-3 gap-4">
                  {OFFICIAL_TEAMS.map((t) => (
                    <div key={t.id} className="rounded-2xl border border-line-soft bg-panel p-5 flex flex-col transition-colors hover:border-pri/40">
                      <div className="flex items-center gap-2.5">
                        <span className="w-10 h-10 rounded-xl bg-pri-soft text-pri flex items-center justify-center shrink-0">
                          <Users className="w-5 h-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1.5">
                            <span className="text-[15px] font-bold text-ink truncate">{t.name}</span>
                            <BadgeCheck className="w-4 h-4 text-pri shrink-0" />
                          </span>
                          <span className="mt-0.5 block text-[11.5px] text-mut-2">画衣衣 官方 · {t.members.length} 个技能 · {t.users} 人在用</span>
                        </span>
                      </div>
                      <p className="mt-3 text-[12.5px] text-mut leading-relaxed line-clamp-2">{t.desc}</p>
                      <div className="mt-3 flex items-center gap-1 flex-wrap">
                        {t.members.map((m, i) => {
                          const G = GLYPHS[m.glyph]
                          return (
                            <span key={m.skillId} className="flex items-center gap-1">
                              {i > 0 && <span className="text-mut-3 text-[11px]">→</span>}
                              <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-fill text-[11px] text-ink-2">
                                <G className="w-3 h-3" />
                                {m.name}
                              </span>
                            </span>
                          )
                        })}
                      </div>
                      <div className="mt-4 pt-4 border-t border-line-soft flex items-center gap-2">
                        <button
                          onClick={() => onUseTeam(t)}
                          className="h-9 px-4 rounded-full bg-ink text-panel text-[12.5px] font-medium inline-flex items-center gap-1.5 hover:bg-pri transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                          一键使用
                        </button>
                        <button
                          onClick={() => openTeamDetail(t)}
                          className="h-9 px-4 rounded-full border border-line text-[12.5px] text-ink hover:border-ink transition-colors"
                        >
                          查看详情
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : myTeams.length === 0 ? (
                /* 空状态：引导创建 / 跳转官方推荐 */
                <div className="mt-5 rounded-2xl border border-dashed border-line-strong bg-panel px-6 py-16 flex flex-col items-center text-center">
                  <span className="w-14 h-14 rounded-2xl bg-fill flex items-center justify-center text-mut-2">
                    <Users className="w-7 h-7" />
                  </span>
                  <p className="mt-4 text-[15px] font-bold text-ink">还没有自己的团队</p>
                  <p className="mt-1.5 text-[12.5px] text-mut max-w-[400px] leading-relaxed">
                    从技能库中挑选至少 1 个技能，按工作流顺序串成你的专属团队；也可以先选用官方推荐团队跑起来。
                  </p>
                  <div className="mt-5 flex items-center gap-2.5">
                    <button
                      onClick={startCreateTeam}
                      className="h-10 px-5 rounded-full bg-ink text-panel text-[13px] font-medium inline-flex items-center gap-1.5 hover:bg-ink/85 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      新建团队
                    </button>
                    <button
                      onClick={() => setTeamSub('official')}
                      className="h-10 px-5 rounded-full border border-line text-[13px] text-ink hover:border-ink transition-colors"
                    >
                      看看官方团队
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 grid grid-cols-3 gap-4">
                  {myTeams.map((t) => (
                    <div key={t.id} className="rounded-2xl border border-line-soft bg-panel p-5 flex flex-col transition-colors hover:border-pri/40">
                      <div className="flex items-center gap-2.5">
                        <span className="w-10 h-10 rounded-xl bg-fill text-ink-2 flex items-center justify-center shrink-0">
                          <Users className="w-5 h-5" />
                        </span>
                        <span className="min-w-0">
                          <span className="text-[15px] font-bold text-ink truncate block">{t.name}</span>
                          <span className="mt-0.5 block text-[11.5px] text-mut-2">我的团队 · {t.members.length} 个技能</span>
                        </span>
                      </div>
                      <p className="mt-3 text-[12.5px] text-mut leading-relaxed line-clamp-2">{t.desc || '这个团队还没有描述'}</p>
                      <div className="mt-3 flex items-center gap-1 flex-wrap">
                        {t.members.map((m, i) => {
                          const G = GLYPHS[m.glyph]
                          return (
                            <span key={m.skillId} className="flex items-center gap-1">
                              {i > 0 && <span className="text-mut-3 text-[11px]">→</span>}
                              <span className="inline-flex items-center gap-1 h-6 px-2 rounded-md bg-fill text-[11px] text-ink-2">
                                <G className="w-3 h-3" />
                                {m.name}
                              </span>
                            </span>
                          )
                        })}
                      </div>
                      <div className="mt-4 pt-4 border-t border-line-soft flex items-center gap-2">
                        <button
                          onClick={() => onUseTeam(t)}
                          className="h-9 px-4 rounded-full bg-ink text-panel text-[12.5px] font-medium inline-flex items-center gap-1.5 hover:bg-pri transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                          使用团队
                        </button>
                        <button
                          onClick={() => startEditTeam(t)}
                          className="h-9 px-4 rounded-full border border-line text-[12.5px] text-ink hover:border-ink transition-colors"
                        >
                          编辑
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ===== 技能 Tab ===== */}
      {tab === 'skill' && !installedOnly && (
        <>
          {/* 精选技能 */}
          <div className="mt-8 flex items-center">
            <h2 className="text-[24px] font-bold text-ink tracking-wide">精选Skills</h2>
            <button
              onClick={() => setFeatOffset((v) => v + 1)}
              className="ml-auto h-9 px-3 rounded-full text-[13px] text-mut hover:text-ink hover:bg-fill inline-flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              换一换
            </button>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-5">
            {featured.map((s) => (
              <SkillCard key={s.id} s={s} installed={isEquipped(s.id)} onToggle={() => toggleInstall(s)} onUse={() => setDetail(s)} />
            ))}
          </div>

          {/* 推荐 / 套件 子 Tab */}
          <div className="mt-12 flex items-baseline gap-6">
            {([
              ['rec', 'Skills'],
              ['suite', '套件'],
            ] as const).map(([k, label]) => (
              <button
                key={k}
                onClick={() => setSub(k)}
                className={`text-[24px] tracking-wide transition-colors ${sub === k ? 'font-bold text-ink' : 'font-medium text-mut-2 hover:text-ink'}`}
              >
                {label}
              </button>
            ))}
          </div>

          {sub === 'rec' && (
            <>
              {/* 分类标签 */}
              <div className="mt-4 flex items-center gap-1.5 flex-wrap">
                {CATS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCat(c)}
                    className={`h-9 px-4 rounded-lg text-[14px] transition-colors ${
                      cat === c ? 'bg-fill text-ink font-medium' : 'text-mut hover:text-ink'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <div className="mt-5 grid grid-cols-3 gap-5">
                {filtered.map((s) => (
                  <SkillCard key={s.id} s={s} installed={isEquipped(s.id)} onToggle={() => toggleInstall(s)} onUse={() => setDetail(s)} />
                ))}
                {!filtered.length && (
                  <div className="col-span-4 py-16 text-center text-[12.5px] text-mut">没有匹配的技能，换个关键词或分类试试</div>
                )}
              </div>
            </>
          )}

          {sub === 'suite' && (
            <div className="mt-5 grid grid-cols-3 gap-5">
              {SUITES.map((suite) => {
                const all = suite.skillIds.every((id) => isEquipped(id))
                const names = suite.skillIds.map((id) => PLATFORM_SKILLS.find((s) => s.id === id)?.name ?? id)
                return (
                  <div key={suite.id} className="rounded-2xl border border-line bg-panel p-6 flex flex-col transition-all hover:border-pri/40 hover:shadow-[0_10px_28px_rgba(42,104,254,0.10)]">
                    <div className="flex items-center gap-3">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${suite.tint} text-white flex items-center justify-center shrink-0`}>
                        <Layers className="w-5 h-5" />
                      </div>
                      <div className="text-[17px] font-bold text-ink">{suite.name}</div>
                    </div>
                    <p className="mt-3 text-[13.5px] text-mut leading-[1.75]">{suite.desc}</p>
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {names.map((n) => (
                        <span key={n} className="h-6 px-2 rounded-md bg-fill text-ink-3 text-[11px] inline-flex items-center">{n}</span>
                      ))}
                    </div>
                    <button
                      onClick={() => installSuite(suite)}
                      className={`mt-4 h-10 w-full rounded-xl text-[13px] font-medium transition-colors inline-flex items-center justify-center gap-1.5 ${
                        all ? 'bg-pri-soft text-pri' : 'bg-pri text-white hover:bg-pri/90'
                      }`}
                    >
                      {all ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                      {all ? '已安装，点击移除' : '一键安装套件'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {/* ===== 连接器 Tab：复用连接器面板 ===== */}
      {tab === 'conn' && (
        <div className="mt-6 rounded-2xl border border-line bg-panel p-5">
          <ConnectorsPanel />
        </div>
      )}

      {/* ===== 上传自定义 skill 弹窗：文件 / GitHub / npx 三种接入方式 ===== */}
      {uploadOpen && (
        <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center p-6" onClick={() => setUploadOpen(false)}>
          <div className="w-[600px] bg-panel rounded-2xl border border-line shadow-[0_24px_64px_rgba(0,0,0,0.18)] p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center">
              <h3 className="text-[17px] font-bold text-ink">上传自定义 skill</h3>
              <button
                onClick={() => setUploadOpen(false)}
                title="关闭"
                className="ml-auto w-8 h-8 rounded-lg flex items-center justify-center text-mut hover:bg-fill hover:text-ink transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* 接入方式切换 */}
            <div className="mt-5 grid grid-cols-3 gap-2.5">
              {([
                ['file', '文件', Upload],
                ['github', 'GitHub', Github],
                ['npx', 'npx', Terminal],
              ] as const).map(([k, label, Icon]) => (
                <button
                  key={k}
                  onClick={() => setUploadTab(k)}
                  className={`h-11 rounded-lg border text-[14px] inline-flex items-center justify-center gap-2 transition-colors ${
                    uploadTab === k ? 'bg-panel border-ink text-ink font-medium' : 'bg-fill border-transparent text-ink-2 hover:text-ink'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </button>
              ))}
            </div>

            {uploadTab === 'file' && (
              <div
                onClick={() => skillFileRef.current?.click()}
                className="mt-4 h-[180px] rounded-xl border border-line bg-panel flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-pri/40 transition-colors"
              >
                <Upload className="w-6 h-6 text-mut" />
                <div className="text-[15px] font-semibold text-ink">选择 skill 文件</div>
                <div className="text-[12.5px] text-mut-2">支持 SKILL.md，或包含 SKILL.md 的 zip 包。</div>
                <input
                  ref={skillFileRef}
                  type="file"
                  accept=".md,.zip"
                  className="hidden"
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => {
                    onSkillFile(e.target.files?.[0])
                    e.target.value = ''
                  }}
                />
              </div>
            )}

            {uploadTab === 'github' && (
              <div className="mt-4 h-[180px] rounded-xl border border-line bg-panel flex flex-col items-center justify-center gap-3 px-8">
                <Github className="w-6 h-6 text-mut" />
                <div className="text-[15px] font-semibold text-ink">从 GitHub 导入 skill</div>
                <input
                  value={uploadUrl}
                  onChange={(e) => setUploadUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSkillUrl()}
                  placeholder="粘贴包含 SKILL.md 的仓库地址，如 https://github.com/org/repo"
                  className="w-full h-10 px-3.5 rounded-lg bg-fill outline-none text-[13px] placeholder:text-mut-3 focus:ring-2 focus:ring-pri/15"
                />
                <button onClick={onSkillUrl} className="h-9 px-5 rounded-lg bg-ink text-white text-[13px] font-medium hover:bg-ink/85 transition-colors">
                  导入
                </button>
              </div>
            )}

            {uploadTab === 'npx' && (
              <div className="mt-4 h-[180px] rounded-xl border border-line bg-panel flex flex-col items-center justify-center gap-3 px-8">
                <Terminal className="w-6 h-6 text-mut" />
                <div className="text-[15px] font-semibold text-ink">通过 npx 安装 skill</div>
                <input
                  value={uploadUrl}
                  onChange={(e) => setUploadUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && onSkillUrl()}
                  placeholder="输入包名，如 @huayiyi/skill-xxx"
                  className="w-full h-10 px-3.5 rounded-lg bg-fill outline-none text-[13px] placeholder:text-mut-3 focus:ring-2 focus:ring-pri/15"
                />
                <button onClick={onSkillUrl} className="h-9 px-5 rounded-lg bg-ink text-white text-[13px] font-medium hover:bg-ink/85 transition-colors">
                  安装
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
