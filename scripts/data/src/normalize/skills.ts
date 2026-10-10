// GameTora `skills` → master skills, ported from uma-racer (docs/master-data.md#skills). Every rarity is kept,
// evolved skills included, and each inherited (gene) version becomes its own record. uma-racer's kinds, Global term
// rewriting and normal-skill links are game interpretations and stay in its adapter (docs/racer-mapping.md).

import type { Skill, SkillConditionGroup, SkillEvolution, SkillEvolutionRequirement } from '@luismlorenzana/uma-data'
import { id, ids, integer, isRecord, number, records, servers, text, WarningTally, type NormalizeResult, type RawRecord } from './shared'

/** Collapses runs of whitespace, as uma-racer does, so names and descriptions read on one line. */
function clean(value: unknown): string | null {
  const trimmed = text(value)
  return trimmed ? trimmed.replace(/\s+/g, ' ') : null
}

function localizedEnglish(raw: RawRecord): RawRecord | null {
  const loc = isRecord(raw.loc) ? raw.loc : null
  return loc && isRecord(loc.en) ? loc.en : null
}

function conditionGroups(value: unknown): SkillConditionGroup[] | null {
  if (!Array.isArray(value)) return null
  return value.filter(isRecord).map((group) => ({
    precondition: text(group.precondition),
    condition: typeof group.condition === 'string' ? group.condition : '',
    baseTime: integer(group.base_time) ?? 0,
    cooldown: integer(group.cd),
    timeScale: integer(group.time_scale),
    effects: Array.isArray(group.effects)
      ? group.effects.filter(isRecord).flatMap((effect) => {
          const type = integer(effect.type)
          const amount = number(effect.value)
          if (type === null || amount === null) return []
          return [{
            type,
            value: amount,
            target: integer(effect.target),
            targetDetails: integer(effect.target_details),
            valueScale: integer(effect.value_scale),
            additionalActivation: integer(effect.additional_activation),
          }]
        })
      : [],
  }))
}

function tags(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null
  return value.map(text).filter((tag): tag is string => tag !== null)
}

function evolutions(value: unknown): SkillEvolution[] {
  if (!Array.isArray(value)) return []
  return value.filter(isRecord).flatMap((entry) => {
    const skillIds = ids(entry.evos)
    if (skillIds.length === 0) return []
    return [{ outfitId: id(entry.card_id), scenarioId: id(entry.scenario_id), skillIds }]
  })
}

function evolvedFrom(value: unknown): Skill['evolvedFrom'] {
  if (!isRecord(value)) return null
  const skillId = id(value.old)
  return skillId ? { skillId, outfitId: id(value.card_id), scenarioId: id(value.scenario_id) } : null
}

const isScalar = (value: unknown): value is string | number | null =>
  value === null || typeof value === 'string' || (typeof value === 'number' && Number.isFinite(value))

/** `evo_cond` is `[[step, …], …]` where each step is an array of scalars or scalar arrays. */
function evolutionRequirements(value: unknown): SkillEvolutionRequirement[][] {
  if (!Array.isArray(value)) return []
  return value.filter(Array.isArray).map((alternative) =>
    (alternative as unknown[]).filter(Array.isArray).map((step) =>
      (step as unknown[]).filter((part) => isScalar(part) || (Array.isArray(part) && part.every(isScalar))) as SkillEvolutionRequirement,
    ),
  )
}

interface BuildContext {
  unknownServers: WarningTally
}

function build(raw: RawRecord, context: BuildContext): Skill | null {
  const skillId = id(raw.id)
  const rarity = integer(raw.rarity)
  const iconId = id(raw.iconid)
  const ja = clean(raw.jpname)
  const jaDescription = clean(raw.jpdesc)
  const conditions = conditionGroups(raw.condition_groups)
  if (!skillId || rarity === null || !iconId || !ja || !jaDescription || !conditions) return null
  const localized = localizedEnglish(raw)
  const gene = isRecord(raw.gene_version) ? raw.gene_version : null
  return {
    id: skillId,
    rarity,
    name: { ja, en: clean(raw.enname), global: clean(raw.name_en) },
    description: { ja: jaDescription, en: clean(raw.endesc), global: clean(raw.desc_en) },
    costSp: integer(raw.cost),
    iconId,
    activation: integer(raw.activation) ?? 0,
    tags: tags(raw.type) ?? [],
    conditionGroups: conditions,
    globalConditionGroups: conditionGroups(localized?.condition_groups),
    globalIconId: id(localized?.iconid),
    globalTags: tags(localized?.type),
    inheritedSkillId: gene ? id(gene.id) : null,
    parentSkillIds: [],
    versionIds: ids(raw.versions),
    evolutions: evolutions(raw.evo),
    evolvedFrom: evolvedFrom(raw.pre_evo),
    evolutionRequirements: evolutionRequirements(raw.evo_cond),
    scenarioEventIds: ids(raw.sce_e),
    unreleasedIn: servers(raw.unreleased, (code) => context.unknownServers.add('Unknown server code in skills', code)),
  }
}

/**
 * The inherited version nested in `gene_version`. GameTora gives it no Japanese name or translation of its own (the
 * original shows the parent's name), so those come from the parent; its Global name, description, mechanics and
 * cost are its own.
 */
function buildInherited(parent: RawRecord, parentSkill: Skill, context: BuildContext): Skill | null {
  const gene = isRecord(parent.gene_version) ? parent.gene_version : null
  const skillId = gene ? id(gene.id) : null
  const rarity = gene ? integer(gene.rarity) : null
  const iconId = gene ? id(gene.iconid) : null
  const conditions = gene ? conditionGroups(gene.condition_groups) : null
  if (!gene || !skillId || rarity === null || !iconId || !conditions) return null
  const localizedParent = localizedEnglish(parent)
  const localized = isRecord(localizedParent?.gene_version) ? localizedParent.gene_version : null
  const parentIds = ids(gene.parent_skills)
  return {
    id: skillId,
    rarity,
    name: { ja: parentSkill.name.ja, en: parentSkill.name.en, global: clean(gene.name_en) },
    description: { ja: parentSkill.description.ja, en: parentSkill.description.en, global: clean(gene.desc_en) },
    costSp: integer(gene.cost),
    iconId,
    activation: integer(gene.activation) ?? 0,
    tags: parentSkill.tags,
    conditionGroups: conditions,
    globalConditionGroups: conditionGroups(localized?.condition_groups),
    globalIconId: id(localized?.iconid),
    globalTags: parentSkill.globalTags,
    inheritedSkillId: null,
    parentSkillIds: [...new Set([...parentIds, parentSkill.id])],
    versionIds: [],
    evolutions: [],
    evolvedFrom: null,
    evolutionRequirements: [],
    scenarioEventIds: [],
    unreleasedIn: servers(parent.unreleased, (code) => context.unknownServers.add('Unknown server code in skills', code)),
  }
}

export function normalizeSkills(value: unknown): NormalizeResult<Skill> {
  const warnings: string[] = []
  const context: BuildContext = { unknownServers: new WarningTally() }
  const byId = new Map<number, Skill>()
  const rows = records(value)

  for (const raw of rows) {
    const skill = build(raw, context)
    if (!skill) {
      warnings.push(`Skill ${id(raw.id) ?? '<missing id>'} has invalid required fields and was skipped`)
      continue
    }
    if (byId.has(skill.id)) {
      warnings.push(`Skill ${skill.id} repeats; the first row was kept`)
      continue
    }
    byId.set(skill.id, skill)
  }

  for (const raw of rows) {
    const parent = byId.get(id(raw.id) ?? 0)
    if (!parent || parent.inheritedSkillId === null) continue
    const existing = byId.get(parent.inheritedSkillId)
    if (existing) {
      // The same gene can sit under several parents (a unique shared by outfits); collect every parent once.
      if (!existing.parentSkillIds.includes(parent.id)) existing.parentSkillIds.push(parent.id)
      continue
    }
    const inherited = buildInherited(raw, parent, context)
    if (inherited) byId.set(inherited.id, inherited)
    else warnings.push(`Inherited skill ${parent.inheritedSkillId} has invalid required fields and was skipped`)
  }

  warnings.push(...context.unknownServers.lines())
  return { items: [...byId.values()], warnings }
}
