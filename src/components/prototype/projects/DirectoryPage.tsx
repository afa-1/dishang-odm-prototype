import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router'
import { ArrowUpRight, Building2, ChevronRight, Download, FileText, FolderKanban, Pencil, Plus, Tags, Upload } from 'lucide-react'
import BrandLibPage from '../BrandLibPage'
import { blankProfile, profileIds, profileSummary, profileURL, resolvePushCustomer, saveProfile, useDirectory, type Profile, type ProfileKind } from './directory'
import { dateLabel, downloadBlob, loadProjects, readBlob, storeFile } from './model'
import { Badge, Button, card, Empty, Field, input, Modal, SearchBox, textarea } from './ui'

export function ProfileForm({ kind, initial, onClose, onSaved }: { kind: ProfileKind; initial?: Profile; onClose: () => void; onSaved: (p: Profile) => void }) {
  const { records, error: loadError } = useDirectory()
  const [draft, setDraft] = useState(() => initial ? structuredClone(initial) : blankProfile(kind))
  const [error, setError] = useState('')
  const label = kind === 'customer' ? '客户' : '品牌'
  const set = (k: keyof Profile, value: string) => setDraft(d => ({ ...d, [k]: value }))
  return <Modal title={`${initial ? '编辑' : '新建'}${label}档案`} description="同一份档案供项目引用，修改名称不会切断原有项目关联。此处保存于本机，尚未同步真实业务系统。" onClose={onClose}>
    <form className="space-y-4" onSubmit={e => { e.preventDefault(); try { onSaved(saveProfile(draft)) } catch (e) { setError((e as Error).message) } }}>
      <Field label={`${label}名称 *`}><input autoFocus className={input} maxLength={100} value={draft.name} onChange={e => set('name', e.target.value)} /></Field>
      {kind === 'customer' ? <><div className="grid grid-cols-2 gap-4"><Field label="联系人 / 联系方式"><input className={input} maxLength={200} value={draft.contact} onChange={e => set('contact', e.target.value)} /></Field><Field label="业务负责人"><input className={input} maxLength={80} value={draft.owner} onChange={e => set('owner', e.target.value)} /></Field></div><Field label="常用品类"><input className={input} maxLength={200} value={draft.category} onChange={e => set('category', e.target.value)} placeholder="例如：风衣、衬衫、轻户外" /></Field></> : <>
        <Field label="品牌定位"><input className={input} maxLength={300} value={draft.positioning} onChange={e => set('positioning', e.target.value)} /></Field><div className="grid grid-cols-2 gap-4"><Field label="目标客群"><input className={input} maxLength={200} value={draft.audience} onChange={e => set('audience', e.target.value)} /></Field><Field label="价格带（注明币种 / 口径）"><input className={input} maxLength={100} value={draft.price} onChange={e => set('price', e.target.value)} placeholder="例如：零售价 CNY 500–800" /></Field></div><Field label="风格偏好"><input className={input} maxLength={300} value={draft.style} onChange={e => set('style', e.target.value)} /></Field>
        <div className="space-y-2"><p className="font-medium">关联客户（可选）</p><div className="flex flex-wrap gap-2">{records.filter(p => p.kind === 'customer').map(p => <button type="button" key={p.id} aria-pressed={draft.customerIds.includes(p.id)} onClick={() => setDraft(d => ({ ...d, customerIds: d.customerIds.includes(p.id) ? d.customerIds.filter(id => id !== p.id) : [...d.customerIds, p.id] }))} className={`px-3 py-2 text-[12px] rounded-full border ${draft.customerIds.includes(p.id) ? 'bg-pri-soft border-pri-line text-pri' : 'border-line text-ink-3'}`}>{p.name}</button>)}</div><p className="text-[11px] text-ink-3">用于项目选品牌时优先推荐，不强制绑定，也不会自动改变项目的客户。</p></div>
      </>}
      <Field label={kind === 'customer' ? '开发要求 / 风格偏好' : '品牌规范 / 开发注意事项'}><textarea className={textarea} rows={4} maxLength={10000} value={draft.requirements} onChange={e => set('requirements', e.target.value)} placeholder="填写已知背景；本次开发的具体要求仍在项目中确认。" /></Field>
      {(error || loadError) && <p role="alert" className="text-err">{error || loadError}</p>}<div className="flex justify-end gap-2"><Button onClick={onClose}>取消</Button><Button primary type="submit" disabled={!!loadError}>保存档案</Button></div>
    </form>
  </Modal>
}

export default function DirectoryPage({ kind }: { kind: ProfileKind }) {
  const { records, error } = useDirectory()
  const [params, setParams] = useSearchParams()
  const id = params.get(kind), profile = records.find(p => p.kind === kind && p.id === id)
  const [query, setQuery] = useState(''), [edit, setEdit] = useState(false), [create, setCreate] = useState(false)
  const [projectResult, setProjectResult] = useState(loadProjects)
  const [notice, setNotice] = useState(''), [busy, setBusy] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  useEffect(() => {
    const sync = () => setProjectResult(loadProjects())
    window.addEventListener('storage', sync); window.addEventListener('odm-directory-change', sync); window.addEventListener('odm-projects-change', sync)
    return () => { window.removeEventListener('storage', sync); window.removeEventListener('odm-directory-change', sync); window.removeEventListener('odm-projects-change', sync) }
  }, [])
  const label = kind === 'customer' ? '客户' : '品牌'
  const own = records.filter(r => r.kind === kind)
  const rows = own.filter(r => `${r.name} ${r.owner} ${r.category} ${r.positioning}`.toLowerCase().includes(query.toLowerCase()))
  const projects = projectResult.projects
  const related = profile ? projects.filter(p => profileIds(p, kind).includes(profile.id)) : []
  const brands = profile ? records.filter(p => p.kind === 'brand' && p.customerIds.includes(profile.id)) : []
  const customers = profile ? records.filter(p => p.kind === 'customer' && profile.customerIds.includes(p.id)) : []
  const pushes = profile && kind === 'customer' ? projects.flatMap(p => p.pushes.filter(r => resolvePushCustomer(r.customerId, r.customer) === profile.id).map(r => ({ project: p, record: r }))) : []
  const go = (id?: string) => { setParams({ view: kind === 'customer' ? 'customers' : 'brands', ...(id ? { [kind]: id } : {}) }); setNotice('') }
  async function upload(files: File[]) {
    if (!profile || !files.length) return
    setBusy(true); setNotice('')
    try { const docs = await Promise.all(files.map(storeFile)); saveProfile({ ...profile, documents: [...profile.documents, ...docs] }); setNotice('资料已保存，可在项目任务中按需引用。') } catch (e) { setNotice((e as Error).message) } finally { setBusy(false) }
  }
  return <div className="text-ink text-[13px]" data-testid={`${kind}-directory`}>
    <div className="px-6 lg:px-8 py-5 bg-panel border-b border-line-soft flex items-center justify-between"><div className="flex items-center gap-2 text-ink-3 min-w-0">{kind === 'customer' ? <Building2 size={17} /> : <Tags size={17} />}<button onClick={() => go()} className="hover:text-pri shrink-0">{label}档案</button>{profile && <><ChevronRight size={14} /><span className="truncate text-ink" title={profile.name}>{profile.name}</span></>}</div><Badge>本机原型 · 未连接业务系统</Badge></div>
    <div className="max-w-[1360px] mx-auto px-6 lg:px-8 py-7 space-y-6">
      {error && <p role="alert" className="p-4 bg-err-soft text-err rounded-xl">{error}</p>}{projectResult.error && <p role="alert" className="p-4 bg-warn-soft text-warn rounded-xl">关联项目暂时无法读取，请到项目模块检查本地数据；未覆盖原数据。</p>}{notice && <p role="status" className="p-3 rounded-xl bg-fill text-ink-2">{notice}</p>}
      {!id ? <><div className="flex justify-between items-start gap-4"><div><h1 className="text-[24px] font-semibold">{label}档案</h1><p className="text-ink-3 text-[12px] mt-2">{kind === 'customer' ? '维护合作背景，让客户需求、开发项目和推款反馈互相连接。' : '沉淀品牌定位、风格和规范，为项目提供可引用的设计背景。'}</p></div><Button primary disabled={!!error} onClick={() => setCreate(true)}><Plus size={15} />新建{label}</Button></div><div className="flex justify-between items-center"><SearchBox value={query} onChange={setQuery} placeholder={`搜索${label}档案`} /><span className="text-ink-3 text-[12px]">{rows.length} 个{label}</span></div>
        {!rows.length ? <Empty title={`暂无匹配的${label}`} text="可以调整搜索，或新建一份档案。" /> : <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">{rows.map(p => <button key={p.id} onClick={() => go(p.id)} className={`${card} p-5 text-left hover:border-pri/40 min-w-0`}><div className="flex justify-between mb-4"><span className="w-10 h-10 rounded-xl bg-pri-soft text-pri flex items-center justify-center">{kind === 'customer' ? <Building2 size={20} /> : <Tags size={20} />}</span><ArrowUpRight size={16} className="text-mut" /></div><h2 className="font-semibold text-[16px] truncate" title={p.name}>{p.name}</h2><p className="text-[12px] text-ink-3 mt-2 min-h-10 line-clamp-2">{kind === 'customer' ? p.category || '尚未补充常用品类' : p.positioning || '尚未补充品牌定位'}</p><div className="border-t border-line-soft mt-4 pt-3 flex flex-wrap gap-3 text-[11px] text-ink-3"><span>{projects.filter(project => profileIds(project, kind).includes(p.id)).length} 个关联项目</span><span>{p.documents.length} 份资料</span><span>{kind === 'customer' ? `负责人：${p.owner || '未填写'}` : `${p.customerIds.length} 个关联客户`}</span></div></button>)}</div>}
      </> : !profile ? <Empty title="未找到该档案" text="请返回列表检查，原有项目资料不会被删除。"><Button onClick={() => go()}>返回列表</Button></Empty> : <>
        <div className="flex flex-wrap justify-between gap-4"><div><h1 className="text-[24px] font-semibold break-words">{profile.name}</h1><p className="text-ink-3 text-[12px] mt-2">{kind === 'customer' ? '客户合作背景' : '品牌设计背景'} · 更新于 {dateLabel(profile.updated)}</p></div><div className="flex gap-2"><Button onClick={() => setEdit(true)}><Pencil size={14} />编辑档案</Button><Link className="h-9 px-4 bg-pri text-white rounded-full flex items-center gap-2" to={`/?view=projects&new=1&${kind}=${encodeURIComponent(profile.id)}`}><Plus size={15} />基于此{label}建项目</Link></div></div>
        <div className="grid lg:grid-cols-[minmax(0,1fr)_300px] gap-5"><section className={`${card} p-5`}><h2 className="text-[16px] font-semibold mb-4">{kind === 'customer' ? '基础信息与开发要求' : '品牌定位与设计要求'}</h2>{kind === 'customer' && <div className="grid grid-cols-2 gap-4 mb-5 text-[12px]"><div><p className="text-mut mb-2">联系人 / 联系方式</p><p className="break-words">{profile.contact || '未填写'}</p></div><div><p className="text-mut mb-2">业务负责人</p><p>{profile.owner || '未填写'}</p></div></div>}<p className="text-[13px] text-ink-2 leading-7 whitespace-pre-wrap break-words">{profileSummary(profile)}</p></section><section className={`${card} p-5`}><h2 className="text-[16px] font-semibold mb-4">关联{kind === 'customer' ? '品牌' : '客户'}</h2><div className="space-y-2">{(kind === 'customer' ? brands : customers).map(p => <Link key={p.id} to={profileURL(p.kind, p.id)} className="rounded-xl border border-line px-3 py-3 flex justify-between items-center hover:border-pri/40 gap-2"><span className="truncate" title={p.name}>{p.name}</span><ArrowUpRight size={14} className="text-mut shrink-0" /></Link>)}</div>{!(kind === 'customer' ? brands : customers).length && <p className="text-[12px] text-ink-3">暂无关联。可在品牌档案中维护，不强制建立父子关系。</p>}</section></div>
        <section className={`${card} p-5`}><div className="flex items-center justify-between gap-4 mb-2"><h2 className="text-[16px] font-semibold">{kind === 'customer' ? '客户资料 / Brief' : '品牌规范与参考资料'}</h2><Button disabled={busy} onClick={() => fileInput.current?.click()}><Upload size={14} />{busy ? '正在保存…' : '上传资料'}</Button><input ref={fileInput} className="sr-only" aria-label="上传档案资料" type="file" multiple disabled={busy} onChange={e => { void upload(Array.from(e.target.files ?? [])); e.target.value = '' }} /></div><p className="text-[12px] text-ink-3 mb-4">原件保存在当前浏览器，每份不超过 30 MB；不会自动加入项目或被 AI 读取，创建任务时可按需引用。</p>{!profile.documents.length ? <p className="text-[12px] text-mut py-4">暂无资料，可以上传 Brief、品牌规范、趋势报告或历史款式参考。</p> : <div className="divide-y divide-line-soft">{profile.documents.map(d => <div key={d.id} className="flex items-center gap-3 py-3"><FileText size={17} className="text-ink-3 shrink-0" /><span className="flex-1 min-w-0 truncate" title={d.name}>{d.name}</span><span className="text-[11px] text-mut">{dateLabel(d.date)}</span><Button aria-label={`下载 ${d.name}`} title="下载原文件" className="px-3" onClick={async () => { try { downloadBlob(await readBlob(d), d.name) } catch (e) { setNotice((e as Error).message) } }}><Download size={14} /></Button></div>)}</div>}</section>
        <Link to={`/?view=assets&profile=${encodeURIComponent(profile.id)}`} className={`${card} p-5 flex justify-between items-center hover:border-pri/40`}><div><h2 className="text-[16px] font-semibold">关联公共资料</h2><p className="text-[12px] text-ink-3 mt-2">查看适用于此{label}的趋势报告、厂商资料与项目沉淀成果。</p></div><ArrowUpRight size={18} /></Link><section><h2 className="text-[16px] font-semibold mb-4">关联开发项目 <span className="text-mut text-[12px] font-normal">{related.length}</span></h2>{!related.length ? <div className={`${card} p-6 text-[12px] text-ink-3`}>暂无关联项目，可新建项目，或在已有项目中选择此{label}。</div> : <div className="grid sm:grid-cols-2 gap-3">{related.map(p => <Link key={p.id} to={`/?view=projects&project=${encodeURIComponent(p.id)}&tab=概览`} className={`${card} p-4 flex gap-3 items-center hover:border-pri/40 min-w-0`}><FolderKanban size={19} className="text-pri shrink-0" /><div className="min-w-0 flex-1"><p className="font-medium truncate" title={p.name}>{p.name}</p><p className="text-[11px] text-ink-3 mt-2">{p.season || '季节待定'} · {p.assets.filter(a => a.delivery).length} 项交付</p></div><Badge tone={p.status === '进行中' ? 'blue' : 'muted'}>{p.status}</Badge></Link>)}</div>}</section>
        {kind === 'customer' && <section className={`${card} p-5`}><h2 className="text-[16px] font-semibold mb-2">推款记录与客户反馈</h2><p className="text-[12px] text-ink-3 mb-4">汇总各项目内的原始记录，不重复维护；反馈仍由项目内部评估，不触发 PLM。</p>{!pushes.length ? <p className="py-4 text-[12px] text-mut">暂无推款记录</p> : <div className="space-y-3">{pushes.map(({ project: p, record: r }) => <div key={r.id} className="border border-line rounded-xl p-4"><div className="flex justify-between items-start gap-3"><div><p className="font-medium">{p.name}</p><p className="text-[11px] text-ink-3 mt-1">{dateLabel(r.date)} · {r.items.length} 个款式 · 当时客户名称：{r.customer}</p></div><Link className="text-pri text-[12px] shrink-0" to={`/?view=projects&project=${encodeURIComponent(p.id)}&tab=交付`}>进入项目处理 ↗</Link></div><p className="text-[12px] text-ink-2 bg-fill-2 rounded-xl p-3 mt-3 whitespace-pre-wrap">{r.feedback || '尚未记录客户反馈'}</p></div>)}</div>}</section>}
      </>}
      <p className="text-[11px] text-mut">档案、项目和推款记录通过编号关联；旧对话与已确认交接保留当时快照。此版本仅本机保存，非正式 CRM。</p>
    </div>
    {(create || edit && profile) && <ProfileForm key={edit ? profile?.id : 'new'} kind={kind} initial={edit ? profile : undefined} onClose={() => { setEdit(false); setCreate(false) }} onSaved={p => { setEdit(false); setCreate(false); go(p.id); setNotice('档案已保存，项目关联保持不变。') }} />}
  </div>
}

export function BrandHub({ showToast }: { showToast: (s: string) => void }) {
  const [params, setParams] = useSearchParams()
  const assets = params.get('section') === 'assets'
  return <div className="min-h-full bg-cvs"><div className="px-6 lg:px-8 pt-5 pb-4 bg-panel border-b border-line-soft"><div className="inline-flex bg-fill p-1 rounded-full" role="tablist" aria-label="品牌库内容">{['品牌档案', '原有资产库'].map((name, i) => <button role="tab" aria-selected={assets === !!i} key={name} className={`rounded-full px-5 py-2 text-[13px] ${assets === !!i ? 'bg-panel text-ink font-semibold' : 'text-ink-3'}`} onClick={() => setParams({ view: 'brands', ...(i ? { section: 'assets' } : {}) })}>{name}</button>)}</div></div><div hidden={assets}><DirectoryPage kind="brand" /></div><div hidden={!assets}><BrandLibPage showToast={showToast} /></div></div>
}
