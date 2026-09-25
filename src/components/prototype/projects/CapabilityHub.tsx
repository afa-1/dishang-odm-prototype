import { useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowUpRight, Check, Plug, Plus, Sparkles, Users } from 'lucide-react'
import { capabilityLabel, type Capability, type CapabilityKind } from './capabilities'
import { useCapabilityCatalog } from './capabilityCatalog'
import { CONNECTORS, loadProjects, now, saveProjects, uid, type Task } from './model'
import { Badge, Button, card, Empty, Field, input, Modal, SearchBox, textarea } from './ui'

export default function CapabilityHub() {
  const catalog = useCapabilityCatalog(), [, navigate] = useSearchParams()
  const [kind, setKind] = useState<CapabilityKind | 'connector'>('skill'), [query, setQuery] = useState(''), [scope, setScope] = useState('全部')
  const [selected, setSelected] = useState<Capability>(), [connector, setConnector] = useState(''), [target, setTarget] = useState(''), [prompt, setPrompt] = useState(''), [notice, setNotice] = useState('')
  const projects = loadProjects().projects, project = projects.find(p => p.id === target)
  const rows = catalog.filter(c => c.kind === kind && (c.name + c.description).includes(query) && (scope === '全部' || (scope === 'ODM 专用') === c.id.startsWith('odm-')))
  function save(start: boolean) {
    if (!project || !(selected || connector)) return
    try {
      const current = loadProjects(); if (current.error) throw new Error(current.error)
      let taskId: string | undefined
      const next = current.projects.map(p => {
        if (p.id !== target) return p
        const key = connector ? 'connectors' : selected!.kind === 'skill' ? 'skills' : selected!.kind === 'expert' ? 'experts' : 'teams'
        const name = connector || selected!.name
        if (!start) return { ...p, [key]: [...new Set([...(p[key] ?? []), name])], updated: now() }
        taskId = uid()
        const t: Task = { id: taskId, name: selected!.name + ' · ' + p.name, type: selected!.taskType, status: '进行中', updated: now(), refs: [], context: { goal: p.goal, customers: [...p.customers], brands: [...p.brands], skills: [...p.skills], experts: [...p.experts], teams: [...(p.teams ?? [])], connectors: [...p.connectors], requirements: p.requirements ? structuredClone(p.requirements) : undefined }, invocations: [{ id: uid(), capability: structuredClone(selected!), instruction: prompt.trim(), refs: [], date: now(), status: '已配置' }], messages: [{ id: uid(), role: 'user', text: prompt.trim(), date: now() }] }
        return { ...p, tasks: [t, ...p.tasks], updated: now() }
      })
      saveProjects(next)
      if (taskId) navigate({ view: 'projects', project: target, tab: '任务', task: taskId })
      else setNotice('已加入「' + project.name + '」的项目配置')
    } catch (e) { setNotice((e as Error).message) }
  }
  return <div className="max-w-[1360px] mx-auto p-6 lg:p-9 text-ink text-[13px]" data-testid="capability-hub">
    <div className="flex justify-between gap-4 items-start"><div><p className="text-[11px] tracking-widest text-pri mb-2">ODM · CAPABILITIES</p><h1 className="text-[26px] font-semibold">专家、技能与连接器</h1><p className="text-ink-3 mt-2">选择适合这次开发的协作方式，在项目里开始工作。</p></div><Badge>交互演示</Badge></div>
    <div className="grid md:grid-cols-3 gap-4 my-7">{[[Sparkles, '技能', '做好一件明确的事'], [Users, '专家 / 专家团', '专业判断，按需协作'], [Plug, '连接器', '让任务知道从哪里找资料']].map(([Icon, title, desc]) => { const I = Icon as typeof Sparkles; return <div key={String(title)} className="rounded-2xl bg-fill-2 p-4 flex items-start gap-3"><I size={20} className="text-pri mt-1" /><div><p className="font-medium">{String(title)}</p><p className="text-[12px] text-ink-3 mt-1">{String(desc)}</p></div></div> })}</div>
    <div className="flex flex-wrap gap-3 justify-between mb-5"><div className="inline-flex rounded-full bg-fill p-1">{(['skill', 'expert', 'team', 'connector'] as const).map(k => <button key={k} onClick={() => { setKind(k); setQuery('') }} className={`px-4 py-2 rounded-full text-[13px] ${kind === k ? 'bg-panel font-semibold' : 'text-ink-3'}`}>{k === 'connector' ? '连接器' : capabilityLabel[k]}</button>)}</div><SearchBox value={query} onChange={setQuery} placeholder="搜索能力或数据来源" /></div>
    {kind !== 'connector' && <div className="flex gap-4 text-[12px] mb-5">{['全部', 'ODM 专用', '原有平台能力'].map(s => <button key={s} onClick={() => setScope(s)} className={scope === s ? 'text-pri font-medium' : 'text-ink-3'}>{s}</button>)}</div>}
    <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{kind === 'connector' ? CONNECTORS.filter(c => c.includes(query)).map(c => <button key={c} className={`${card} p-5 text-left hover:border-pri/40`} onClick={() => { setConnector(c); setTarget(''); setNotice('') }}><Plug size={24} className="text-pri mb-4" /><h3 className="font-semibold text-[15px]">{c}</h3><p className="text-[12px] text-ink-3 my-3 leading-6">{c === 'PLM' ? '承接内部确认后的样衣开发资料。' : c.includes('Cloud') ? '链接已有 3D 样衣，用于项目参考。' : '为项目中的检索、分析与设计提供资料来源。'}</p><Badge>连接配置演示</Badge></button>) : rows.map(c => { const count = projects.filter(p => [...p.skills, ...p.experts, ...(p.teams ?? [])].includes(c.name)).length; return <button key={c.id} className={`${card} p-5 text-left hover:border-pri/40 transition-colors flex flex-col`} onClick={() => { setSelected(c); setTarget(''); setPrompt(c.input); setNotice('') }}><div className="flex justify-between w-full items-center mb-4"><span className="w-10 h-10 rounded-xl bg-pri-soft text-pri flex items-center justify-center">{c.kind === 'skill' ? <Sparkles size={20} /> : <Users size={20} />}</span><Badge>{c.id.startsWith('odm-') ? 'ODM 专用' : '平台能力'}</Badge></div><h3 className="font-semibold text-[15px]">{c.name}</h3><p className="text-[12px] text-ink-3 leading-6 mt-2 mb-4 flex-1">{c.description}</p><div className="border-t border-line-soft pt-3 flex justify-between w-full text-[11px] text-ink-3"><span>{count ? count + ' 个项目已配置' : '可直接用于项目任务'}</span><ArrowUpRight size={14} /></div></button> })}</div>
    {kind !== 'connector' && !rows.length && <Empty title="没有匹配的能力" text="可以切换分类或调整搜索关键词。" />}
    <p className="text-[11px] text-mut mt-7">与项目配置、任务调用共用同一份能力目录。执行过程使用演示数据，不访问真实业务系统。</p><Link to="/?view=legacy-skills" className="inline-block mt-3 text-[11px] text-ink-3 hover:text-pri">原有平台能力的高级配置 ↗</Link>
    {(selected || connector) && <Modal wide title={selected?.name ?? connector} description={selected?.description ?? '配置数据来源与使用范围，演示不需要填写密钥。'} onClose={() => { setSelected(undefined); setConnector('') }}>
      <div className="grid md:grid-cols-[1fr_280px] gap-6"><div className="space-y-5"><Badge tone="blue">{selected ? capabilityLabel[selected.kind] : '连接器'}</Badge>{selected ? <><div><h3 className="font-medium mb-2">需要什么</h3><p className="text-ink-3 leading-6">{selected.input}</p></div><div><h3 className="font-medium mb-2">会得到什么</h3><p className="text-ink-2 leading-6">{selected.output}</p></div>{selected.members && <div><h3 className="font-medium mb-2">协作专家</h3><div className="flex flex-wrap gap-2">{selected.members.map(id => <Badge key={id}>{catalog.find(c => c.id === id)?.name ?? id}</Badge>)}</div></div>}{selected.skills && <div><h3 className="font-medium mb-2">可调用技能</h3><div className="flex flex-wrap gap-2">{selected.skills.map(id => <Badge key={id}>{catalog.find(c => c.id === id)?.name ?? id}</Badge>)}</div></div>}<p className="text-[12px] text-ink-3 bg-fill-2 p-3 rounded-xl">{selected.review}</p></> : <div className="space-y-4"><p className="leading-7">连接器把业务数据提供给任务；资料不会因为加入项目就自动全部读取。</p><p className="text-ink-3 text-[12px]">本原型只演示配置和使用关系，不进行真实授权或同步。</p></div>}</div><div className="space-y-4 bg-fill-2 p-4 rounded-2xl"><Field label="应用到项目"><select className={input} value={target} onChange={e => setTarget(e.target.value)}><option value="">请选择项目</option>{projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></Field>{selected && <Field label="本次任务要求"><textarea className={textarea} rows={4} value={prompt} onChange={e => setPrompt(e.target.value)} /></Field>}<Button className="w-full" disabled={!project} onClick={() => save(false)}><Plus size={14} />加入项目配置</Button>{selected && <Button primary className="w-full" disabled={!project || !prompt.trim()} onClick={() => save(true)}>在项目中发起任务</Button>}{notice && <p role="status" className="text-[12px] text-pri flex items-start gap-2"><Check size={14} className="shrink-0 mt-1" />{notice}</p>}</div></div>
    </Modal>}
  </div>
}
