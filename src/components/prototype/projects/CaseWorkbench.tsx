import { useEffect, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronRight, Loader2, Pause, Play, Sparkles } from 'lucide-react'
import { AssetThumb } from './Assets'
import { CASE_NOTICE, CASE_STAGES, finishCaseStage, THEMES } from './zaraDemo'
import { capabilityById, capabilityLabel } from './capabilities'
import { TaskLifecycle } from './Lifecycle'
import { downloadBlob, now, storeFile, uid, type Asset, type DocumentKind, type Project, type Tab, type Task } from './model'
import { planningPPT, reportHTML } from './documentExport'
import { Badge, Button, card, Modal, textarea } from './ui'

export type CaseUpdate = (transform: (p: Project) => Project, message: string) => boolean
export function CaseProgress({ project, onTask, onTab }: { project: Project; onTask: (id: string) => void; onTab: (tab: Tab) => void }) {
  const done = project.tasks.filter(t => t.caseStage && t.status === '已完成').length
  const next = project.tasks.find(t => t.caseStage && t.status !== '已完成')
  return <section className={`${card} overflow-hidden`} data-testid="case-progress"><div className="p-6 flex flex-wrap items-start justify-between gap-4"><div><p className="text-[11px] text-pri tracking-widest font-medium">ZARA / 2028 SPRING SUMMER · 演示案例</p><h2 className="text-[24px] font-semibold mt-2">城市轻行 <span className="text-ink-3 font-normal text-[18px]">Urban Ease</span></h2><p className="text-[12px] text-ink-3 mt-2">趋势研究 → 系列企划 → 款式与选料 → 内部确认 → PLM 样衣开发</p></div><div className="flex flex-col items-end gap-3"><Badge tone={project.handoffs.length ? 'green' : 'blue'}>{project.handoffs.length ? '演示交接完成' : `${done} / ${CASE_STAGES.length} 个任务已通过`}</Badge><Button primary onClick={() => next ? onTask(next.id) : onTab('交付')}>{next ? `继续 · ${CASE_STAGES.find(s => s.id === next.caseStage)?.short}` : project.handoffs.length ? '查看交接快照' : '进入交付确认'}<ArrowRight size={14} /></Button></div></div>
    <div className="grid grid-cols-2 xl:grid-cols-4 border-t border-line-soft">{CASE_STAGES.map((s, i) => { const t = project.tasks.find(t => t.caseStage === s.id); return <button key={s.id} onClick={() => t && onTask(t.id)} className="text-left p-4 border-b border-r border-line-soft hover:bg-fill-2 transition-colors"><div className="flex items-center gap-2"><span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${t?.status === '已完成' ? 'bg-ok-soft text-ok' : next?.id === t?.id ? 'bg-pri-soft text-pri' : 'bg-fill text-mut'}`}>{t?.status === '已完成' ? <Check size={13} /> : `0${i + 1}`}</span><span className="font-medium text-[12px]">{s.short}</span><ChevronRight size={12} className="ml-auto text-mut" /></div><p className="text-[11px] text-ink-3 mt-2 ml-8">{t?.status ?? '待开始'} · {t?.assignee?.split('（')[0]}</p></button> })}</div>
    <p className="px-5 py-3 text-[11px] text-mut leading-5">{CASE_NOTICE} · 路线用于演示，不限制普通项目自由发起任务。</p>
  </section>
}

export function CaseWorkbench({ project, task, onUpdate, onBack, onNavigate, onOpenAsset, onDocument, onCanvas, onUpload, onSaveTask }: { project: Project; task: Task; onUpdate: CaseUpdate; onBack: () => void; onNavigate: (tab: Tab, task?: string) => void; onOpenAsset: (id: string) => void; onDocument: (kind: DocumentKind) => void; onCanvas: (refs: Asset[]) => void; onUpload: () => void; onSaveTask: (task: Task) => boolean }) {
  const stage = CASE_STAGES.find(s => s.id === task.caseStage)!
  const [instruction, setInstruction] = useState(task.caseRun?.instruction ?? stage.instruction)
  const [message, setMessage] = useState(''), [preview, setPreview] = useState(false), [busy, setBusy] = useState(false), [notice, setNotice] = useState('')
  const [resultKind, setResultKind] = useState<'款式' | '面辅料'>('款式'), [scope, setScope] = useState('全部')
  const run = task.caseRun!, running = run.state === 'running', ready = run.state === 'ready'
  const stageIndex = CASE_STAGES.findIndex(s => s.id === stage.id)
  const previous = stageIndex > 0 ? project.tasks.find(t => t.caseStage === CASE_STAGES[stageIndex - 1].id) : undefined
  const hasInput = !previous || previous.caseRun?.state === 'ready'
  const doc = task.documents?.[0]
  const outputs = project.assets.filter(a => a.taskId === task.id)
  const selectedSet = task.searches?.find(s => s.kind === resultKind)
  const selectedRefs = selectedSet?.results.filter(a => selectedSet.selected.includes(a.id)) ?? []
  const canSubmit = ready && (stage.id !== 'selection' || project.assets.some(a => a.kind === '款式设计' && a.selection === '保留'))

  useEffect(() => {
    if (!running) return
    const timer = setTimeout(() => {
      onUpdate(p => {
        const current = p.tasks.find(t => t.id === task.id)
        if (current?.caseRun?.state !== 'running') return p
        const step = current.caseRun.step + 1
        if (step >= stage.steps.length) return finishCaseStage(p, stage.id)
        return { ...p, tasks: p.tasks.map(t => t.id === task.id ? { ...t, caseRun: { ...t.caseRun!, step }, history: [...(t.history ?? []), { date: now(), text: `演示过程：${stage.steps[step - 1].title}` }] } : t) }
      }, `演示执行：${stage.title}`)
    }, 1150)
    return () => clearTimeout(timer)
  }, [running, run.step, stage, task.id, onUpdate])

  function start() {
    onUpdate(p => ({ ...p, status: p.status === '待启动' ? '进行中' : p.status, tasks: p.tasks.map(t => t.id === task.id ? { ...t, status: '进行中', caseRun: { state: 'running', step: t.caseRun?.step ?? 0, instruction }, history: [...(t.history ?? []), { date: now(), text: '确认输入并开始预置演示' }] } : t) }), `开始任务：${stage.title}`)
  }
  async function exportDocument() {
    if (!doc) return
    setBusy(true); setNotice('')
    try {
      const ppt = doc.kind === '企划 PPT', blob = ppt ? await planningPPT(doc, project.assets) : new Blob([await reportHTML(doc, project.assets)], { type: 'text/html' })
      const fileName = `${doc.title}.${ppt ? 'pptx' : 'html'}`
      const revision = await storeFile(new File([blob], fileName, { type: blob.type }))
      const output = outputs.find(a => a.kind === '项目文档')
      const ok = onUpdate(p => ({ ...p, assets: p.assets.map(a => a.id === output?.id ? { ...a, revisions: [...a.revisions, revision], adopted: revision.id } : a) }), `导出并采用 ${ppt ? 'PPTX' : 'HTML'}：${doc.title}`)
      if (ok) { downloadBlob(blob, fileName); setNotice('已下载，并归档为新的采用版本；可以本地修改后上传修订。') }
    } catch (e) { setNotice(`导出失败：${(e as Error).message}`) } finally { setBusy(false) }
  }
  function toggleReference(id: string) {
    if (!selectedSet) return
    onSaveTask({ ...task, searches: task.searches?.map(s => s.id === selectedSet.id ? { ...s, selected: s.selected.includes(id) ? s.selected.filter(x => x !== id) : [...s.selected, id] } : s) })
  }
  function collect() {
    if (onUpdate(p => ({ ...p, assets: [...p.assets, ...selectedRefs.filter(a => !p.assets.some(x => x.id === a.id)).map(a => ({ ...a, taskId: task.id }))] }), `择优归档 ${selectedRefs.length} 项检索参考`)) setNotice('所选参考已归档到本项目；结果集仍保留在当前任务。')
  }
  return <div className="space-y-5" data-testid={`case-workbench-${stage.id}`}>
    <div className="flex items-center justify-between gap-3"><button onClick={onBack} className="flex items-center gap-2 text-[12px] text-ink-3 hover:text-pri"><ArrowLeft size={14} />全部任务</button><span className="text-[11px] text-mut">设计工作台 Agent · 预置案例运行</span></div>
    <div className="flex items-start gap-3"><span className="w-11 h-11 rounded-2xl bg-pri-soft text-pri flex items-center justify-center font-semibold">0{stageIndex + 1}</span><div><h2 className="text-[22px] font-semibold">{stage.title}</h2><p className="text-[12px] text-ink-3 mt-1">{stage.outcome}</p></div></div>
    <TaskLifecycle project={project} task={task} onSave={onSaveTask} canSubmit={canSubmit} />
    <section className={`${card} p-5`}><div className="flex gap-2 items-center mb-3"><Sparkles size={16} className="text-pri" /><h3 className="font-medium">本次调用</h3><Badge>预置演示 · 非真实 AI</Badge></div><div className="flex flex-wrap gap-2">{stage.capabilityIds.map(id => { const c = capabilityById(id)!; return <Badge key={id} tone="blue">{capabilityLabel[c.kind]} · {c.name}</Badge> })}</div><p className="text-[12px] leading-6 text-ink-3 mt-3">数据与工具：{stage.sources.join('、')}（连接器为演示配置）。</p><details className="mt-2"><summary className="text-[12px] text-pri cursor-pointer">查看能力分工与引用</summary><div className="mt-3 space-y-2">{stage.capabilityIds.map(id => { const c = capabilityById(id)!; return <div key={id} className="p-3 bg-fill-2 rounded-xl text-[12px] leading-6"><p>{c.name}：{c.description}</p>{c.members && <p className="text-ink-3">协作专家：{c.members.map(id => capabilityById(id)?.name).join(' → ')}</p>}{c.skills && <p className="text-ink-3">执行技能：{c.skills.map(id => capabilityById(id)?.name).join('、')}</p>}</div> })}<div className="flex flex-wrap gap-2">{project.assets.filter(a => a.kind === '参考资料').slice(0, 4).map(a => <button key={a.id} className="text-pri text-[11px] underline" onClick={() => onOpenAsset(a.id)}>@{a.name}</button>)}</div>{stage.id === 'collect' && <p className="text-[12px] text-ink-3">待整理：SOP、标签规范、Story 逻辑流、2028SS 趋势报告四份用户资料。</p>}</div></details></section>
    {!ready && <section className={`${card} p-5`}><h3 className="font-medium mb-3">先确认这次任务</h3><textarea aria-label="案例任务指令" className={textarea} rows={3} value={instruction} disabled={running} onChange={e => setInstruction(e.target.value)} /><div className="flex flex-wrap justify-between items-center gap-3 mt-4"><p className="text-[11px] text-ink-3">可补充演示指令；执行结果为预置内容，不会调用真实模型。</p>{!hasInput ? <Button onClick={() => onNavigate('任务', previous!.id)}>先完成 · {previous!.name}</Button> : running ? <Button onClick={() => onSaveTask({ ...task, caseRun: { ...run, state: 'paused' } })}><Pause size={14} />暂停演示</Button> : <Button primary disabled={!instruction.trim()} onClick={start}><Play size={14} />{run.state === 'paused' ? '继续执行' : '确认并运行演示'}</Button>}</div></section>}
    {(running || run.state === 'paused' || ready) && <section className={`${card} p-5`} aria-live="polite"><div className="flex justify-between items-center gap-2"><h3 className="font-medium">执行过程</h3><Badge tone={ready ? 'green' : 'blue'}>{ready ? '运行完成 · 待人工复核' : run.state === 'paused' ? '已暂停' : `${run.step + 1} / ${stage.steps.length}`}</Badge></div><div className="mt-4 space-y-4">{stage.steps.map((s, i) => <div key={s.title} className={`flex items-start gap-3 ${!ready && i > run.step ? 'opacity-40' : ''}`}><div className="mt-1 shrink-0">{ready || i < run.step ? <CheckCircle2 size={17} className="text-ok" /> : i === run.step && running ? <Loader2 size={17} className="text-pri animate-spin motion-reduce:animate-none" /> : <span className="block h-4 w-4 rounded-full border border-line-strong" />}</div><div><p className="font-medium text-[12px]">{s.title}</p>{(ready || i <= run.step) && <p className="text-[12px] text-ink-3 leading-6 mt-1">{s.detail}</p>}</div></div>)}</div></section>}
    {ready && <section className={`${card} p-5 space-y-4`}><div className="flex items-center justify-between flex-wrap gap-3"><h3 className="font-semibold text-[15px]">运行结果</h3>{doc && <div className="flex flex-wrap gap-2"><Button onClick={() => setPreview(true)}>预览{doc.kind === '企划 PPT' ? '企划' : '报告'}</Button><Button onClick={() => onDocument(doc.kind)}>编辑工作稿</Button><Button primary disabled={busy} onClick={() => void exportDocument()}>{busy ? '正在导出…' : doc.kind === '企划 PPT' ? '下载并归档 PPTX' : '下载并归档报告'}</Button></div>}</div>
      {stage.id === 'trend' && <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{THEMES.map(t => <button key={t.name} onClick={() => setPreview(true)} className="rounded-2xl bg-fill-2 p-4 text-left hover:bg-pri-soft/40"><span className="text-[10px] tracking-wider text-mut">{t.en}</span><h4 className="text-[15px] font-medium mt-2">{t.name}</h4><p className="text-[11px] text-pri mt-1">{t.scope}</p><p className="text-[12px] text-ink-3 mt-3 leading-6">{t.story}</p></button>)}</div>}
      {doc && stage.id !== 'trend' && <div className="grid sm:grid-cols-2 gap-3">{doc.sections.slice(1, 5).map(s => <div key={s.id} className="rounded-xl bg-fill-2 p-4"><h4 className="font-medium text-[12px]">{s.title}</h4><p className="text-[12px] text-ink-3 leading-6 mt-2 line-clamp-3">{s.body}</p></div>)}</div>}
      {stage.id === 'search' && <><div className="flex flex-wrap gap-2 items-center">{(['款式', '面辅料'] as const).map(k => <Button primary={resultKind === k} key={k} onClick={() => setResultKind(k)}>{k}结果集</Button>)}<select aria-label="案例检索范围" className="ml-auto bg-fill rounded-full px-3 py-2 text-[12px]" value={scope} onChange={e => setScope(e.target.value)}>{['全部', '内部', '外部'].map(s => <option key={s}>{s}</option>)}</select></div><div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">{selectedSet?.results.filter(a => scope === '全部' || (a.provenance?.scope ?? '内部') === scope).map(a => <label key={a.id} className={`${card} p-3 cursor-pointer ${selectedSet.selected.includes(a.id) ? 'border-pri' : ''}`}><AssetThumb asset={a} large /><div className="flex items-start gap-2 mt-3"><input aria-label={`选择${a.name}`} type="checkbox" className="accent-pri mt-1" checked={selectedSet.selected.includes(a.id)} onChange={() => toggleReference(a.id)} /><div><p className="text-[12px] font-medium">{a.name}</p><p className="text-[11px] text-ink-3 mt-2 leading-5">{a.provenance?.provider ?? '内部面料库 · 演示候选'}</p><p className="text-[11px] text-ink-3 mt-2">匹配依据：{resultKind === '款式' ? '品类与松量廓形匹配；细节仍需设计修改。' : '轻量与自然视觉方向匹配；成分及供货待确认。'}</p></div></div></label>)}</div><div className="flex flex-wrap items-center gap-3"><span className="text-[12px] text-ink-3">已选择 {selectedRefs.length} 项</span><Button disabled={!selectedRefs.length} onClick={collect}>择优归档到项目</Button>{resultKind === '款式' && <Button primary disabled={!selectedRefs.length} onClick={() => onCanvas(selectedRefs)}>加入设计画布</Button>}</div><p className="text-[11px] text-mut">均为预置示例，不代表实时库存或品牌商品；任务保留结果集，项目只保留你选中的参考。</p></>}
      {outputs.length > 0 && <div className="grid sm:grid-cols-2 gap-3">{outputs.map(a => <button key={a.id} onClick={() => onOpenAsset(a.id)} className="flex items-center gap-3 rounded-xl border border-line p-3 text-left hover:border-pri/40"><AssetThumb asset={a} /><div className="min-w-0"><p className="text-[12px] font-medium truncate">{a.name}</p><p className="text-[11px] text-ink-3 mt-1">{a.kind} · V{a.revisions.findIndex(r => r.id === a.adopted) + 1} · 点击预览 / 上传修订</p></div></button>)}</div>}
      {stage.id === 'design' && <Button onClick={() => onCanvas(outputs.filter(a => a.kind === '款式设计'))}>在画布中继续设计</Button>}
      {stage.id === 'selection' && <div className="rounded-xl bg-pri-soft/40 p-4 flex flex-wrap justify-between items-center gap-3"><p className="text-[12px]">已保留 {project.assets.filter(a => a.kind === '款式设计' && a.selection === '保留').length} 款；请先完成至少一款人工选款。</p><Button primary onClick={() => onNavigate('资产')}>打开内部选款</Button></div>}
      {stage.id === 'delivery' && <Button primary onClick={() => onNavigate('交付')}>整理交付，提交内部审核<ArrowRight size={14} /></Button>}
      <div className="flex gap-2 flex-wrap"><Button onClick={onUpload}>上传人工成果</Button>{stageIndex < CASE_STAGES.length - 1 && <Button onClick={() => onNavigate('任务', project.tasks.find(t => t.caseStage === CASE_STAGES[stageIndex + 1].id)!.id)}>下一步 · {CASE_STAGES[stageIndex + 1].short}<ArrowRight size={14} /></Button>}</div>
    </section>}
    {notice && <p role="status" className="text-[12px] bg-pri-soft text-pri p-3 rounded-xl">{notice}</p>}
    <details className={`${card} p-4`}><summary className="cursor-pointer text-[12px] text-ink-3">对话记录与补充意见 · {task.messages.length}</summary><div className="space-y-3 mt-4">{task.messages.map(m => <div key={m.id} className={`p-3 rounded-xl text-[12px] leading-6 whitespace-pre-wrap ${m.role === 'user' ? 'bg-fill' : 'bg-pri-soft/30'}`}><span className="text-mut">{m.role === 'user' ? '我' : '设计工作台 Agent'}：</span>{m.text}</div>)}</div></details>
    <form className={`${card} p-4`} onSubmit={e => { e.preventDefault(); if (message.trim() && onSaveTask({ ...task, messages: [...task.messages, { id: uid(), role: 'user', text: message.trim(), date: now() }, { id: uid(), role: 'assistant', text: '已记录补充意见。原型不会根据自由输入调用模型；请编辑工作稿或上传修订，之后提交人工审核。', date: now() }] })) setMessage('') }}><textarea aria-label="案例补充意见" className="w-full bg-transparent outline-none resize-none text-[13px]" rows={2} placeholder="补充修改意见，或记录需要线下确认的事项…" value={message} onChange={e => setMessage(e.target.value)} /><div className="flex justify-between items-center gap-3 mt-2"><span className="text-[11px] text-mut">自由意见会保存在本任务中</span><Button type="submit" disabled={!message.trim()}>记录意见</Button></div></form>
    {preview && doc && <Modal wide title={doc.title} description="可编辑工作稿预览 · 资料摘录与开发转译，不是品牌官方报告" onClose={() => setPreview(false)}><div className="space-y-5">{doc.sections.map((s, i) => <section key={s.id} className="p-5 rounded-2xl bg-fill-2"><p className="text-[10px] text-mut tracking-widest">{doc.kind === '企划 PPT' ? `SLIDE ${String(i + 1).padStart(2, '0')}` : `SECTION ${String(i + 1).padStart(2, '0')}`}</p><h3 className="font-semibold mt-2 mb-3 text-[16px]">{s.title}</h3><p className="text-[13px] text-ink-2 leading-7 whitespace-pre-wrap">{s.body}</p></section>)}</div></Modal>}
  </div>
}
