import { useState } from 'react'
import { CheckCircle2, Circle, FileCheck2, PackageOpen } from 'lucide-react'
import { AssetThumb } from './Assets'
import { adopted, now, type Project } from './model'
import { Badge, Button, card, Field, input, Modal, textarea } from './ui'
import type { CaseUpdate } from './CaseWorkbench'

export function DeliveryReview({ project, onUpdate }: { project: Project; onUpdate: CaseUpdate }) {
  const [picker, setPicker] = useState(false), [preview, setPreview] = useState(false), [returnOpen, setReturnOpen] = useState(false), [note, setNote] = useState('')
  const [ids, setIds] = useState<string[]>([])
  const selected = project.assets.filter(a => a.delivery)
  const styles = selected.filter(a => a.kind === '款式设计')
  const readyStyles = styles.filter(a => a.selection === '保留')
  const state = project.review?.state ?? 'draft'
  const reviewer = project.review?.reviewer || project.owner
  const missing = styles.some(a => a.selection !== '保留')
  const canSubmit = readyStyles.length > 0 && !missing && !project.tasks.some(t => t.status === '退回修改')
  const checks = [
    { label: '至少一款已由内部保留', ok: readyStyles.length > 0 },
    { label: '交付中无待选、备选、修改或淘汰款', ok: styles.length > 0 && !missing },
    { label: '退回任务已处理', ok: !project.tasks.some(t => t.status === '退回修改') },
  ]
  function review(state: NonNullable<Project['review']>['state'], note: string) {
    return onUpdate(p => ({ ...p, review: { state, note, reviewer, date: now() }, status: state === 'pending' || state === 'approved' ? '待内部确认' : state === 'returned' ? '修改中' : '进行中' }), `${state === 'pending' ? '提交内部审核' : state === 'approved' ? '内部审核通过，等待人工交接' : '内部退回修改'}：${note || reviewer}`)
  }
  return <section className={`${card} p-5 space-y-5`} data-testid="delivery-review">
    <div className="flex flex-wrap gap-2"><Button onClick={() => { setIds(selected.map(a => a.id)); setPicker(true) }}><PackageOpen size={14} />整理交付内容</Button><Button disabled={!selected.length} onClick={() => setPreview(true)}>预览方案包</Button></div>
    <div className="pt-4 border-t border-line-soft"><div className="flex justify-between items-center gap-3 flex-wrap"><div><h3 className="font-medium text-[15px] flex items-center gap-2"><FileCheck2 size={17} />内部审核</h3><p className="text-[11px] text-ink-3 mt-2">客户反馈不触发通过。内容或采用版本变更后需重新审核；历史快照保持不变。</p></div><Badge tone={state === 'approved' ? 'green' : state === 'draft' ? 'muted' : 'orange'}>{state === 'approved' ? '已审核通过' : state === 'pending' ? '待内部审核' : state === 'returned' ? '退回修改' : '整理中'}</Badge></div>
      <details className="mt-4"><summary className="cursor-pointer text-[11px] text-mut">{canSubmit ? "查看确认条件" : "还有内容需要整理"}</summary><div className="flex flex-wrap gap-x-5 gap-y-2 mt-3 text-[12px]">{checks.filter(c => !canSubmit ? !c.ok : true).map(c => <span key={c.label} className={`flex items-center gap-1.5 ${c.ok ? 'text-ink-3' : 'text-warn'}`}>{c.ok ? <CheckCircle2 size={13} /> : <Circle size={13} />}{c.label}</span>)}</div></details>
      <div className="flex flex-wrap justify-between items-center gap-3 mt-4"><label className="flex items-center gap-2 text-[12px] text-ink-3">内部审核人<select aria-label="内部审核人" disabled={state === 'pending' || state === 'approved'} className={`${input} !w-auto !h-8 !text-[12px]`} value={reviewer} onChange={e => onUpdate(p => ({ ...p, review: { state, reviewer: e.target.value, note: p.review?.note ?? '', date: now() } }), '设置交付审核人')}>{[...new Set([project.owner, ...(project.members ?? []).map(m => m.name), reviewer])].map(n => <option key={n}>{n}</option>)}</select></label><div className="flex gap-2">{(state === 'draft' || state === 'returned') && <Button primary disabled={!canSubmit} onClick={() => review('pending', '本轮交付版本提交内部审核')}>{state === 'returned' ? '修改后重新提交' : '提交内部审核'}</Button>}{state === 'pending' && <><Button onClick={() => setReturnOpen(true)}>退回修改</Button><Button primary disabled={!canSubmit} onClick={() => review('approved', '内部确认本轮设计方案；未决采购事项在样衣开发中继续核查（演示）')}>内部审核通过</Button></>}{state === 'approved' && <Button onClick={() => review('draft', '主动重新整理本轮交付')}>重新整理</Button>}</div></div>
      {project.review?.note && <p className={`mt-4 text-[12px] leading-6 rounded-xl p-3 ${state === 'returned' ? 'bg-warn-soft text-warn' : 'bg-fill-2 text-ink-3'}`}>{project.review.note}</p>}
      {!canSubmit && state !== 'approved' && <p className="mt-3 text-[11px] text-ink-3">先到资产完成内部选款，再整理交付；如有退回任务，请处理并重新提交。</p>}
    </div>
    {picker && <Modal wide title="整理本次交付内容" description="勾选本轮要确认的成果。原始参考资料留在资产中；待选或修改款不能作为正式交付款。" onClose={() => setPicker(false)}><div className="space-y-3 max-h-[55vh] overflow-auto">{project.assets.filter(a => a.kind !== '参考资料').map(a => <label key={a.id} className="flex items-center gap-3 rounded-xl border border-line p-3"><input type="checkbox" className="accent-pri" checked={ids.includes(a.id)} disabled={a.kind === '款式设计' && a.selection !== '保留'} onChange={e => setIds(e.target.checked ? [...ids, a.id] : ids.filter(id => id !== a.id))} /><AssetThumb asset={a} /><div className="flex-1 min-w-0"><p className="font-medium truncate">{a.name}</p><p className="text-[11px] text-ink-3 mt-1">{a.kind} · V{a.revisions.findIndex(r => r.id === a.adopted) + 1}{a.kind === '款式设计' ? ` · ${a.selection}` : ''}</p></div></label>)}</div><div className="flex justify-end gap-2 mt-5"><Button onClick={() => setPicker(false)}>取消</Button><Button primary onClick={() => { if (onUpdate(p => ({ ...p, assets: p.assets.map(a => ({ ...a, delivery: ids.includes(a.id) && (a.kind !== '款式设计' || a.selection === '保留') })) }), '整理本次交付内容')) setPicker(false) }}>保存交付内容</Button></div></Modal>}
    {preview && <Modal wide title={`${project.name} · ODM 方案包`} description="预览当前已采用版本；这是设计开发方案，不代表已完成实体样衣。" onClose={() => setPreview(false)}><div className="space-y-5"><section className="rounded-2xl bg-pri-soft/40 p-5"><p className="text-[11px] text-pri">{project.season} / {project.brands.join('、') || '自主企划'}</p><h3 className="text-[20px] font-semibold mt-2">{project.name}</h3><p className="text-[12px] text-ink-3 leading-6 mt-3">{project.goal}</p></section>{selected.map(a => <div key={a.id} className="rounded-2xl bg-fill-2 p-4"><h4 className="font-medium mb-3">{a.name} · V{a.revisions.findIndex(r => r.id === a.adopted) + 1}</h4>{a.kind === '款式设计' ? <><div className="[&>div]:!h-64"><AssetThumb asset={a} large /></div><p className="text-[12px] text-ink-3 leading-6 whitespace-pre-wrap mt-3">{a.material}</p><p className="text-[12px] text-ink-3 mt-2">选料：{a.materials?.map(m => m.name).join('、') || '待补充'}</p><p className="text-[12px] text-ink-3 mt-2">内部意见：{a.selectionNote || '无补充意见'}</p><p className="text-[11px] text-mut mt-2">Cloud 3D：{a.cloud ? '已绑定，资产详情中打开' : '未绑定真实分享链接'}</p></> : <p className="text-[12px] text-ink-3 whitespace-pre-wrap leading-6">{adopted(a).text?.slice(0, 600) || `${adopted(a).name} · 完整文件可从资产下载。`}</p>}</div>)}</div></Modal>}
    {returnOpen && <Modal title="退回交付方案" description="退回后项目进入修改中，已有历史交接快照不会被更改。" onClose={() => setReturnOpen(false)}><Field label="需要修改什么？ *"><textarea className={textarea} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="例如：去掉未确认款，补充主料待测试项目。" /></Field><div className="mt-4 flex justify-end"><Button primary disabled={!note.trim()} onClick={() => { if (review('returned', note.trim())) { setReturnOpen(false); setNote('') } }}>确认退回</Button></div></Modal>}
  </section>
}
