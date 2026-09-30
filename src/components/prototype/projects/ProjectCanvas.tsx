import { useEffect, useState } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import CanvasArea, { type ProjectCanvasDocument } from '../CanvasArea'
import { adopted, makeAsset, now, readBlob, storeFile, type Asset, type Project, type Revision, type Task } from './model'
import { Button, Modal } from './ui'

const dataURL = (b: Blob) => new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(new Error('图片无法读取')); r.readAsDataURL(b) })
// Blob URLs expire on refresh. Inline only transient blobs in the IndexedDB draft file.
// eslint-disable-next-line react-refresh/only-export-components
export async function durableDraft(draft: ProjectCanvasDocument): Promise<ProjectCanvasDocument> {
  const urls = new Map<string, string>()
  async function walk(value: unknown): Promise<unknown> {
    if (typeof value === 'string' && value.startsWith('blob:')) { if (!urls.has(value)) { const r = await fetch(value); if (!r.ok) throw new Error('画布图片已失效'); urls.set(value, await dataURL(await r.blob())) }; return urls.get(value) }
    if (Array.isArray(value)) return Promise.all(value.map(walk))
    if (value && typeof value === 'object') return Object.fromEntries(await Promise.all(Object.entries(value).map(async ([key, v]) => [key, await walk(v)])))
    return value
  }
  return await walk(draft) as ProjectCanvasDocument
}

export function ProjectCanvas({ project, task, references, onSaveDraft, onArchive, onClose }: { project: Project; task: Task; references: Asset[]; onSaveDraft: (r: Revision) => boolean; onArchive: (assets: Asset[]) => boolean; onClose: () => void }) {
  const [toolbar, setToolbar] = useState<HTMLDivElement | null>(null)
  const [initial, setInitial] = useState<ProjectCanvasDocument>(), [marks, setMarks] = useState<ProjectCanvasDocument['marks']>([]), [error, setError] = useState(''), [discard, setDiscard] = useState(false)
  useEffect(() => {
    let live = true
    async function load() {
      const draft: ProjectCanvasDocument = task.canvas ? JSON.parse(await (await readBlob(task.canvas)).text()) : { cards: [], strokes: [], marks: [] }
      if (!Array.isArray(draft.cards) || !Array.isArray(draft.strokes) || !Array.isArray(draft.marks)) throw new Error('画布草稿格式无法读取，未覆盖原稿')
      for (const a of references) {
        const r = adopted(a), id = `reference-${a.id}-${r.id}`
        if (draft.cards.some(c => c.id === id)) continue
        const url = await dataURL(await readBlob(r)), x = draft.cards.length ? Math.max(...draft.cards.map(c => c.x + c.w)) + 40 : 40
        draft.cards.push({ id, tag: a.name, kind: 'gen', img: url, x, y: 100, w: 300, imgH: 380 })
      }
      if (live) { setInitial(draft); setMarks(draft.marks) }
    }
    void load().catch(e => { if (live) setError((e as Error).message) })
    return () => { live = false }
    // Opened once per canvas session; later task saves must not reinitialize edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  useEffect(() => { const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }; window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn) }, [])
  async function save(draft: ProjectCanvasDocument) {
    setError('')
    try { const durable = await durableDraft(draft); const r = await storeFile(new File([JSON.stringify(durable)], `${task.name}-画布.json`, { type: 'application/json' })); const saved = onSaveDraft(r); if (!saved) setError('画布记录未保存，请检查浏览器存储空间后重试。'); return saved } catch (e) { setError((e as Error).message); return false }
  }
  async function archive(files: { id: string; name: string; blob: Blob }[]) {
    setError('')
    try {
      const assets = await Promise.all(files.map(async f => { const a = makeAsset(`${f.name} · 画布稿`, '款式设计', await storeFile(new File([f.blob], `${f.name}.png`, { type: 'image/png' })), '任务产出'); a.taskId = task.id; a.provenance = { key: `canvas-${task.id}-${f.id}`, scope: '内部', provider: '项目设计画布 · 人工选定归档', collectedAt: now() }; return a }))
      const saved = onArchive(assets); if (!saved) setError('图片归档记录未保存，请检查浏览器存储空间后重试。'); return saved
    } catch (e) { setError((e as Error).message); return false }
  }
  return <Dialog.Root open onOpenChange={open => { if (!open) setDiscard(true) }}><Dialog.Portal><Dialog.Overlay className="fixed inset-0 z-50 bg-panel" /><Dialog.Content onEscapeKeyDown={e => { e.preventDefault(); setDiscard(true) }} className="fixed inset-0 z-50 bg-panel text-ink flex flex-col outline-none"><header className="px-5 py-3 border-b border-line bg-panel"><Dialog.Title className="text-[15px] font-semibold">项目设计画布 · {project.name}</Dialog.Title><Dialog.Description className="text-[11px] text-ink-3 mt-1">归属任务：{task.name}。复用原设计画布；AI 功能仍为厂商演示。保存草稿与归档成果是两个操作。</Dialog.Description><div ref={setToolbar} className="mt-3" /></header>{error && <p role="alert" className="p-3 bg-err-soft text-err text-[12px]">{error}</p>}<div className="relative flex-1 min-h-0">{initial ? <CanvasArea marks={marks} onMarksChange={setMarks} projectBridge={{ initial, toolbar, onSave: save, onArchive: archive, onExit: onClose, onDiscard: () => setDiscard(true) }} /> : <div className="p-8 text-[13px] text-ink-3">{error ? <Button onClick={onClose}>返回任务，保留原稿</Button> : '正在读取参考图与画布草稿…'}</div>}</div>
    {discard && <Modal title="退出画布？" description="尚未保存的画布编辑将丢失。已经归档的图片与之前保存的草稿不受影响。" onClose={() => setDiscard(false)}><div className="flex justify-end gap-3"><Button onClick={() => setDiscard(false)}>继续编辑</Button><Button onClick={onClose}>放弃未保存修改并退出</Button></div></Modal>}
  </Dialog.Content></Dialog.Portal></Dialog.Root>
}
