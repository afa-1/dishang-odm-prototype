import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowUpRight, Check, Download, FileText, FolderInput, Image, MessageSquare, Paperclip, Plus, RotateCcw, Settings2, Users, X, Zap } from 'lucide-react'
import ChatPanel, { type ChatItem } from '../ChatPanel'
import CanvasArea, { type ProjectCanvasDocument } from '../CanvasArea'
import { INTENTS, executionSteps, inferIntent, initialSession, prepareDemo, produceOutput, type AgentIntent, type AgentOutput, type AgentSession } from './projectAgentModel'
import { capabilityById, capabilityLabel, type CapabilityKind } from './capabilities'
import { useCapabilityCatalog } from './capabilityCatalog'
import { adopted, dateLabel, downloadBlob, makeAsset, now, readBlob, storeFile, uid, type Asset, type Project, type Task } from './model'
import { durableDraft } from './ProjectCanvas'
import { planningPPT, reportHTML } from './documentExport'
import { TaskLifecycle } from './Lifecycle'
import { Badge, Button, Empty, input, Modal, SearchBox } from './ui'
import { statusTone } from './lifecycleModel'
import { FilePreview } from './FilePreview'

interface Props {
  project: Project; task: Task; onBack: () => void; onCreate: () => void; onOpenTask: (id: string) => void
  onSave: (task: Task) => boolean; onArchive: (assets: Asset[], target?: 'assets' | 'delivery') => boolean; onReplay: () => void
  onOpenAsset: (id: string) => void; onUpload: () => void; onProjectTab: (tab: '资产' | '交付') => void
}
const blobData = (blob: Blob) => new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('文件读取失败')); reader.readAsDataURL(blob) })

export function ProjectAgentWorkspace({ project, task, onBack, onCreate, onOpenTask, onSave, onArchive, onOpenAsset, onUpload, onProjectTab, onReplay }: Props) {
  const catalog = useCapabilityCatalog()
  const current = useRef(task); current.current = task
  const [prepared] = useState(() => !task.agent && task.caseRun?.state === 'idle' ? prepareDemo(project, task) : null)
  const session = task.agent ?? prepared?.session ?? initialSession(task, project)
  const sessionRef = useRef(session); sessionRef.current = session
  const [draft, setDraft] = useState<string | undefined>(() => session.draft)
  const [width, setWidth] = useState(() => Math.min(720, window.innerWidth * .48)), [collapsed, setCollapsed] = useState(false)
  const [modal, setModal] = useState<'capabilities' | 'references' | 'history' | 'info' | null>(null)
  const [kind, setKind] = useState<CapabilityKind>('skill'), [query, setQuery] = useState('')
  const [pane, setPane] = useState<'results' | 'canvas' | 'file' | null>(null)
  const [fileAsset, setFileAsset] = useState<Asset | null>(null)
  const [activeOutput, setActiveOutput] = useState<string | null>(session.outputs.at(-1)?.id ?? null)
  const [selected, setSelected] = useState<string[]>([])
  const [toast, setToast] = useState(''), [exporting, setExporting] = useState(false)
  const [canvas, setCanvas] = useState<ProjectCanvasDocument | null>(null), [canvasKey, setCanvasKey] = useState(0)
  const [marks, setMarks] = useState<ProjectCanvasDocument['marks']>([])
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null)
  const [inbox, setInbox] = useState<{ ts: number; items: { name: string; url: string }[] } | null>(null)
  const canvasRef = useRef<ProjectCanvasDocument>({ cards: [], strokes: [], marks: [] })
  const canvasDirty = useRef(false)
  const live = useRef(true)
  const busy = session.run?.status === 'running'
  const output = session.outputs.find(o => o.id === activeOutput)
  const offset = collapsed ? 64 : width + 20

  function save(next: AgentSession, patch: Partial<Task> = {}) {
    const t = { ...current.current, ...patch, agent: next, updated: now() }
    if (!onSave(t)) return false
    sessionRef.current = next; current.current = t
    return true
  }
  function notice(text: string) { setToast(text) }
  useEffect(() => { if (!toast) return; const id = setTimeout(() => setToast(''), 3500); return () => clearTimeout(id) }, [toast])
  useEffect(() => { const resize = () => setWidth(w => Math.max(300, Math.min(w, window.innerWidth * .48))); window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize) }, [])
  useEffect(() => {
    if (!prepared || current.current.agent) return
    const missing = prepared.assets.filter(a => !project.assets.some(v => v.id === a.id))
    if (!missing.length || onArchive(missing)) save(prepared.session, { refs: prepared.refs })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    live.current = true
    async function load() {
      try {
        const loaded: ProjectCanvasDocument = task.canvas ? JSON.parse(await (await readBlob(task.canvas)).text()) : { cards: [], strokes: [], marks: [] }
        if (live.current) { canvasRef.current = loaded; setCanvas(loaded); setMarks(loaded.marks) }
      } catch { if (live.current) { setCanvas({ cards: [], strokes: [], marks: [] }); notice('原画布未能读取，原稿仍保留在任务中。') } }
    }
    void load()
    return () => { live.current = false }
  }, [task.id]) // eslint-disable-line react-hooks/exhaustive-deps

  function complete(next: AgentSession) {
    const run = next.run!
    const result = produceOutput(project, current.current, run)
    const items: ChatItem[] = [...next.items.map((m, i) => i === run.progressIndex && m.kind === 'progress' ? { ...m, done: true, steps: m.steps.map(s => ({ ...s, done: true })) } : m),
      { kind: 'ai', text: `已整理好「${result.title}」。你可以先预览，也可以下载修改，或直接告诉我还要调整哪里。` },
      { kind: 'artifact', id: result.id, title: result.title, detail: result.document ? `${result.document.sections.length} 个章节 · 可编辑 / 下载` : `${result.assets.length} 项内容 · 查看结果` },
      { kind: 'suggest', items: INTENTS[run.intent].followups }]
    const documents = result.document ? [...(current.current.documents ?? []), result.document] : current.current.documents
    save({ ...next, items, outputs: [...next.outputs, result], run: { ...run, status: 'done' } }, { status: '待人工处理', documents })
  }
  useEffect(() => {
    if (!busy) return
    const timer = setTimeout(() => {
      const s = sessionRef.current, run = s.run
      if (!run || run.status !== 'running') return
      const steps = executionSteps(project, run), tick = (run.tick ?? 0) + 1
      const phase = steps[Math.min(run.step, steps.length - 1)]
      const done = tick >= 5
      const items: ChatItem[] = s.items.map((m, i) => i === run.executionIndex && m.kind === 'execution' ? { ...m, detail: phase.detail.slice(0, Math.ceil(phase.detail.length * tick / 5)), state: done ? 'done' : 'running' } : i === run.progressIndex && m.kind === 'progress' ? { ...m, steps: m.steps.map((v, j) => ({ ...v, done: j < run.step + (done ? 1 : 0) })) } : m)
      if (done && run.step + 1 >= steps.length) complete({ ...s, items })
      else if (done) {
        const executionIndex = items.length
        items.push({ kind: 'execution', title: steps[run.step + 1].title, detail: '', state: 'running' })
        save({ ...s, items, run: { ...run, step: run.step + 1, tick: 0, executionIndex } })
      } else save({ ...s, items, run: { ...run, tick } })
    }, 620)
    return () => clearTimeout(timer)
  }, [busy, session.run?.step, session.run?.tick, session.run?.request]) // eslint-disable-line react-hooks/exhaustive-deps

  function send(text: string, mode: 'auto' | 'ask') {
    const s = sessionRef.current
    if (s.run?.status === 'running') return
    if (s.run?.status === 'paused' && /^(继续|继续执行|接着做)[。！!\s]*$/.test(text)) {
      save({ ...s, items: [...s.items.map((m, i) => i === s.run!.progressIndex && m.kind === 'progress' ? { ...m, status: 'running' as const } : m), { kind: 'user', text }], run: { ...s.run, status: 'running' } }, { status: '进行中' }); return
    }
    if (s.run?.status === 'asking') {
      const i = s.items.map((m, i) => m.kind === 'ask' && !m.answer && !m.skipped ? i : -1).filter(i => i >= 0).at(-1) ?? -1
      if (i >= 0) { answer(i, [], text); return }
    }
    const intent = s.draft && text.startsWith(s.draft) && task.caseStage ? task.caseStage as AgentIntent : inferIntent(text, s.capabilityIds, s.run?.intent), config = INTENTS[intent]
    const capabilities = s.capabilityIds.length ? s.capabilityIds : config.capability ? [config.capability] : []
    const names = capabilities.map(id => catalog.find(c => c.id === id)?.name ?? id)
    const refs = current.current.refs
    const items: ChatItem[] = [...s.items, { kind: 'user', text }, { kind: 'ai', text: `收到。${names.length ? `本次调用${names.join('、')}` : '我会结合项目背景'}${refs.length ? `，先读取 ${refs.length} 份引用资料` : ''}，再整理可修改的成果。` }]
    const progressIndex = items.length
    items.push({ kind: 'progress', steps: config.steps.map(label => ({ label, done: false })), done: false, status: mode === 'ask' ? 'waiting' : 'running' })
    if (mode === 'ask') items.push({ kind: 'ask', context: '开始前，先对齐这次的重点。也可以直接输入你的想法。', question: config.question, options: config.options, preset: [0] })
    const executionIndex = items.length
    items.push({ kind: 'execution', title: executionSteps(project, { intent, request: text, status: 'running', step: 0, progressIndex, capabilities, refs })[0].title, detail: '', state: 'running' })
    save({ ...s, draft: undefined, items, run: { intent, request: text, status: mode === 'ask' ? 'asking' : 'running', step: 0, tick: 0, progressIndex, executionIndex, capabilities, refs } }, {
      name: current.current.name === '新建对话' ? text.split('\n')[0].slice(0, 32) : current.current.name, status: mode === 'ask' ? '待人工处理' : '进行中',
      messages: [...current.current.messages, { id: uid(), role: 'user', text, date: now() }],
      invocations: [...(current.current.invocations ?? []), ...capabilities.flatMap(id => { const c = catalog.find(c => c.id === id); return c ? [{ id: uid(), capability: c, instruction: text, date: now(), refs, status: '已演示' as const }] : [] })],
    })
  }
  function answer(index: number, choices: number[], custom?: string, skip = false) {
    const s = sessionRef.current, item = s.items[index]
    if (!s.run || item.kind !== 'ask') return
    const supplement = [...choices.map(i => item.options[i]), custom].filter(Boolean).join('；') || item.options[0]
    save({ ...s, items: s.items.map((m, i) => i === index && m.kind === 'ask' ? { ...m, answer: skip ? undefined : supplement, skipped: skip } : i === s.run!.progressIndex && m.kind === 'progress' ? { ...m, status: 'running' } : m), run: { ...s.run, supplement, status: 'running' } }, { status: '进行中' })
  }
  function stop() {
    const s = sessionRef.current
    if (s.run) save({ ...s, run: { ...s.run, status: 'paused' }, items: [...s.items.map((m, i) => i === s.run!.progressIndex && m.kind === 'progress' ? { ...m, status: 'paused' as const } : m), { kind: 'ai', text: '已停止。进度和引用已保留，发送“继续”可以接着做，也可以给我新的要求。' }] }, { status: '待人工处理' })
  }
  function reference(assets: Asset[]) {
    const refs = [...current.current.refs]
    for (const a of assets) if (!refs.some(r => r.assetId === a.id)) refs.push({ assetId: a.id, revisionId: a.adopted, name: a.name })
    save(sessionRef.current, { refs })
  }
  async function upload(files: File[]) {
    try {
      const assets = await Promise.all(files.map(async f => makeAsset(f.name.replace(/\.[^.]+$/, ''), f.type.startsWith('image/') ? '参考资料' : '项目文档', await storeFile(f))))
      if (!live.current) return
      if (onArchive(assets)) { reference(assets); notice('已上传并引用到当前对话') }
    } catch (e) { notice((e as Error).message) }
  }
  function updateOutput(next: AgentOutput) {
    const s = sessionRef.current
    if (next.document && next.document !== s.outputs.find(o => o.id === next.id)?.document) next = { ...next, archivedDocument: undefined }
    save({ ...s, outputs: s.outputs.map(o => o.id === next.id ? next : o) }, next.document ? { documents: (current.current.documents ?? []).map(d => d.id === next.document!.id ? next.document! : d) } : {})
  }
  async function outputFile(o: AgentOutput): Promise<File> {
    const doc = o.document!
    if (doc.kind === '企划 PPT') return new File([await planningPPT(doc, project.assets)], `${doc.title}.pptx`, { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
    return new File([await reportHTML(doc, project.assets)], `${doc.title}.html`, { type: 'text/html' })
  }
  async function download(o: AgentOutput) {
    setExporting(true)
    try { if (o.document) { const f = await outputFile(o); downloadBlob(f, f.name) } else if (o.assets.length) { for (const a of o.assets.filter(a => activeOutput !== o.id || pane !== 'results' || !selected.length || selected.includes(a.id))) downloadBlob(await readBlob(adopted(a)), adopted(a).name) } }
    catch (e) { notice((e as Error).message) } finally { setExporting(false) }
  }
  async function archive(o: AgentOutput, assets = o.assets, target: 'assets' | 'delivery' = 'assets') {
    setExporting(true)
    try {
      let adding = assets
      if (o.document) adding = [o.archivedDocument ?? { ...makeAsset(o.title, '项目文档', await storeFile(await outputFile(o)), '任务产出'), id: `agent-document-${o.id}`, provenance: { key: `agent-document-${o.id}`, scope: '内部', provider: 'Agent 工作稿', collectedAt: now() } }]
      else if (target === 'assets') adding = adding.filter(a => !(o.archivedIds ?? []).includes(a.id))
      if (!adding.length) { notice('选中的成果已经归档'); return }
      if (onArchive(adding, target)) { updateOutput({ ...o, archivedDocument: o.document ? adding[0] : o.archivedDocument, archivedIds: [...new Set([...(o.archivedIds ?? []), ...adding.map(a => a.id)])] }); notice(target === 'delivery' ? '已加入项目交付，等待内部确认' : '已存入项目资产') }
    } catch (e) { notice((e as Error).message) } finally { setExporting(false) }
  }
  async function saveCanvas(doc: ProjectCanvasDocument, quiet = false) {
    try {
      const r = await storeFile(new File([JSON.stringify(await durableDraft(doc))], `${task.name}-画布.json`, { type: 'application/json' }))
      if (!live.current) return false
      const ok = save(sessionRef.current, { canvas: r }); if (ok) { canvasDirty.current = false; if (!quiet) notice('画布已保存到当前任务') }; return ok
    } catch (e) { notice((e as Error).message); return false }
  }
  async function addToCanvas(assets: Asset[]) {
    try {
      const next = structuredClone(canvasRef.current)
      for (const a of assets.filter(a => adopted(a).mime.startsWith('image/'))) {
        const id = `reference-${a.id}-${a.adopted}`
        if (!next.cards.some(c => c.id === id)) { const i = next.cards.length; next.cards.push({ id, tag: a.name, kind: 'gen', img: await blobData(await readBlob(adopted(a))), x: 40 + (i % 2) * 340, y: 100 + Math.floor(i / 2) * 310, w: 300, imgH: 230 }) }
      }
      canvasRef.current = next; setCanvas(next); setMarks(next.marks); setCanvasKey(v => v + 1); setPane('canvas'); await saveCanvas(next, true)
    } catch (e) { notice((e as Error).message) }
  }
  async function leave(action: () => void) { if (!canvasDirty.current || await saveCanvas(canvasRef.current, true)) { setCanvas(structuredClone(canvasRef.current)); action() } }
  function openOutput(o: AgentOutput) { void leave(() => { setActiveOutput(o.id); setSelected([]); setPane('results') }) }
  function previewAsset(a: Asset) { if (adopted(a).mime.startsWith('image/')) void addToCanvas([a]); else void leave(() => { setFileAsset(a); setPane('file') }) }

  function artifactCard(item: Extract<ChatItem, { kind: 'artifact' }>) {
    const o = session.outputs.find(v => v.id === item.id)
    if (!o) return null
    const images = o.assets.filter(a => adopted(a).mime.startsWith('image/'))
    const delivered = o.archivedIds?.length && o.archivedIds.every(id => project.assets.find(a => a.id === id)?.delivery)
    return <article className="rounded-2xl border border-line overflow-hidden bg-panel" data-testid="conversation-artifact">
      <button onClick={() => openOutput(o)} className="flex items-start w-full text-left gap-3 p-5 hover:bg-fill-2"><span className="w-10 h-11 rounded-xl bg-pri-soft text-pri grid place-items-center shrink-0">{images.length ? <Image size={20} /> : <FileText size={20} />}</span><span className="min-w-0 flex-1"><span className="font-semibold text-[14px] block">{o.title}</span><span className="text-[11px] text-mut block mt-1.5">{o.document?.kind ?? (images.length ? `${images.length} 张图片` : '资料与说明')} · 点击预览</span></span><ArrowUpRight size={16} className="text-mut" /></button>
      {images.length > 0 ? <div className="px-5 pb-4 grid grid-cols-3 gap-3">{images.slice(0, 3).map(a => <button key={a.id} onClick={() => void addToCanvas([a])} aria-label={`打开设计画布：${a.name}`} className="rounded-xl overflow-hidden border border-line hover:border-pri text-left"><AssetThumb asset={a} /><span className="text-[11px] p-2 block truncate">{a.name}</span></button>)}</div> : <p className="px-5 pb-4 text-[12px] text-ink-3 leading-6 line-clamp-3">{o.document ? o.document.sections.slice(0, 5).map(s => s.title).join(' · ') : o.body?.split('本次要求：')[0].replace(/#/g, '').slice(0, 180)}</p>}
      <div className="px-4 py-3 border-t border-line-soft flex items-center gap-1.5 flex-wrap text-[12px]">
        {images.length > 0 && <button className="rounded-full px-3 py-1.5 text-pri hover:bg-pri-soft" onClick={() => void addToCanvas(images)}>打开设计画布</button>}
        <button disabled={exporting} className="rounded-full px-3 py-1.5 hover:bg-fill text-ink-2 disabled:opacity-40" onClick={() => void archive(o)}>{o.archivedIds?.length ? '已存入资产' : '存入资产'}</button>
        <button disabled={exporting || !!delivered} className="rounded-full px-3 py-1.5 hover:bg-pri-soft text-pri disabled:text-mut" onClick={() => void archive(o, o.assets, 'delivery')}>{delivered ? '已加入交付' : '加入交付'}</button>
        <button disabled={exporting} className="rounded-full px-3 py-1.5 hover:bg-fill text-ink-3 ml-auto flex items-center gap-1.5" onClick={() => void download(o)}><Download size={13} />{o.document?.kind === '企划 PPT' ? '下载 PPT' : '下载'}</button>
      </div>
    </article>
  }

  const shownCapabilities = catalog.filter(c => c.kind === kind && `${c.name}${c.description}`.toLowerCase().includes(query.toLowerCase()))
  const composerContext = <div className="space-y-2 p-1" data-testid="agent-context">
    {session.capabilityIds.length > 0 && <div className="flex flex-wrap gap-1.5">{session.capabilityIds.map(id => { const c = catalog.find(c => c.id === id); return <span key={id} className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-pri text-white text-[11px]"><Zap size={12} />{c?.name ?? id}<button title={`移除${c?.name ?? id}`} onClick={() => save({ ...sessionRef.current, capabilityIds: sessionRef.current.capabilityIds.filter(x => x !== id) })}><X size={12} /></button></span> })}</div>}
    {task.refs.length > 0 && <div className="flex flex-wrap gap-1">{task.refs.map(r => <span key={r.assetId} className="inline-flex items-center gap-1 py-1 px-2 rounded-full bg-fill-2 border border-line text-[11px] max-w-[190px]"><Paperclip size={11} className="shrink-0" /><button className="truncate hover:text-pri" title={r.name} onClick={() => { const a = [...project.assets, ...session.outputs.flatMap(o => o.assets)].find(v => v.id === r.assetId); if (a) previewAsset(a) }}>{r.name}</button><button title={`取消引用${r.name}`} onClick={() => save(sessionRef.current, { refs: current.current.refs.filter(x => x.assetId !== r.assetId) })}><X size={11} /></button></span>)}</div>}
  </div>

  return <div className="fixed inset-0 z-40 bg-cvs text-ink text-[13px] flex flex-col" data-testid="project-agent-workspace">
    <header className="h-12 shrink-0 border-b border-line-soft bg-panel flex items-center gap-3 px-4">
      <button onClick={() => void leave(onBack)} className="flex items-center gap-2 text-ink-3 hover:text-pri shrink-0"><ArrowLeft size={15} />项目任务</button><span className="text-line-strong">/</span><span className="truncate text-[12px]">{project.name}</span>
      <div className="ml-auto flex gap-2 shrink-0 items-center"><span className="text-[10px] text-mut hidden sm:inline">交互演示</span><Badge tone={statusTone(task.status)}>{task.status}</Badge>{task.caseStage && session.items.length > 0 && !busy && <button aria-label="重新演示本任务" title="重新演示，保留这次记录" className="p-2 rounded-full text-mut hover:bg-fill flex items-center gap-1.5 text-[12px]" onClick={() => void leave(onReplay)}><RotateCcw size={14} /><span className="hidden sm:inline">重新演示</span></button>}<Button onClick={() => setModal('info')}><Settings2 size={13} />任务信息</Button><Button onClick={() => void leave(() => onProjectTab('资产'))}>项目资产</Button></div>
    </header>
    <div className="flex-1 min-h-0 relative">
      {pane && <section className="absolute top-2 bottom-2 right-2 z-[35] rounded-2xl bg-panel border border-line overflow-hidden flex flex-col" style={{ left: window.innerWidth < 760 ? 8 : offset }} aria-label="任务预览" data-testid="task-preview">
        <div className="h-12 shrink-0 px-4 flex items-center gap-3 border-b border-line-soft">
          {pane === 'canvas' ? <Image size={16} className="text-mut shrink-0" /> : <FileText size={16} className="text-mut shrink-0" />}
          <span className="flex-1 truncate font-medium text-[12px]">{pane === 'canvas' ? '设计画布' : pane === 'file' ? fileAsset?.name : output?.title}</span>
          {pane === 'results' && <button title="上传本地修改稿" onClick={onUpload} className="text-mut hover:text-pri p-2"><FolderInput size={15} /></button>}
          <button aria-label="收起预览" onClick={() => void leave(() => setPane(null))} className="rounded-full p-2 text-mut hover:bg-fill"><X size={17} /></button>
        </div>
        {pane === 'file' && fileAsset && <FilePreview key={fileAsset.adopted} asset={fileAsset} />}
        {pane === 'canvas' && <div className="flex-1 min-h-0 relative">
          {canvas && <CanvasArea key={canvasKey} leftOffset={16} marks={marks} onMarksChange={setMarks} onMarkToChat={() => setCollapsed(false)} onSendToAgent={items => { setInbox({ ts: Date.now(), items }); setCollapsed(false) }} projectBridge={{ initial: canvas, toolbar, embedded: true,
            onChange: d => { canvasRef.current = d; canvasDirty.current = true }, onSave: saveCanvas,
            onArchive: async files => { const assets = await Promise.all(files.map(async f => ({ ...makeAsset(f.name, '款式设计', await storeFile(new File([f.blob], f.name + '.png', { type: 'image/png' })), '任务产出'), taskId: task.id }))); return onArchive(assets) },
            onExit: () => void leave(() => setPane(null)), onDiscard: () => void leave(() => setPane(null)),
          }} />}
        </div>}
        {pane === 'canvas' && <div ref={setToolbar} className="p-3 border-t border-line-soft [&_button]:text-[11px]" />}
        {pane === 'results' && <div className="flex-1 min-h-0 overflow-auto">
          {!output ? null
          : <div className="p-5 lg:p-8 max-w-[1080px] mx-auto" data-testid="agent-output"><div className="flex flex-wrap items-start justify-between gap-3 mb-6"><div><p className="text-[11px] text-mut">{output.document?.kind ?? (output.type === 'search' ? '检索结果集' : '任务产出')} · {dateLabel(output.date)}</p><h2 className="text-[21px] font-semibold mt-2">{output.title}</h2></div><div className="flex gap-2 flex-wrap"><Button disabled={exporting} onClick={() => void download(output)}><Download size={14} />{output.document?.kind === '企划 PPT' ? '下载 PPT' : '下载'}</Button><Button primary disabled={exporting} onClick={() => void archive(output, selected.length ? output.assets.filter(a => selected.includes(a.id)) : output.assets)}><FolderInput size={14} />{output.archivedIds?.length ? output.document ? '归档新修订' : '归档所选' : '归档到项目'}</Button></div></div>
            {output.document ? <div className="space-y-5"><p className="text-[11px] text-mut">点击文字即可编辑，修改随任务保存。</p>{output.document.sections.map((s, i) => <section key={s.id} className="border-b border-line-soft pb-5"><div className="flex gap-3 items-start"><span className="text-pri text-[12px] mt-2 tabular-nums">{String(i + 1).padStart(2, '0')}</span><div className="flex-1 min-w-0"><input aria-label={`章节标题 ${i + 1}`} className="w-full font-semibold text-[16px] bg-transparent rounded-lg p-2 outline-none focus:bg-fill-2" value={s.title} onChange={e => updateOutput({ ...output, document: { ...output.document!, updated: now(), sections: output.document!.sections.map(x => x.id === s.id ? { ...x, title: e.target.value } : x) } })} /><textarea aria-label={`章节内容 ${i + 1}`} className="w-full text-[13px] leading-7 bg-transparent rounded-lg p-2 outline-none focus:bg-fill-2 resize-y" rows={Math.max(3, Math.min(10, Math.ceil(s.body.length / 40)))} value={s.body} onChange={e => updateOutput({ ...output, document: { ...output.document!, updated: now(), sections: output.document!.sections.map(x => x.id === s.id ? { ...x, body: e.target.value } : x) } })} /></div></div></section>)}</div>
            : <>{output.body && <details className="mb-5 rounded-xl bg-fill-2 px-4 py-3" open={output.type === 'notes'}><summary className="cursor-pointer text-[12px]">本轮说明与依据</summary><p className="whitespace-pre-wrap text-[12px] leading-7 mt-3 text-ink-3">{output.body}</p></details>}
              {(output.type === 'images' || output.type === 'search') && <div className="flex gap-2 flex-wrap mb-4"><Button onClick={() => setSelected(selected.length === output.assets.length ? [] : output.assets.map(a => a.id))}>{selected.length === output.assets.length ? '取消全选' : '全选'}</Button><Button disabled={!selected.length} onClick={() => void addToCanvas(output.assets.filter(a => selected.includes(a.id)))}>加入画布{selected.length ? `（${selected.length}）` : ''}</Button><Button disabled={!selected.length} onClick={() => { reference(output.assets.filter(a => selected.includes(a.id))); notice('已引用到对话，可继续提出设计要求') }}>引用到对话</Button></div>}
              <div className="grid grid-cols-1 min-[1250px]:grid-cols-2 gap-4">{output.assets.map(a => <div key={a.id} className={`rounded-2xl border overflow-hidden ${selected.includes(a.id) ? 'border-pri' : 'border-line'}`}><button className="w-full" aria-label={`预览 ${a.name}`} onClick={() => previewAsset(a)}><AssetThumb asset={a} /></button><div className="p-4"><div className="flex items-start gap-2"><input aria-label={`选择${a.name}`} type="checkbox" className="accent-pri mt-1" checked={selected.includes(a.id)} onChange={e => setSelected(e.target.checked ? [...selected, a.id] : selected.filter(id => id !== a.id))} /><div className="min-w-0"><h3 className="font-medium text-[13px]">{a.name}</h3><p className="text-[11px] text-mut mt-1">{a.provenance?.provider ?? a.kind}{a.provenance?.scope ? ` · ${a.provenance.scope}` : ''}</p></div></div><div className="mt-3 flex gap-3 text-[11px] text-pri"><button onClick={() => reference([a])}>引用</button>{adopted(a).mime.startsWith('image/') && <button onClick={() => void addToCanvas([a])}>加入画布</button>}<button onClick={() => void readBlob(adopted(a)).then(b => downloadBlob(b, adopted(a).name)).catch(e => notice(e.message))}>下载</button>{project.assets.some(v => v.id === a.id) && <button onClick={() => onOpenAsset(a.id)}>查看资产</button>}</div></div></div>)}</div>
            </>}
            {output.archivedIds?.length ? <p className="flex gap-2 items-center text-[12px] text-ok mt-6"><Check size={14} />已归档 {output.archivedIds.length} 项 · <button className="underline" onClick={() => void leave(() => onProjectTab('资产'))}>到项目资产处理版本与选款</button></p> : null}
          </div>}
        </div>}
      </section>}
      <ChatPanel width={width} onWidthChange={setWidth} minW={300} maxW={Math.min(720, window.innerWidth * .58)} defaultW={448} collapsed={collapsed} onCollapsedChange={setCollapsed} marks={marks} onRemoveMark={id => setMarks(m => m.filter(v => v.id !== id))} onClearMarks={() => setMarks([])} onDeliver={() => {}} onOpenCanvas={() => setPane('canvas')} onBackHome={() => void leave(onBack)} agentInbox={inbox} onAgentInboxConsumed={() => setInbox(null)}
        projectAgent={{ layout: pane ? 'split' : 'full', prepared: !!session.draft, projectName: project.name, taskName: task.name, items: session.items, busy, draft, onDraftConsumed: () => setDraft(undefined), onSend: send, onAnswer: answer, onSkip: i => answer(i, [], undefined, true), onStop: stop, onNew: () => void leave(onCreate), onHistory: () => setModal('history'), onCapabilities: () => { setQuery(''); setModal('capabilities') }, onReferences: () => { setQuery(''); setModal('references') }, onUpload: files => void upload(files), composerContext,
          renderArtifact: artifactCard,
        }} />
    </div>
    {toast && <div role="status" className="fixed bottom-6 left-1/2 -translate-x-1/2 rounded-full px-5 py-3 bg-ink text-panel z-[70] text-[12px]">{toast}</div>}
    {modal === 'info' && <Modal title="任务信息" onClose={() => setModal(null)}><div className="space-y-5"><label className="block text-[12px]">任务名称<input className={`${input} mt-2`} value={task.name} onChange={e => save(sessionRef.current, { name: e.target.value })} /></label><TaskLifecycle project={project} task={task} onSave={onSave} /><details className="text-[12px] leading-6"><summary className="cursor-pointer">项目背景与数据源</summary><p className="mt-3 whitespace-pre-wrap">{task.context.goal}</p><p>客户：{task.context.customers.join('、') || '自主开发'} · 品牌：{task.context.brands.join('、') || '未关联'}</p><p>数据源：{task.context.connectors.join('、') || '本次提供的资料'}</p></details><Button onClick={() => void leave(() => onProjectTab('交付'))}>查看项目交付</Button></div></Modal>}
    {modal === 'history' && <Modal title="项目中的对话" onClose={() => setModal(null)}><div className="flex justify-end mb-4"><Button onClick={() => void leave(onCreate)}><Plus size={14} />新建对话</Button></div><div className="space-y-2">{project.tasks.map(t => <button key={t.id} onClick={() => { if (t.id === task.id) setModal(null); else void leave(() => onOpenTask(t.id)) }} className={`w-full p-4 rounded-xl flex items-center gap-3 text-left ${t.id === task.id ? 'bg-pri-soft' : 'hover:bg-fill-2'}`}><MessageSquare size={16} className="text-mut" /><span className="flex-1 truncate">{t.name}</span><Badge>{t.status}</Badge></button>)}</div></Modal>}
    {modal === 'capabilities' && <Modal title="选择技能、专家或专家团" onClose={() => setModal(null)}><div className="flex gap-1 rounded-full bg-fill p-1 w-fit mb-4">{(['skill', 'expert', 'team'] as const).map(k => <button key={k} onClick={() => setKind(k)} className={`px-5 py-2 rounded-full ${kind === k ? 'bg-panel font-medium' : 'text-mut'}`}>{capabilityLabel[k]}</button>)}</div><SearchBox value={query} onChange={setQuery} placeholder="搜索能力" /><div className="space-y-2 mt-4">{shownCapabilities.map(c => <button key={c.id} onClick={() => { const ids = sessionRef.current.capabilityIds; save({ ...sessionRef.current, capabilityIds: ids.includes(c.id) ? ids.filter(id => id !== c.id) : [...ids, c.id] }) }} className={`w-full text-left p-4 rounded-xl border ${session.capabilityIds.includes(c.id) ? 'border-pri bg-pri-soft' : 'border-line hover:bg-fill-2'}`}><div className="flex items-center gap-2">{c.kind === 'team' ? <Users size={16} /> : <Zap size={16} />}<span className="font-medium flex-1">{c.name}</span>{session.capabilityIds.includes(c.id) && <Check size={16} className="text-pri" />}</div><p className="text-[12px] text-ink-3 leading-6 mt-2">{c.description}</p>{c.members && <p className="text-[11px] text-mut mt-2">{c.members.map(id => capabilityById(id)?.name ?? id).join(' / ')}</p>}</button>)}</div><div className="sticky bottom-0 bg-panel pt-4 flex justify-end"><Button primary onClick={() => setModal(null)}>完成选择（{session.capabilityIds.length}）</Button></div></Modal>}
    {modal === 'references' && <Modal title="引用项目资料" description="选择后带入当前对话，不会改变其他任务。" onClose={() => setModal(null)}><SearchBox value={query} onChange={setQuery} placeholder="搜索项目资料与任务成果" /><div className="space-y-2 mt-4">{[...project.assets, ...session.outputs.flatMap(o => o.assets).filter(a => !project.assets.some(p => p.id === a.id))].filter((a, i, arr) => arr.findIndex(v => v.id === a.id) === i && a.name.toLowerCase().includes(query.toLowerCase())).map(a => <button key={a.id} onClick={() => task.refs.some(r => r.assetId === a.id) ? save(sessionRef.current, { refs: task.refs.filter(r => r.assetId !== a.id) }) : reference([a])} className="w-full p-4 rounded-xl border border-line flex gap-3 items-center text-left hover:bg-fill-2"><FileText size={16} className="text-mut" /><span className="flex-1">{a.name}</span>{task.refs.some(r => r.assetId === a.id) && <Check size={15} className="text-pri" />}</button>)}</div>{!project.assets.length && !session.outputs.length && <Empty title="还没有资料" text="可从输入框的 + 上传趋势报告、PPT、图片或其他文件。" />}<div className="mt-5 flex justify-end"><Button primary onClick={() => setModal(null)}>完成引用</Button></div></Modal>}
  </div>
}

function AssetThumb({ asset }: { asset: Asset }) {
  const revision = adopted(asset), [src, setSrc] = useState(revision.url ?? '')
  useEffect(() => { let live = true, url = ''; if (revision.mime.startsWith('image/') && !revision.url) void readBlob(revision).then(b => { url = URL.createObjectURL(b); if (live) setSrc(url) }).catch(() => {}); return () => { live = false; if (url) URL.revokeObjectURL(url) } }, [revision])
  return revision.mime.startsWith('image/') ? <img src={src} alt={asset.name} className="w-full aspect-[4/3] object-contain bg-fill-2" /> : <div className="h-20 bg-fill-2 grid place-items-center"><FileText size={25} className="text-mut" /></div>
}
