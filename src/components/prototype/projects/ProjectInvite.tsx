import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { Check, Link2, Users, X } from 'lucide-react'
import { now, uid, type Project } from './model'
import { Button, Modal } from './ui'

type Update = (transform: (p: Project) => Project, activity: string) => boolean

export function ProjectInvite({ project, onUpdate }: { project: Project; onUpdate: Update }) {
  const [open, setOpen] = useState(false), [preview, setPreview] = useState(false), [copied, setCopied] = useState(false)
  const [message, setMessage] = useState('')
  const members = [{ name: project.owner, role: '所有者' }, ...(project.members ?? []).filter(m => m.name !== project.owner)]
  const invite = project.invitation ?? { token: uid(), mode: 'request' as const, requests: [] }
  function ensure() { return project.invitation || (onUpdate(p => ({ ...p, invitation: invite }), '创建项目邀请链接') ? invite : null) }
  async function copy() {
    const value = ensure(); if (!value) return
    const url = new URL(location.href); url.search = new URLSearchParams({ view: 'projects', project: project.id, invite: value.token }).toString()
    try { await navigator.clipboard.writeText(url.href); setCopied(true); setTimeout(() => setCopied(false), 2400) } catch { setMessage('未能复制，请允许浏览器使用剪贴板。') }
  }
  function decide(name: string, approve: boolean) {
    onUpdate(p => ({ ...p, members: approve && !(p.members ?? []).some(m => m.name === name) ? [...(p.members ?? []), { name, role: '项目成员' }] : p.members, invitation: { ...p.invitation!, requests: p.invitation!.requests.filter(r => r.name !== name) } }), `${approve ? '通过' : '婉拒'} ${name} 的加入申请`)
  }
  return <>
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild><button className="flex items-center gap-2 bg-ink text-panel rounded-full px-4 h-9 text-[12px]" aria-label="邀请项目成员"><Users size={14} />邀请{invite.requests.length > 0 && <span className="w-4 h-4 rounded-full bg-panel text-ink grid place-items-center text-[10px]">{invite.requests.length}</span>}</button></Popover.Trigger>
      <Popover.Portal><Popover.Content align="end" sideOffset={12} className="z-[60] w-[360px] max-w-[calc(100vw-24px)] bg-panel border border-line rounded-3xl text-ink text-[13px] overflow-hidden" aria-label="项目团队成员">
        <div className="flex items-center justify-between p-5"><h2 className="font-semibold">项目团队成员 · {members.length}</h2><Popover.Close aria-label="关闭邀请" className="text-mut rounded-full p-1 hover:bg-fill"><X size={16} /></Popover.Close></div>
        <div className="px-5 pb-4 space-y-4 max-h-64 overflow-auto">{members.map(m => <div key={m.name} className="flex items-center gap-3"><span className="w-8 h-8 rounded-full bg-pri-soft text-pri grid place-items-center text-[12px]">{m.name.slice(0, 1)}</span><span className="flex-1">{m.name}</span><span className="text-[11px] text-ink-3">{m.name === project.owner ? '所有者' : '成员'}</span></div>)}</div>
        {!!invite.requests.length && <div className="px-5 py-4 border-t border-line-soft"><h3 className="text-[11px] text-mut mb-3">待处理申请 · {invite.requests.length}</h3>{invite.requests.map(r => <div key={r.name} className="flex items-center gap-3 py-2"><span className="flex-1">{r.name}</span><button className="text-mut text-[12px]" onClick={() => decide(r.name, false)}>婉拒</button><button className="text-pri text-[12px]" onClick={() => decide(r.name, true)}>同意</button></div>)}</div>}
        <div className="p-4 border-t border-line-soft"><Button className="w-full justify-center !bg-ink !text-panel !border-ink" onClick={() => void copy()}>{copied ? <Check size={15} /> : <Link2 size={15} />}{copied ? '已复制邀请链接' : '复制链接'}</Button><div className="flex items-center justify-between mt-4 text-[12px]"><span className="text-ink-3">获得链接的人</span><select aria-label="邀请加入方式" value={invite.mode} className="bg-transparent rounded-full py-1 pl-3 pr-1 outline-none" onChange={e => { const mode = e.target.value as 'request' | 'direct'; onUpdate(p => ({ ...p, invitation: { ...invite, mode } }), '更新邀请加入方式') }}><option value="request">申请后加入</option><option value="direct">直接加入</option></select></div><button className="text-[11px] text-mut hover:text-pri mt-4" onClick={() => { if (ensure()) { setOpen(false); setPreview(true) } }}>预览邀请页</button>{message && <p role="status" className="text-[11px] text-err mt-2">{message}</p>}</div>
      </Popover.Content></Popover.Portal>
    </Popover.Root>
    {preview && <JoinProject project={project} onUpdate={onUpdate} onClose={() => { setPreview(false); setOpen(true) }} />}
  </>
}

export function JoinProject({ project, onUpdate, onClose }: { project: Project; onUpdate: Update; onClose: () => void }) {
  const name = '李晴（示例）'
  const [sent, setSent] = useState(false)
  const joined = project.members?.some(m => m.name === name), pending = project.invitation?.requests.some(r => r.name === name)
  const direct = project.invitation?.mode === 'direct'
  function join() {
    if (!project.invitation) return
    if (onUpdate(p => direct ? { ...p, members: [...(p.members ?? []).filter(m => m.name !== name), { name, role: '项目成员' }], invitation: { ...p.invitation!, requests: p.invitation!.requests.filter(r => r.name !== name) } } : { ...p, invitation: { ...p.invitation!, requests: [...p.invitation!.requests.filter(r => r.name !== name), { name, date: now() }] } }, direct ? `${name} 通过链接加入项目` : `${name} 申请加入项目`)) setSent(true)
  }
  return <Modal title="项目邀请" onClose={onClose}><div className="text-center py-6"><div className="w-14 h-14 rounded-2xl bg-pri-soft text-pri grid place-items-center mx-auto"><Users size={25} /></div><p className="text-ink-3 text-[12px] mt-5">{project.owner} 邀请你参与</p><h2 className="text-[22px] font-semibold mt-2">{project.name}</h2><p className="text-[12px] text-ink-3 mt-3">一起讨论、共享资料，完成项目交付。</p><Button primary className="mt-8 mx-auto" disabled={joined || pending || sent} onClick={join}>{joined ? '已加入项目' : pending || sent ? '申请已发送，等待同意' : direct ? '加入项目' : '申请加入'}</Button><p className="text-[11px] text-mut mt-5">以 {name} 体验 · 仅演示本机邀请流程</p></div></Modal>
}
