import { useState } from 'react'
import { ChevronDown, Plug, Sparkles, Users } from 'lucide-react'
import { useCapabilityCatalog } from './capabilityCatalog'
import { CONNECTORS, emptyProject, type Project } from './model'
import { hydrateProject, useDirectory } from './directory'
import { Button, Choices, Field, input, Modal, textarea } from './ui'
import { PROJECT_TEMPLATES, type ProjectTemplate } from './capabilities'

export function ProjectForm({ initial, template, presetCustomer, presetBrand, onSave, onClose }: { initial?: Project; template?: ProjectTemplate; presetCustomer?: string; presetBrand?: string; onSave: (p: Project) => void; onClose: () => void }) {
  const { records, error: directoryError } = useDirectory()
  const [draft, setDraft] = useState<Project>(() => initial ? structuredClone(initial) : hydrateProject({ ...emptyProject(), ...(template ? templateConfig(template) : {}), customerIds: presetCustomer ? [presetCustomer] : [], brandIds: presetBrand ? [presetBrand] : [] }))
  const [pendingTemplate, setPendingTemplate] = useState<ProjectTemplate | null>(null)
  const [extra, setExtra] = useState(false)
  const [error, setError] = useState('')
  const set = <K extends keyof Project>(key: K, value: Project[K]) => setDraft(d => ({ ...d, [key]: value }))
  const customers = records.filter(r => r.kind === 'customer')
  const brands = records.filter(r => r.kind === 'brand')
  const recommended = brands.filter(r => r.customerIds.some(id => draft.customerIds?.includes(id)))
  function toggle(field: 'customerIds' | 'brandIds', id: string) { setDraft(d => hydrateProject({ ...d, [field]: d[field]?.includes(id) ? d[field]!.filter(x => x !== id) : [...(d[field] ?? []), id] })) }
  const options = (items: typeof records, field: 'customerIds' | 'brandIds') => <div className="flex flex-wrap gap-2">{items.map(r => <button type="button" key={r.id} aria-pressed={draft[field]?.includes(r.id) ?? false} onClick={() => toggle(field, r.id)} className={`px-3 py-2 rounded-full border text-[12px] ${draft[field]?.includes(r.id) ? 'bg-pri-soft text-pri border-pri-line' : 'bg-panel border-line text-ink-3 hover:border-pri/40'}`}>{r.name}</button>)}</div>
  return <Modal title={initial ? '编辑项目信息' : '新建项目'} description="先确定开发目标，其余信息可在项目中逐步完善。客户、品牌均可不关联。" onClose={onClose}>
    <form onSubmit={e => { e.preventDefault(); if (pendingTemplate) return; if (!draft.name.trim()) { setError('请填写项目名称'); return }; if (directoryError) { setError(directoryError); return }; onSave(hydrateProject({ ...draft, name: draft.name.trim(), owner: draft.owner.trim() || '我' })) }} className="space-y-5">
      <Field label="项目名称 *"><input autoFocus maxLength={60} value={draft.name} onChange={e => set('name', e.target.value)} className={input} placeholder="例如：2026 夏季轻量风衣" /></Field>
      {!initial && <div className="space-y-3"><Field label="项目模板"><select className={input} value={draft.templateId ?? ''} onChange={e => { const t = PROJECT_TEMPLATES.find(t => t.id === e.target.value); if (!t) { set('templateId', undefined); setPendingTemplate(null); return }; if (draft.goal || draft.skills.length || draft.experts.length || draft.teams?.length || draft.connectors.length) setPendingTemplate(t); else setDraft(d => ({ ...d, ...templateConfig(t) })) }}><option value="">空白项目 · 自行配置</option>{PROJECT_TEMPLATES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>{pendingTemplate && <div role="alert" className="rounded-xl bg-warn-soft text-warn p-4 space-y-3"><p className="text-[12px] leading-6">应用「{pendingTemplate.name}」将替换项目指令、技能、专家、专家团及连接器配置。名称、客户、品牌和基本信息不会改变。</p><div className="flex gap-2"><Button onClick={() => { setDraft(d => ({ ...d, ...templateConfig(pendingTemplate) })); setPendingTemplate(null) }}>确认应用模板</Button><Button onClick={() => setPendingTemplate(null)}>保留当前配置</Button></div></div>}<p className="text-[11px] text-ink-3">模板只是开发起点，不会自动创建任务、读取资料或授权连接器。切换为空白仅解除模板标记，已填内容保留。</p></div>}
      <Field label="项目目标 / 指令"><textarea rows={3} maxLength={5000} value={draft.goal} onChange={e => set('goal', e.target.value)} className={textarea} placeholder="这次要开发什么？面向什么人群？有哪些风格、成本和交付要求？" /></Field>
      <div className="grid grid-cols-2 gap-4"><Field label="季节"><input className={input} value={draft.season} onChange={e => set('season', e.target.value)} placeholder="2026 春夏" maxLength={40} /></Field><Field label="品类"><input className={input} value={draft.category} onChange={e => set('category', e.target.value)} placeholder="风衣 / 轻外套" maxLength={60} /></Field></div>
      <div className="space-y-3"><p className="font-medium">关联客户 <span className="text-mut font-normal">（可选，可多选）</span></p>{options(customers, 'customerIds')}<p className="text-[11px] text-ink-3">从客户档案中选择；不关联即为自主开发。新增客户请在「客户」中维护。</p></div>
      <div className="space-y-3"><p className="font-medium">目标品牌 <span className="text-mut font-normal">（可选）</span></p>{recommended.length > 0 && <div className="rounded-xl bg-pri-soft/30 p-3 space-y-2"><p className="text-[11px] text-ink-3">根据所选客户推荐</p>{options(recommended, 'brandIds')}</div>}{options(brands.filter(r => !recommended.some(b => b.id === r.id)), 'brandIds')}<p className="text-[11px] text-ink-3">也可选择其他品牌；竞品品牌仅作为参考资料，不在这里关联。客户变化不会自动移除目标品牌。</p>{directoryError && <p role="alert" className="text-err">{directoryError}</p>}</div>
      <button type="button" aria-expanded={extra} className="flex items-center justify-between w-full text-ink-2 py-2 border-t border-line" onClick={() => setExtra(!extra)}>更多设置 <ChevronDown size={16} className={extra ? 'rotate-180' : ''} /></button>
      {extra && <Field label="负责人"><input className={input} value={draft.owner} maxLength={40} onChange={e => set('owner', e.target.value)} /></Field>}
      {!initial && <ConfigFields draft={draft} onChange={v => setDraft({ ...draft, ...v })} />}
      {error && <p role="alert" className="text-err">{error}</p>}
      <div className="flex justify-end gap-2 pt-2"><Button onClick={onClose}>取消</Button><Button type="submit" primary disabled={!!pendingTemplate}>{initial ? '保存修改' : '创建项目'}</Button></div>
    </form>
  </Modal>
}

function templateConfig(t: ProjectTemplate): Partial<Project> {
  return { templateId: t.id, goal: t.goal, skills: [...t.skills], experts: [...t.experts], teams: [...t.teams], connectors: [...t.connectors] }
}

export function ConfigFields({ draft, onChange }: { draft: Project; onChange: (p: Partial<Project>) => void }) {
  const catalog = useCapabilityCatalog()
  const sections = [
    { key: 'connectors' as const, label: '连接器', hint: '决定从哪里取数据；选择不代表已授权或已连接。', icon: Plug, values: CONNECTORS },
    { key: 'experts' as const, label: '专家', hint: '单一专业角色，负责判断、建议与沟通。', icon: Users, values: catalog.filter(c => c.kind === 'expert').map(c => c.name) },
    { key: 'teams' as const, label: '专家团', hint: '组合多位专家，协作完成复杂任务，不强制固定流程。', icon: Users, values: catalog.filter(c => c.kind === 'team').map(c => c.name) },
    { key: 'skills' as const, label: '技能', hint: '完成一项明确工作，例如搜款、分析 Brief 或制作 PPT。', icon: Sparkles, values: catalog.filter(c => c.kind === 'skill').map(c => c.name) },
  ]
  return <div className="space-y-4">{sections.map(s => <details key={s.key} className="rounded-2xl border border-line p-4"><summary className="cursor-pointer list-none"><span className="flex items-center gap-2 font-medium"><s.icon size={16} className="text-ink-3" />{s.label}<span className="text-mut ml-auto text-[12px]">已选 {(draft[s.key] ?? []).length}</span><ChevronDown size={14} /></span>{!!draft[s.key]?.length && <span className="block truncate text-[12px] text-ink-3 mt-3" title={draft[s.key]!.join('、')}>{draft[s.key]!.join('、')}</span>}</summary><p className="mt-3 text-[11px] text-ink-3 leading-6">{s.hint}</p><div className="mt-3"><Choices values={s.values} selected={draft[s.key] ?? []} onChange={v => onChange({ [s.key]: v })} /></div></details>)}</div>
}

export function ConfigForm({ project, onSave, onClose }: { project: Project; onSave: (p: Partial<Project>) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(project)
  return <Modal title="项目配置" description="为项目中的新任务设置默认背景和能力；已有任务保留创建时的上下文快照。" onClose={onClose}><div className="space-y-5"><Field label="项目目标 / 指令"><textarea className={textarea} rows={4} maxLength={5000} value={draft.goal} onChange={e => setDraft({ ...draft, goal: e.target.value })} /></Field><ConfigFields draft={draft} onChange={v => setDraft({ ...draft, ...v })} /><div className="flex justify-end gap-2"><Button onClick={onClose}>取消</Button><Button primary onClick={() => onSave({ goal: draft.goal, experts: draft.experts, teams: draft.teams ?? [], skills: draft.skills, connectors: draft.connectors })}>保存配置</Button></div></div></Modal>
}
