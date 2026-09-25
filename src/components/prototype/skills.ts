/* ================= 技能模块：全局共享状态（首页技能页 ↔ Agent 对话框「选择技能」双向同步） =================
 * 数据持久化于浏览器 localStorage（原型态：技能资产跟随当前用户账户的浏览器环境） */

import { useSyncExternalStore } from 'react'
import {
  Calculator,
  CalendarRange,
  ClipboardList,
  Flame,
  Globe2,
  Hammer,
  Layers,
  LayoutTemplate,
  Sparkles,
} from 'lucide-react'

/** 卡片图标图形键（极简彩色渐变方块 + 白色图形，样式参考主流技能市场） */
export type SkillGlyph = 'flame' | 'globe' | 'layers' | 'plan' | 'tech' | 'layout' | 'cost' | 'trend' | 'mine'

export interface SkillEntry {
  id: string
  name: string
  /** 技能说明：用途 / 使用场景 */
  desc: string
  /** 提示词工程：使用技能时带入 Agent 对话框 */
  prompt: string
  /** platform=平台技能市场；mine=用户沉淀/自建 */
  source: 'platform' | 'mine'
  created?: number
  /** 版本号（卡片与详情页展示） */
  version?: string
  /** 详情页「试试这些提示词」示例（缺省时回退为提示词工程本身） */
  examples?: string[]
  /** 卡片图标图形 */
  glyph?: SkillGlyph
  /** 图标渐变（Tailwind 类，如 'from-orange-400 to-rose-500'） */
  tint?: string
  /** 详情页「示例图」：该技能的历史交付结果图（本地资源路径） */
  samples?: string[]
}

/** 图标图形键 → 图标组件（技能页卡片/详情页与首页对话框技能胶囊共用） */
export const GLYPHS: Record<SkillGlyph, typeof Flame> = {
  flame: Flame,
  globe: Globe2,
  layers: Layers,
  plan: CalendarRange,
  tech: ClipboardList,
  layout: LayoutTemplate,
  cost: Calculator,
  trend: Sparkles,
  mine: Hammer,
}

/** 平台技能市场：系统预设 / 社区共享（原型演示数据） */
export const PLATFORM_SKILLS: SkillEntry[] = [
  { id: 'pf-hit', name: '爆款推款助手', desc: '基于市场趋势与品类数据，批量推导高潜新款方向', prompt: '请基于当季市场趋势与品类热销数据，为我批量推导 5 个高潜新款方向：每个方向给出目标人群、核心卖点、建议廓形与面料组合。', source: 'platform', samples: ['/samples/pf-hit.png', '/samples/gen-look.png', '/samples/gen-model.png'],  version: '1.3.1', glyph: 'flame', tint: 'from-orange-400 to-rose-500', examples: ['帮我推导 5 个 26 早春高潜新款方向', '基于近 30 天热销数据，推荐本季连衣裙的爆款元素'] },
  { id: 'pf-trade', name: '外贸大单快反', desc: '面向外贸订单的快速改款、多尺码与多市场适配', prompt: '请针对外贸订单场景对当前款式做快速改款：适配欧美尺码体系，输出多尺码放码建议与多市场（欧美/东南亚/中东）适配说明。', source: 'platform', samples: ['/samples/pf-trade.png', '/samples/gen-model.png', '/samples/gen-look.png'],  version: '2.0.0', glyph: 'globe', tint: 'from-sky-400 to-blue-600', examples: ['把这款外套适配欧美尺码并输出放码建议', '针对中东市场给出这款长裙的改款方案'] },
  { id: 'pf-fabric', name: '面料智库问答', desc: '面料成分、克重、工艺与供应商智能答疑', prompt: '请作为面料专家，回答我关于面料成分、克重、手感、工艺适配与供应商选择的问题，并给出可采购的替代方案。', source: 'platform', samples: ['/samples/pf-fabric.png', '/samples/gen-look.png', '/samples/gen-model.png'],  version: '1.0.1', glyph: 'layers', tint: 'from-violet-400 to-purple-600', examples: ['60S 匹马棉和 80S 长绒棉做衬衫哪个更合适？', '真丝双绉有没有性价比更高的替代面料？'] },
  { id: 'pf-plan', name: '系列企划生成', desc: '一键生成季节系列企划：主题、波段、SKU 结构', prompt: '请为我生成一份 2026 秋冬系列企划：包含主题故事、上市波段规划、SKU 结构与价格带分布，输出为结构化表格。', source: 'platform', samples: ['/samples/pf-plan.png', '/samples/gen-look.png', '/samples/gen-model.png'],  version: '1.2.0', glyph: 'plan', tint: 'from-emerald-400 to-teal-600', examples: ['生成 2026 秋冬系列企划：主题、波段与 SKU 结构', '帮我规划一个 12 款的胶囊系列并给出价格带'] },
  { id: 'pf-techpack', name: '工艺单自动生成', desc: '从款式图生成标准工艺单与尺寸表', prompt: '请基于画布中的款式生成标准工艺单：含各部位尺寸表、缝制工艺要求、辅料清单与质检要点。', source: 'platform', samples: ['/samples/pf-techpack.png', '/samples/gen-model.png', '/samples/gen-look.png'],  version: '1.0.0', glyph: 'tech', tint: 'from-amber-400 to-orange-500', examples: ['把画布上的风衣生成标准工艺单和尺寸表', '输出这款卫衣的缝制工艺要求与辅料清单'] },
  { id: 'pf-detail', name: '电商详情页套版', desc: '主图 + 卖点图 + 详情长图一键套版输出', prompt: '请将当前款式一键套版为电商详情页素材：1 张主图、3 张卖点图与 1 张详情长图，文案自动提炼核心卖点。', source: 'platform', samples: ['/samples/pf-detail.png', '/samples/gen-look.png', '/samples/gen-model.png'],  version: '2.1.0', glyph: 'layout', tint: 'from-pink-400 to-fuchsia-600', examples: ['把这款连衣裙一键套版成详情页：主图 + 卖点图 + 长图', '为这款大衣生成 3 张卖点图并提炼卖点文案'] },
  { id: 'pf-cost', name: '成本核价助手', desc: '按 BOM 与工艺自动估算单件成本区间', prompt: '请按 BOM 清单与缝制工艺为当前款式估算单件成本：拆分面料、辅料、工时与损耗，给出成本区间与降本建议。', source: 'platform', samples: ['/samples/pf-cost.png', '/samples/gen-model.png', '/samples/gen-look.png'],  version: '1.1.0', glyph: 'cost', tint: 'from-lime-400 to-green-600', examples: ['估算这款西装的单件成本并给出降本建议', '按 BOM 拆分这款羽绒服的面料与工时成本'] },
  { id: 'pf-trend', name: '秀场趋势解读', desc: '解析四大秀场趋势并转化为可落地设计方向', prompt: '请解析最新四大时装周的秀场趋势，提炼 3 个可落地的设计方向：色彩、廓形与关键细节，并匹配到我的品类。', source: 'platform', samples: ['/samples/pf-trend.png', '/samples/gen-model.png', '/samples/gen-look.png'],  version: '1.0.2', glyph: 'trend', tint: 'from-indigo-400 to-violet-600', examples: ['解读最新巴黎时装周趋势并转化 3 个设计方向', '提炼本季秀场色彩趋势，匹配到我的针织品类'] },
]

/* —— 存储与订阅 —— */

const LS_EQUIPPED = 'hyy-skill-equipped-v1' // 已装备技能 id 列表（平台 + 自建）
const LS_MINE = 'hyy-skill-mine-v1' // 用户沉淀的自建技能

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

let equippedIds: string[] = load<string[]>(LS_EQUIPPED, [])
let mineSkills: SkillEntry[] = load<SkillEntry[]>(LS_MINE, [])
let snapshot = { equippedIds, mineSkills }

const listeners = new Set<() => void>()
const subscribe = (cb: () => void) => {
  listeners.add(cb)
  return () => {
    listeners.delete(cb)
  }
}

function mutate(fn: () => void) {
  fn()
  try {
    localStorage.setItem(LS_EQUIPPED, JSON.stringify(equippedIds))
    localStorage.setItem(LS_MINE, JSON.stringify(mineSkills))
  } catch {
    /* 存储不可用时仅保留会话内状态 */
  }
  snapshot = { equippedIds, mineSkills }
  listeners.forEach((l) => l())
}

export function useSkillStore() {
  const snap = useSyncExternalStore(subscribe, () => snapshot)
  const eq = snap.equippedIds
  return {
    equippedIds: eq,
    mineSkills: snap.mineSkills,
    /** 已装备全集（自建 + 平台），同步至对话框「选择技能」列表 */
    equippedSkills: [
      ...snap.mineSkills.filter((s) => eq.includes(s.id)),
      ...PLATFORM_SKILLS.filter((s) => eq.includes(s.id)),
    ],
    isEquipped: (id: string) => eq.includes(id),
    equip: (id: string) =>
      mutate(() => {
        if (!equippedIds.includes(id)) equippedIds = [...equippedIds, id]
      }),
    unequip: (id: string) =>
      mutate(() => {
        equippedIds = equippedIds.filter((x) => x !== id)
      }),
    /** 沉淀为技能：保存至「我的技能」并立即装备（同步出现在「选择技能」列表） */
    addMine: (s: SkillEntry) =>
      mutate(() => {
        mineSkills = [s, ...mineSkills.filter((x) => x.id !== s.id)]
        if (!equippedIds.includes(s.id)) equippedIds = [s.id, ...equippedIds]
      }),
    /** 卸载安装类条目（如设计专家）：从「我的技能」库移除并取消装备 */
    removeMine: (id: string) =>
      mutate(() => {
        mineSkills = mineSkills.filter((x) => x.id !== id)
        equippedIds = equippedIds.filter((x) => x !== id)
      }),
    updateMine: (id: string, patch: Partial<Pick<SkillEntry, 'name' | 'desc' | 'prompt'>>) =>
      mutate(() => {
        mineSkills = mineSkills.map((s) => (s.id === id ? { ...s, ...patch } : s))
      }),
  }
}

/** 非组件环境读取（如初始化） */
export const skillStoreRead = () => ({ equippedIds, mineSkills })

/* ================= 团队（Team）：多个技能按工作流串行协作（PRD：AI Skill 团队板块） =================
 * R-01 串行执行：members 数组顺序即工作流执行顺序（MVP 按添加顺序串行）
 * R-05 保存校验：至少包含 1 个技能才可保存 */

export interface TeamMember {
  /** 来源技能 id（平台技能 / 自建技能） */
  skillId: string
  name: string
  /** 职责说明（沿用技能说明） */
  desc: string
  glyph: SkillGlyph
  tint: string
}

export interface Team {
  id: string
  name: string
  desc: string
  /** official=官方团队（认证标识）；false=用户自定义团队 */
  official: boolean
  /** 官方团队展示的使用人数 */
  users?: string
  /** 成员技能清单：顺序即串行工作流顺序 */
  members: TeamMember[]
  /** 分类：design=款式设计；market=视觉营销（联动首页顶部分类导航） */
  cat: 'design' | 'market'
}

/** 技能 id → 团队成员（取技能名/说明/图标） */
export const teamMemberOf = (skillId: string): TeamMember => {
  const s = PLATFORM_SKILLS.find((x) => x.id === skillId)!
  return { skillId: s.id, name: s.name, desc: s.desc, glyph: s.glyph ?? 'mine', tint: s.tint ?? 'from-slate-400 to-slate-600' }
}

/** 官方团队（认证标识，可直接选用；PRD 4.1） */
export const OFFICIAL_TEAMS: Team[] = [
  /* —— 款式设计 —— */
  {
    id: 'ot-dev',
    name: '新款开发天团',
    desc: '从爆款洞察、系列企划到工艺单与核价，一条链路完成新款开发闭环。',
    official: true,
    users: '3.2k',
    members: ['pf-hit', 'pf-plan', 'pf-techpack', 'pf-cost'].map(teamMemberOf),
    cat: 'design',
  },
  {
    id: 'ot-ec',
    name: '电商上架天团',
    desc: '详情页批量套版与外贸大单快反联动，新品上架出货一气呵成。',
    official: true,
    users: '1.9k',
    members: ['pf-detail', 'pf-cost', 'pf-trade'].map(teamMemberOf),
    cat: 'design',
  },
  {
    id: 'ot-trend',
    name: '趋势企划天团',
    desc: '秀场趋势解读、面料匹配到系列企划，让每一季企划站在趋势之上。',
    official: true,
    users: '2.5k',
    members: ['pf-trend', 'pf-fabric', 'pf-plan'].map(teamMemberOf),
    cat: 'design',
  },
  /* —— 视觉营销 —— */
  {
    id: 'mt-ec',
    name: '电商营销天团',
    desc: '爆款洞察、详情页套版与成本核价联动，打造高转化商品详情。',
    official: true,
    users: '2.8k',
    members: ['pf-hit', 'pf-detail', 'pf-cost'].map(teamMemberOf),
    cat: 'market',
  },
  {
    id: 'mt-brand',
    name: '品牌视觉天团',
    desc: '从趋势解读到视觉套版，输出统一且有记忆点的品牌视觉。',
    official: true,
    users: '1.6k',
    members: ['pf-trend', 'pf-detail'].map(teamMemberOf),
    cat: 'market',
  },
  {
    id: 'mt-global',
    name: '出海营销天团',
    desc: '外贸大单快反 × 详情页套版 × 爆款洞察，一套素材适配全球渠道。',
    official: true,
    users: '1.4k',
    members: ['pf-trade', 'pf-detail', 'pf-hit'].map(teamMemberOf),
    cat: 'market',
  },
]

/** 我的团队：localStorage 持久化键 */
export const LS_MY_TEAMS = 'hyy-my-teams-v1'
export const loadMyTeams = (): Team[] => load<Team[]>(LS_MY_TEAMS, [])
