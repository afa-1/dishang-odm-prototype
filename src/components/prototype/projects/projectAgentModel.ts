import type { ChatItem } from '../ChatPanel'
import { adopted, makeAsset, now, uid, type Asset, type Project, type Task, type WorkDocument } from './model'
import { capabilityById } from './capabilities'
import { CASE_STAGES, caseDocument, caseMaterials, caseSources, caseStyle } from './zaraDemo'

export type AgentIntent = 'collect' | 'brief' | 'trend' | 'planning' | 'search' | 'design' | 'selection' | 'delivery' | 'discuss'
export interface AgentOutput {
  id: string; title: string; date: string; type: 'document' | 'images' | 'search' | 'notes'
  assets: Asset[]; document?: WorkDocument; body?: string; archivedIds?: string[]; archivedDocument?: Asset
}
export interface AgentRun {
  intent: AgentIntent; request: string; status: 'running' | 'asking' | 'paused' | 'done'
  step: number; progressIndex: number; capabilities: string[]; refs: Task['refs']; supplement?: string
  tick?: number; executionIndex?: number
}
export interface AgentSession { items: ChatItem[]; outputs: AgentOutput[]; run?: AgentRun; capabilityIds: string[]; draft?: string }

export function prepareDemo(project: Project, task: Task) {
  const stage = CASE_STAGES.find(s => s.id === task.caseStage)
  if (!stage) return null
  let assets = caseSources(project)
  if (['brief', 'planning'].includes(stage.id)) {
    const brief = makeAsset('ZARA · 本次开发目标', '参考资料', { id: `${project.id}-brief-input-v1`, name: '开发目标与品牌背景.md', mime: 'text/markdown', date: now(), text: project.goal + '\n\n客户：' + project.customers.join('、') + '\n品牌：' + project.brands.join('、') }, '资料收集')
    brief.id = `${project.id}-brief-input`; assets = [brief, ...assets.slice(-1)]
  }
  if (['search', 'design', 'selection'].includes(stage.id)) assets = [caseStyle(project, 0, true), ...caseMaterials(project)]
  if (stage.id === 'delivery') assets = project.assets.filter(a => a.delivery).length ? project.assets.filter(a => a.delivery) : assets.slice(-1)
  assets = assets.map(a => project.assets.find(v => v.id === a.id) ?? a)
  return { assets, refs: assets.map(a => ({ assetId: a.id, revisionId: a.adopted, name: a.name })), session: { items: [], outputs: [], capabilityIds: stage.capabilityIds, draft: stage.instruction } as AgentSession }
}

export function executionSteps(project: Project, run: AgentRun) {
  const sample = project.caseId && CASE_STAGES.find(s => s.id === run.intent)
  if (sample) return sample.steps
  return INTENTS[run.intent].steps.map((title, i) => ({ title, detail: i === 0 ? `读取项目目标与 ${run.refs.length} 份引用：${run.refs.map(r => r.name).join('、') || '项目背景'}。` : i === 1 ? `调用${run.capabilities.map(id => capabilityById(id)?.name ?? id).join('、') || '服装助手'}，围绕“${run.request.slice(0, 90)}”组织本轮内容。` : '整理可编辑草稿和成果附件，保留资料来源与待确认事项。完成后可以在对话中预览、下载或保存。' }))
}

export const INTENTS: Record<AgentIntent, { title: string; capability: string; steps: string[]; question: string; options: string[]; followups: string[] }> = {
  collect: { title: '趋势资料整理', capability: 'odm-trend-collect', steps: ['读取引用资料与项目背景', '整理来源、主题与版本', '形成资料清单与使用建议'], question: '这轮资料优先怎么整理？', options: ['按趋势主题', '按品牌与季节', '按来源与版本'], followups: ['基于这些资料生成趋势报告', '把重点方向整理成企划 PPT'] },
  brief: { title: '客户需求拆解', capability: 'odm-demand-expert', steps: ['读取需求与品牌背景', '提炼目标、约束和信息缺口', '整理可编辑的需求草稿'], question: '这次需求分析重点是什么？', options: ['完整拆解客户 Brief', '优先梳理设计约束', '整理需要向客户确认的问题'], followups: ['结合这些需求找相似款', '基于需求做一份系列企划'] },
  trend: { title: '趋势研究', capability: 'odm-research-team', steps: ['梳理项目资料与引用依据', '趋势专家提炼主题与设计信号', '企划专家转译开发方向并整理报告'], question: '报告希望重点展开哪部分？', options: ['完整趋势报告', '色彩与面料方向', '廓形与款式转化'], followups: ['把报告转成服装企划 PPT', '围绕重点方向搜款搜料'] },
  planning: { title: '服装企划', capability: 'odm-planning-ppt', steps: ['梳理项目目标与已有成果', '组织主题、色彩、面料和款式矩阵', '生成可编辑的企划稿与 PPT'], question: '这份企划主要用于什么场景？', options: ['内部讨论与选款', '客户方案沟通', '设计开发执行'], followups: ['按企划设计三个款式方向', '给这套方案找合适的面辅料'] },
  search: { title: '搜款搜料', capability: 'odm-style-search', steps: ['整理检索条件与引用图', '匹配内部样衣与候选面辅料', '按范围补充参考并保留来源'], question: '这次要检索哪些数据？', options: ['内部优先，补充外部', '仅内部样衣与材料', '仅外部款式参考'], followups: ['基于选中的参考图做设计改款', '分析这些面料适合哪些款式'] },
  design: { title: '设计与改款', capability: 'odm-style-team', steps: ['设计专家分析参考与修改要求', '面料专家补充款料适配建议', '整理设计图与修改说明'], question: '这轮设计希望怎么推进？', options: ['保留参考廓形，调整细节', '探索三个不同方向', '从材料特性反推款式'], followups: ['给这组设计做内部选款比较', '检查方案的交付资料是否齐全'] },
  selection: { title: '选款比较', capability: 'odm-style-expert', steps: ['读取候选款与材料信息', '比较主题适配、系列搭配与开发风险', '整理选款建议和修改要点'], question: '选款优先考虑什么？', options: ['系列完整性与品牌适配', '开发可行性', '款式差异与创新'], followups: ['按修改意见调整设计', '整理本轮 ODM 交付说明'] },
  delivery: { title: '交付资料核查', capability: 'odm-delivery-check', steps: ['汇总当前选款与交付资料', '检查款式、面辅料和说明缺项', '形成内部确认清单'], question: '这次整理的用途是？', options: ['内部方案确认', '客户沟通与反馈', '准备 PLM 样衣开发交接'], followups: ['整理客户需要确认的问题', '补充方案的面辅料建议'] },
  discuss: { title: '项目讨论', capability: '', steps: ['理解本次问题', '结合项目背景与已有成果', '整理建议和后续行动'], question: '希望我先从哪个角度展开？', options: ['设计与企划', '材料与开发', '客户与交付'], followups: ['帮我拆解这次开发需求', '整理一份趋势分析报告'] },
}

// Routes demo responses, not the product workflow: any intent can run in any conversation.
export function inferIntent(text: string, selected: string[], previous?: AgentIntent): AgentIntent {
  if (/选款|比较|对比|评审/.test(text)) return 'selection'
  if (/交付|PLM|缺项|齐全/i.test(text)) return 'delivery'
  if (/搜|相似|检索|找.*(款|料)|选料/.test(text)) return 'search'
  if (/收集|整理.*资料|归集|采集/.test(text)) return 'collect'
  if (/PPT|企划|演示稿|幻灯片/i.test(text)) return 'planning'
  if (/趋势|报告/.test(text)) return 'trend'
  if (/brief|需求.*(分析|拆解)|拆解.*需求/i.test(text)) return 'brief'
  if (/设计|改款|效果图|配色|袖|领|廓形|面料.*适合/.test(text)) return 'design'
  if (/继续|重做|修改|改成|简短|精简|补充/.test(text) && previous) return previous
  const cap = selected[0]
  return (Object.entries(INTENTS).find(([, v]) => v.capability && v.capability === cap)?.[0] as AgentIntent) ?? 'discuss'
}

export function initialSession(task: Task, project: Project): AgentSession {
  if (task.agent) return task.agent
  const freshExample = task.caseRun?.state === 'idle' && task.messages.length === 1
  const outputs: AgentOutput[] = (task.documents ?? []).map(d => ({ id: d.id, title: d.title, type: 'document', document: d, assets: [], date: d.updated }))
  const existing = project.assets.filter(a => a.taskId === task.id)
  if (existing.length) outputs.push({ id: `${task.id}-existing`, title: '已保存的任务成果', type: existing.some(a => adopted(a).mime.startsWith('image/')) ? 'images' : 'notes', assets: existing, date: task.updated, archivedIds: existing.map(a => a.id) })
  return { items: [...(freshExample ? [] : task.messages.map(m => ({ kind: m.role === 'user' ? 'user' as const : 'ai' as const, text: m.text }))), ...outputs.map(o => ({ kind: 'artifact' as const, id: o.id, title: o.title, detail: '点击查看已有成果' }))], outputs, capabilityIds: [] }
}

export function newAgentTask(project: Project, reference?: Asset): Task {
  return { id: uid(), name: '新建对话', type: '自由任务', status: '待开始', updated: now(), assignee: project.owner,
    refs: reference ? [{ assetId: reference.id, revisionId: reference.adopted, name: reference.name }] : [],
    context: { goal: project.goal, customers: [...project.customers], brands: [...project.brands], skills: [...project.skills], experts: [...project.experts], teams: [...(project.teams ?? [])], connectors: [...project.connectors], requirements: project.requirements },
    agent: { items: [], outputs: [], capabilityIds: [] }, messages: [] }
}

function genericDocument(p: Project, run: AgentRun): WorkDocument {
  const kind = run.intent === 'brief' ? 'Brief 拆解' : run.intent === 'planning' ? '企划 PPT' : '趋势报告'
  const sections: [string, string][] = run.intent === 'brief' ? [
    ['开发目标', p.goal || run.request], ['客户与品牌', `${p.customers.join('、') || '自主开发'} / ${p.brands.join('、') || '未指定品牌'}`],
    ['已知约束', `${p.season || '季节待确认'}；${p.category || '品类待确认'}。\n${run.request}`], ['待确认问题', '目标成本、首轮款数、时间节点、面辅料供应与实物要求。'],
  ] : [
    ['开发背景与目标', p.goal || run.request], ['本轮方向', `围绕 ${p.season || '目标季节'} ${p.category || '目标品类'}，结合品牌风格与使用场景组织设计。\n${run.request}`],
    ['主题与叙事', '城市与自然之间：把日常通勤和周末出行连接起来。以轻结构、自然肌理与克制细节为讨论起点。'],
    ['色彩与材料', '以米白、灰绿、浅卡其为候选色系；对照实物样卡，比较轻斜纹与哑光梭织的垂坠、手感与缩水。'],
    ['款式结构', '主推款强调轮廓与识别细节；搭配款延续共同色系；探索款只改变一个设计变量，便于比较。'],
    ['开发与评审', '先比较系列搭配、品牌适配和材料可行性，再确定保留款。成本、检测及交期以业务确认结果为准。'],
  ]
  return { id: uid(), title: `${p.name} · ${kind}`, kind, refs: run.refs, updated: now(), sections: sections.map(([title, body]) => ({ id: uid(), title, body })) }
}

export function produceOutput(project: Project, task: Task, run: AgentRun): AgentOutput {
  const base = { id: uid(), date: now(), assets: [] as Asset[] }
  const config = INTENTS[run.intent]
  const context = `本次要求：${run.request}${run.supplement ? `\n补充选择：${run.supplement}` : ''}\n引用：${run.refs.map(r => r.name).join('、') || '项目背景'}\n协作：${run.capabilities.map(id => capabilityById(id)?.name ?? id).join('、') || '通用服装助手'}`
  if (['brief', 'trend', 'planning'].includes(run.intent)) {
    const doc = project.caseId ? caseDocument(project, run.intent)! : genericDocument(project, run)
    doc.id = uid(); doc.refs = run.refs; doc.updated = now()
    doc.sections = [...doc.sections, { id: uid(), title: '本轮任务与修改要求', body: context }]
    return { ...base, type: 'document', title: doc.title, document: doc }
  }
  if (run.intent === 'search') {
    const onlyExternal = run.supplement?.includes('仅外部') || /仅外部|只搜外部/.test(run.request)
    const onlyInternal = run.supplement?.includes('仅内部') || /仅内部|只搜内部/.test(run.request)
    const internal = project.assets.filter(a => ['款式设计', '面辅料'].includes(a.kind)).slice(0, 6)
    const samples = [0, 1, 2].map(i => caseStyle(project, i, true, !!onlyExternal))
    const assets = onlyExternal ? samples : [...(internal.length ? internal : samples), ...caseMaterials(project)]
    if (!onlyInternal && !onlyExternal) assets.push(...[0, 1].map(i => caseStyle(project, i, true, true)))
    return { ...base, type: 'search', title: '相似款与面辅料候选', assets: assets.filter((a, i) => assets.findIndex(b => a.id === b.id) === i), body: `${context}\n\n按主题、廓形与材料方向筛选。候选仅留在本次结果中，可择优引用、加入画布或归档。` }
  }
  if (run.intent === 'design') {
    const images = [0, 1, 2].map(i => {
      const a = caseStyle(project, i); a.id = `${task.id}-design-${i}`; a.taskId = task.id
      a.adopted = uid(); a.revisions[0].id = a.adopted
      if (a.provenance) a.provenance.key = `agent-design-${task.id}-${i}`
      if (!project.caseId) a.name = `${project.name} · 设计方向 ${i + 1}`
      a.material = `候选：轻量哑光梭织 / 自然肌理；实物及采购条件待确认。\n${context}`
      return a
    })
    return { ...base, type: 'images', title: '款式设计与款料建议', assets: images, body: `三个示例方向已生成，点击图片可打开设计画布继续调整。\n${context}` }
  }
  const sources = run.intent === 'collect' && project.caseId ? caseSources(project) : []
  const text = run.intent === 'collect'
    ? `## 资料清单\n${[...sources.map(a => a.name), ...run.refs.map(r => r.name)].map((s, i) => `${i + 1}. ${s}`).join('\n') || '当前没有引用文件，可上传供应商趋势报告、企划 PPT 或选择项目资料。'}\n\n## 整理建议\n保留来源与发布时间；按主题、品牌和季节标注。研究过程稿与最终版分别引用，不混用统计口径。`
    : run.intent === 'selection' ? `## 候选比较\n${project.assets.filter(a => a.kind === '款式设计').map(a => `• ${a.name}：${a.selection}`).join('\n') || '请从右侧已有成果选择候选款，或引用项目款式。'}\n\n## 建议\n优先检查主题适配、系列搭配、差异性与材料风险。选款结论由内部人员在项目资产中记录。`
    : run.intent === 'delivery' ? `## 当前交付\n${project.assets.filter(a => a.delivery).map(a => `• ${a.name}`).join('\n') || '当前尚未选定交付内容。'}\n\n## 核查要点\n选定设计图、款料说明、采用版本和待确认事项。客户反馈作为意见记录，内部确认后再由交付页发起 PLM 交接。`
    : `围绕「${run.request}」，建议先明确这次要做出的判断，再从项目资料和已有成果中选取依据。\n\n可以在同一对话继续研究趋势、整理企划、搜款搜料或修改设计，也可以新开任务分别推进。`
  const body = `${text}\n\n${context}`
  const a = makeAsset(config.title, '项目文档', { id: uid(), name: `${config.title}.md`, date: now(), mime: 'text/markdown', text: `# ${config.title}\n\n${body}` }, '任务产出'); a.taskId = task.id
  return { ...base, type: 'notes', title: config.title, assets: [...sources, a], body }
}
