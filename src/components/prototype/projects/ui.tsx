import { cloneElement, useContext, useId, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import { FolderOpen, Search, X } from 'lucide-react'
import { ProjectStorageErrorContext } from './feedback'

export const input = 'w-full h-10 px-3 rounded-xl border border-line-strong bg-panel text-ink text-[13px] placeholder:text-mut-2 focus:border-pri focus:outline-none'
export const textarea = `${input} h-auto py-3 resize-y leading-relaxed`
export const card = 'bg-panel border border-line rounded-2xl'
export function Button({ children, primary, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { primary?: boolean }) {
  return <button type="button" className={`h-9 px-4 rounded-full inline-flex items-center justify-center gap-2 text-[13px] font-medium whitespace-nowrap transition-colors [transition-duration:var(--dur-fast)] [transition-timing-function:var(--ease)] disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline focus-visible:outline-2 focus-visible:outline-pri focus-visible:outline-offset-2 ${primary ? 'bg-pri text-white hover:bg-pri-hover' : 'bg-panel border border-line text-ink-2 hover:border-pri/40 hover:text-pri'} ${className}`} {...props}>{children}</button>
}
export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'blue' | 'green' | 'orange' | 'muted' }) {
  return <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] leading-none whitespace-nowrap ${tone === 'blue' ? 'bg-pri-soft text-pri' : tone === 'green' ? 'bg-ok-soft text-ok' : tone === 'orange' ? 'bg-warn-soft text-warn' : 'bg-fill text-ink-3'}`}>{children}</span>
}
export function Modal({ title, description, children, onClose, wide = false }: { title: string; description?: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const storageError = useContext(ProjectStorageErrorContext)
  return <Dialog.Root open onOpenChange={open => { if (!open) onClose() }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-black/45" /><Dialog.Content {...(!description ? { 'aria-describedby': undefined } : {})} className={`fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-32px)] ${wide ? 'max-w-[880px]' : 'max-w-[560px]'} max-h-[90vh] overflow-y-auto bg-panel border border-line rounded-2xl p-6 text-ink text-[13px] outline-none`}>
    <div className="flex items-center justify-between gap-4 mb-2"><Dialog.Title className="text-[17px] font-semibold">{title}</Dialog.Title><Dialog.Close aria-label="关闭弹窗" title="关闭" className="w-8 h-8 rounded-full flex items-center justify-center text-ink-3 hover:bg-fill"><X size={16} /></Dialog.Close></div>
    {description && <Dialog.Description className="text-ink-3 text-[12px] leading-relaxed mb-5">{description}</Dialog.Description>}
    {storageError && <p role="alert" className="bg-err-soft text-err rounded-xl p-3 mb-4 text-[12px] leading-6">{storageError}</p>}
    {children}
  </Dialog.Content></Dialog.Portal></Dialog.Root>
}
export function Field({ label, children, hint }: { label: string; children: ReactElement<{ id?: string }>; hint?: string }) {
  const id = useId()
  return <div className="block space-y-2"><label htmlFor={id} className="block text-[13px] font-medium">{label}</label>{cloneElement(children, { id })}{hint && <span className="block text-[11px] text-ink-3 leading-relaxed">{hint}</span>}</div>
}
export function Empty({ title, text, children }: { title: string; text: string; children?: ReactNode }) {
  return <div className="py-14 px-5 text-center"><div className="mx-auto w-12 h-12 bg-fill rounded-2xl flex items-center justify-center text-mut mb-4"><FolderOpen size={24} /></div><h3 className="font-medium text-[15px]">{title}</h3><p className="text-ink-3 text-[12px] mt-2 mb-5 leading-relaxed">{text}</p>{children}</div>
}
export function SearchBox({ value, onChange, placeholder }: { value: string; onChange: (s: string) => void; placeholder: string }) {
  return <div className="relative w-full sm:w-64"><Search size={15} className="absolute left-3 top-3 text-mut" /><input aria-label={placeholder} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className={`${input} pl-9`} /></div>
}
export function Choices({ values, selected, onChange }: { values: string[]; selected: string[]; onChange: (s: string[]) => void }) {
  return <div className="flex flex-wrap gap-2">{[...new Set([...values, ...selected])].map(v => <button type="button" key={v} aria-pressed={selected.includes(v)} onClick={() => onChange(selected.includes(v) ? selected.filter(x => x !== v) : [...selected, v])} className={`rounded-full border px-3 py-2 text-[12px] ${selected.includes(v) ? 'bg-pri-soft text-pri border-pri-line' : 'bg-panel border-line text-ink-3 hover:border-pri/40'}`}>{v}</button>)}</div>
}
