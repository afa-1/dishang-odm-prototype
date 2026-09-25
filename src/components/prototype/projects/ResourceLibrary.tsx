import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowUpRight, BookOpen, Check, FileText, FolderInput, Plus, Upload } from 'lucide-react'
import { adopted, downloadBlob, KINDS, loadProjects, makeAsset, now, readBlob, saveProjects, storeFile, uid, type Asset, type Project } from './model'
import { useDirectory, type Profile } from './directory'
import { loadResources, projectResourceIds, resourceAsset, saveResource, useResources, type Resource } from './resourceStore'
import { Badge, Button, card, Empty, Field, input, Modal, SearchBox, textarea } from './ui'

function ResourceTile({ resource: r, selected, onClick, footer }: { resource: Resource; selected?: boolean; onClick: () => void; footer?: React.ReactNode }) {
  return <div className={`${card} overflow-hidden transition-colors ${selected ? 'border-pri' : 'hover:border-pri/40'}`}>
    <button onClick={onClick} className="w-full text-left"><div className="h-32 bg-fill-2 flex items-center justify-center relative">{adopted(r.asset).url ? <img src={adopted(r.asset).url} className="w-full h-full object-contain" alt="" /> : <div className="flex gap-3 items-center text-ink-3"><BookOpen size={30} strokeWidth={1.3} /><span className="text-[12px] tracking-widest">{r.asset.kind === '面辅料' ? 'MATERIAL STUDY' : 'DESIGN RESEARCH'}</span></div>}{selected && <span className="absolute top-3 right-3 rounded-full bg-pri text-white p-1"><Check size={13} /></span>}</div><div className="p-4 space-y-2"><div className="flex gap-2"><Badge>{r.asset.kind}</Badge><Badge>{r.season || '季节不限'}</Badge></div><h3 className="font-semibold text-[14px] line-clamp-2">{r.asset.name}</h3><p className="text-[11px] text-ink-3">{r.provider}</p><p className="text-[12px] text-ink-3 leading-6 line-clamp-2 min-h-12">{r.summary || '暂无说明'}</p></div></button>{footer && <div className="px-4 pb-4">{footer}</div>}
  </div>
}

export function ResourceForm({ asset, project, initial, onClose, onSaved }: { asset?: Asset; project?: Project; initial?: Resource; onClose: () => void; onSaved: () => void }) {
  const { records } = useDirectory()
  const [name, setName] = useState(initial?.asset.name ?? asset?.name ?? ''), [provider, setProvider] = useState(initial?.provider ?? asset?.provenance?.provider ?? (project ? '项目成果 · ' + project.name : ''))
  const [season, setSeason] = useState(initial?.season ?? project?.season ?? ''), [summary, setSummary] = useState(initial?.summary ?? '')
  const [kind, setKind] = useState<Asset['kind']>(initial?.asset.kind ?? asset?.kind ?? '参考资料')
  const [customerIds, setCustomers] = useState(initial?.customerIds ?? project?.customerIds ?? []), [brandIds, setBrands] = useState(initial?.brandIds ?? project?.brandIds ?? [])
  const [file, setFile] = useState<File>(), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const options = (type: Profile['kind'], selected: string[], update: (ids: string[]) => void) => <div className="flex flex-wrap gap-2">{records.filter(r => r.kind === type).map(r => <button type="button" key={r.id} aria-pressed={selected.includes(r.id)} onClick={() => update(selected.includes(r.id) ? selected.filter(id => id !== r.id) : [...selected, r.id])} className={`px-3 py-2 rounded-full text-[12px] border ${selected.includes(r.id) ? 'border-pri-line text-pri bg-pri-soft' : 'border-line text-ink-3'}`}>{r.name}</button>)}</div>
  async function submit() {
    setBusy(true); setError('')
    try {
      const source = initial?.asset ?? asset ?? (file ? makeAsset(name.trim(), kind, await storeFile(file), '资料收集') : undefined)
      if (!source) throw new Error('请选择资料文件')
      saveResource({ id: initial?.id ?? uid(), asset: { ...structuredClone(source), name: name.trim(), kind }, provider: provider.trim(), season, summary, customerIds, brandIds, originProject: initial?.originProject ?? project?.id, originAsset: initial?.originAsset ?? asset?.id })
      onSaved()
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return <Modal title={initial ? '编辑公共资料' : asset ? '沉淀到公共资料' : '收录公共资料'} description="保存资料来源与适用范围，后续项目按需引用。客户、品牌均可不关联，不自动公开给客户。" onClose={() => { if (!busy) onClose() }}>
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); void submit() }}>
      <Field label="资料名称 *"><input className={input} value={name} required onChange={e => setName(e.target.value)} /></Field>
      <div className="grid grid-cols-2 gap-4"><Field label="资料分类"><select className={input} value={kind} onChange={e => setKind(e.target.value as Asset['kind'])}>{KINDS.map(k => <option key={k}>{k}</option>)}</select></Field><Field label="适用季节"><input className={input} placeholder="例如：2027 春夏" value={season} onChange={e => setSeason(e.target.value)} /></Field></div>
      <Field label="来源机构 / 厂商 *"><input className={input} required value={provider} onChange={e => setProvider(e.target.value)} placeholder="趋势平台、面料厂商或内部团队" /></Field>
      {!asset && !initial && <label className="block cursor-pointer border border-dashed border-pri/40 rounded-xl bg-pri-soft/30 p-5 text-center text-pri"><Upload className="mx-auto mb-2" size={20} />{file?.name ?? '上传报告、PPT、图片等资料'}<input aria-label="公共资料文件" type="file" className="sr-only" onChange={e => { const f = e.target.files?.[0]; setFile(f); if (f && !name) setName(f.name.replace(/\.[^.]+$/, '')) }} /></label>}
      <Field label="资料说明"><textarea className={textarea} rows={3} value={summary} onChange={e => setSummary(e.target.value)} placeholder="这份资料讲什么？可用于哪些开发场景？" /></Field>
      <details className="border border-line rounded-xl p-3"><summary className="cursor-pointer">关联客户 / 品牌 <span className="text-mut">（可选）</span></summary><p className="text-[12px] text-ink-3 my-3">用于查找和推荐，不代表客户可见权限。</p><p className="mb-2">客户</p>{options('customer', customerIds, setCustomers)}<p className="my-2">品牌</p>{options('brand', brandIds, setBrands)}</details>
      {error && <p role="alert" className="text-err">{error}</p>}<div className="flex justify-end gap-2"><Button disabled={busy} onClick={onClose}>取消</Button><Button primary disabled={busy || !name.trim() || !provider.trim() || !(file || asset || initial)} type="submit">{busy ? '保存中…' : '保存公共资料'}</Button></div>
    </form>
  </Modal>
}

export function ResourcePicker({ project, onClose, onImport }: { project: Project; onClose: () => void; onImport: (assets: Asset[]) => boolean }) {
  const resources = useResources(), used = projectResourceIds(project)
  const [query, setQuery] = useState(''), [selected, setSelected] = useState<string[]>([])
  const rows = resources.filter(r => (r.asset.name + r.provider + r.summary).includes(query))
  return <Modal wide title="从公共资料引用" description="只把选中的资料版本带入本项目，不搬走原件，也不自动读取全部资料。" onClose={onClose}><SearchBox value={query} onChange={setQuery} placeholder="搜索资料名称、来源或内容说明" /><div className="grid sm:grid-cols-2 gap-4 my-5 max-h-[50vh] overflow-auto">{rows.map(r => <ResourceTile key={r.id} resource={r} selected={selected.includes(r.id) || used.includes(r.id)} onClick={() => { if (!used.includes(r.id)) setSelected(selected.includes(r.id) ? selected.filter(id => id !== r.id) : [...selected, r.id]) }} footer={<span className="text-[11px] text-ink-3">{used.includes(r.id) ? '已在本项目' : r.customerIds.some(id => project.customerIds?.includes(id)) || r.brandIds.some(id => project.brandIds?.includes(id)) ? '与本项目客户 / 品牌相关' : '可跨项目复用'}</span>} />)}</div>{!rows.length && <Empty title="暂无匹配资料" text="可以调整搜索，或到公共资料中收录文件。" />}<div className="flex justify-between items-center"><span className="text-[12px] text-ink-3">已选 {selected.length} 份</span><Button primary disabled={!selected.length} onClick={() => { if (onImport(resources.filter(r => selected.includes(r.id)).map(resourceAsset))) onClose() }}>引用到项目</Button></div></Modal>
}

export default function ResourceLibrary() {
  const resources = useResources(), { records } = useDirectory(), [params, setParams] = useSearchParams()
  const [query, setQuery] = useState(''), [kind, setKind] = useState('全部'), [form, setForm] = useState(false), [edit, setEdit] = useState(false), [detail, setDetail] = useState<Resource>(), [notice, setNotice] = useState(''), [target, setTarget] = useState('')
  const projects = loadProjects().projects
  const profile = records.find(r => r.id === params.get('profile'))
  const rows = resources.filter(r => (kind === '全部' || r.asset.kind === kind) && (r.asset.name + r.provider + r.summary + r.season).includes(query) && (!profile || [...r.customerIds, ...r.brandIds].includes(profile.id)))
  const related = detail ? projects.filter(p => projectResourceIds(p).includes(detail.id)) : []
  function useInProject() {
    if (!detail || !target) return
    try { const current = loadProjects(); if (current.error) throw new Error(current.error); saveProjects(current.projects.map(p => p.id === target && !projectResourceIds(p).includes(detail.id) ? { ...p, assets: [resourceAsset(detail), ...p.assets], updated: now() } : p)); setNotice('已引用到项目，原资料留在公共库。'); setDetail(undefined) } catch (e) { setNotice((e as Error).message) }
  }
  return <div className="max-w-[1360px] mx-auto p-6 lg:p-9 text-ink text-[13px]" data-testid="resource-library">
    <div className="flex items-start justify-between gap-4"><div><p className="text-[11px] text-pri tracking-widest mb-2">ODM · SHARED RESOURCES</p><h1 className="text-[26px] font-semibold">公共资料</h1><p className="text-ink-3 mt-2">把收集的资料留下来，让下一次开发不必从零开始。</p></div><Button primary onClick={() => setForm(true)}><Plus size={15} />收录资料</Button></div>
    <div className="grid sm:grid-cols-3 gap-4 my-7">{[['收集', '厂商报告、趋势企划与设计参考'], ['关联', '按客户、品牌和季节整理'], ['复用', '引用到项目，成果再沉淀回来']].map(([t, d], i) => <div key={t} className="rounded-2xl bg-fill-2 p-4 flex gap-3"><span className="text-pri text-[18px] font-semibold">0{i + 1}</span><div><p className="font-medium">{t}</p><p className="text-[12px] text-ink-3 mt-1">{d}</p></div></div>)}</div>
    <div className="flex flex-wrap gap-3 justify-between mb-5"><div className="inline-flex bg-fill rounded-full p-1 flex-wrap">{['全部', ...KINDS].map(k => <button key={k} onClick={() => setKind(k)} className={`px-4 py-2 rounded-full text-[12px] ${kind === k ? 'bg-panel font-semibold' : 'text-ink-3'}`}>{k}</button>)}</div><SearchBox value={query} onChange={setQuery} placeholder="搜索资料、来源、季节" /></div>
    {profile && <div className="flex items-center gap-3 mb-4"><Badge tone="blue">关联：{profile.name}</Badge><Button onClick={() => setParams({ view: 'assets' })}>查看全部资料</Button></div>}
    {notice && <p role="status" className="rounded-xl bg-pri-soft text-pri p-3 mb-4">{notice}</p>}
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5">{rows.map(r => <ResourceTile key={r.id} resource={r} onClick={() => { setDetail(r); setTarget('') }} footer={<div className="flex justify-between text-[11px] text-ink-3"><span>{projects.filter(p => projectResourceIds(p).includes(r.id)).length} 个项目引用 · {r.originProject ? '项目沉淀' : '收集资料'}</span><ArrowUpRight size={14} /></div>} />)}</div>
    {!rows.length && <Empty title="没有匹配的资料" text="调整筛选条件，或收录新的资料。" />}
    <p className="text-[11px] text-mut mt-7">演示资料仅用于讲解产品。公共表示团队内部复用，不代表对外公开。</p>
    {detail && !edit && <Modal wide title={detail.asset.name} description={detail.provider + ' · ' + (detail.season || '季节不限')} onClose={() => setDetail(undefined)}><div className="grid md:grid-cols-[1fr_260px] gap-6"><div className="rounded-2xl bg-fill-2 p-6"><BookOpen size={32} className="text-pri mb-5" /><h3 className="font-semibold text-[16px]">资料摘要</h3><p className="text-ink-2 leading-7 whitespace-pre-wrap mt-3">{detail.summary || '尚未填写说明，可下载原件查看。'}</p><p className="text-[12px] text-ink-3 mt-6 flex gap-2 items-center"><FileText size={14} />{adopted(detail.asset).name}</p><div className="flex flex-wrap gap-2 mt-5">{records.filter(p => [...detail.customerIds, ...detail.brandIds].includes(p.id)).map(p => <Badge key={p.id}>{p.name}</Badge>)}</div></div><div className="space-y-4"><h3 className="font-medium">用于下一次开发</h3><Field label="选择引用项目"><select className={input} value={target} onChange={e => setTarget(e.target.value)}><option value="">请选择项目</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}{projectResourceIds(p).includes(detail.id) ? ' · 已引用' : ''}</option>)}</select></Field><Button primary className="w-full" disabled={!target} onClick={useInProject}><FolderInput size={15} />引用到项目</Button><Button className="w-full" onClick={async () => { try { downloadBlob(await readBlob(adopted(detail.asset)), adopted(detail.asset).name) } catch (e) { setNotice((e as Error).message) } }}>下载原件</Button><Button className="w-full" onClick={() => setEdit(true)}>编辑来源与关联</Button><p className="text-[11px] text-ink-3">已引用到 {related.length} 个项目</p>{related.map(p => <Link key={p.id} to={`/?view=projects&project=${p.id}&tab=资产`} className="block text-pri text-[12px]">{p.name} ↗</Link>)}</div></div></Modal>}
    {(form || edit && detail) && <ResourceForm initial={edit ? detail : undefined} onClose={() => { setForm(false); setEdit(false) }} onSaved={() => { setForm(false); setEdit(false); if (detail) setDetail(loadResources().find(r => r.id === detail.id)); setNotice('资料已保存，可供项目按需引用。') }} />}
  </div>
}
