import { capabilityById, type Capability } from './capabilities'
import { blankProfile, getDirectory, saveProfile } from './directory'
import { adopted, emptyProject, makeAsset, now, snapshot, uid, type Asset, type Project, type WorkDocument } from './model'

// All commercial details below are fictional demonstration assumptions. No customer data or credentials.
export const CASE_NOTICE = '迪尚自主企划演示，面向 ZARA 推广；不是 ZARA 官方 Brief、真实订单或实时 AI / 采集结果。'
export const CASE_MEMBERS = [
  { name: '林悦（示例）', role: '项目负责人 / 内部确认' },
  { name: '陈宁（示例）', role: '趋势企划' },
  { name: '苏禾（示例）', role: '服装设计' },
  { name: '周青（示例）', role: '面辅料开发' },
]
export interface CaseStage { id: string; title: string; short: string; type: string; capabilityIds: string[]; sources: string[]; instruction: string; steps: { title: string; detail: string }[]; outcome: string }
export const CASE_STAGES: CaseStage[] = [
  { id: 'collect', title: '收集趋势资料', short: '收集', type: '趋势分析', capabilityIds: ['odm-trend-collect'], sources: ['趋势资料库', '本地上传'], instruction: '收集并整理 2028 春夏男装资料，区分流程规范、标签规范、Story 草稿和最终报告，关联本项目与 ZARA。只纳入有来源的资料。', steps: [
    { title: '读取 4 份已提供资料', detail: '识别 SOP、标签词库、Story 逻辑流、趋势企划报告；本演示引用内容摘录，不执行外网爬虫。' },
    { title: '整理来源与可用范围', detail: '保留文件名、用途和版本口径；原始 WGSN PDF、秀场图未提供，不把报告引用数量当成本次采集数量。' },
    { title: '关联项目并检查冲突', detail: '同一份资料可以关联多个项目；本例关联 ZARA / 2028 春夏。发现 Story 与报告的评分、主题、统计口径不同。' },
  ], outcome: '4 份来源摘录 + 资料清单 + 口径待核查项' },
  { id: 'brief', title: '拆解开发 Brief', short: '需求', type: 'Brief 拆解', capabilityIds: ['odm-demand-expert'], sources: ['客户档案', '品牌档案'], instruction: '本次是自主开发后向 ZARA 推广，不是正式客户下单。整理 2028 春夏男装胶囊系列的目标、品类、交付物和待确认项。', steps: [
    { title: '读取客户与品牌上下文', detail: '客户以 Inditex 集团级档案管理，品牌 ZARA；真实签约与采购主体待业务核实。' },
    { title: '拆解自主开发假设', detail: '面向都市通勤与周末出行，演示客群 25–35 岁；拟做轻结构外套、短袖衬衫、宽褶长裤。' },
    { title: '标记不能代填的商业条件', detail: '成本、采购量、交期、测试标准均待确认；不把内部企划假设写成客户承诺。' },
  ], outcome: '结构化 Brief 与待确认问题' },
  { id: 'trend', title: '分析趋势并生成报告', short: '趋势', type: '趋势分析', capabilityIds: ['odm-research-team'], sources: ['趋势资料库', '标签词库'], instruction: '按七步 SOP，从宏观变量到交叉映射、跨季演变、秀场证据和六主题，形成 2028 春夏男装报告。报告正文为本次主口径，保留资料差异，不伪造验证。', steps: [
    { title: '趋势企划专家 · 提取与交叉映射', detail: '整理消费者情绪、理念与面料叙事；归纳触感治愈、可靠恒常、创意无畏、自然生长四方向。' },
    { title: '趋势分析报告技能 · 证据核查', detail: '原报告记述 11 品牌 / 125 张分析图，库存口径 451 张；本次不重新计数。视觉成分标为推测，未提供原图的强度标为待复核。' },
    { title: '客户需求专家 · 转译与交叉检查', detail: '保留 3 个维度 × 春夏 2 季的六主题；ZARA 演示只聚焦流动精裁与适应地形，避免全盘照搬原材料商的要求。' },
  ], outcome: '可编辑趋势报告 · 六主题 × 八模块' },
  { id: 'planning', title: '制作系列企划 PPT', short: '企划', type: '服装企划', capabilityIds: ['odm-planning-ppt'], sources: ['项目趋势报告', '已确认 Brief'], instruction: '围绕“城市轻行 Urban Ease”组织 ZARA 2028 春夏男装企划，结合流动精裁与适应地形，形成可下载和本地修改的 PPT。', steps: [
    { title: '组织企划页序', detail: '开发背景 → 趋势证据 → 主题 → 场景 → 色彩 → 面料 → 款式矩阵 → 开发计划。' },
    { title: '将研究转成可设计要求', detail: '奶油白、雾绿、石灰与墨黑；轻结构上装 + 宽褶裤，下装兼顾短裤。面料重视干爽视觉与垂坠，真实手感另行核查。' },
    { title: '准备可编辑工作稿', detail: '先审页序与内容，再下载真正可编辑的 PPTX；离线修改后可在资产中上传新版本。' },
  ], outcome: '系列企划工作稿与可编辑 PPTX' },
  { id: 'search', title: '检索参考款与候选料', short: '搜款搜料', type: '搜款搜料', capabilityIds: ['odm-style-search', 'odm-material-search'], sources: ['内部样衣库', '面辅料库', '外部搜款服务'], instruction: '优先查内部衬衫夹克、短袖衬衫与宽褶裤；外部只补充廓形与口袋参考。搜索干爽棉麻视觉、轻垂梭织主料及匹配辅料。', steps: [
    { title: '内部优先 · 匹配可复用方向', detail: '预置内部款 3 个，依据品类、廓形和细节解释适配点；面料候选 3 个，采购数据均为演示假设。' },
    { title: '外部补充 · 不全量爬取', detail: '展示 3 个标明来源为“外部服务示例”的参考构图，不冒充真实 ZARA 商品或实时抓取结果。' },
    { title: '选择参考 · 送入画布', detail: '结果集先跟随任务保存；用户选中的参考才进入项目资产或设计画布，不把全部检索图片塞入品牌库。' },
  ], outcome: '可比较的款式 / 材料结果集，择优加入画布' },
  { id: 'design', title: '完成款式设计与款料组合', short: '设计', type: '款式设计', capabilityIds: ['odm-style-team'], sources: ['本任务选定参考', '面辅料库', '凌迪 Cloud'], instruction: '完成 3 款男装正背面设计方案，列明主料与辅料、结构细节和样衣注意事项。AI 设计图不代表完成制版或实体样衣。', steps: [
    { title: '服装设计专家 · 形成设计方案', detail: '衬衫夹克缩短衣长、减轻口袋体量；短袖衬衫增加背部活动量；宽褶长裤强调垂坠与可搭配性。' },
    { title: '面辅料专家 · 配料并标出风险', detail: '关联 3 个候选主料及同色辅料建议。成分、缩水、色牢度与供货状态仍待实物 / 供应商验证。' },
    { title: '交付资料核查 · 正背面与开发说明', detail: '归档预置正背面示意图、款料组合与开发要点；3D 入口支持绑定真实授权 Cloud 链接，本例未绑定。' },
  ], outcome: '3 款正背面图 + 款料关联 + 开发说明' },
  { id: 'selection', title: '内部选款与修改', short: '选款', type: '内部选款', capabilityIds: ['odm-style-expert'], sources: ['项目设计成果'], instruction: '比较三款设计，记录保留、备选、修改或淘汰及理由。内部选款由人决定；需要修改的款式可直接发起修改任务。', steps: [
    { title: '服装设计专家 · 提出比较维度', detail: '主题适配、系列搭配、款式差异、材料适配与开发风险。' },
    { title: '形成选款建议', detail: '建议优先核查衬衫夹克与宽褶裤的配套性，短袖款的袋型可适度简化；只是建议，不替人选款。' },
    { title: '等待内部决策', detail: '到资产中的“内部选款”看大图、比较、填写意见；只有手动保留的款式才允许进入最终交接。' },
  ], outcome: '内部选款意见与修改任务' },
  { id: 'delivery', title: '整理交付并内部确认', short: '交付', type: '交付核查', capabilityIds: ['odm-delivery-check'], sources: ['项目交付内容', 'PLM（模拟）'], instruction: '整理本次选定款式、需求、趋势报告、企划和材料资料，记录客户意见，再由内部审核。审核通过后模拟交接 PLM，进入样衣开发。', steps: [
    { title: '检查交付内容', detail: '核对保留款、采用版本、款料关联与开发说明；客户意见只供内部决策参考。' },
    { title: '生成待确认项', detail: '成本、采购条件、测试要求及实际 3D 链接尚未接入；原型交接记录不能冒充真实 PLM 回执。' },
    { title: '进入内部审核', detail: '到“交付”提交内部审核，可退回并说明原因。内部通过后，人工勾选最终版本并生成模拟交接快照。' },
  ], outcome: '交付清单 → 内部审核 → PLM 模拟交接' },
]

export const SOURCE_NOTES = [
  ['趋势企划SOP_流程框架.html', '流程规范', '七步：宏观输入、变量提取、交叉映射、跨季演变、秀场验证、六主题、八模块叙事。强趋势门槛 ≥5 品牌且 ≥20 造型。来源不足时标为待验证，不以单图代表趋势。'],
  ['标签词库及标注规范.html', '标注规则', '优先固定词库。成分状态区分已确认 / 供应商提供 / 视觉推测 / 待确认。主风格 1 个、辅风格不超过 2 个。实物手感与视觉观感分开记录，功能性需证据。'],
  ['28SS男装Story逻辑流.html', '过程稿', '该版本以触觉庇护所等四方向推导 SOFT PRECISION 等六主题。它与最终报告的主题、评分不同，本例仅保留为过程参考，不混入最终报告统计。原稿材料商语境不直接转成 ZARA 要求。'],
  ['2028春夏男装趋势企划报告.html', '主参考报告', '报告正文采用触感治愈、可靠恒常、创意无畏、自然生长四方向；最终六主题为恒久传承、流动精裁、触感重置、快意重构、自然韧性、适应地形。文中 42 份资料库存、14 份 PDF 分析及 125 / 451 张图片等口径应分别保留，未在本次重新验证。'],
]
export const THEMES = [
  { name: '恒久传承', en: 'ENDURING HERITAGE', scope: '商务精裁 · 春', story: '以柔化肩部的轻结构外套配直筒长裤，在褐灰、米白与碳灰中强化安静耐穿的日常精裁。', shape: '微宽 H 型便西、立领衬衫、直筒西裤', pattern: '细条纹、微格纹，小面积应用', fabric: '哑光斜纹与高密梭织，克重根据实物样卡选择', evidence: '原报告 T1 / T2 / T3，计数待原图复核', emotion: '韧性激活 × 信任重建', color: '褐灰 / 米白 / 碳灰', brands: 'Zegna、Armani、Auralee（原报告参考）' },
  { name: '流动精裁', en: 'LIQUID TAILORING', scope: '商务精裁 · 夏', story: '无垫肩衬衫夹克与宽褶裤弱化商务边界，以干爽视觉、自然垂坠和奶油白、雾绿组合，服务通勤与周末切换。', shape: '无垫肩轻外套、宽褶长裤、开放领衬衫', pattern: '细条纹、竹节肌理，避免大面积印花', fabric: '轻垂梭织与棉麻视觉，真实成分和手感待确认', evidence: '原报告 T1 / T2 / T3 / T5；不将灯芯绒信号直接转为盛夏主料', emotion: '静享独处 × 感官重置', color: '奶油白 / 雾绿 / 石灰', brands: 'Zegna、Armani、Soshiotsuki（原报告参考）' },
  { name: '触感重置', en: 'TACTILE RESET', scope: '休闲日常 · 春', story: '以柔软视觉的衬衫、轻针织与宽松裤叠搭，用低饱和灰绿和米白表达轻松而真实的日常衣橱。', shape: '落肩衬衫、轻针织开衫、抽绳直筒裤', pattern: '纱染格纹、小尺度条纹', fabric: '肌理平纹、轻罗纹；厚重毛料仅为原稿方向，不自动纳入本胶囊', evidence: '原报告 T1 / T2 / T9 / T11', emotion: '静享独处 × 感官重置', color: '灰绿 / 米白 / 雾紫点缀', brands: 'Auralee、ssstein、Études（原报告参考）' },
  { name: '快意重构', en: 'JOYFUL REMIX', scope: '休闲日常 · 夏', story: '开放领短袖衬衫与轻松短裤中加入少量色彩对比，保留宽松比例，用清晰的条纹替代复杂堆砌。', shape: '短袖衬衫、Polo、宽松短裤', pattern: '条纹、局部定位图案', fabric: '轻量府绸、薄型牛仔与平纹针织', evidence: '原报告 T9 / T10；T13 为单品牌信号，不能泛化为市场共识', emotion: '快意无畏 × 创意表达', color: '米白 / 蓝 / 少量黄色', brands: 'AMI、Amiri、Études（原报告参考）' },
  { name: '自然韧性', en: 'NATURAL RESILIENCE', scope: '轻户外 · 春', story: '轻工装外套和直筒裤以克制的贴袋与低饱和大地色增强日常实用感，功能性能需要测试而非凭图判断。', shape: '翻领工装夹克、轻外套、直筒裤', pattern: '素色为主，同色小肌理', fabric: '轻斜纹、薄帆布；不预设防水或防晒能力', evidence: '原报告 T1 / T2 / T8', emotion: '自在生长 × 气候适应', color: '雾绿 / 卡其 / 褐灰', brands: 'Officine Générale、SFTM（原报告参考）' },
  { name: '适应地形', en: 'ADAPTIVE TERRAIN', scope: '轻户外 · 夏', story: '短袖衬衫式夹克配宽松下装，以轻量哑光梭织和奶油白、雾绿构成日常出行组合，弱化专业户外的装备感。', shape: '短袖衬衫夹克、宽松短裤、简化口袋', pattern: '素色、细条纹、微肌理', fabric: '轻量棉麻视觉平纹，防皱与缩水需实物核查', evidence: '原报告 T5 / T8 / T10，计数待复核', emotion: '自在生长 × 气候适应', color: '奶油白 / 雾绿 / 浅卡其', brands: 'Zegna、Soshiotsuki、AMI（原报告参考）' },
]

export function ensureCaseProfiles() {
  const find = (kind: 'brand' | 'customer', name: string) => getDirectory().records.find(p => p.kind === kind && p.name.toLowerCase() === name.toLowerCase())
  const customer = find('customer', 'Inditex（ZARA 业务·演示）') ?? saveProfile({ ...blankProfile('customer', 'Inditex（ZARA 业务·演示）'), id: 'demo-inditex', owner: CASE_MEMBERS[0].name, contact: '采购联系人待业务核实；未配置真实联系方式', category: '男装 / 自主开发推广', requirements: '集团级客户示例。ZARA 官网说明品牌属于 Inditex。真实采购、签约及结算主体待核实，不代表迪尚与该集团的真实业务关系。', positioning: 'https://www.zara.com/es/en/z-company-corp1391.html' })
  const brand = find('brand', 'ZARA') ?? saveProfile({ ...blankProfile('brand', 'ZARA'), id: 'demo-zara', owner: CASE_MEMBERS[0].name, customerIds: [customer.id], category: '男装', positioning: '真实品牌；以下定位是本次自主企划假设，不是品牌官方 2028 策略。', audience: '25–35 岁都市男装客群（本案例假设）', style: '简洁轻精裁、自然肌理、城市与周末两用（案例方向）', price: '目标零售价与开发成本待确认', requirements: '2028 春夏男装“城市轻行”胶囊；正背面图、款料说明、趋势报告与企划。未收到正式客户 Brief。' })
  return { customer, brand }
}

function textAsset(p: Project, key: string, name: string, text: string, source: Asset['source'] = '任务产出', kind: Asset['kind'] = '项目文档'): Asset {
  const a = makeAsset(name, kind, { id: `${p.id}-${key}-v1`, name: `${name}.md`, mime: 'text/markdown', date: now(), text: `# ${name}\n\n> ${CASE_NOTICE}\n\n${text}` }, source)
  a.id = `${p.id}-${key}`
  return a
}
export function caseSources(p: Project) {
  return SOURCE_NOTES.map(([name, usage, note], i) => {
    const a = textAsset(p, `source-${i}`, name.replace('.html', '') + ' · 内容摘录', `来源文件：${name}\n用途：${usage}\n\n${note}\n\n此处为用户提供文件的摘要；不包含未提供的原始付费报告、原始秀场图或其使用授权。`, '资料收集', '参考资料')
    a.provenance = { key: `zara-source-${i}`, scope: '内部', provider: `用户提供 · ${name}`, collectedAt: now(), demo: true }
    return a
  })
}
export function createCaseProject(complete = false, instanceId?: string): Project {
  const { customer, brand } = ensureCaseProfiles()
  let p: Project = { ...emptyProject(), id: instanceId ?? (complete ? 'zara-28ss-showcase' : 'zara-28ss-demo'), name: complete ? 'ZARA · 2028 春夏男装（完整成果）' : 'ZARA · 2028 春夏男装', caseId: 'zara-28ss', demo: true, developmentMode: '自主开发', status: '待启动', season: '2028 春夏', category: '男装 · 轻外套 / 衬衫 / 长裤', owner: CASE_MEMBERS[0].name, members: structuredClone(CASE_MEMBERS), customerIds: [customer.id], brandIds: [brand.id], customers: [customer.name], brands: [brand.name], goal: '城市轻行 Urban Ease：从趋势收集出发，聚焦流动精裁与适应地形，完成 3 款男装方案及面辅料建议。先自主开发，再面向 ZARA 推广；客户意见仅作为反馈，内部确认后模拟交接 PLM 进入样衣开发。', skills: ['趋势资料整理', '客户 Brief 拆解', '趋势分析报告', '服装企划 PPT', '内外部相似款检索', '内外部面辅料检索', '交付资料核查'], experts: ['客户需求专家', '面辅料专家'], teams: ['趋势企划专家团', '款式驱动开发专家团'], connectors: ['趋势资料库', '内部样衣库', '面辅料库', '外部搜款服务', '凌迪 Cloud', 'PLM'], review: { state: 'draft', reviewer: CASE_MEMBERS[0].name, note: '', date: now() } }
  p.tasks = CASE_STAGES.map((stage, i) => ({ id: `${p.id}-task-${stage.id}`, caseStage: stage.id, name: stage.title, type: stage.type, status: '待开始', updated: now(), assignee: CASE_MEMBERS[i < 4 ? 1 : i < 7 ? 2 : 0].name, reviewer: CASE_MEMBERS[0].name, refs: [], context: { goal: p.goal, customers: p.customers, brands: p.brands, skills: p.skills, experts: p.experts, teams: p.teams, connectors: stage.sources }, caseRun: { state: 'idle', step: 0, instruction: stage.instruction }, invocations: stage.capabilityIds.map(id => ({ id: `${p.id}-${stage.id}-${id}`, capability: capabilityById(id)!, instruction: stage.instruction, date: now(), refs: [], status: '已配置' })), messages: [{ id: uid(), role: 'user', text: stage.instruction, date: now() }], history: [{ date: now(), text: '创建演示任务，等待开始' }] }))
  p.activities = [{ id: uid(), text: '创建 ZARA 演示案例，关联集团级客户与品牌；商业需求均为内部假设', date: now() }]
  if (complete) {
    for (const stage of CASE_STAGES) {
      p = finishCaseStage(p, stage.id)
      p.tasks = p.tasks.map(t => t.caseStage === stage.id ? { ...t, status: '已完成', history: [...(t.history ?? []), { date: now(), text: '完整成果预置：示例负责人已复核（非真实审批）' }] } : t)
    }
    p.assets = p.assets.map(a => ({ ...a, selection: a.kind === '款式设计' ? a.id.endsWith('style-1') ? '备选' : '保留' : a.selection, selectionNote: a.kind === '款式设计' ? '完整成果示例：优先保留夹克与配套裤，短袖衬衫作为备选。' : a.selectionNote, selectionBy: CASE_MEMBERS[0].name, delivery: a.kind === '项目文档' && !a.name.includes('资料清单') || a.kind === '面辅料' || a.kind === '款式设计' && !a.id.endsWith('style-1') }))
    const items = p.assets.filter(a => a.delivery).map(snapshot)
    p.pushes = [{ id: uid(), date: now(), customer: customer.name, customerId: customer.id, items: items.filter(a => a.kind === '款式设计'), feedback: '示例反馈：偏好夹克与长裤的同色搭配，首轮样衣先核查垂坠和缩水。此处不是客户真实意见。' }]
    p.review = { state: 'approved', reviewer: p.owner, note: '完整成果示例：内部同意进入模拟样衣开发交接，采购条件保留为待验证事项。', date: now() }
    p.handoffs = [{ id: uid(), date: now(), confirmedBy: p.owner, items }]
    p.requirements = { ...p.tasks.find(t => t.caseStage === 'brief')!.documents![0], confirmedAt: now() }
    p.status = '已交接'
  }
  return p
}

function workDoc(p: Project, key: string, kind: WorkDocument['kind'], title: string, sections: [string, string][]): WorkDocument {
  return { id: `${p.id}-doc-${key}`, kind, title, updated: now(), refs: p.assets.filter(a => a.kind === '参考资料' || a.name.includes('趋势报告')).map(a => ({ assetId: a.id, revisionId: a.adopted, name: a.name })), sections: [{ id: `${key}-notice`, title: '使用说明', body: CASE_NOTICE }, ...sections.map(([title, body], i) => ({ id: `${key}-${i}`, title, body }))] }
}
export function caseDocument(p: Project, stage: string): WorkDocument | undefined {
  if (stage === 'brief') return workDoc(p, stage, 'Brief 拆解', 'ZARA 2028SS · 自主开发 Brief', [
    ['开发背景与客户关系', '迪尚自主开发，面向 ZARA 推广。客户按 Inditex 集团级管理，真实采购与签约主体待核实。未收到 ZARA 官方 Brief。'],
    ['本轮已知开发方向', '城市轻行 Urban Ease；都市通勤、周末出行。客群 25–35 岁为内部演示假设。围绕流动精裁与适应地形开发夹克、短袖衬衫、宽褶长裤 3 款方案。'],
    ['设计约束', '轻结构、低饱和自然色、可组合搭配；简化口袋与不必要辅料；不凭效果图承诺功能、成分和可生产性。'],
    ['交付要求', '趋势分析报告、系列企划 PPT、款式正背面示意图、款料组合、内部选款意见与样衣开发说明。3D 以获得授权的 Cloud 分享链接补充。'],
    ['待业务确认', '目标成本、数量、交期、尺码、检测项目、采购主体、材料供货状态。没有依据的字段保持待确认。'],
    ['确认边界', '客户反馈 ≠ 内部批准。内部负责人决定是否交接 PLM；本演示仅生成模拟快照，不产生真实开发单。'],
  ])
  if (stage === 'trend') return workDoc(p, stage, '趋势报告', '2028 春夏男装趋势报告 · ZARA 开发转译', [
    ['01 资料与版本口径', '主参考：2028春夏男装趋势企划报告.html（文内日期 2026-08-07）。流程与字段分别参考 SOP、标签规范。Story 过程稿只用于理解推导方式，四方向与六主题不混用。原报告提到 42 份资料库存、14 份 PDF 分析及 11 品牌 125 / 451 张图片，不是本次系统采集结果。'],
    ['02 宏观输入与四方向', '原报告归纳：触感治愈 / 可靠恒常 / 创意无畏 / 自然生长。对应恢复真实触感、稳定耐穿、积极表达、日常气候适应。本例沿用方向，不将用户报告中的评分冒充新计算结果。'],
    ['03 跨季演变 · 五维待验证假设', '客群：从单一商务走向通勤与周末切换；材料：从厚重挺括转向轻量与微肌理；廓形：从强结构转向松量轻结构；品类：衬衫夹克与宽褶裤成为胶囊重点；色彩：中性色加入雾绿。这是开发假设，不是已验证的跨季统计，需补原始季节数据。'],
    ['04 证据强度与风险', 'SOP 强趋势要求 ≥5 品牌且 ≥20 造型。原报告列宽松廓形、暖中性色、便西等强趋势，但未提供原图，标为待复核。中等与初现分组中部分品牌数超出 SOP 区间，应重新计算而非直接通过。纤维成分与手感仅为视觉推测；色号存在重名 / 重复风险，应核查正式色卡。'],
    ...THEMES.map(t => [`${t.name} / ${t.en} · ${t.scope}`, `① 核心叙事：${t.story}\n② 廓形：${t.shape}\n③ 花型：${t.pattern}\n④ 面料转译：${t.fabric}\n⑤ 趋势依据：${t.evidence}\n⑥ 情绪 / 理念：${t.emotion}\n⑦ 色彩：${t.color}（色号待正式色卡确认）\n⑧ 参考品牌：${t.brands}`] as [string, string]),
    ['05 ZARA 胶囊开发选择', '聚焦流动精裁 + 适应地形，形成“城市轻行”。只提取可应用的轻结构、自然肌理、低饱和色；不是对 ZARA 2028 官方策略的预测。候选 3 款设计、3 个主料方向，进入人工选款。'],
    ['06 待确认与下一步', '补充有授权的原始报告和秀场图；复核趋势计数、季节标注与色卡；供应商确认成分及实物手感；内部审核企划后再进入样衣开发。本例不宣称完成真实市场验证。'],
  ])
  if (stage === 'planning') return workDoc(p, stage, '企划 PPT', 'ZARA 2028SS · 城市轻行 Urban Ease', [
    ['企划目标', '自主开发推广案例｜以 3 款男装连接通勤与周末；不代表 ZARA 官方需求。'],
    ['趋势依据', '流动精裁 × 适应地形。依据用户提供的 2028SS 报告；方向可用，计数、视觉成分、色号仍需复核。'],
    ['主题叙事', '城市轻行：松量不松散，简洁但有肌理。轻结构衬衫夹克、开放领衬衫、宽褶长裤构成可交叉搭配的微型衣橱。'],
    ['人群与场景', '演示假设：25–35 岁都市男性；工作日轻通勤 / 周末城市漫游。以搭配和活动余量为判断依据。'],
    ['色彩方案', '主色：奶油白、雾绿；辅色：石灰、墨黑。设计图颜色只为演示，量产色以实物色卡确认。'],
    ['面料方案', 'M01 自然肌理轻梭织用于夹克；M02 轻薄棉麻视觉用于衬衫；M03 垂坠斜纹用于裤子。成分、克重与价格是待验证开发方向，不是采购承诺。'],
    ['款式矩阵', 'ZE-2801 衬衫夹克：短衣长、落肩、简化贴袋。\nZE-2802 短袖衬衫：开放领、背部活动褶、平直下摆。\nZE-2803 宽褶长裤：单褶、直筒、腰内调节。'],
    ['款料与工艺检查', '先确认主料缩水、缝口与垂坠，辅料采用同色纽扣和拉链方向。正背面图仅为设计说明，纸样、尺寸表和实物样衣在 PLM 开发阶段补齐。'],
    ['选款与修改计划', '三款并排比较，人工保留 / 备选 / 修改 / 淘汰；修改意见直接形成任务。不得把专家建议自动当作内部通过。'],
    ['交付与责任人', '趋势 / 企划：陈宁；设计：苏禾；材料：周青；内部确认：林悦（均为示例成员）。客户反馈记录后，由内部决定是否模拟交接 PLM。'],
  ])
}

// Original vector technical flats for this prototype, not scraped brand garments or AI-generated photos.
export function designSVG(index: number, external = false): string {
  const colors = ['#b6c1b5', '#e8e2d5', '#c0bbb0']
  const cloth = colors[index % 3]
  const shirt = index % 3 === 1
  const pants = index % 3 === 2
  const body = pants ? `<path d="M74 40H206L219 283L157 288L140 123L123 288L61 283Z"/><path d="M73 56H206M140 43V119M94 60L98 157M185 60L182 158M77 62L68 94M202 62L213 94" fill="none"/><path d="M61 272L123 277M157 277L218 272" fill="none" stroke-dasharray="3 3"/>` : `<path d="M98 40L62 55L15 ${shirt ? 118 : 252}L53 ${shirt ? 135 : 262}L76 ${shirt ? 89 : 129}L75 270Q140 282 205 270L204 ${shirt ? 89 : 129}L227 ${shirt ? 135 : 262}L265 ${shirt ? 118 : 252}L218 55L182 40L166 25H114Z"/><path d="M114 25L140 65L98 49L111 28M166 25L140 65L182 49L169 28M140 66V275M75 260Q140 272 205 260" fill="none"/><path d="M89 99H122V138H89ZM159 99H192V138H159Z" fill="none"/><path d="M89 109H122M159 109H192" fill="none"/><g fill="#666960">${[89,122,156,190,224,255].map(y => `<circle cx="145" cy="${y}" r="1.8"/>`).join('')}</g>`
  const back = pants ? `<path d="M74 40H206L219 283L157 288L140 123L123 288L61 283Z"/><path d="M73 56H206M140 56V123M88 85H121M159 85H192M94 58L96 75M185 58L183 75" fill="none"/>` : `<path d="M98 40L62 55L15 ${shirt ? 118 : 252}L53 ${shirt ? 135 : 262}L76 ${shirt ? 89 : 129}L75 270Q140 282 205 270L204 ${shirt ? 89 : 129}L227 ${shirt ? 135 : 262}L265 ${shirt ? 118 : 252}L218 55L182 40L166 25H114Z"/><path d="M98 40Q140 62 182 40M72 81Q140 90 208 81M136 86V199M144 86V199M75 260Q140 272 205 260" fill="none" stroke-dasharray="${shirt ? '0' : '3 3'}"/>`
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="660" viewBox="0 0 1000 660"><rect width="1000" height="660" fill="#f5f4f0"/><text x="48" y="53" font-family="Arial,sans-serif" font-size="16" letter-spacing="4" fill="#666960">DISHANG STUDIO / 28SS</text><text x="48" y="96" font-family="Arial,sans-serif" font-size="29" fill="#242722">${external ? 'REFERENCE COMPOSITION' : 'URBAN EASE'} — 0${index % 3 + 1}</text><line x1="48" x2="952" y1="120" y2="120" stroke="#d6d8cf"/><g stroke="#55594f" stroke-width="1.8" stroke-linejoin="round" fill="${cloth}" transform="translate(82 162) scale(1.35)">${body}</g><g stroke="#55594f" stroke-width="1.8" stroke-linejoin="round" fill="${cloth}" transform="translate(543 162) scale(1.35)">${back}</g><text x="227" y="586" font-family="Arial,sans-serif" font-size="13" letter-spacing="3" fill="#777b71">FRONT</text><text x="690" y="586" font-family="Arial,sans-serif" font-size="13" letter-spacing="3" fill="#777b71">BACK</text><text x="48" y="635" font-family="Arial,sans-serif" font-size="12" fill="#92958c">PROTOTYPE TECHNICAL FLAT · NOT A ZARA PRODUCT · MATERIALS TO BE VERIFIED</text></svg>`
}
export function caseStyle(p: Project, index: number, reference = false, external = false): Asset {
  const names = ['短款衬衫夹克', '开放领短袖衬衫', '宽褶直筒长裤']
  const svg = designSVG(index, external)
  const key = reference ? `ref-${external ? 'external' : 'internal'}-${index}` : `style-${index}`
  const a = makeAsset(`${reference ? external ? '外部参考构图' : '内部样衣方向' : `ZE-280${index + 1}`} · ${names[index]}`, reference ? '参考资料' : '款式设计', { id: `${p.id}-${key}-v1`, date: now(), name: `${key}.svg`, mime: 'image/svg+xml', url: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`, text: svg }, reference ? '资料收集' : '任务产出')
  a.id = `${p.id}-${key}`
  a.material = ['短衣长、落肩、简化贴袋；需核查缩水、缝口与袖窿活动量。', '开放领、背部活动褶、平直下摆；优先核查透底与接缝滑移。', '单褶直筒、腰内调节；需核查垂坠、膝位变形与裆缝强度。'][index] + '\n设计示意，不含确认纸样、尺寸表与实物样衣。'
  a.provenance = { key: `${p.id}-${key}`, scope: external ? '外部' : '内部', provider: reference ? external ? '外部搜款服务 · 预置参考构图（非实际商品）' : '内部样衣库 · 预置方向（非实际库存）' : '迪尚演示设计 · 原创矢量示意', demo: true, collectedAt: now() }
  return a
}
export function caseMaterials(p: Project): Asset[] {
  return ['M01 · 自然肌理轻梭织', 'M02 · 轻薄棉麻视觉平纹', 'M03 · 垂坠细斜纹'].map((name, i) => {
    const a = textAsset(p, `material-${i}`, name, `## 使用方向\n${['衬衫夹克', '短袖衬衫', '宽褶长裤'][i]}\n\n## 候选规格（开发假设）\n${['棉 / 莱赛尔混纺方向，180–210 g/m²', '棉 / 亚麻混纺方向，120–150 g/m²', '莱赛尔 / 粘纤混纺方向，180–220 g/m²'][i]}\n\n成分状态：待确认，不由图片认定。\n供应来源：材料开发组（示例）；实际供应商未指定。\n价格、库存、MOQ、交期：待询价。\n视觉：哑光、自然肌理；实物手感、缩水、色牢度待验证。`, '资料收集', '面辅料')
    a.material = '开发方向，非供应商已确认规格。采购与检测条件待确认。'
    return a
  })
}
export function finishCaseStage(project: Project, stageId: string): Project {
  const stage = CASE_STAGES.find(s => s.id === stageId)!, task = project.tasks.find(t => t.caseStage === stageId)!
  let p = { ...project }, outputs: Asset[] = []
  if (stageId === 'collect') outputs = [...caseSources(p), textAsset(p, 'source-register', '趋势资料清单与口径检查', SOURCE_NOTES.map(([name, usage, note]) => `## ${name}\n用途：${usage}\n${note}`).join('\n\n') + '\n\n## 归档关联\n本项目 / 品牌 ZARA / 集团级客户 Inditex。当前 4 份摘要，不等同于拥有 42 份原始报告授权。')]
  const doc = caseDocument(p, stageId)
  if (doc) outputs = [textAsset(p, `output-${stageId}`, doc.title, doc.sections.map(s => `## ${s.title}\n${s.body}`).join('\n\n'))]
  if (stageId === 'search') outputs = caseMaterials(p)
  if (stageId === 'design') {
    const materials = p.assets.filter(a => a.kind === '面辅料')
    outputs = [0, 1, 2].map(i => {
      const a = caseStyle(p, i), m = materials.find(m => m.id.endsWith(`material-${i}`)) ?? materials[i]
      if (m) a.materials = [{ assetId: m.id, name: m.name, revision: { ...adopted(m) }, role: '主料', usage: '主体；用量待纸样核算', supplier: '待采购确认', notes: '演示候选；同色纽扣 / 拉链为辅料方向，实际物料编号待建立。' }]
      return a
    })
  }
  if (stageId === 'selection') outputs = [textAsset(p, 'selection-advice', '内部选款比较建议', '## 比较维度\n主题适配 / 系列搭配 / 差异性 / 材料适配 / 开发风险\n\n## 专家建议\n优先比较衬衫夹克与宽褶裤的同色搭配，短袖款可核查袋型是否冗余。\n\n## 决策\n请在资产 → 内部选款中人工标记并记录意见。此建议不会自动保留任何款式。')]
  if (stageId === 'delivery') outputs = [textAsset(p, 'delivery-check', 'ODM 交付核查与样衣开发说明', `## 本轮款式\n${p.assets.filter(a => a.kind === '款式设计').map(a => `${a.name}：${a.selection}；${a.materials?.length ?? 0} 个关联料`).join('\n')}\n\n## 下一阶段\nPLM 中开展纸样、尺寸规格、材料实物确认、打样、试穿与修版。当前只交接设计方案，未完成实体样衣。\n\n## 保留问题\n成本 / 数量 / 交期 / 检测要求 / 真实采购主体 / Cloud 3D 链接待核实。\n\n## 放行规则\n人工内部审核通过后生成模拟快照。客户反馈不会自动触发放行。`)]
  const newAssets = outputs.filter(a => !p.assets.some(x => x.id === a.id)).map(a => ({ ...a, taskId: task.id }))
  p = { ...p, assets: [...p.assets, ...newAssets], status: p.status === '待启动' ? '进行中' : p.status }
  const refs = p.assets.filter(a => a.kind === '参考资料' || a.name.includes('Brief') || a.name.includes('趋势报告')).map(a => ({ assetId: a.id, revisionId: a.adopted, name: a.name }))
  const capabilities = stage.capabilityIds.map(capabilityById).filter((c): c is Capability => !!c)
  p.tasks = p.tasks.map(t => t.id !== task.id ? t : { ...t, updated: now(), status: '待人工处理', refs, caseRun: { state: 'ready', step: stage.steps.length, instruction: t.caseRun?.instruction ?? stage.instruction }, documents: doc ? [doc] : t.documents, invocations: capabilities.map(c => ({ id: `${t.id}-${c.id}`, capability: c, instruction: t.caseRun?.instruction ?? stage.instruction, refs, date: now(), status: '已演示', outputId: outputs[0]?.id })), searches: stageId === 'search' ? [{ id: `${p.id}-search-styles`, date: now(), kind: '款式', scope: '全部', query: '轻结构夹克 / 短袖衬衫 / 宽褶裤', results: [0, 1, 2].flatMap(i => [caseStyle(p, i, true), caseStyle(p, i, true, true)]), selected: [] }, { id: `${p.id}-search-materials`, date: now(), kind: '面辅料', scope: '内部', query: '轻薄 / 哑光 / 垂坠', results: caseMaterials(p), selected: [] }] : t.searches, history: [...(t.history ?? []), { date: now(), text: `完成预置演示：${stage.outcome}；等待人工处理` }], messages: [...t.messages, { id: uid(), role: 'assistant', date: now(), text: `演示执行完成：${stage.outcome}。请检查下方工作稿和产出，可继续编辑、下载，或上传人工修订；不会自动当作内部通过。` }] })
  return p
}
