import { useState } from 'react'
import { ArrowRight, FolderKanban, Palette } from 'lucide-react'
import { createCaseProject } from './zaraDemo'
import { loadProjects, saveProjects } from './model'
import { Button, card, Modal } from './ui'

export function DesignEntry({ onClose, onFreeCanvas, onTask }: { onClose: () => void; onFreeCanvas: () => void; onTask: (project: string, task: string) => void }) {
  const [initial] = useState(loadProjects), [error, setError] = useState(initial.error ?? '')
  const projects = initial.projects.filter(p => p.status !== '已归档')
  function startCase() {
    try {
      const loaded = loadProjects()
      if (loaded.error) throw Error(loaded.error)
      const existing = loaded.projects.find(p => p.id === 'zara-28ss-demo')
      const project = existing ?? createCaseProject()
      if (!existing) saveProjects([project, ...loaded.projects])
      onTask(project.id, (project.tasks.find(t => t.caseStage && t.status !== '已完成') ?? project.tasks[0]).id)
    } catch (e) { setError((e as Error).message) }
  }
  return <Modal title="设计工作台" description="在项目里发起 Agent 任务，成果自动带回项目；也可以直接打开自由画布。" onClose={onClose}><div className="space-y-4"><div className="rounded-2xl bg-pri-soft/40 border border-pri-line p-5"><p className="text-[11px] text-pri">完整案例 · ZARA 2028 春夏男装</p><h3 className="text-[18px] font-semibold mt-2">从趋势收集开始，跑通 ODM</h3><p className="text-[12px] text-ink-3 leading-6 mt-2">查看技能、专家与专家团怎样协作，逐步形成报告、企划、设计和交付方案。</p><Button primary className="mt-4" onClick={startCase}>进入案例 Agent<ArrowRight size={14} /></Button></div><div className="max-h-48 overflow-auto space-y-2">{projects.filter(p => p.tasks.length > 0).slice(0, 5).map(p => <button key={p.id} className={`${card} flex gap-3 w-full items-center text-left p-3 hover:border-pri/40`} onClick={() => onTask(p.id, (p.tasks.find(t => t.status !== '已完成') ?? p.tasks[0]).id)}><FolderKanban size={17} className="text-ink-3 shrink-0" /><div className="min-w-0"><p className="text-[12px] font-medium truncate">{p.name}</p><p className="text-[11px] text-ink-3 mt-1">继续项目任务 · {p.tasks.length} 个对话</p></div><ArrowRight size={14} className="ml-auto text-mut shrink-0" /></button>)}</div><Button className="w-full" onClick={onFreeCanvas}><Palette size={15} />打开自由设计画布</Button>{error && <p role="alert" className="text-err text-[12px]">{error}</p>}</div></Modal>
}
