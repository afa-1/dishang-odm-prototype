import { useSyncExternalStore } from 'react'
import type { Project, Revision } from './model'
import { OFFICIAL_TEAMS } from '../skills'
import { ODM_TEAMS } from './capabilities'

export type ProfileKind = 'customer' | 'brand'
export interface Profile {
  id: string; kind: ProfileKind; name: string; aliases: string[]; owner: string; contact: string
  category: string; requirements: string; positioning: string; audience: string; style: string; price: string
  customerIds: string[]; documents: Revision[]; updated: string
}
export interface ProfileReference { id: string; kind: ProfileKind; name: string; summary: string; documents: Revision[]; capturedAt: string }
interface DirectoryState { records: Profile[]; error?: string }
export const DIRECTORY_KEY = 'hyy-odm-directory-v1'
const listeners = new Set<() => void>()
const keyName = (name: string) => name.trim().normalize('NFKC').toLocaleLowerCase()
const legacyId = (kind: ProfileKind, name: string) => `legacy-${kind}-${encodeURIComponent(name)}`
export function blankProfile(kind: ProfileKind, name = ''): Profile {
  return { id: crypto.randomUUID(), kind, name, aliases: [], owner: '', contact: '', category: '', requirements: '', positioning: '', audience: '', style: '', price: '', customerIds: [], documents: [], updated: new Date().toISOString() }
}
const customerNames = ['北辰服饰（示例）', '远山户外（示例）', '都市衣橱（示例）']
const brandNames = ['NORDEN（示例）', 'FIELDWORK（示例）', 'URBAN DAILY（示例）']
const seeds: Profile[] = [...customerNames.map((name, i) => ({ ...blankProfile('customer', name), id: legacyId('customer', name), owner: '业务团队（示例）', category: ['风衣 / 轻外套', '户外服装', '都市通勤'][i], requirements: '示例开发要求：优先复用内部样衣，实际成本、交期与检测要求以确认后的 Brief 为准。' })), ...brandNames.map((name, i) => ({ ...blankProfile('brand', name), id: legacyId('brand', name), customerIds: [legacyId('customer', customerNames[i])], positioning: ['日常通勤与轻户外', '户外功能与日常穿着', '简洁都市衣橱'][i], audience: '待业务确认', style: '简洁、易搭配（示例）' }))]
let cachedKey: string | undefined, cached: DirectoryState = { records: [] }
function matches(p: Profile, name: string) { return [p.name, ...p.aliases].some(n => keyName(n) === keyName(name)) }
function validRecord(p: unknown): p is Profile {
  if (!p || typeof p !== 'object') return false
  const r = p as Record<string, unknown>
  return (r.kind === 'customer' || r.kind === 'brand') && ['id', 'name', 'owner', 'contact', 'category', 'requirements', 'positioning', 'audience', 'style', 'price', 'updated'].every(k => typeof r[k] === 'string') && ['aliases', 'customerIds'].every(k => Array.isArray(r[k]) && (r[k] as unknown[]).every(v => typeof v === 'string')) && Array.isArray(r.documents) && r.documents.every(d => d && typeof d.id === 'string' && typeof d.name === 'string' && typeof d.mime === 'string' && typeof d.date === 'string')
}
export function getDirectory(): DirectoryState {
  try {
    const raw = localStorage.getItem(DIRECTORY_KEY), projectRaw = localStorage.getItem('hyy-odm-projects-v1')
    const cacheKey = `${raw ?? ''}\n${projectRaw ?? ''}`
    if (cacheKey === cachedKey) return cached
    let records = structuredClone(seeds)
    if (raw) {
      const data = JSON.parse(raw)
      if (data.version !== 1 || !Array.isArray(data.records) || !data.records.every(validRecord) || new Set(data.records.map((p: Profile) => p.id)).size !== data.records.length) throw new Error('invalid')
      records = data.records
    }
    // Preserve pre-directory projects, including names users entered in the first prototype.
    // Deterministic IDs plus aliases keep links stable across renames before migration is saved.
    try {
      const oldProjects = JSON.parse(projectRaw || '[]')
      if (Array.isArray(oldProjects)) for (const p of oldProjects) for (const kind of ['customer', 'brand'] as const) {
        const field = kind === 'customer' ? 'customers' : 'brands'
        if (Array.isArray(p?.[`${kind}Ids`]) || !Array.isArray(p?.[field])) continue
        for (const name of p[field]) if (typeof name === 'string' && name.trim() && !records.some(r => r.kind === kind && matches(r, name))) records.push({ ...blankProfile(kind, name), id: legacyId(kind, name) })
      }
    } catch { /* Corrupt projects are handled by the project reader; never overwrite them here. */ }
    cachedKey = cacheKey; cached = { records }; return cached
  } catch { cachedKey = undefined; if (!cached.error) cached = { records: [], error: '客户 / 品牌档案无法读取，已暂停修改以保护原数据。' }; return cached }
}
function emit() { cachedKey = undefined; listeners.forEach(fn => fn()); window.dispatchEvent(new Event('odm-directory-change')) }
const subscribe = (fn: () => void) => {
  listeners.add(fn)
  const onStorage = (e: StorageEvent) => { if (e.key === DIRECTORY_KEY || e.key === 'hyy-odm-projects-v1' || e.key === null) { cachedKey = undefined; fn() } }
  window.addEventListener('storage', onStorage)
  return () => { listeners.delete(fn); window.removeEventListener('storage', onStorage) }
}
export function useDirectory() { return useSyncExternalStore(subscribe, getDirectory, getDirectory) }
// Persist imported legacy names before projects begin referring to their IDs.
// Writing the directory first is safe: a failed project write retains the original
// project, while any imported profiles remain available and can still resolve aliases.
export function persistDirectory() {
  const data = getDirectory()
  if (data.error) throw new Error(data.error)
  const json = JSON.stringify({ version: 1, records: data.records })
  if (localStorage.getItem(DIRECTORY_KEY) !== json) localStorage.setItem(DIRECTORY_KEY, json)
}
export function saveProfile(profile: Profile): Profile {
  const data = getDirectory()
  if (data.error) throw new Error(data.error)
  const name = profile.name.trim()
  if (!name) throw new Error('请填写名称')
  if (data.records.some(p => p.kind === profile.kind && p.id !== profile.id && matches(p, name))) throw new Error('该名称或历史名称已有档案，请选择已有档案，避免重复创建')
  const old = data.records.find(p => p.id === profile.id)
  const documents = [...(old?.documents ?? []), ...profile.documents.filter(d => !old?.documents.some(prev => prev.id === d.id))]
  const next = { ...profile, documents, name, aliases: [...new Set([...(old?.aliases ?? []), ...(old && old.name !== name ? [old.name] : [])])], updated: new Date().toISOString() }
  if (next.customerIds.some(id => !data.records.some(r => r.id === id && r.kind === 'customer'))) throw new Error('关联客户不存在，请刷新后重新选择')
  const records = old ? data.records.map(p => p.id === next.id ? next : p) : [...data.records, next]
  try { localStorage.setItem(DIRECTORY_KEY, JSON.stringify({ version: 1, records })) } catch { throw new Error('档案保存失败，请检查浏览器存储空间；原档案未改变') }
  emit(); return next
}
export function profileIds(project: Project, kind: ProfileKind): string[] {
  const known = kind === 'customer' ? project.customerIds : project.brandIds
  if (known) return known
  const names = kind === 'customer' ? project.customers : project.brands
  const records = getDirectory().records
  return names.map(name => records.find(r => r.kind === kind && matches(r, name))?.id ?? legacyId(kind, name))
}
export function hydrateProject(p: Project): Project {
  const directory = getDirectory()
  if (directory.error) throw new Error(directory.error)
  const customerIds = profileIds(p, 'customer'), brandIds = profileIds(p, 'brand')
  const teamNames = [...OFFICIAL_TEAMS, ...ODM_TEAMS].map(t => t.name)
  const experts = (p.experts ?? []).filter(name => !teamNames.includes(name))
  const teams = [...new Set([...(p.teams ?? []), ...(p.experts ?? []).filter(name => teamNames.includes(name))])]
  return { ...p, experts, teams, customerIds, brandIds, customers: customerIds.map((id, i) => directory.records.find(r => r.id === id)?.name ?? p.customers[i] ?? '未找到客户'), brands: brandIds.map((id, i) => directory.records.find(r => r.id === id)?.name ?? p.brands[i] ?? '未找到品牌') }
}
export const profileURL = (kind: ProfileKind, id: string) => `/?view=${kind === 'customer' ? 'customers' : 'brands'}&${kind}=${encodeURIComponent(id)}`
export const profileSummary = (p: Profile) => p.kind === 'customer' ? `常用品类：${p.category || '未填写'}\n开发要求：${p.requirements || '未填写'}` : `定位：${p.positioning || '未填写'}\n客群：${p.audience || '未填写'}\n风格：${p.style || '未填写'}\n价格带：${p.price || '未填写'}\n开发要求：${p.requirements || '未填写'}`
export function resolvePushCustomer(id: string | undefined, name: string) { return id ?? getDirectory().records.find(p => p.kind === 'customer' && matches(p, name))?.id }
