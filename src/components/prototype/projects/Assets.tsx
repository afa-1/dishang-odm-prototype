import { sandboxHTML } from './documentExport'
import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Check, Download, FileText, Grid2X2, History, List, Plus, Upload } from 'lucide-react'
import { adopted, dateLabel, downloadBlob, KINDS, makeAsset, readBlob, safeURL, storeFile, type Asset, type AssetKind, type Project, type Revision } from './model'
import { Badge, Button, card, Empty, Field, input, Modal, SearchBox, textarea } from './ui'

import { InternalSelection } from './InternalSelection'
import type { CaseUpdate } from './CaseWorkbench'
import { MaterialLinks } from './MaterialLinks'
import { ResourceForm, ResourcePicker } from './ResourceLibrary'

export function AssetThumb({ asset, large = false }: { asset: Asset; large?: boolean }) {
  const r = adopted(asset)
  const [url, setUrl] = useState(r.url)
  useEffect(() => {
    if (!r.mime.startsWith('image/') || r.url) return
    let alive = true, objectURL: string | undefined
    readBlob(r).then(b => { objectURL = URL.createObjectURL(b); if (alive) setUrl(objectURL) }).catch(() => {})
    return () => { alive = false; if (objectURL) URL.revokeObjectURL(objectURL) }
  }, [r])
  return <div className={`${large ? 'h-40 w-full' : 'h-12 w-12 shrink-0 rounded-xl'} bg-fill-2 flex items-center justify-center overflow-hidden`}>{r.mime.startsWith('image/') && (r.url || url) ? <img src={r.url || url} alt={asset.name} className="w-full h-full object-contain" /> : <FileText size={large ? 32 : 21} className="text-mut" />}</div>
}

export function AssetsView({ onUpdate, project, onOpen, onUpload, onReference, onChange, onImport }: { onUpdate: CaseUpdate; onImport: (assets: Asset[]) => boolean; project: Project; onOpen: (id: string) => void; onUpload: () => void; onReference: (a: Asset) => void; onChange: (id: string, patch: Partial<Asset>, message: string) => boolean }) {
  const [query, setQuery] = useState(''), [kind, setKind] = useState('全部'), [source, setSource] = useState('全部来源'), [grid, setGrid] = useState(true)
  const [section, setSection] = useState(() => project.caseId && project.tasks.some(t => t.caseStage === 'selection' && t.caseRun?.state === 'ready') ? '内部选款' : '全部')
  const [importOpen, setImportOpen] = useState(false)
  const rows = project.assets.filter(a => (section === '全部' || section === '输入资料' && a.source === '资料收集' || section === '产出成果' && a.source !== '资料收集') && a.name.toLowerCase().includes(query.toLowerCase()) && (kind === '全部' || a.kind === kind) && (source === '全部来源' || a.source === source))
  if (section === '内部选款') return <InternalSelection project={project} onBack={() => setSection('全部')} onOpen={onOpen} onChange={onChange} onUpdate={onUpdate} />
  return <div className="space-y-5">{importOpen && <ResourcePicker project={project} onClose={() => setImportOpen(false)} onImport={onImport} />}<div className="flex justify-between items-start gap-3 flex-wrap"><div><h2 className="text-[18px] font-semibold">项目资产 <span className="text-mut font-normal ml-1 text-[13px]">{project.assets.length}</span></h2><p className="text-[12px] text-ink-3 mt-1">参考资料、任务产出和人工修订，在这里共同沉淀。</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => setImportOpen(true)}>从公共资料引用</Button><Button primary onClick={onUpload}><Upload size={15} />上传资产</Button></div></div>
    <div className="grid sm:grid-cols-3 gap-3">{[{ name: '输入资料', text: '上传或引用的研究依据', count: project.assets.filter(a => a.source === '资料收集').length }, { name: '产出成果', text: '任务结果与人工修订', count: project.assets.filter(a => a.source !== '资料收集').length }, { name: '内部选款', text: '看大图、比较、记意见', count: project.assets.filter(a => a.kind === '款式设计').length }].map(c => <button key={c.name} onClick={() => setSection(section === c.name ? '全部' : c.name)} aria-pressed={section === c.name} className={card + ' p-4 text-left hover:border-pri/40 aria-pressed:border-pri aria-pressed:bg-pri-soft/30'}><p className="font-medium">{c.name}<span className="float-right text-pri">{c.count}</span></p><p className="text-[11px] text-ink-3 mt-2">{c.text}</p></button>)}</div>
    {section !== '全部' && <button className="text-[12px] text-pri" onClick={() => setSection('全部')}>← 查看全部资产</button>}
    <div className="flex flex-wrap justify-between gap-3"><SearchBox value={query} onChange={setQuery} placeholder="搜索资产名称" /><div className="flex gap-2"><select aria-label="资产来源" className={`${input} !w-auto`} value={source} onChange={e => setSource(e.target.value)}>{['全部来源', '资料收集', '任务产出', '人工上传'].map(x => <option key={x}>{x}</option>)}</select><Button aria-label={grid ? '切换列表视图' : '切换卡片视图'} title={grid ? '列表视图' : '卡片视图'} onClick={() => setGrid(!grid)} className="px-3">{grid ? <List size={16} /> : <Grid2X2 size={16} />}</Button></div></div>
    <div className="flex flex-wrap gap-2">{['全部', ...KINDS].map(k => <button key={k} onClick={() => setKind(k)} aria-pressed={kind === k} className={`px-3.5 py-2 rounded-full text-[12px] ${kind === k ? 'bg-pri-soft text-pri font-medium' : 'text-ink-3 hover:bg-fill'}`}>{k}</button>)}</div>
    {!rows.length ? <Empty title="暂无匹配的资产" text="上传本地文件，或在任务对话中归档产出。" /> : <div className={grid ? 'grid grid-cols-1 sm:grid-cols-2 min-[1450px]:grid-cols-3 gap-4' : 'space-y-3'}>{rows.map(a => <div key={a.id} className={`${card} overflow-hidden`}>
      <button onClick={() => onOpen(a.id)} className={`text-left w-full ${grid ? '' : 'flex items-center gap-4 p-4'}`}><AssetThumb key={adopted(a).id} asset={a} large={grid} /><div className={grid ? 'px-4 pt-4' : 'min-w-0 flex-1'}><div className="flex justify-between gap-2"><h3 className="font-medium truncate" title={a.name}>{a.name}</h3>{a.delivery && <Check size={15} className="text-pri shrink-0" />}</div><p className="text-[11px] text-ink-3 mt-2">{a.kind} · {a.source} · V{a.revisions.findIndex(r => r.id === a.adopted) + 1}</p></div></button>
      <div className={`flex items-center justify-between gap-2 px-4 pb-4 ${grid ? 'pt-3' : ''}`}><button className="text-[12px] text-ink-3 hover:text-pri" onClick={() => onReference(a)}>引用到任务 <ArrowUpRight size={12} className="inline" /></button><button className={`text-[12px] ${a.delivery ? 'text-pri' : 'text-ink-2 hover:text-pri'}`} onClick={() => onChange(a.id, { delivery: !a.delivery }, `${a.delivery ? '从交付移除' : '选入交付'}：${a.name}`)}>{a.delivery ? '已选入交付' : '选入交付'}</button></div>
    </div>)}</div>}
  </div>
}

export function UploadForm({ onSave, onClose }: { onSave: (assets: Asset[]) => void; onClose: () => void }) {
  const [kind, setKind] = useState<AssetKind>('参考资料'), [files, setFiles] = useState<File[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState('')
  async function submit() {
    setBusy(true); setError('')
    try { const assets = await Promise.all(files.map(async f => makeAsset(f.name.replace(/\.[^.]+$/, ''), kind, await storeFile(f)))); onSave(assets) } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  return <Modal title="上传项目资产" description="支持图片、PPT、PDF 和其他设计文件；单个文件不超过 30 MB。文件仅保存在当前浏览器，请保留本地原件。" onClose={() => { if (!busy) onClose() }}><div className="space-y-5"><Field label="资产分类"><select className={input} value={kind} onChange={e => setKind(e.target.value as AssetKind)}>{KINDS.map(k => <option key={k}>{k}</option>)}</select></Field><label onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!busy) setFiles(Array.from(e.dataTransfer.files)) }} className="block border border-dashed border-pri/40 rounded-xl bg-pri-soft/30 p-8 text-center cursor-pointer hover:border-pri"><Upload size={24} className="mx-auto text-pri mb-3" /><span className="block">选择文件，或拖拽文件到这里</span><span className="block mt-2 text-[11px] text-ink-3">可一次上传多个文件</span><input aria-label="选择上传文件" className="sr-only" type="file" multiple disabled={busy} onChange={e => setFiles(Array.from(e.target.files ?? []))} /></label>{files.length > 0 && <ul className="space-y-2 max-h-32 overflow-auto text-ink-2">{files.map((f, i) => <li key={i} className="truncate" title={f.name}>{f.name} <span className="text-mut text-[11px]">{(f.size / 1024 / 1024).toFixed(2)} MB</span></li>)}</ul>}{error && <p role="alert" className="text-err">{error}</p>}<div className="flex justify-end gap-2"><Button disabled={busy} onClick={onClose}>取消</Button><Button primary disabled={!files.length || busy} onClick={submit}>{busy ? '正在保存…' : `上传${files.length ? ` ${files.length} 个文件` : ''}`}</Button></div></div></Modal>
}

export function AssetDetail({ project, asset, onClose, onChange, onReference, toast }: { project?: Project; asset: Asset; onClose: () => void; onChange: (id: string, patch: Partial<Asset>, message: string) => boolean; onReference: (a: Asset) => void; toast: (s: string) => void }) {
  const [revisionId, setRevisionId] = useState(asset.adopted), [url, setUrl] = useState(''), [text, setText] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const [material, setMaterial] = useState(asset.material), [cloud, setCloud] = useState(asset.cloud)
  const [publish, setPublish] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const revision = asset.revisions.find(r => r.id === revisionId) ?? adopted(asset)
  useEffect(() => {
    let active = true, objectURL = ''
    setUrl(''); setText(''); setError('')
    readBlob(revision).then(async b => {
      if (revision.mime.startsWith('text/') || /\.(md|txt|csv)$/i.test(revision.name)) { const t = await b.text(); if (active) setText(revision.mime === 'text/html' ? t : t.slice(0, 100000)) }
      else { objectURL = URL.createObjectURL(b); if (active) setUrl(objectURL) }
    }).catch(e => { if (active) setError(e.message) })
    return () => { active = false; if (objectURL) URL.revokeObjectURL(objectURL) }
  }, [revision])
  async function download(r: Revision) { try { downloadBlob(await readBlob(r), r.name) } catch (e) { toast((e as Error).message) } }
  async function upload(f: File) {
    setBusy(true)
    try { const r = await storeFile(f); if (!onChange(asset.id, { revisions: [...asset.revisions, r] }, `上传新版本：${asset.name}`)) return; setRevisionId(r.id); toast('新版本已上传，请检查后点击“采用此版本”') } catch (e) { toast((e as Error).message) } finally { setBusy(false) }
  }
  return <Modal wide title={asset.name} description={`${asset.kind} · ${asset.source} · 新版本不会自动覆盖已采用版本，也不会改变历史交接记录。`} onClose={onClose}>
    {publish && <ResourceForm asset={asset} project={project} onClose={() => setPublish(false)} onSaved={() => { setPublish(false); toast('已沉淀到公共资料，其他项目可以按需引用。') }} />}<div className="grid md:grid-cols-[1fr_240px] gap-5"><div className="min-w-0"><div className="bg-cvs border border-line rounded-2xl min-h-72 max-h-[50vh] overflow-auto flex items-center justify-center p-4">
      {error ? <p role="alert" className="text-err text-center">{error}</p> : text && revision.mime === 'text/html' ? <iframe title="HTML 报告预览" sandbox="" srcDoc={sandboxHTML(text)} className="w-full h-[60vh] border border-line rounded-xl bg-panel" /> : text ? <pre className="whitespace-pre-wrap break-words w-full text-[13px] font-sans leading-7 self-start">{text}</pre> : url && revision.mime.startsWith('image/') ? <img src={url} alt={asset.name} className="max-w-full max-h-[45vh] object-contain" /> : url && revision.mime === 'application/pdf' ? <iframe title="PDF 预览" src={url} className="w-full h-[45vh]" /> : url ? <div className="text-center text-ink-3"><FileText size={32} className="mx-auto mb-3" /><p>此格式请下载后在本地编辑</p><p className="mt-2 text-[11px]">支持原文件下载，修改后可上传新版本。</p></div> : <p className="text-ink-3">正在读取文件…</p>}
    </div><div className="flex flex-wrap gap-2 mt-4"><Button onClick={() => download(revision)}><Download size={14} />下载此版本</Button><Button disabled={busy} onClick={() => fileRef.current?.click()}><Upload size={14} />{busy ? '正在上传…' : '上传新版本'}</Button><input ref={fileRef} aria-label="上传新版本文件" type="file" className="sr-only" onChange={e => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = '' }} /></div>
    </div><div className="min-w-0"><h3 className="flex items-center gap-2 font-medium mb-3"><History size={15} />版本记录</h3><div className="space-y-2 max-h-52 overflow-auto">{asset.revisions.map((r, i) => <button key={r.id} onClick={() => setRevisionId(r.id)} className={`text-left w-full rounded-xl border p-3 ${revision.id === r.id ? 'border-pri-line bg-pri-soft text-pri' : 'border-line bg-panel'}`}><div className="flex justify-between items-center">V{i + 1}{asset.adopted === r.id && <Badge tone="blue">已采用</Badge>}</div><p className="truncate text-[11px] mt-2" title={r.name}>{r.name}</p><p className="text-[10px] text-ink-3 mt-1">{dateLabel(r.date)}</p></button>)}</div>
      {revision.id !== asset.adopted && <Button className="mt-3 w-full" primary onClick={() => { if (!onChange(asset.id, { adopted: revision.id }, `采用新版本：${asset.name}`)) return; toast('已采用此版本，历史交接快照保持不变') }}>采用此版本</Button>}
      <div className="border-t border-line mt-4 pt-4 space-y-2"><Button className="w-full" onClick={() => setPublish(true)}>沉淀到公共资料</Button><Button className="w-full" onClick={() => onReference(asset)}>引用已采用版本到任务</Button><Button className="w-full" onClick={() => onChange(asset.id, { delivery: !asset.delivery }, `${asset.delivery ? '从交付移除' : '选入交付'}：${asset.name}`)}>{asset.delivery ? <Check size={14} /> : <Plus size={14} />}{asset.delivery ? '从交付移除' : '选入交付'}</Button></div>
    </div></div>
    {asset.provenance && <p className="mt-4 text-[12px] text-ink-3 leading-6">来源：{asset.provenance.scope} · {asset.provenance.provider}{asset.provenance.demo ? ' · 示例数据' : ''}{asset.provenance.url && safeURL(asset.provenance.url) && <a className="text-pri ml-3" href={safeURL(asset.provenance.url)!} target="_blank" rel="noopener noreferrer">查看原始来源 ↗</a>}</p>}
    {project && asset.kind === '款式设计' && <MaterialLinks project={project} asset={asset} onSave={materials => onChange(asset.id, { materials }, `更新款料关联：${asset.name}`)} />}
    {(asset.kind === '款式设计' || asset.kind === '面辅料') && <div className="mt-5 border-t border-line pt-5 space-y-4"><Field label="面辅料选择 / 样衣开发说明"><textarea className={textarea} rows={3} value={material} onChange={e => setMaterial(e.target.value)} placeholder="填写面料编号、成分、克重、辅料与样衣开发注意事项…" /></Field><Field label="凌迪 Cloud 3D 样衣链接（可选）"><input className={input} value={cloud} onChange={e => setCloud(e.target.value)} placeholder="粘贴已获授权的 3D 样衣分享链接" /></Field><div className="flex justify-between gap-2">{asset.cloud && safeURL(asset.cloud) && <a className="text-pri flex items-center gap-1" href={safeURL(asset.cloud)!} target="_blank" rel="noopener noreferrer">打开 3D 样衣 <ArrowUpRight size={14} /></a>}<Button className="ml-auto" onClick={() => { const value = safeURL(cloud); if (value === null) { toast('请输入有效的 http 或 https 链接'); return }; if (!onChange(asset.id, { material, cloud: value }, `更新开发说明：${asset.name}`)) return; toast('开发说明已保存') }}>保存开发说明</Button></div></div>}
  </Modal>
}
