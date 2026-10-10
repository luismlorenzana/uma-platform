// Career objectives per character (docs/master-data.md#objectives).

import { parseLocalText, parseServer, type CharacterId, type LocalText, type RaceFamilyId, type Server, type TrackId } from '../common.js'
import { arrayOf, boolean, fields, id, integer, nonNegativeInteger, positiveInteger, type Parser } from '../parse.js'

/** A race an objective names, with the details the source gives (debut races have no `races` record). */
export interface ObjectiveRace {
  /** The race's own id (`Race.familyId`). */
  familyId: RaceFamilyId
  name: LocalText
  /** Grade code, see `RACE_GRADES`. */
  grade: number
  group: number
  terrain: number
  distance: number
  trackId: TrackId
  iconId: number
  fansGained: number
  fansNeeded: number
  /** A local (NAR) race. */
  nar: boolean
  unreleasedIn: Server[]
}

export interface CareerObjective {
  /** Position in the career, from 1. */
  order: number
  /** The career turn it's due by. */
  turn: number
  /** The original's objective-condition id, type and values. */
  conditionId: number
  conditionType: number
  conditionValue: number
  conditionValue2: number
  raceChoice: number
  raceChoiceDetails: number
  raceType: number
  targetType: number
  /** The race(s) it names; empty for a non-race objective (e.g. a fan count). */
  races: ObjectiveRace[]
}

export interface CareerObjectives {
  /** The original's objective-set id. */
  id: number
  characterId: CharacterId
  objectives: CareerObjective[]
}

const parseObjectiveRace: Parser<ObjectiveRace> = (value, path) => {
  const f = fields(value, path)
  return {
    familyId: f('familyId', id),
    name: f('name', parseLocalText),
    grade: f('grade', integer),
    group: f('group', integer),
    terrain: f('terrain', integer),
    distance: f('distance', positiveInteger),
    trackId: f('trackId', id),
    iconId: f('iconId', integer),
    fansGained: f('fansGained', nonNegativeInteger),
    fansNeeded: f('fansNeeded', nonNegativeInteger),
    nar: f('nar', boolean),
    unreleasedIn: f('unreleasedIn', arrayOf(parseServer)),
  }
}

const parseObjective: Parser<CareerObjective> = (value, path) => {
  const f = fields(value, path)
  return {
    order: f('order', positiveInteger),
    turn: f('turn', nonNegativeInteger),
    conditionId: f('conditionId', integer),
    conditionType: f('conditionType', integer),
    conditionValue: f('conditionValue', integer),
    conditionValue2: f('conditionValue2', integer),
    raceChoice: f('raceChoice', integer),
    raceChoiceDetails: f('raceChoiceDetails', integer),
    raceType: f('raceType', integer),
    targetType: f('targetType', integer),
    races: f('races', arrayOf(parseObjectiveRace)),
  }
}

export const parseCareerObjectives: Parser<CareerObjectives> = (value, path) => {
  const f = fields(value, path)
  return { id: f('id', id), characterId: f('characterId', id), objectives: f('objectives', arrayOf(parseObjective)) }
}
