export type CapabilityKind = 'skill' | 'expert' | 'team'
export interface Capability {
  id: string
  kind: CapabilityKind
  name: string
  description: string
  input: string
  output: string
  review: string
  taskType: string
  sources: string[]
  skills?: string[]
  members?: string[]
}

// Product capability definitions, not credentials or executable AI integrations.
export const ODM_SKILLS: Capability[] = [
  { id: 'odm-trend-collect', kind: 'skill', name: '趋势资料整理', description: '整理上传或授权数据源的资料，保留出处、用途与项目关联。', input: '授权趋势报告、PPT、图片、流程和标注规范。', output: '来源清单、版本差异、项目引用与待复核项。', review: '没有原始数据时不声称已爬取或分析，不默认保存全部外部搜索结果。', taskType: '趋势分析', sources: ['趋势资料库'] },
  { id: 'odm-brief', kind: 'skill', name: '客户 Brief 拆解', description: '提炼已知需求、设计约束和待确认问题。', input: '客户 Brief、邮件或需求描述，可补充客户与品牌资料。', output: '需求摘要、约束清单、待确认事项。', review: '人工确认需求后，才作为其他任务的开发依据。', taskType: 'Brief 拆解', sources: [] },
  { id: 'odm-style-search', kind: 'skill', name: '内外部相似款检索', description: '优先复用内部样衣，按需拓展外部参考款。', input: '参考图或款式描述，说明品类、风格和检索范围。', output: '候选款式结果集、来源与匹配依据，择优加入画布或归档。', review: '外部参考不等于自有可生产款，不默认全量爬取或保存。', taskType: '搜款搜料', sources: ['内部样衣库', '外部搜款服务'] },
  { id: 'odm-material-search', kind: 'skill', name: '内外部面辅料检索', description: '按成分、克重、功能和供应条件寻找候选料。', input: '面料图片或规格，以及目标成本、采购量等已知条件。', output: '候选面辅料、供应商与来源、待核实的采购条件。', review: '实物手感、价格、库存及交期必须由业务核实。', taskType: '搜款搜料', sources: ['面辅料库', '外部面辅料服务'] },
  { id: 'odm-trend-report', kind: 'skill', name: '趋势分析报告', description: '结合授权资料与设计判断，整理有出处的趋势分析。', input: '供应商报告、趋势资料、研究季节和目标品类。', output: '趋势报告草稿、引用来源和可转化的开发方向。', review: '区分来源事实与推断，人工核查后归档。', taskType: '趋势分析', sources: ['趋势资料库'] },
  { id: 'odm-planning-ppt', kind: 'skill', name: '服装企划 PPT', description: '从主题、色彩、面料到款式结构组织企划演示。', input: '研究成果、参考图、个人判断和期望页数。', output: '企划大纲及可编辑 PPT，支持下载、线下修改、上传修订。', review: '先确认大纲与引用素材，再形成正式演示稿。', taskType: '服装企划', sources: ['趋势资料库'] },
  { id: 'odm-design', kind: 'skill', name: '款式设计与改款', description: '将选定参考与修改要求交给设计画布。', input: '选定参考款、客户约束和设计修改说明。', output: '款式设计图、修改说明和需补充的设计视图。', review: 'AI 图不代表已完成制版或实体样衣开发。', taskType: '款式设计', sources: ['内部样衣库'] },
  { id: 'odm-material-match', kind: 'skill', name: '款料匹配建议', description: '结合款式效果与材料特性提出面辅料方案。', input: '款式设计、候选面辅料及成本和工艺约束。', output: '主料、辅料、备选料及适配理由。', review: '材料可采购性与工艺适配需人工确认。', taskType: '款式设计', sources: ['面辅料库'] },
  { id: 'odm-delivery-check', kind: 'skill', name: '交付资料核查', description: '检查选定款式、面辅料及样衣开发资料的缺项。', input: '本次拟交付的款式与资料。', output: '缺项、风险和待确认事项清单。', review: '仅辅助核查，不代替内部确认，也不自动提交 PLM。', taskType: '自由任务', sources: [] },
]

export const ODM_EXPERTS: Capability[] = [
  { id: 'odm-demand-expert', kind: 'expert', name: '客户需求专家', description: '从客户目标与品牌约束出发，辨别需求冲突和信息缺口。', input: 'Brief 与客户、品牌背景。', output: '需求判断和需沟通的问题。', review: '不代替业务人员确认客户承诺。', taskType: 'Brief 拆解', sources: [], skills: ['odm-brief'] },
  { id: 'odm-trend-expert', kind: 'expert', name: '趋势企划专家', description: '将趋势信息转化为适合本次开发的系列企划。', input: '趋势资料、目标人群、季节与品类。', output: '趋势判断、系列方向和企划建议。', review: '结论应注明依据与不确定性。', taskType: '趋势分析', sources: ['趋势资料库'], skills: ['odm-trend-report', 'odm-planning-ppt'] },
  { id: 'odm-style-expert', kind: 'expert', name: '服装设计专家', description: '判断款式、廓形和细节，给出可执行的设计修改建议。', input: '候选参考、设计图与开发约束。', output: '选款判断、改款要求和设计方案。', review: '最终设计由设计师确认。', taskType: '款式设计', sources: ['内部样衣库', '外部搜款服务'], skills: ['odm-style-search', 'odm-design'] },
  { id: 'odm-material-expert', kind: 'expert', name: '面辅料专家', description: '判断材料特性、款料适配和可采购条件。', input: '面辅料规格、款式效果和采购条件。', output: '选料建议、替代方案与待核实事项。', review: '实物与供应商确认优先于图片判断。', taskType: '搜款搜料', sources: ['面辅料库', '外部面辅料服务'], skills: ['odm-material-search', 'odm-material-match'] },
]

export const ODM_TEAMS: Capability[] = [
  { id: 'odm-research-team', kind: 'team', name: '趋势企划专家团', description: '需求与趋势专家协作，完成研究和服装企划。', input: '研究目标、客户背景和收集的趋势资料。', output: '需求要点、趋势报告及企划大纲。', review: '各结论可单独修改，不强制顺序执行。', taskType: '服装企划', sources: ['趋势资料库'], members: ['odm-demand-expert', 'odm-trend-expert'], skills: ['odm-brief', 'odm-trend-report', 'odm-planning-ppt'] },
  { id: 'odm-style-team', kind: 'team', name: '款式驱动开发专家团', description: '从参考款出发，协同设计与面辅料选择。', input: '参考款或设计方向，及已知开发约束。', output: '设计方案、款料建议和交付缺项清单。', review: '选款、选料与进入 PLM 均保留人工确认。', taskType: '款式设计', sources: ['内部样衣库', '外部搜款服务', '面辅料库'], members: ['odm-demand-expert', 'odm-style-expert', 'odm-material-expert'], skills: ['odm-brief', 'odm-style-search', 'odm-design', 'odm-material-match', 'odm-delivery-check'] },
  { id: 'odm-material-team', kind: 'team', name: '材料驱动开发专家团', description: '从特色材料出发，寻找适合的款式与开发方向。', input: '材料图片、规格与实物评价，可补充目标客户。', output: '材料分析、适配款式和设计开发建议。', review: '先核实材料属性，方案仍由内部择优确认。', taskType: '款式设计', sources: ['面辅料库', '外部面辅料服务', '内部样衣库'], members: ['odm-material-expert', 'odm-style-expert'], skills: ['odm-material-search', 'odm-style-search', 'odm-design', 'odm-material-match', 'odm-delivery-check'] },
]
export const ODM_CAPABILITIES = [...ODM_SKILLS, ...ODM_EXPERTS, ...ODM_TEAMS]
export const capabilityLabel: Record<CapabilityKind, string> = { skill: '技能', expert: '专家', team: '专家团' }
export const capabilityById = (id: string) => ODM_CAPABILITIES.find(c => c.id === id)

export interface ProjectTemplate {
  id: string; name: string; description: string; goal: string
  skills: string[]; experts: string[]; teams: string[]; connectors: string[]
  outputs: string[]
}
const names = (ids: string[]) => ids.map(id => capabilityById(id)!.name)
const boundary = '\n\n协作约定：按需发起多个任务，不强制按顺序执行。任务成果先人工核查，可下载到本地修改后上传。客户意见作为反馈，只有内部最终确认后才提交 PLM 进行样衣开发。'
export const PROJECT_TEMPLATES: ProjectTemplate[] = [
  { id: 'customer-development', name: '客户需求开发', description: '从客户 Brief 出发，逐步形成设计与选料方案。', goal: '围绕客户 Brief 开展 ODM 开发。先明确已知需求、设计约束和待确认问题；根据需要搜款、设计改款与选料，汇集本次交付内容。不要虚构缺失的成本、数量或交期。' + boundary, skills: names(['odm-brief', 'odm-style-search', 'odm-design', 'odm-material-match', 'odm-delivery-check']), experts: names(['odm-demand-expert']), teams: names(['odm-style-team']), connectors: ['内部样衣库', '面辅料库'], outputs: ['需求拆解', '款式设计', '选料建议'] },
  { id: 'style-development', name: '自主款式开发', description: '先自主开发，再选择合适的客户推广。', goal: '围绕选定的季节、品类与设计方向自主开发。优先复用内部样衣，按需拓展外部参考；形成款式设计及面辅料建议。暂不预设客户，可在推广时关联一个或多个客户。' + boundary, skills: names(['odm-style-search', 'odm-design', 'odm-material-match', 'odm-delivery-check']), experts: names(['odm-style-expert']), teams: names(['odm-style-team']), connectors: ['内部样衣库', '外部搜款服务', '面辅料库'], outputs: ['候选参考', '款式设计', '面辅料方案'] },
  { id: 'material-development', name: '材料驱动开发', description: '从一块面料、一项材料特性开始设计。', goal: '从已收集的面辅料出发，整理成分、克重、手感、功能和采购条件。区分已核实与待确认信息，研究适合的品类与款式，再形成设计和款料组合。' + boundary, skills: names(['odm-material-search', 'odm-style-search', 'odm-design', 'odm-material-match', 'odm-delivery-check']), experts: names(['odm-material-expert']), teams: names(['odm-material-team']), connectors: ['面辅料库', '外部面辅料服务', '内部样衣库'], outputs: ['材料分析', '款式方向', '款料组合'] },
  { id: 'trend-research', name: '趋势研究', description: '汇集来源资料，形成可复用的趋势分析报告。', goal: '根据目标季节、人群与品类，分析授权的供应商报告、趋势资料和参考图。保留出处与时间，区分来源事实与个人推断，输出有依据的趋势报告和开发建议。' + boundary, skills: names(['odm-trend-report']), experts: names(['odm-trend-expert']), teams: names(['odm-research-team']), connectors: ['趋势资料库'], outputs: ['来源资料', '趋势报告', '开发方向'] },
  { id: 'fashion-planning', name: '服装企划', description: '把研究资料与设计判断组织成企划 PPT。', goal: '结合已有趋势研究、品牌风格和设计判断，梳理系列主题、色彩、面料和款式结构。先确认 PPT 大纲及引用素材，再组织可编辑的企划演示稿，便于线下修改后归档。' + boundary, skills: names(['odm-trend-report', 'odm-planning-ppt']), experts: names(['odm-trend-expert']), teams: names(['odm-research-team']), connectors: ['趋势资料库', '内部样衣库', '面辅料库'], outputs: ['企划大纲', '企划 PPT', '引用素材'] },
]
