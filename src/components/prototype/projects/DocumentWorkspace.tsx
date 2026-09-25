import { useEffect, useState } from 'react'
import { ArrowDown, ArrowLeft, ArrowUp, Plus } from 'lucide-react'
import { adopted, makeAsset, now, storeFile, uid, type Asset, type DocumentKind, type Project, type Task, type WorkDocument } from './model'
import { planningPPT, reportHTML, sandboxHTML } from './documentExport'
import { Badge, Button, card, Field, input, Modal, textarea } from './ui'

const sectionNames: Record<DocumentKind, string[]> = {
  'Brief 拆解': ['需求摘要', '设计约束', '待确认问题', '后续开发建议'],
  '趋势报告': ['研究范围', '资料依据', '趋势判断', '设计转化方向'],
  '企划 PPT': ['系列主题', '客群与场景', '色彩与面料', '款式结构', '开发建议'],
}

export function DocumentWorkspace({ kind, project, task, invocationId, onSave, onRequirements, onArchive, onClose }: { kind: DocumentKind; invocationId?: string; project: Project; task: Task; onSave: (doc: WorkDocument) => boolean; onRequirements: (doc: WorkDocument) => boolean; onArchive: (assets: Asset[]) => boolean; onClose: () => void }) {
  const [initial] = useState<WorkDocument>(() => structuredClone(task.documents?.find(d => d.kind === kind) ?? { id: uid(), kind, invocationId, title: `${project.name} · ${kind}`, sections: sectionNames[kind].map(title => ({ id: uid(), title, body: '' })), refs: task.invocations?.find(i => i.id === invocationId)?.refs ?? task.refs, updated: now() }))
  const [draft, setDraft] = useState(initial), [saved, setSaved] = useState(initial), [busy, setBusy] = useState(false), [message, setMessage] = useState(''), [error, setError] = useState(''), [preview, setPreview] = useState<string>(), [discard, setDiscard] = useState(false)
  const invocation = task.invocations?.find(i => i.id === draft.invocationId)
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved)
  useEffect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  const valid = !!draft.title.trim() && draft.sections.length > 0 && draft.sections.every(s => !!s.title.trim()) && draft.sections.some(s => !!s.body.trim())
  const patch = (value: Partial<WorkDocument>) => { setDraft(d => ({ ...d, ...value, confirmedAt: undefined })); setMessage('修改后需重新确认，项目已确认需求和历史任务不会自动变化。') }
  function save(confirm: boolean) {
    if (!valid) { setError('请填写标题，并至少补充一个段落的内容。'); return }
    const next = { ...draft, updated: now(), ...(confirm ? { confirmedAt: now() } : {}) }
    if (onSave(next)) { setDraft(next); setSaved(next); setError(''); setMessage(confirm ? '本稿已人工确认；不代表 PLM 放行。' : '工作稿已保存') } else setError('工作稿未保存，请检查浏览器存储空间后重试。')
  }
  async function exportFile(format: 'html' | 'pptx') {
    if (!valid) return
    setBusy(true); setError(''); setMessage('')
    try {
      const next = { ...draft, updated: now() }
      if (!onSave(next)) throw new Error('工作稿未保存，请检查浏览器存储空间')
      setDraft(next); setSaved(next)
      const blob = format === 'html' ? new Blob([await reportHTML(next, project.assets)], { type: 'text/html' }) : await planningPPT(next, project.assets)
      const file = new File([blob], `${next.title}.${format}`, { type: format === 'html' ? 'text/html' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
      const asset = makeAsset(`${next.title} · ${format.toUpperCase()}`, '项目文档', await storeFile(file), '任务产出')
      asset.taskId = task.id; asset.provenance = { key: `document-${next.id}-${format}`, scope: '内部', provider: '人工编辑工作稿 · 模板排版导出', collectedAt: now() }
      if (!onArchive([asset])) throw new Error('导出文件未成功归档，请检查存储空间后重试')
      setMessage('文件已归入原任务的项目资产，可下载到本地编辑。重复导出会新增修订，需手动采用。')
    } catch (e) { setError((e as Error).message) } finally { setBusy(false) }
  }
  async function view() { setBusy(true); setError(''); try { setPreview(await reportHTML(draft, project.assets)) } catch (e) { setError((e as Error).message) } finally { setBusy(false) } }
  function move(index: number, delta: number) { const sections = [...draft.sections]; [sections[index], sections[index + delta]] = [sections[index + delta], sections[index]]; patch({ sections }) }
  return <div className="space-y-5" data-testid="document-workspace"><button disabled={busy} onClick={() => { if (dirty) setDiscard(true); else onClose() }} className="inline-flex items-center gap-2 text-[12px] text-ink-3 hover:text-pri"><ArrowLeft size={14} />返回任务对话</button><div className="flex gap-3 items-center"><h2 className="text-[20px] font-semibold">{kind}工作稿</h2><Badge tone={draft.confirmedAt ? 'green' : 'muted'}>{draft.confirmedAt ? '已人工确认' : '待确认'}</Badge></div><p className="text-[12px] text-ink-3 leading-6">这里承接技能产出并供人工调整。当前未接 AI，正文由你编辑；导出会按模板排版，不会自动编造分析结论。</p>
    {project.requirements && kind === 'Brief 拆解' && <p className="text-[12px] bg-pri-soft rounded-xl p-3 text-ink-2">当前项目需求：{project.requirements.title} · {new Date(project.requirements.confirmedAt!).toLocaleString('zh-CN')} 确认。修改本稿不会自动覆盖。</p>}
    {invocation && <div className={`${card} p-4 text-[12px] leading-6`}><p className="font-medium">来自能力调用：{invocation.capability.name}</p><p className="whitespace-pre-wrap break-words text-ink-2 mt-2">{invocation.instruction}</p><p className="text-ink-3 mt-2">初始引用来自该次调用；同一任务的同类工作稿共用一份，可继续补充资料。</p></div>}
    <fieldset disabled={busy} className="space-y-5"><Field label="稿件标题 *"><input className={input} maxLength={100} value={draft.title} onChange={e => patch({ title: e.target.value })} /></Field><details className={`${card} p-4`}><summary className="cursor-pointer font-medium">引用资料 · {draft.refs.length} 份</summary><p className="text-[11px] text-ink-3 leading-6 mt-3">勾选时固定已采用版本。这里只记录引用，不代表 AI 已阅读附件；导出会附上来源，PNG / JPG 可作为插图。</p><div className="max-h-48 overflow-auto space-y-3 mt-3">{project.assets.map(a => <label key={a.id} className="flex gap-2 items-start text-[12px]"><input type="checkbox" className="accent-pri mt-1" checked={draft.refs.some(r => r.assetId === a.id)} onChange={e => patch({ refs: e.target.checked ? [...draft.refs, { assetId: a.id, revisionId: a.adopted, name: `${a.name} · ${adopted(a).name}` }] : draft.refs.filter(r => r.assetId !== a.id) })} /><span className="break-words">{a.name} <span className="text-ink-3">{draft.refs.find(r => r.assetId === a.id)?.name ?? adopted(a).name}</span></span></label>)}</div></details>
    {draft.sections.map((s, i) => <section key={s.id} className={`${card} p-5 space-y-4`}><div className="flex items-center gap-2"><span className="text-[11px] text-mut mr-auto">{kind === '企划 PPT' ? '页面' : '段落'} {i + 1}</span><Button aria-label={`上移段落 ${i + 1}`} title="上移" disabled={i === 0} className="px-2" onClick={() => move(i, -1)}><ArrowUp size={14} /></Button><Button aria-label={`下移段落 ${i + 1}`} title="下移" disabled={i === draft.sections.length - 1} className="px-2" onClick={() => move(i, 1)}><ArrowDown size={14} /></Button><Button disabled={draft.sections.length === 1} onClick={() => patch({ sections: draft.sections.filter(x => x.id !== s.id) })}>移除此段</Button></div><Field label={`段落 ${i + 1} 标题`}><input className={input} value={s.title} maxLength={100} onChange={e => patch({ sections: draft.sections.map(x => x.id === s.id ? { ...x, title: e.target.value } : x) })} /></Field><Field label={`段落 ${i + 1} 内容`}><textarea className={textarea} rows={4} value={s.body} maxLength={10000} onChange={e => patch({ sections: draft.sections.map(x => x.id === s.id ? { ...x, body: e.target.value } : x) })} placeholder="补充你的判断、已知事实与待核实事项；建议注明依据…" /></Field></section>)}
    <Button disabled={draft.sections.length >= 30} onClick={() => patch({ sections: [...draft.sections, { id: uid(), title: '新增段落', body: '' }] })}><Plus size={14} />添加段落 / 页面</Button></fieldset>
    {error && <p role="alert" className="text-err bg-err-soft p-3 rounded-xl text-[12px]">{error}</p>}{message && <p role="status" className="text-ink-2 bg-fill p-3 rounded-xl text-[12px]">{message}</p>}
    <div className="sticky bottom-0 bg-panel rounded-2xl border border-line p-4 flex flex-wrap gap-2"><Button disabled={busy || !valid} onClick={() => save(false)}>保存工作稿</Button><Button disabled={busy || !valid} onClick={() => save(true)}>确认本稿</Button>{kind === 'Brief 拆解' && <Button disabled={busy || !draft.confirmedAt || dirty} onClick={() => { if (onRequirements(draft)) setMessage('已设为项目需求，仅新建任务带入，历史任务不变。') }}>设为项目需求</Button>}<Button disabled={busy || !valid} onClick={() => void view()}>预览排版</Button><Button primary disabled={busy || !valid} onClick={() => void exportFile(kind === '企划 PPT' ? 'pptx' : 'html')}>{busy ? '处理中…' : kind === '企划 PPT' ? '导出 PPT 并归档' : '导出报告并归档'}</Button></div>
    {preview && <Modal wide title="稿件排版预览" description="这是内容预览；企划 PPT 导出使用可编辑文字与独立图片，不是整页截图。" onClose={() => setPreview(undefined)}><iframe title="报告内容预览" sandbox="" srcDoc={sandboxHTML(preview)} className="w-full h-[65vh] border border-line rounded-xl bg-panel" /></Modal>}
    {discard && <Modal title="离开工作稿？" description="尚未保存的修改将丢失，之前保存的稿件和导出文件不受影响。" onClose={() => setDiscard(false)}><div className="flex justify-end gap-3"><Button onClick={() => setDiscard(false)}>继续编辑</Button><Button onClick={onClose}>放弃未保存修改并返回</Button></div></Modal>}
  </div>
}
