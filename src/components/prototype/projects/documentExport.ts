import { adopted, readBlob, safeURL, type Asset, type WorkDocument } from './model'

// A preview must not execute uploaded HTML or request remote resources.
export const sandboxHTML = (html: string) => `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data: blob:; style-src 'unsafe-inline'">${html}`
export const escapeHTML = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
export function sourceAssets(doc: WorkDocument, assets: Asset[]) {
  return doc.refs.flatMap(ref => { const a = assets.find(a => a.id === ref.assetId); return a?.revisions.some(r => r.id === ref.revisionId) ? [{ ...a, adopted: ref.revisionId }] : [] })
}
async function imageData(a: Asset) {
  const r = adopted(a)
  if (!['image/png', 'image/jpeg'].includes(r.mime)) return null
  const blob = await readBlob(r)
  return new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result)); reader.onerror = () => reject(new Error('引用图片无法读取')); reader.readAsDataURL(blob) })
}
export async function reportHTML(doc: WorkDocument, assets: Asset[]): Promise<string> {
  const sources = sourceAssets(doc, assets)
  const images = await Promise.all(sources.map(async a => { const data = await imageData(a); return data ? `<figure><img src="${data}" alt="${escapeHTML(a.name)}"><figcaption>${escapeHTML(a.name)} · ${escapeHTML(a.provenance?.provider ?? '项目上传资料')}</figcaption></figure>` : '' }))
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHTML(doc.title)}</title><style>body{margin:0;background:#f6f6f6;color:#181818;font:15px/1.8 -apple-system,"PingFang SC",sans-serif}main{max-width:900px;margin:32px auto;background:white;padding:48px;border-radius:16px}h1{font-size:32px;line-height:1.35;margin:16px 0}h2{font-size:21px;border-left:3px solid #2a68fe;padding-left:16px;margin-top:36px}.meta,figcaption{font-size:12px;color:#787878}.body{white-space:pre-wrap;overflow-wrap:anywhere}figure{margin:16px 0}img{max-width:100%;max-height:420px;object-fit:contain}.gallery{display:grid;grid-template-columns:1fr 1fr;gap:20px}a{color:#2151c6}li{overflow-wrap:anywhere}footer{margin-top:36px;border-top:1px solid #e8e8e8;padding-top:16px}@media print{body{background:white}main{margin:0;padding:0}.gallery,section{break-inside:avoid}}@media(max-width:640px){main{padding:24px;margin:0}.gallery{grid-template-columns:1fr}}</style></head><body><main><p class="meta">ODM · ${escapeHTML(doc.kind)} · ${doc.confirmedAt ? '已人工确认稿件' : '待确认草稿'}</p><h1>${escapeHTML(doc.title)}</h1>${doc.sections.map(s => `<section><h2>${escapeHTML(s.title)}</h2><div class="body">${escapeHTML(s.body || '待补充')}</div></section>`).join('')}<h2>引用素材</h2><div class="gallery">${images.join('')}</div><ol>${sources.map(a => `<li>${escapeHTML(a.name)} — ${escapeHTML(adopted(a).name)}${a.provenance ? ` · ${escapeHTML(a.provenance.provider)}` : ''}${a.provenance?.url && safeURL(a.provenance.url) ? ` · <a href="${escapeHTML(safeURL(a.provenance.url)!)}" rel="noopener noreferrer" target="_blank">原始来源</a>` : ''}</li>`).join('') || '<li>未引用资料，请人工核查依据。</li>'}</ol><footer class="meta">由人工编辑的任务工作稿导出，未执行 AI 分析。稿件确认不代表客户认可或内部 PLM 放行。生成时间：${escapeHTML(new Date().toLocaleString('zh-CN'))}</footer></main></body></html>`
}

export async function planningPPT(doc: WorkDocument, assets: Asset[]): Promise<Blob> {
  const { default: PptxGenJS } = await import('pptxgenjs')
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'; pptx.author = '迪尚 ODM'; pptx.subject = '人工编辑的企划工作稿'; pptx.title = doc.title
  pptx.theme = { headFontFace: 'Microsoft YaHei', bodyFontFace: 'Microsoft YaHei' }
  const sources = sourceAssets(doc, assets), images = (await Promise.all(sources.map(imageData))).filter((s): s is string => !!s)
  let index = 0
  function slide(title: string, body: string, image?: string) {
    const s = pptx.addSlide(); index++
    s.background = { color: 'FFFFFF' }
    s.addShape(pptx.ShapeType.rect, { x: 0.55, y: 0.55, w: 0.07, h: 0.48, fill: { color: '2A68FE' }, line: { color: '2A68FE' } })
    s.addText(title, { x: 0.85, y: 0.5, w: 11.5, h: 0.75, fontSize: 26, bold: true, color: '181818', breakLine: false, margin: 0, fit: 'shrink' })
    s.addText(body, { x: 0.85, y: 1.65, w: image ? 7.25 : 11.5, h: 4.65, fontSize: 20, color: '4A4A4A', valign: 'top', margin: 0, breakLine: false, fit: 'shrink', paraSpaceAfter: 10, lang: 'zh-CN' })
    if (image) s.addImage({ data: image, x: 8.6, y: 1.65, w: 3.8, h: 4.65, sizing: { type: 'contain', w: 3.8, h: 4.65 } })
    s.addText(`${doc.confirmedAt ? '已人工确认稿件' : '待确认草稿'} · 非 AI 自动分析 / 非 PLM 放行`, { x: 0.85, y: 7.0, w: 10, h: 0.2, fontSize: 9, color: '787878', margin: 0 })
    s.addText(String(index), { x: 12, y: 7.0, w: 0.4, h: 0.2, fontSize: 9, color: '787878', margin: 0 })
  }
  slide(doc.title, `${doc.kind}\n\n基于人工编辑内容及明确引用的项目素材\n可在本地 PowerPoint 中继续编辑，再上传修订。`, images[0])
  doc.sections.forEach((section, i) => {
    const body = section.body || '待补充'
    const chunks = Array.from(body).reduce<string[]>((all, ch, j) => { const k = Math.floor(j / 300); all[k] = (all[k] ?? '') + ch; return all }, [])
    chunks.forEach((chunk, j) => slide(`${section.title}${j ? `（续 ${j + 1}）` : ''}`, chunk, images.length ? images[i % images.length] : undefined))
  })
  const sourceLines = sources.map(a => `${a.name} · ${adopted(a).name}${a.provenance?.provider ? ` · ${a.provenance.provider}` : ''}`)
  if (!sourceLines.length) sourceLines.push('未引用资料。请补充依据后再对外使用。')
  for (let i = 0; i < sourceLines.length; i += 8) slide('资料来源', sourceLines.slice(i, i + 8).join('\n\n'))
  return await pptx.write({ outputType: 'blob' }) as Blob
}
