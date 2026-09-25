import { OFFICIAL_TEAMS, PLATFORM_SKILLS, loadMyTeams, useSkillStore } from '../skills'
import { ODM_CAPABILITIES, type Capability } from './capabilities'

// The global catalog and project pickers read the same definitions.
export function useCapabilityCatalog(): Capability[] {
  const { mineSkills } = useSkillStore()
  const original: Capability[] = [...PLATFORM_SKILLS, ...mineSkills].map(s => ({ id: s.id, kind: 'skill', name: s.name, description: s.desc, input: '项目目标、参考资料与本次要求。', output: s.desc, review: '演示成果需人工确认，可继续编辑后归档。', taskType: '自由任务', sources: [] }))
  const teams: Capability[] = [...OFFICIAL_TEAMS, ...loadMyTeams()].map(t => ({ id: t.id, kind: 'team', name: t.name, description: t.desc, input: '开发目标与参考资料。', output: '组合技能协作完成本次开发任务。', review: '成果由项目人员确认，不自动流转 PLM。', taskType: '自由任务', sources: [], skills: t.members.map(m => m.skillId) }))
  return [...ODM_CAPABILITIES, ...original, ...teams].filter((c, i, all) => all.findIndex(x => x.name === c.name && x.kind === c.kind) === i)
}
