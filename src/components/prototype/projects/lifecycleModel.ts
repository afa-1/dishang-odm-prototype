import { now, type Task } from './model'

export const TASK_STATUSES: Task['status'][] = ['待开始', '进行中', '待人工处理', '待审核', '退回修改', '已完成']
export const statusTone = (status: string) => status === '已完成' || status === '已交接' ? 'green' : /待审核|退回|待人工|修改|待内部/.test(status) ? 'orange' : status === '待开始' || status === '待启动' || status === '已归档' ? 'muted' : 'blue'
export function taskTransition(task: Task, status: Task['status'], note = ''): Task {
  return { ...task, status, updated: now(), reviewNote: note || task.reviewNote, history: [...(task.history ?? []), { date: now(), text: `${task.status} → ${status}${note ? `：${note}` : ''}` }] }
}
