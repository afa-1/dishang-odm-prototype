import { useEffect, useState } from 'react'
import coat from '@/assets/brandlib/coat1.png'
import { adopted, makeAsset, now, uid, type Asset, type Project } from './model'
import { getDirectory } from './directory'

export interface Resource { id: string; asset: Asset; provider: string; season: string; summary: string; customerIds: string[]; brandIds: string[]; originProject?: string; originAsset?: string }
const KEY = 'hyy-odm-resources-v1'
function examples(): Resource[] {
  const records = getDirectory().records
  return [
    ['春夏轻户外趋势观察', '趋势机构 · 示例报告', '以轻量、防护、日常通勤为研究线索，供设计团队补充趋势判断。'],
    ['棉锦轻量面料开发册', '面料供应商 · 示例资料', '含成分、克重、色卡与应用方向。价格、起订量与交期待核实。'],
    ['都市通勤系列企划参考', '设计团队 · 示例企划', '主题、色彩、廓形与系列组合的参考结构，不是市场结论。'],
    ['风衣结构与细节参考', '内部样衣库 · 示例款式', '用于观察门襟、袖口和腰带细节，可引用到项目画布。'],
  ].map(([name, provider, summary], i) => {
    const a = makeAsset(name, i === 1 ? '面辅料' : '参考资料', { id: 'resource-rev-' + i, name: name + (i === 3 ? '.png' : '.md'), mime: i === 3 ? 'image/png' : 'text/markdown', date: '2026-09-24T00:00:00Z', ...(i === 3 ? { url: coat } : { text: '# ' + name + '\n\n> 演示资料，非真实厂商报告。\n\n' + summary }) }, '资料收集')
    a.id = 'resource-asset-' + i
    return { id: 'resource-' + i, asset: a, provider, season: '2027 春夏', summary, customerIds: i === 2 ? records.filter(r => r.kind === 'customer').slice(0, 1).map(r => r.id) : [], brandIds: i === 2 ? records.filter(r => r.kind === 'brand').slice(0, 1).map(r => r.id) : [] }
  })
}
export function loadResources(): Resource[] {
  try { const raw = localStorage.getItem(KEY); return raw ? JSON.parse(raw) : examples() } catch { return [] }
}
export function saveResource(resource: Resource) {
  const all = loadResources(), index = all.findIndex(r => r.id === resource.id || resource.originAsset && r.originAsset === resource.originAsset && r.originProject === resource.originProject)
  if (index < 0) all.unshift(resource); else all[index] = { ...resource, id: all[index].id }
  localStorage.setItem(KEY, JSON.stringify(all)); window.dispatchEvent(new Event('odm-resources-change'))
}
export function useResources() {
  const [rows, setRows] = useState(loadResources)
  useEffect(() => { const sync = () => setRows(loadResources()); window.addEventListener('odm-resources-change', sync); window.addEventListener('storage', sync); return () => { window.removeEventListener('odm-resources-change', sync); window.removeEventListener('storage', sync) } }, [])
  return rows
}
export function resourceAsset(r: Resource): Asset {
  const a = structuredClone(r.asset)
  return { ...a, id: uid(), resourceId: r.id, source: '资料收集', taskId: undefined, delivery: false, selection: '待选', revisions: [adopted(a)], provenance: { key: r.id, provider: r.provider, scope: '内部', collectedAt: now(), demo: r.id.startsWith('resource-') } }
}
export const projectResourceIds = (p: Project) => p.assets.map(a => a.resourceId).filter(Boolean)
