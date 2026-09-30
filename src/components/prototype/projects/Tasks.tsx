import { useState } from 'react'
import { ArrowUpRight, MessageSquare, Plus } from 'lucide-react'
import { dateLabel, type Asset, type Project, type Tab, type Task } from './model'
import { Badge, Button, card, Empty, input, SearchBox } from './ui'
import { TASK_STATUSES, statusTone } from './lifecycleModel'
import { ProjectAgentWorkspace } from './ProjectAgentWorkspace'

export function TasksView({ onNavigate, project, activeId, onActive, onCreate, onUpdate, onReplay, onAssets, onOpenAsset, onUpload }: { onNavigate: (tab: Tab, task?: string) => void; project: Project; activeId: string | null; onActive: (id: string | null) => void; onCreate: () => void; onUpdate: (t: Task) => boolean; onReplay: (t: Task) => void; onAssets: (taskId: string, assets: Asset[], mode: 'collect' | 'design' | 'document' | 'delivery') => boolean; onOpenAsset: (id: string) => void; onUpload: (taskId: string) => void }) {
  const [query, setQuery] = useState(''), [filter, setFilter] = useState('全部')
  const task = project.tasks.find(t => t.id === activeId)
  const rows = project.tasks.filter(t => t.name.toLowerCase().includes(query.toLowerCase()) && (filter === '全部' || t.status === filter))
  if (task) return <ProjectAgentWorkspace key={task.id} project={project} task={task} onBack={() => onActive(null)} onCreate={onCreate} onOpenTask={onActive} onSave={onUpdate} onReplay={() => onReplay(task)} onArchive={(assets, target) => onAssets(task.id, assets, target === 'delivery' ? 'delivery' : 'document')} onOpenAsset={onOpenAsset} onUpload={() => onUpload(task.id)} onProjectTab={onNavigate} />
  return <div className="space-y-5"><div className="flex justify-between gap-3"><div><h2 className="text-[18px] font-semibold">项目任务</h2><p className="text-[12px] text-ink-3 mt-1">每个任务都是一段持续对话。按需要调用能力，不限定工作顺序。</p></div><Button primary onClick={onCreate}><Plus size={15} />新建任务</Button></div><div className="flex justify-between flex-wrap gap-3"><SearchBox value={query} onChange={setQuery} placeholder="搜索任务名称" /><select aria-label="任务状态筛选" className={input + ' !w-auto'} value={filter} onChange={e => setFilter(e.target.value)}>{['全部', ...TASK_STATUSES].map(v => <option key={v}>{v}</option>)}</select></div>
    {!rows.length ? <Empty title="从一个任务开始" text="分析 Brief、研究趋势，或直接整理你的设计想法。"><Button onClick={onCreate}>发起对话</Button></Empty> : <div className="space-y-3">{rows.map(t => <button key={t.id} onClick={() => onActive(t.id)} className={card + ' p-5 flex w-full text-left items-center gap-4 hover:border-pri/40'}><div className="w-10 h-10 rounded-xl bg-fill-2 flex items-center justify-center shrink-0"><MessageSquare size={18} className="text-ink-3" /></div><div className="min-w-0 flex-1"><h3 className="font-medium truncate" title={t.name}>{t.name}</h3><p className="text-[11px] text-ink-3 mt-2">{t.assignee || project.owner} · {t.agent?.outputs.length ?? project.assets.filter(a => a.taskId === t.id).length} 项产出 · {dateLabel(t.updated)}</p></div><Badge tone={statusTone(t.status)}>{t.status}</Badge><ArrowUpRight size={16} className="text-mut" /></button>)}</div>}
  </div>
}
