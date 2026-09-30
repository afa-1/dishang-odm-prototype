import { useState } from 'react'
import { Check, History } from 'lucide-react'
import { dateLabel, now, type Project, type Task } from './model'
import { Badge, Button, card, Field, input, Modal, textarea } from './ui'
import { statusTone, taskTransition } from './lifecycleModel'

export function TaskLifecycle({ project, task, onSave, canSubmit = true }: { project: Project; task: Task; onSave: (task: Task) => boolean; canSubmit?: boolean }) {
  const [returnOpen, setReturnOpen] = useState(false), [note, setNote] = useState('')
  const members = [...new Set([...(project.members ?? []).map(m => m.name), project.owner, task.assignee, task.reviewer].filter((x): x is string => !!x))]
  return <section className={`${card} p-4 space-y-3`} aria-label="任务分工与审核">
    <div className="flex items-center justify-between gap-3 flex-wrap"><div className="flex items-center gap-2"><Badge tone={statusTone(task.status)}>{task.status}</Badge><span className="text-[12px] text-ink-3">AI 执行与人工审核分开记录</span></div><div className="flex flex-wrap gap-2">
      {task.status === '待开始' && !task.caseStage && <Button onClick={() => onSave(taskTransition(task, '进行中', '开始处理'))}>开始任务</Button>}
      {['进行中', '待人工处理', '退回修改'].includes(task.status) && <Button primary disabled={!canSubmit} onClick={() => onSave(taskTransition(task, '待审核', '负责人提交成果'))}>{task.status === '退回修改' ? '修改完成，重新提交' : '提交任务审核'}</Button>}
      {task.status === '待审核' && <><Button onClick={() => setReturnOpen(true)}>退回修改</Button><Button primary onClick={() => onSave(taskTransition(task, '已完成', `${task.reviewer || project.owner} 审核通过（原型操作）`))}><Check size={14} />审核通过</Button></>}
      {task.status === '已完成' && <Button onClick={() => onSave(taskTransition(task, '进行中', '重新打开任务；旧交接快照不变'))}>重新打开</Button>}
    </div></div>
    <div className="flex flex-wrap items-center gap-3 text-[12px]"><label className="flex items-center gap-2 text-ink-3">负责人<select aria-label="任务负责人" className={`${input} !w-auto !h-8 !text-[12px]`} value={task.assignee || project.owner} onChange={e => onSave({ ...task, assignee: e.target.value, history: [...(task.history ?? []), { date: now(), text: `分配负责人：${e.target.value}` }] })}>{members.map(n => <option key={n}>{n}</option>)}</select></label><label className="flex items-center gap-2 text-ink-3">审核人<select aria-label="任务审核人" className={`${input} !w-auto !h-8 !text-[12px]`} value={task.reviewer || project.owner} onChange={e => onSave({ ...task, reviewer: e.target.value, history: [...(task.history ?? []), { date: now(), text: `设置审核人：${e.target.value}` }] })}>{members.map(n => <option key={n}>{n}</option>)}</select></label></div>
    {task.status === '退回修改' && <p className="rounded-xl bg-warn-soft text-warn p-3 text-[12px]">退回原因：{task.reviewNote}。修改工作稿或上传修订后重新提交。</p>}
    {!!task.history?.length && <details><summary className="cursor-pointer text-[11px] text-ink-3"><History size={12} className="inline mr-1" />流转记录 · {task.history.length}</summary><div className="mt-2 max-h-36 overflow-auto space-y-2">{[...task.history].reverse().map((h, i) => <p key={i} className="text-[11px] text-ink-3 leading-5">{dateLabel(h.date)} · {h.text}</p>)}</div></details>}
    {returnOpen && <Modal title="退回任务" description="说明需要修改的内容，负责人可在原任务里继续完善。" onClose={() => setReturnOpen(false)}><Field label="退回原因 *"><textarea className={textarea} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="例如：核实材料成分来源，并补充成本待确认说明。" /></Field><div className="flex justify-end mt-4"><Button primary disabled={!note.trim()} onClick={() => { if (onSave(taskTransition(task, '退回修改', note.trim()))) { setReturnOpen(false); setNote('') } }}>确认退回</Button></div></Modal>}
  </section>
}
