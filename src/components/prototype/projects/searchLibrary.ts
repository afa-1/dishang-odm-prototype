import coat1 from '@/assets/brandlib/coat1.png'
import coat2 from '@/assets/brandlib/coat2.png'
import coat3 from '@/assets/brandlib/coat3.png'
import { adopted, makeAsset, now, type Asset, type Project, type SearchSet } from './model'

export function searchLocal(project: Project, kind: SearchSet['kind'], query: string): Asset[] {
  const styles = [coat1, coat2, coat3].map((url, i) => {
    const a = makeAsset(['轻量通勤风衣（库内示例）', '宽松长款风衣（库内示例）', '短款户外夹克（库内示例）'][i], '参考资料', { id: `library-style-${i}-v1`, name: `款式参考-${i + 1}.png`, mime: 'image/png', date: '2026-09-01T00:00:00Z', url }, '资料收集')
    a.id = `library-style-${i}`
    a.provenance = { key: a.id, scope: '内部', provider: '内部样衣库 · 演示数据', collectedAt: now(), demo: true }
    return a
  })
  const materials = ['轻量棉锦面料', '再生尼龙面料', '同色树脂纽扣'].map((name, i) => {
    const a = makeAsset(`${name}（库内示例）`, '面辅料', { id: `library-material-${i}-v1`, name: `${name}.md`, mime: 'text/markdown', date: '2026-09-01T00:00:00Z', text: `# ${name}\n\n演示材料，不代表真实供应商库存。\n\n成分比例、克重、色号、价格、起订量及交期均待核实。` }, '资料收集')
    a.id = `library-material-${i}`
    a.material = '演示候选料；规格、供应商、价格与可采购性待核实。'
    a.provenance = { key: a.id, scope: '内部', provider: '面辅料库 · 演示数据', collectedAt: now(), demo: true }
    return a
  })
  const local = project.assets.filter(a => kind === '面辅料' ? a.kind === '面辅料' : a.kind === '款式设计' || a.kind === '参考资料' && adopted(a).mime.startsWith('image/')).filter(a => a.provenance?.scope !== '外部').map(a => ({ ...structuredClone(a), provenance: a.provenance ?? { key: `project-${a.id}`, scope: '内部' as const, provider: '本项目资产', collectedAt: now() } }))
  const all = [...local, ...(kind === '款式' ? styles : materials)]
  const tokens = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  const seen = new Set<string>()
  return all.filter(a => { const key = a.provenance!.key; if (seen.has(key)) return false; seen.add(key); return !tokens.length || tokens.some(t => `${a.name} ${a.material}`.toLocaleLowerCase().includes(t)) })
}
