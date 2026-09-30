import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { hydrateProject } from './directory'
import { ArrowUpRight, Building2, ChevronRight, FileText, FolderKanban, MessageSquare, PanelRightClose, PanelRightOpen, Pencil, Plus, Plug, Settings2, Sparkles, Users } from 'lucide-react'
import { AssetsView, AssetDetail, UploadForm } from './Assets'
import { ConfigForm, ProjectForm } from './ProjectForms'
import { TasksView } from './Tasks'
import { newAgentTask } from './projectAgentModel'
import { DeliveryView } from './Delivery'
import { snapshot, dateLabel, loadProjects, log, saveProjects, TABS, type Asset, type Project, type Tab, type Task } from './model'
import { Badge, Button, card, Empty, SearchBox } from './ui'
import { ProjectStorageErrorContext } from './feedback'
import { TemplateCards } from './TemplatePicker'
import type { ProjectTemplate } from './capabilities'
import { ProjectOverview } from './ProjectOverview'
import { ProjectInvite, JoinProject } from './ProjectInvite'
import { createCaseProject } from './zaraDemo'

export default function ProjectsPage() {
  const [initial] = useState(loadProjects)
  const [projects, setProjects] = useState(initial.projects)
  const projectsRef = useRef(projects)
  const [storageError, setStorageError] = useState(initial.error ?? '')
  const [toast, setToast] = useState(''), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const [params, setParams] = useSearchParams()
  const projectId = params.get('project'), activeId = params.get('task')
  const project = projects.find(p => p.id === projectId)
  const tab: Tab = TABS.includes(params.get('tab') as Tab) ? params.get('tab') as Tab : '概览'
  const [query, setQuery] = useState(''), [scope, setScope] = useState('全部项目')
  const [form, setForm] = useState<'create' | 'edit' | 'config' | 'task' | 'upload' | null>(() => new URLSearchParams(location.search).get('new') === '1' ? 'create' : null)
  const [assetId, setAssetId] = useState<string | null>(null), [uploadTask, setUploadTask] = useState<string | undefined>()
  const [configOpen, setConfigOpen] = useState(false)
  const [template, setTemplate] = useState<ProjectTemplate | undefined>()
  const asset = project?.assets.find(a => a.id === assetId)
  function notify(s: string) { setToast(s); clearTimeout(timer.current); timer.current = setTimeout(() => setToast(''), 3200) }
  useEffect(() => {
    if (!initial.error) { try { saveProjects(initial.projects) } catch { queueMicrotask(() => setStorageError('浏览器存储不可用，修改无法保存。请检查浏览器设置。')) } }
    const sync = () => { const result = loadProjects(); if (result.error) setStorageError(result.error); else { projectsRef.current = result.projects; setProjects(result.projects) } }
    window.addEventListener('storage', sync); window.addEventListener('odm-directory-change', sync)
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('odm-directory-change', sync); clearTimeout(timer.current) }
  }, [initial])
  function commit(next: Project[]) {
    if (initial.error) { notify(initial.error); return false }
    try { const hydrated = next.map(hydrateProject); saveProjects(hydrated); projectsRef.current = hydrated; setProjects(hydrated); setStorageError(''); return true } catch { setStorageError('保存失败：浏览器存储空间不足或被禁用。本次修改未保存。'); notify('保存失败，本次修改未保存，请检查浏览器存储空间'); return false }
  }
  function update(transform: (p: Project) => Project, activity: string) {
    return commit(projectsRef.current.map(p => {
      if (p.id !== projectId) return p
      let next = transform(p)
      const signature = (v: Project) => JSON.stringify(v.assets.filter(a => a.delivery).map(snapshot))
      if (next.review === p.review && p.review && ['pending', 'approved'].includes(p.review.state) && signature(next) !== signature(p)) {
        next = { ...next, status: '修改中', review: { ...p.review, state: 'returned', note: '交付内容或采用版本发生变化，请重新提交内部审核。' } }
      }
      return log(next, activity)
    }))
  }
  function navigate(id: string | null, nextTab: Tab = '概览', task?: string | null) {
    setParams({ view: 'projects', ...(id ? { project: id, tab: nextTab } : {}), ...(task ? { task } : {}) })
    setAssetId(null)
  }
  function newTask(a?: Asset) { if (!project) return; const t = newAgentTask(project, a); if (update(p => ({ ...p, tasks: [t, ...p.tasks] }), '新建项目对话')) { setAssetId(null); navigate(project.id, '任务', t.id) } }
  function replayTask(source: Task) { if (!project) return; const t: Task = { ...newAgentTask(project), name: source.name.replace(/ · 新演示$/, '') + ' · 新演示', caseStage: source.caseStage, caseRun: source.caseRun ? { ...source.caseRun, state: 'idle', step: 0 } : undefined, agent: undefined }; if (update(p => ({ ...p, tasks: [t, ...p.tasks] }), '新建演示对话，保留原任务')) navigate(project.id, '任务', t.id) }
  function upload(taskId?: string) { setUploadTask(taskId); setForm('upload') }
  function changeAsset(id: string, patch: Partial<Asset>, activity: string) { return update(p => ({ ...p, assets: p.assets.map(a => a.id === id ? { ...a, ...patch } : a) }), activity) }
  function saveTask(t: Task) { const brief = t.documents?.filter(d => d.kind === 'Brief 拆解').at(-1); return update(p => ({ ...p, status: p.status === '待启动' && t.status === '进行中' ? '进行中' : p.status, ...(t.status === '已完成' && brief ? { requirements: { ...structuredClone(brief), confirmedAt: new Date().toISOString() } } : {}), tasks: p.tasks.map(x => x.id === t.id ? t : x) }), `更新任务：${t.name}`) }
  function saveTaskAssets(taskId: string, assets: Asset[], mode: 'collect' | 'design' | 'document' | 'delivery') {
    return update(p => {
      const next = [...p.assets]
      for (const a of assets) {
        const index = next.findIndex(x => x.id === a.id || a.provenance && x.provenance?.key === a.provenance.key)
        if (index >= 0) {
          if (mode !== 'collect') next[index] = { ...next[index], delivery: mode === 'delivery' || next[index].delivery, revisions: [...next[index].revisions, ...a.revisions.filter(r => !next[index].revisions.some(old => old.id === r.id))] }
          continue
        }
        next.unshift({ ...structuredClone(a), taskId, delivery: mode === 'delivery', selection: '待选' })
      }
      return { ...p, assets: next }
    }, mode === 'document' ? '从任务工作稿导出文件；修订版本待人工采用' : mode === 'design' ? '从设计画布归档图片；修订版本待人工采用' : '从检索结果择优归档参考')
  }
  function openCase(complete = false, fresh = false) {
    const id = fresh ? 'zara-28ss-' + crypto.randomUUID().slice(0, 8) : complete ? 'zara-28ss-showcase' : 'zara-28ss-demo'
    if (projectsRef.current.some(p => p.id === id)) { navigate(id); return }
    try {
      const p = createCaseProject(complete, id)
      if (commit([p, ...projectsRef.current])) { navigate(p.id); notify(complete ? '已打开完整成果示例；可另从头演示' : 'ZARA 案例已准备，从趋势资料收集开始') }
    } catch (e) { notify((e as Error).message) }
  }
  const rows = projects.filter(p => `${p.name} ${p.customers.join(' ')} ${p.brands.join(' ')}`.toLowerCase().includes(query.toLowerCase()) && (scope === '全部项目' || scope === '客户开发' && (p.developmentMode === '客户开发' || !p.developmentMode && p.customers.length > 0) || scope === '自主开发' && (p.developmentMode === '自主开发' || !p.developmentMode && !p.customers.length) || scope === '已归档' && p.status === '已归档'))

  return <ProjectStorageErrorContext.Provider value={storageError}><div className="min-h-full bg-cvs text-ink text-[13px]" data-testid="projects-module">
    <header className="h-[76px] bg-panel border-b border-line-soft px-6 lg:px-8 flex items-center justify-between gap-4"><div className="flex items-center gap-2 min-w-0 text-ink-3"><FolderKanban size={17} className="shrink-0" /><button onClick={() => navigate(null)} className="hover:text-pri shrink-0">项目</button>{project && <><ChevronRight size={14} className="text-mut shrink-0" /><span className="text-ink truncate" title={project.name}>{project.name}</span></>}</div><div className="flex items-center gap-3 shrink-0"><span className="text-[11px] text-mut">演示原型</span>{project && <ProjectInvite project={project} onUpdate={update} />}{project && <button title={configOpen ? '收起项目配置' : '展开项目配置'} aria-label={configOpen ? '收起项目配置' : '展开项目配置'} onClick={() => setConfigOpen(!configOpen)} className="w-9 h-9 flex items-center justify-center rounded-full border border-line text-ink-3 hover:bg-fill">{configOpen ? <PanelRightClose size={17} /> : <PanelRightOpen size={17} />}</button>}</div></header>
    {project && params.get('invite') === project.invitation?.token && <JoinProject project={project} onUpdate={update} onClose={() => navigate(project.id)} />}
    {storageError && <div role="alert" className="m-4 px-4 py-3 bg-err-soft text-err rounded-xl text-[12px]">{storageError}</div>}
    {projectId && !project ? <Empty title="项目不存在或已不在此浏览器中" text="请返回项目列表，选择本机保存的项目。"><Button onClick={() => navigate(null)}>返回项目列表</Button></Empty> : !project ? <div className="max-w-[1360px] mx-auto px-6 lg:px-10 py-9">
      <div className="flex items-start justify-between gap-4 mb-8"><div><h1 className="text-[26px] font-semibold">项目</h1><p className="text-ink-3 text-[13px] mt-2">让每次讨论、每份资料和每个款式，都围绕同一个开发目标。</p></div><Button primary onClick={() => setForm('create')}><Plus size={16} />新建项目</Button></div>
      <section className="mb-7 rounded-3xl border border-pri-line bg-panel p-6 flex flex-wrap items-center justify-between gap-5" data-testid="zara-case-entry"><div><p className="text-[11px] tracking-widest text-pri">完整演示案例 / 2028 SPRING SUMMER</p><h2 className="text-[22px] font-semibold mt-2">ZARA · 城市轻行</h2><p className="text-[12px] text-ink-3 mt-2">从趋势收集到内部选款、方案确认与 PLM 模拟交接。</p></div><div className="flex flex-wrap gap-2"><Button onClick={() => openCase(true)}>查看完整成果</Button><Button primary onClick={() => openCase(false)}>{projects.some(p => p.id === 'zara-28ss-demo') ? '继续逐步演示' : '从头开始演示'}</Button></div></section>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6"><div className="inline-flex flex-wrap bg-fill rounded-full p-1">{['全部项目', '客户开发', '自主开发', '已归档'].map(s => <button key={s} onClick={() => setScope(s)} aria-pressed={scope === s} className={`px-4 py-2 rounded-full text-[12px] ${scope === s ? 'bg-panel text-ink font-semibold' : 'text-ink-3 hover:text-ink'}`}>{s}</button>)}</div><SearchBox value={query} onChange={setQuery} placeholder="搜索项目、客户或品牌" /></div>
      <div className="grid grid-cols-1 min-[1050px]:grid-cols-2 min-[1600px]:grid-cols-3 gap-5">{rows.map(p => <button key={p.id} onClick={() => navigate(p.id)} className={`${card} text-left p-5 hover:border-pri/40 min-w-0`}>
        <div className="flex items-center justify-between mb-5"><div className="w-11 h-11 bg-pri-soft text-pri rounded-xl flex items-center justify-center"><FolderKanban size={22} /></div><div className="flex gap-2">{p.demo && <Badge>示例项目</Badge>}<Badge tone={p.status === '进行中' ? 'blue' : 'muted'}>{p.status}</Badge></div></div><h2 className="text-[17px] font-semibold truncate" title={p.name}>{p.name}</h2><p className="text-[12px] text-ink-3 mt-2 line-clamp-2 min-h-10 leading-5" title={p.goal}>{p.goal || '尚未填写项目目标，可在项目中随时补充。'}</p><div className="flex flex-wrap gap-2 my-4"><Badge>{p.season || '季节待定'}</Badge><Badge>{p.category || '品类待定'}</Badge></div><div className="flex items-center gap-2 text-[12px] text-ink-3 truncate"><Building2 size={14} className="shrink-0" /><span className="truncate" title={p.customers.join('、')}>{p.customers.join('、') || '自主开发 · 暂不关联客户'}</span></div><div className="mt-5 pt-4 border-t border-line-soft flex justify-between gap-3 text-[11px] text-mut"><span>{p.tasks.length} 个任务 · {p.assets.length} 项资产</span><span>{dateLabel(p.updated)} <ArrowUpRight size={12} className="inline ml-1" /></span></div>
      </button>)}<button onClick={() => setForm('create')} className="min-h-72 rounded-2xl border border-dashed border-line-strong hover:border-pri/50 hover:bg-pri-soft/20 text-center flex flex-col items-center justify-center p-6 text-ink-3"><div className="w-11 h-11 rounded-full border border-line flex items-center justify-center mb-4 bg-panel"><Plus size={20} /></div><span className="font-medium text-ink">开启新的开发</span><span className="text-[12px] mt-2">从客户需求出发，也可以先自主开发</span></button></div>
      {!rows.length && <p className="text-ink-3 text-[12px] mt-5">没有匹配的项目，可以调整筛选或新建项目。</p>}
      <TemplateCards onSelect={t => { setTemplate(t); setForm('create') }} />
      <div className="mt-10 pt-6 border-t border-line-soft"><h3 className="text-[13px] font-medium mb-4">在项目里，把想法变成可交付的成果</h3><div className="grid sm:grid-cols-3 gap-6">{[{ icon: MessageSquare, title: '任务中推进', text: '与专家讨论，拆解需求、搜款搜料、完成企划与设计。' }, { icon: FileText, title: '资产中沉淀', text: '任务产出可下载；本地修改后上传，采用合适的版本。' }, { icon: FolderKanban, title: '交付中确认', text: '整理款式与材料，收集客户反馈，由内部决定样衣开发。' }].map(s => <div key={s.title} className="flex items-start gap-3"><s.icon size={17} className="text-mut shrink-0 mt-0.5" /><div><p className="font-medium text-[12px]">{s.title}</p><p className="text-[12px] text-ink-3 leading-6 mt-1">{s.text}</p></div></div>)}</div></div>
      <p className="text-[11px] text-mut mt-8">数据与文件仅存于当前浏览器，非团队共享存储。清理浏览器数据会丢失本机记录，请保留原始文件。</p>
    </div> : <>
      <div className="px-6 lg:px-8 pt-6 bg-panel border-b border-line-soft"><div className="flex justify-between items-start gap-4 mb-5"><div className="min-w-0"><div className="flex flex-wrap gap-3 items-center"><h1 className="text-[22px] font-semibold break-words">{project.name}</h1>{project.demo && <Badge>示例项目</Badge>}<Badge tone={project.status === '进行中' ? 'blue' : 'muted'}>{project.status}</Badge></div><p className="text-ink-3 text-[12px] mt-2">{project.season || '季节待定'} · {project.category || '品类待定'} · 负责人：{project.owner}</p></div><div className="flex gap-2 shrink-0">{project.caseId && <Button onClick={() => openCase(false, true)}>新开一轮演示</Button>}<Button onClick={() => setForm('edit')}><Pencil size={14} />编辑信息</Button></div></div><div role="tablist" aria-label="项目内容" className="inline-flex bg-fill rounded-full p-1 mb-5">{TABS.map(t => <button id={`project-tab-${t}`} role="tab" aria-selected={tab === t} aria-controls="project-tab-panel" key={t} onClick={() => navigate(project.id, t)} className={`px-5 py-2 rounded-full text-[13px] ${tab === t ? 'bg-panel text-ink font-semibold' : 'text-ink-3 hover:text-ink'}`}>{t}</button>)}</div></div>
      <div className="flex items-start relative"><div role="tabpanel" id="project-tab-panel" aria-labelledby={`project-tab-${tab}`} className="flex-1 min-w-0 p-6 lg:p-8">
        {tab === '概览' && <ProjectOverview project={project} onTab={t => navigate(project.id, t)} onTask={id => navigate(project.id, '任务', id)} onNewTask={() => newTask()} onEdit={() => setForm('edit')} onUpdate={update} />}
        {tab === '任务' && <TasksView onNavigate={(tab, task) => navigate(project.id, tab, task)} key={activeId ?? 'list'} project={project} activeId={activeId} onActive={id => navigate(project.id, '任务', id)} onCreate={() => newTask()} onUpdate={saveTask} onReplay={replayTask} onAssets={saveTaskAssets} onOpenAsset={setAssetId} onUpload={upload} />}
        {tab === '资产' && <AssetsView onUpdate={update} onImport={assets => update(p => ({ ...p, assets: [...assets.filter(a => !p.assets.some(x => x.resourceId === a.resourceId)), ...p.assets] }), '从公共资料引用到项目')} project={project} onOpen={setAssetId} onUpload={() => upload()} onReference={newTask} onChange={changeAsset} />}
        {tab === '交付' && <DeliveryView onUpdate={update} project={project} onOpen={setAssetId} onAssets={() => navigate(project.id, '资产')} onChange={changeAsset} onHandoff={h => { if (update(p => ({ ...p, status: '已交接', handoffs: [h, ...p.handoffs] }), `完成内部确认：${h.items.length} 项内容，模拟交接`)) notify('内部确认快照已保存，未发送到真实 PLM') }} onPush={r => { if (update(p => ({ ...p, pushes: [r, ...p.pushes] }), `新建客户推款记录：${r.customer}`)) notify('推款记录已保存，未实际发送') }} onFeedback={(id, feedback) => { if (update(p => ({ ...p, pushes: p.pushes.map(r => r.id === id ? { ...r, feedback } : r) }), '更新客户反馈（不改变内部确认状态）')) notify('客户反馈已保存') }} />}
      </div>{configOpen && <aside className="w-[264px] shrink-0 border-l border-line-soft bg-panel p-5 min-h-[640px] max-lg:absolute max-lg:right-0 max-lg:top-0 max-lg:z-20 max-lg:border max-lg:rounded-2xl">
        <div className="flex justify-between items-center mb-5"><h2 className="font-semibold text-[14px]">项目配置</h2><button title="编辑项目配置" aria-label="编辑项目配置" onClick={() => setForm('config')} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-fill text-ink-3"><Settings2 size={16} /></button></div>
        <button className="text-left w-full border border-line rounded-2xl p-4 hover:border-pri/40 mb-3" onClick={() => setForm('config')}><div className="flex justify-between items-center font-medium">项目指令<Pencil size={13} className="text-mut" /></div><p className="text-[12px] text-ink-3 leading-6 mt-3 line-clamp-2" title={project.goal}>{project.goal || '设定项目背景、开发目标与输出要求'}</p></button>
        {[{ key: 'connectors' as const, title: '连接器', icon: Plug }, { key: 'experts' as const, title: '专家', icon: Users }, { key: 'teams' as const, title: '专家团', icon: Users }, { key: 'skills' as const, title: '技能', icon: Sparkles }].map(s => <button key={s.key} onClick={() => setForm('config')} className="w-full text-left p-4 border border-line rounded-2xl mb-3 hover:border-pri/40 transition-colors"><div className="flex items-center gap-2 font-medium"><s.icon size={15} className="text-ink-3" />{s.title}<span className="text-mut ml-auto text-[12px]">{(project[s.key] ?? []).length}</span><Plus size={14} className="text-mut" /></div><div className="flex flex-wrap gap-2 mt-3">{project[s.key]?.length ? project[s.key]!.slice(0, 3).map(s => <Badge key={s}>{s}</Badge>) : <span className="text-[12px] text-mut">按需添加</span>}{(project[s.key]?.length ?? 0) > 3 && <Badge>+{project[s.key]!.length - 3}</Badge>}</div></button>)}
        <Link to="/?view=skills" className="text-[12px] text-pri block mt-4">浏览统一能力目录 ↗</Link><p className="text-[11px] text-mut leading-6 mt-4">项目配置供新任务引用。<br />连接器仅为配置示意，未接入数据服务；AI 和 PLM 交接均为演示。</p>
      </aside>}</div>
    </>}
    {form === 'create' && <ProjectForm template={template} presetCustomer={params.get('customer') ?? undefined} presetBrand={params.get('brand') ?? undefined} onClose={() => { setForm(null); setTemplate(undefined); if (params.get('new')) setParams({ view: 'projects' }) }} onSave={p => { if (commit([log(p, '创建项目'), ...projectsRef.current])) { setForm(null); setTemplate(undefined); navigate(p.id); notify('项目已创建') } }} />}
    {form === 'edit' && project && <ProjectForm initial={project} onClose={() => setForm(null)} onSave={p => { if (update(() => p, '更新项目信息')) { setForm(null); notify('项目信息已保存') } }} />}
    {form === 'config' && project && <ConfigForm project={project} onClose={() => setForm(null)} onSave={patch => { if (update(p => ({ ...p, ...patch }), '更新项目配置')) { setForm(null); notify('项目配置已保存') } }} />}

    {form === 'upload' && project && <UploadForm onClose={() => setForm(null)} onSave={assets => { if (update(p => ({ ...p, assets: [...assets.map(a => ({ ...a, ...(uploadTask ? { taskId: uploadTask } : {}) })), ...p.assets] }), `上传 ${assets.length} 项资产`)) { setForm(null); notify('资产已保存到本机浏览器') } }} />}
    {asset && <AssetDetail key={asset.id} project={project} asset={asset} onClose={() => setAssetId(null)} onChange={changeAsset} onReference={newTask} toast={notify} />}
    {toast && !activeId && <div role="status" className="fixed z-[70] bottom-6 left-1/2 -translate-x-1/2 max-w-[80vw] bg-ink text-panel text-[12px] px-5 py-3 rounded-full">{toast}</div>}
  </div></ProjectStorageErrorContext.Provider>
}
