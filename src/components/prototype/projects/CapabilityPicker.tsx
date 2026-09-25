import { useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { capabilityLabel, type Capability, type CapabilityKind } from './capabilities'
import { useCapabilityCatalog } from './capabilityCatalog'
import { adopted, now, uid, type Project, type Task } from './model'
import { Badge, Button, Field, Modal, SearchBox, textarea } from './ui'

export function CapabilityPicker({ project, task, onSave, onClose }: { project: Project; task: Task; onSave: (invocation: NonNullable<Task['invocations']>[number]) => boolean; onClose: () => void }) {
  const catalog = useCapabilityCatalog()
  const [showAll, setShowAll] = useState(false)
  const [kind, setKind] = useState<CapabilityKind>('skill'), [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Capability | null>(null), [instruction, setInstruction] = useState('')
  const [refs, setRefs] = useState<string[]>(task.refs.map(r => r.assetId))
  const configured = [...project.skills, ...project.experts, ...(project.teams ?? [])]
  const rows = catalog.filter(c => (showAll || c.id.startsWith('odm-')) && c.kind === kind && `${c.name} ${c.description}`.includes(query.trim())).sort((a, b) => Number(configured.includes(b.name)) - Number(configured.includes(a.name)))
  return <Modal title="调用技能、专家或专家团" description="为当前对话添加一次调用。可使用项目默认能力，也可临时选择；不会修改项目配置。" onClose={onClose} wide>
    <div className="grid md:grid-cols-[280px_minmax(0,1fr)] gap-6">
      <div className="space-y-4"><div className="inline-flex bg-fill rounded-full p-1" role="group" aria-label="能力类型">{(['skill', 'expert', 'team'] as const).map(k => <button type="button" key={k} aria-pressed={kind === k} onClick={() => { setKind(k); setSelected(null) }} className={`rounded-full px-4 py-2 text-[12px] transition-colors ${kind === k ? 'bg-panel font-semibold' : 'text-ink-3 hover:text-ink'}`}>{capabilityLabel[k]}</button>)}</div><SearchBox value={query} onChange={setQuery} placeholder="搜索 ODM 能力" /><button className="text-pri text-[12px]" onClick={() => setShowAll(!showAll)}>{showAll ? '仅看 ODM 专用' : '查看全部平台能力'}</button><div className="space-y-2 max-h-[440px] overflow-auto">{!rows.length && <p className="text-ink-3 text-[12px] p-3">没有匹配的能力，请调整关键词。</p>}{rows.map(c => <button type="button" key={c.id} aria-pressed={selected?.id === c.id} onClick={() => setSelected(c)} className={`w-full text-left rounded-2xl border p-4 transition-colors ${selected?.id === c.id ? 'bg-pri-soft border-pri-line' : 'border-line bg-panel hover:border-pri/40'}`}><div className="flex gap-2 items-center"><span className="font-medium flex-1">{c.name}</span>{configured.includes(c.name) && <Check size={14} className="text-pri" />}</div><p className="text-[12px] text-ink-3 leading-6 mt-1">{c.description}</p>{configured.includes(c.name) && <span className="text-[11px] text-ink-3">项目已配置</span>}</button>)}</div></div>
      <div className="min-w-0">{!selected ? <div className="rounded-2xl bg-fill-2 p-6 h-full min-h-64"><Sparkles size={22} className="text-pri mb-4" /><h3 className="font-semibold text-[16px]">按任务选择协作方式</h3><div className="space-y-4 text-[12px] text-ink-3 leading-6 mt-4"><p>技能：做一件明确的事。</p><p>专家：从一个专业角度判断和建议。</p><p>专家团：多个专业角色协作，可按需调整。</p><p>这里配置输入、预期产出与人工确认点。真实 AI 和数据连接尚未接入。</p></div></div> : <div className="space-y-4"><div><Badge tone="blue">{capabilityLabel[selected.kind]}</Badge><h3 className="text-[18px] font-semibold mt-3">{selected.name}</h3></div><dl className="text-[12px] leading-6 space-y-3"><div><dt className="text-ink-3">需要什么</dt><dd>{selected.input}</dd></div><div><dt className="text-ink-3">预期产出</dt><dd>{selected.output}</dd></div><div><dt className="text-ink-3">人工确认</dt><dd>{selected.review}</dd></div></dl>
        {selected.members && <div><p className="text-[12px] text-ink-3 mb-2">协作成员</p><div className="flex flex-wrap gap-2">{selected.members.map(id => <Badge key={id}>{catalog.find(c => c.id === id)?.name ?? id}</Badge>)}</div></div>}
        {selected.skills && <div><p className="text-[12px] text-ink-3 mb-2">可调用技能</p><div className="flex flex-wrap gap-2">{selected.skills.map(id => <Badge key={id}>{catalog.find(c => c.id === id)?.name ?? id}</Badge>)}</div></div>}
        <div className="rounded-xl bg-fill-2 p-3 text-[12px] leading-6 text-ink-3">拟使用数据源：{selected.sources.join('、') || '本次提供的资料'}。仅为调用计划，未授权连接器，不会实际访问外部系统。</div>
        <Field label="本次调用要求 *"><textarea className={textarea} rows={3} maxLength={5000} value={instruction} onChange={e => setInstruction(e.target.value)} placeholder="说明这次要解决的问题、范围与期望成果…" /></Field>
        <details className="rounded-xl border border-line p-3"><summary className="cursor-pointer">引用项目资产 · 已选 {refs.filter(id => project.assets.some(a => a.id === id)).length}</summary><div className="space-y-2 mt-3 max-h-36 overflow-auto">{!project.assets.length && <p className="text-[12px] text-ink-3">暂无资产。可先关闭弹窗，通过「上传人工成果」补充文件。</p>}{project.assets.map(a => <label key={a.id} className="flex gap-2 items-center text-[12px]"><input type="checkbox" className="accent-pri" checked={refs.includes(a.id)} onChange={e => setRefs(e.target.checked ? [...refs, a.id] : refs.filter(id => id !== a.id))} /><span className="truncate" title={a.name}>{a.name}</span></label>)}</div></details>
        <div className="flex justify-end gap-2"><Button onClick={onClose}>取消</Button><Button primary disabled={!instruction.trim()} onClick={() => { if (onSave({ id: uid(), capability: structuredClone(selected), instruction: instruction.trim(), date: now(), refs: project.assets.filter(a => refs.includes(a.id)).map(a => ({ assetId: a.id, revisionId: a.adopted, name: `${a.name} · ${adopted(a).name}` })), status: '已配置' })) onClose() }}>加入当前任务</Button></div>
      </div>}</div>
    </div>
  </Modal>
}
