import { ArrowUpRight, LayoutTemplate } from 'lucide-react'
import { PROJECT_TEMPLATES, type ProjectTemplate } from './capabilities'
import { Badge, card } from './ui'

export function TemplateCards({ onSelect }: { onSelect: (t: ProjectTemplate) => void }) {
  return <section className="mt-8" aria-label="项目模板"><div className="mb-4"><h2 className="text-[18px] font-semibold">从模板创建</h2><p className="text-[12px] text-ink-3 mt-2">预置项目指令与协作能力，选择后仍可自由修改。</p></div><div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{PROJECT_TEMPLATES.map(t => <button type="button" key={t.id} onClick={() => onSelect(t)} className={`${card} p-5 text-left hover:border-pri/40 transition-colors`}><div className="flex gap-3 items-center"><LayoutTemplate size={18} className="text-pri shrink-0" /><h3 className="font-medium flex-1">{t.name}</h3><ArrowUpRight size={14} className="text-mut" /></div><p className="text-[12px] text-ink-3 leading-6 mt-3">{t.description}</p><div className="mt-3 flex flex-wrap gap-2">{t.outputs.map(o => <Badge key={o}>{o}</Badge>)}</div></button>)}</div></section>
}
