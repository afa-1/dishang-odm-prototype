import coat1 from '@/assets/brandlib/coat1.png'
import coat2 from '@/assets/brandlib/coat2.png'
import coat3 from '@/assets/brandlib/coat3.png'
import { hydrateProject, persistDirectory, type ProfileReference } from './directory'
import type { Capability } from './capabilities'
import type { AgentSession } from './projectAgentModel'

export type Tab = '概览' | '任务' | '资产' | '交付'
export type AssetKind = '项目文档' | '款式设计' | '面辅料' | '参考资料'
export type Selection = '待选' | '保留' | '备选' | '修改' | '淘汰'
export interface Revision { id: string; name: string; date: string; mime: string; size?: number; blobKey?: string; url?: string; text?: string }
export interface MaterialLink { assetId: string; name: string; revision: Revision; role: '主料' | '辅料' | '备选料'; usage: string; supplier: string; notes: string }
export interface Provenance { key: string; scope: '内部' | '外部'; provider: string; url?: string; collectedAt: string; demo?: boolean }
export interface SearchSet { id: string; date: string; kind: '款式' | '面辅料'; scope: '内部' | '外部' | '全部'; query: string; reference?: Revision; results: Asset[]; selected: string[]; invocationId?: string }
export type DocumentKind = 'Brief 拆解' | '趋势报告' | '企划 PPT'
export interface WorkDocument { invocationId?: string; id: string; kind: DocumentKind; title: string; sections: { id: string; title: string; body: string }[]; refs: Task['refs']; updated: string; confirmedAt?: string }
export interface Asset {
  selectionNote?: string
  selectionBy?: string
  resourceId?: string
  id: string; name: string; kind: AssetKind; source: '资料收集' | '任务产出' | '人工上传'; taskId?: string
  revisions: Revision[]; adopted: string; delivery: boolean; selection: Selection; material: string; cloud: string
  provenance?: Provenance; materials?: MaterialLink[]
}
export interface Task {
  agent?: AgentSession
  assignee?: string; reviewer?: string
  reviewNote?: string
  history?: { date: string; text: string }[]
  caseStage?: string
  caseRun?: { state: 'idle' | 'running' | 'paused' | 'ready'; step: number; instruction: string }
  demoRun?: { scenario: 'brief' | 'planning' | 'search'; status: 'confirm' | 'running' | 'paused' | 'ready' | 'error'; step: number; request: string; direction: string; outputId?: string }
  id: string; name: string; type: string; status: '待开始' | '进行中' | '待人工处理' | '待审核' | '退回修改' | '已完成'; updated: string
  refs: { assetId: string; revisionId: string; name: string }[]
  context: { goal: string; customers: string[]; brands: string[]; skills: string[]; experts: string[]; teams?: string[]; connectors: string[]; profiles?: ProfileReference[]; requirements?: WorkDocument }
  invocations?: { id: string; capability: Capability; instruction: string; date: string; refs: Task['refs']; status: '已配置' | '已演示'; outputId?: string }[]
  searches?: SearchSet[]; canvas?: Revision
  documents?: WorkDocument[]
  messages: { id: string; role: 'user' | 'assistant'; text: string; date: string }[]
}
export interface DeliveryItem { assetId: string; name: string; kind: AssetKind; revision: Revision; material: string; cloud: string; selection: Selection; materials?: MaterialLink[]; provenance?: Provenance }
export interface PushRecord { id: string; customer: string; customerId?: string; date: string; items: DeliveryItem[]; feedback: string }
export interface Handoff { id: string; date: string; confirmedBy: string; items: DeliveryItem[] }
export interface Project {
  caseId?: 'zara-28ss'
  developmentMode?: '自主开发' | '客户开发'
  members?: { name: string; role: string }[]
  review?: { state: 'draft' | 'pending' | 'returned' | 'approved'; reviewer: string; note: string; date: string }
  id: string; name: string; goal: string; customers: string[]; brands: string[]; season: string; category: string; owner: string
  customerIds?: string[]; brandIds?: string[]
  templateId?: string; teams?: string[]
  requirements?: WorkDocument
  status: '待启动' | '进行中' | '待内部确认' | '修改中' | '已交接' | '已归档'; demo?: boolean; created: string; updated: string
  skills: string[]; experts: string[]; connectors: string[]; tasks: Task[]; assets: Asset[]
  activities: { id: string; text: string; date: string }[]; pushes: PushRecord[]; handoffs: Handoff[]
}
export const TABS: Tab[] = ['概览', '任务', '资产', '交付']
export const TASK_TYPES = ['自由任务', 'Brief 拆解', '趋势分析', '服装企划', '搜款搜料', '款式设计']
export function demoRequest(text: string): NonNullable<Task['demoRun']> {
  return { scenario: /搜|相似|面料|选料/.test(text) ? 'search' : /趋势|企划|PPT|报告/i.test(text) ? 'planning' : 'brief', status: 'confirm', step: 0, request: text, direction: '' }
}
export const KINDS: AssetKind[] = ['项目文档', '款式设计', '面辅料', '参考资料']
export const CUSTOMERS = ['北辰服饰（示例）', '远山户外（示例）', '都市衣橱（示例）']
export const BRANDS = ['NORDEN（示例）', 'FIELDWORK（示例）', 'URBAN DAILY（示例）']
export const CONNECTORS = ['内部样衣库', '面辅料库', '趋势资料库', '外部搜款服务', '外部面辅料服务', '凌迪 Cloud', 'PLM']
export const uid = () => crypto.randomUUID()
export const now = () => new Date().toISOString()
export const dateLabel = (d: string) => new Date(d).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
export const adopted = (a: Asset) => a.revisions.find(r => r.id === a.adopted) ?? a.revisions[0]
export const snapshot = (a: Asset): DeliveryItem => ({ assetId: a.id, name: a.name, kind: a.kind, revision: { ...adopted(a) }, material: a.material, cloud: a.cloud, selection: a.selection, materials: structuredClone(a.materials ?? []), provenance: a.provenance ? { ...a.provenance } : undefined })
export function emptyProject(): Project {
  return { id: uid(), name: '', goal: '', customers: [], brands: [], season: '', category: '', owner: '我', status: '进行中', created: now(), updated: now(), skills: [], experts: [], connectors: [], tasks: [], assets: [], activities: [], pushes: [], handoffs: [] }
}
export function log(p: Project, text: string): Project {
  return { ...p, updated: now(), activities: [{ id: uid(), text, date: now() }, ...p.activities].slice(0, 200) }
}
export function makeAsset(name: string, kind: AssetKind, revision: Revision, source: Asset['source'] = '人工上传'): Asset {
  return { id: uid(), name, kind, source, revisions: [revision], adopted: revision.id, delivery: false, selection: '待选', material: '', cloud: '' }
}
function demoProject(): Project {
  const p = emptyProject()
  p.id = 'demo-summer-trench'
  p.name = '2026 夏季轻量风衣'
  p.demo = true
  p.goal = '开发兼顾都市通勤与轻户外的夏季风衣系列。以轻量、舒适、易搭配为方向，优先复用内部样衣与可采购面料；形成可供内部选款和客户沟通的 ODM 方案。'
  p.season = '2026 春夏'; p.category = '风衣 / 轻外套'
  p.customers = [CUSTOMERS[0]]; p.brands = [BRANDS[0]]
  p.skills = ['系列企划生成', '秀场趋势解读', '面料智库问答']; p.experts = ['趋势企划天团']; p.connectors = ['内部样衣库', '面辅料库', '凌迪 Cloud']
  const brief = makeAsset('客户需求拆解', '项目文档', { id: uid(), name: '客户需求拆解.md', date: now(), mime: 'text/markdown', text: '# 客户需求拆解\n\n> 演示资料，不代表真实客户需求。\n\n## 已知方向\n都市通勤与轻户外，轻量风衣系列。\n\n## 待确认\n- 目标成本与价格带\n- 首轮样衣数量、交期\n- 防泼水要求及检测标准\n- 面料采购量与颜色\n\n## 下一步\n由业务与设计负责人确认 Brief 后，筛选款式与面辅料。' }, '任务产出')
  brief.delivery = true
  const ref = makeAsset('轻户外趋势资料摘录', '参考资料', { id: uid(), name: '趋势资料摘录.md', date: now(), mime: 'text/markdown', text: '# 轻户外趋势资料摘录（演示）\n\n本条用于演示资料归档，不是已验证的市场结论。\n\n正式使用时请上传授权的厂商报告，补充来源、发布时间及可使用范围。\n\n候选方向：轻量结构、日常通勤、多场景穿着。' }, '资料收集')
  const styles = [coat1, coat2, coat3].map((url, i) => {
    const a = makeAsset(['轻量通勤风衣', '松弛感长款风衣', '短款轻户外夹克'][i], '款式设计', { id: uid(), name: `款式参考-${i + 1}.png`, date: now(), mime: 'image/png', url }, '任务产出')
    a.delivery = i < 2; a.selection = i === 0 ? '保留' : i === 1 ? '修改' : '备选'
    a.material = i === 0 ? '候选：棉锦混纺；克重、色号、供应商与可采购性待确认。\n辅料：同色纽扣、可调节袖袢。' : ''
    return a
  })
  const task: Task = { id: uid(), name: '拆解客户 Brief，梳理首轮开发方向', type: 'Brief 拆解', status: '待人工处理', updated: now(), refs: [], context: { goal: p.goal, customers: [...p.customers], brands: [...p.brands], skills: [...p.skills], experts: [...p.experts], connectors: [...p.connectors] }, messages: [{ id: uid(), role: 'user', text: '先整理客户需求，列出还需要与客户确认的事项。', date: now() }, { id: uid(), role: 'assistant', text: '【原型演示】需求拆解示例已归入项目资产。成本、交期、检测标准仍待人工确认，可下载后本地修改，再上传新版本。', date: now() }] }
  brief.taskId = task.id; p.tasks = [task]; p.assets = [brief, ...styles, ref]
  p.activities = [{ id: uid(), text: '客户需求拆解已归档，等待人工补充确认', date: now() }, { id: uid(), text: '创建项目，并关联客户与品牌（示例）', date: now() }]
  return p
}

const STORE = 'hyy-odm-projects-v1'
export function loadProjects(): { projects: Project[]; error?: string } {
  try {
    const raw = localStorage.getItem(STORE)
    if (!raw) return { projects: [hydrateProject(demoProject())] }
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed) || !parsed.every(p => p && typeof p.id === 'string' && Array.isArray(p.assets) && Array.isArray(p.tasks))) throw new Error('invalid')
    return { projects: parsed.map(hydrateProject) }
  } catch { return { projects: [], error: '本地项目数据无法读取。为保护原数据，已暂停保存；请先导出浏览器中的原始数据后处理。' } }
}
export function saveProjects(projects: Project[]) { persistDirectory(); localStorage.setItem(STORE, JSON.stringify(projects)); window.dispatchEvent(new Event('odm-projects-change')) }

// Files are kept as Blobs in IndexedDB; localStorage contains metadata only.
async function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const r = indexedDB.open('hyy-odm-project-files-v1', 1)
    r.onupgradeneeded = () => r.result.createObjectStore('files')
    r.onsuccess = () => resolve(r.result)
    r.onerror = () => reject(new Error('浏览器不允许保存文件'))
    r.onblocked = () => reject(new Error('文件库被其他页面占用，请关闭后重试'))
  })
}
export async function storeFile(file: File): Promise<Revision> {
  if (file.size > 30 * 1024 * 1024) throw new Error('单个文件上限为 30 MB，请压缩后重试')
  const key = uid(), connection = await db()
  await new Promise<void>((resolve, reject) => {
    const tx = connection.transaction('files', 'readwrite')
    tx.objectStore('files').put(file, key)
    tx.oncomplete = () => { connection.close(); resolve() }
    tx.onerror = tx.onabort = () => { connection.close(); reject(new Error('文件保存失败，可能是浏览器存储空间不足')) }
  })
  return { id: uid(), name: file.name, date: now(), mime: file.type || (/\.(md|txt)$/i.test(file.name) ? 'text/plain' : 'application/octet-stream'), size: file.size, blobKey: key }
}
export async function readBlob(r: Revision): Promise<Blob> {
  if (r.text !== undefined) return new Blob([r.text], { type: r.mime })
  if (r.url) {
    const res = await fetch(r.url)
    if (!res.ok) throw new Error('示例文件无法读取')
    return res.blob()
  }
  const connection = await db()
  return new Promise((resolve, reject) => {
    const tx = connection.transaction('files', 'readonly')
    const req = tx.objectStore('files').get(r.blobKey ?? '')
    req.onsuccess = () => req.result ? resolve(req.result) : reject(new Error('文件已不在浏览器中，请重新上传'))
    req.onerror = () => reject(new Error('文件读取失败'))
    tx.oncomplete = () => connection.close()
  })
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob), a = document.createElement('a')
  a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
export function safeURL(value: string) {
  if (!value.trim()) return ''
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) ? u.href : null } catch { return null }
}
