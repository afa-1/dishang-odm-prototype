import { useState } from 'react'
import { Link } from 'react-router'
import { Download } from 'lucide-react'
import { profileIds, profileURL, useDirectory, type ProfileReference } from './directory'
import { downloadBlob, readBlob, type Project } from './model'

export function ProfilePicker({ project, selected, files, onSelected, onFiles }: { project: Project; selected: string[]; files: string[]; onSelected: (ids: string[]) => void; onFiles: (ids: string[]) => void }) {
  const { records, error } = useDirectory()
  const ids = [...profileIds(project, 'customer'), ...profileIds(project, 'brand')]
  const rows = records.filter(p => ids.includes(p.id))
  const toggle = (values: string[], id: string, checked: boolean) => checked ? [...values, id] : values.filter(v => v !== id)
  return <details className="border border-line rounded-xl p-3"><summary className="cursor-pointer">引用客户 / 品牌资料 <span className="text-mut">已选 {selected.length} 份背景、{files.length} 份文件</span></summary><p className="text-[11px] text-ink-3 leading-6 my-3">仅引用勾选的内容，不自动读取全部历史资料；背景摘要不包含联系人信息。旧任务保留创建时的快照。</p>{error && <p className="text-err">{error}</p>}{!rows.length && <p className="text-[12px] text-mut">项目尚未关联客户或品牌，可先自主探索。</p>}<div className="space-y-3 max-h-60 overflow-auto">{rows.map(p => <div key={p.id} className="bg-fill-2 rounded-xl p-3"><label className="flex gap-2 items-start"><input type="checkbox" className="accent-pri mt-1" checked={selected.includes(p.id)} onChange={e => onSelected(toggle(selected, p.id, e.target.checked))} /><span>{p.kind === 'customer' ? '客户' : '品牌'}背景：{p.name}</span></label>{p.documents.map(d => <label key={d.id} className="flex items-start gap-2 text-[12px] text-ink-2 mt-3 pl-5"><input aria-label={`引用文件 ${d.name}`} type="checkbox" className="accent-pri mt-0.5" checked={files.includes(d.id)} onChange={e => onFiles(toggle(files, d.id, e.target.checked))} /><span className="break-all">{d.name}</span></label>)}</div>)}</div></details>
}

export function ProfileSnapshots({ profiles }: { profiles?: ProfileReference[] }) {
  const [error, setError] = useState('')
  if (!profiles?.length) return null
  return <div className="space-y-3 mt-3">{profiles.map(p => <div key={p.id} className="border border-line rounded-xl p-3"><div className="flex justify-between gap-3"><span className="font-medium">{p.name} · 创建时快照</span><Link className="text-pri text-[11px] shrink-0" to={profileURL(p.kind, p.id)}>当前档案 ↗</Link></div>{p.summary && <p className="whitespace-pre-wrap leading-6 text-ink-2 mt-2">{p.summary}</p>}{p.documents.map(d => <button key={d.id} className="flex gap-2 items-center text-pri text-[12px] mt-2" onClick={async () => { try { downloadBlob(await readBlob(d), d.name) } catch (e) { setError((e as Error).message) } }}><Download size={12} />{d.name}</button>)}</div>)}{error && <p role="alert" className="text-err">{error}</p>}</div>
}
