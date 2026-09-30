import { useEffect, useState } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'
import JSZip from 'jszip'
import { adopted, downloadBlob, readBlob, type Asset } from './model'
import { sandboxHTML } from './documentExport'
import { Button } from './ui'

const xml = (text: string) => new DOMParser().parseFromString(text, 'application/xml')
const nodes = (root: Document | Element, tag: string) => Array.from(root.getElementsByTagNameNS('*', tag))
type Preview = { text?: string; paragraphs?: string[]; html?: string; pdf?: string; sheets?: { name: string; rows: string[][] }[]; notice?: string }

// Lightweight local Office content preview, not a fidelity editor or remote upload.
async function officePreview(blob: Blob, name: string): Promise<Preview> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer())
  const read = async (path: string) => xml(await zip.file(path)?.async('string') ?? '')
  if (/\.docx$/i.test(name)) return { paragraphs: nodes(await read('word/document.xml'), 'p').map(p => nodes(p, 't').map(t => t.textContent ?? '').join('')), notice: 'Word 内容预览 · 完整排版请下载后查看' }
  if (/\.pptx$/i.test(name)) {
    const paths = Object.keys(zip.files).filter(p => /^ppt\/slides\/slide\d+\.xml$/.test(p)).sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    return { paragraphs: await Promise.all(paths.map(async (p, i) => `第 ${i + 1} 页\n${nodes(await read(p), 'p').map(p => nodes(p, 't').map(t => t.textContent).join('')).join('\n')}`)), notice: 'PPT 文字预览 · 下载后可继续编辑' }
  }
  const strings = nodes(await read('xl/sharedStrings.xml'), 'si').map(e => nodes(e, 't').map(t => t.textContent).join(''))
  const workbook = await read('xl/workbook.xml'), relations = await read('xl/_rels/workbook.xml.rels')
  const sheets = await Promise.all(nodes(workbook, 'sheet').map(async sheet => {
    const relation = nodes(relations, 'Relationship').find(r => r.getAttribute('Id') === sheet.getAttribute('r:id'))
    const target = relation?.getAttribute('Target') ?? ''
    const path = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`
    const rows = nodes(await read(path), 'row').slice(0, 200).map(row => {
      const cells: string[] = []
      for (const c of nodes(row, 'c')) {
        const column = (c.getAttribute('r') ?? 'A').replace(/[0-9]/g, '').split('').reduce((n, s) => n * 26 + s.charCodeAt(0) - 64, 0) - 1
        if (column < 0 || column >= 40) continue
        const value = nodes(c, 'v')[0]?.textContent ?? ''
        cells[column] = c.getAttribute('t') === 's' ? strings[Number(value)] ?? '' : c.getAttribute('t') === 'inlineStr' ? nodes(c, 't').map(t => t.textContent).join('') : value
      }
      return Array.from({ length: Math.max(1, cells.length) }, (_, i) => cells[i] ?? '')
    })
    return { name: sheet.getAttribute('name') ?? '工作表', rows }
  }))
  return { sheets, notice: 'Excel 内容预览 · 每表显示前 200 行 / 40 列，公式显示文件内保存的值' }
}

export function FilePreview({ asset }: { asset: Asset }) {
  const revision = adopted(asset), [preview, setPreview] = useState<Preview | null>(null), [error, setError] = useState(''), [sheet, setSheet] = useState(0)
  useEffect(() => {
    let live = true, url = ''
    async function load() {
      try {
        const blob = await readBlob(revision)
        let value: Preview
        if (/\.(docx|xlsx|pptx)$/i.test(revision.name)) value = await officePreview(blob, revision.name)
        else if (revision.mime === 'application/pdf') { url = URL.createObjectURL(blob); value = { pdf: url } }
        else if (/\.html?$/i.test(revision.name) || revision.mime === 'text/html') value = { html: sandboxHTML(await blob.text()) }
        else if (revision.mime.startsWith('text/') || /\.(md|txt|json|csv)$/i.test(revision.name)) value = { text: await blob.text() }
        else value = { notice: '此格式暂不支持在线预览，可下载到本地查看。' }
        if (live) setPreview(value)
      } catch { if (live) setError('暂时无法读取此文件，请下载到本地查看。') }
    }
    void load(); return () => { live = false; if (url) URL.revokeObjectURL(url) }
  }, [revision])
  return <div className="flex-1 min-h-0 flex flex-col" data-testid="file-preview">
    <div className="px-5 py-3 border-b border-line-soft flex items-center justify-between gap-3"><span className="text-[11px] text-mut">{preview?.notice ?? '文件预览'}</span><Button onClick={() => void readBlob(revision).then(b => downloadBlob(b, revision.name)).catch(() => setError('下载失败，请重试'))}><Download size={13} />下载</Button></div>
    {!preview && !error && <div className="flex-1 grid place-items-center"><Loader2 size={22} className="animate-spin text-mut" /></div>}
    {error && <p className="p-6 text-[12px] text-ink-3">{error}</p>}
    {preview?.pdf && <iframe title={asset.name} src={preview.pdf} className="flex-1 w-full border-0" />}
    {preview?.html && <iframe title={asset.name} srcDoc={preview.html} sandbox="" className="flex-1 w-full border-0 bg-white" />}
    {preview?.text !== undefined && <pre className="flex-1 overflow-auto p-6 whitespace-pre-wrap font-sans text-[13px] leading-7">{preview.text}</pre>}
    {preview?.paragraphs && <div className="flex-1 overflow-auto p-7 space-y-4">{preview.paragraphs.map((p, i) => <p key={i} className="whitespace-pre-wrap text-[13px] leading-7">{p}</p>)}</div>}
    {preview?.sheets && <><div className="flex gap-2 p-3 border-b border-line-soft overflow-auto">{preview.sheets.map((s, i) => <button key={i} className={`rounded-full px-3 py-1.5 text-[12px] whitespace-nowrap ${sheet === i ? 'bg-pri-soft text-pri' : 'text-mut'}`} onClick={() => setSheet(i)}>{s.name}</button>)}</div><div className="flex-1 overflow-auto p-4"><table className="border-collapse text-[12px] w-full"><tbody>{preview.sheets[sheet]?.rows.map((row, i) => <tr key={i}><th className="border border-line bg-fill-2 p-2 text-mut font-normal">{i + 1}</th>{row.map((cell, j) => <td key={j} className="border border-line p-2 min-w-24 whitespace-pre-wrap">{cell}</td>)}</tr>)}</tbody></table></div></>}
    {preview && !preview.text && !preview.html && !preview.pdf && !preview.paragraphs && !preview.sheets && <div className="flex-1 grid place-items-center"><FileText size={38} className="text-mut" /></div>}
  </div>
}
