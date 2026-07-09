import { BirdCard, BonusCard, calculateBirdCardValue } from '../store/app.interfaces'
import { bonusSearchMap } from '../store/bonus-search-map'

export type GameHelperHabitat = 'forest' | 'grassland' | 'wetland'

export interface GameHelperScoredBird {
  id: number
  card: BirdCard
  habitat: GameHelperHabitat
}

export interface BonusValueContribution {
  bonusCardId: number
  bonusCardName: string
  supported: boolean
  value: number
}

export interface BirdValueBreakdown {
  baseValue: number
  bonusValue: number
  totalValue: number
  contributions: BonusValueContribution[]
  unsupportedBonusCards: BonusValueContribution[]
}

type BonusScoreRule = (bonusCard: BonusCard, birds: GameHelperScoredBird[]) => number
type BirdNumberSelector = (bird: GameHelperScoredBird) => number | null

const habitats: GameHelperHabitat[] = ['forest', 'grassland', 'wetland']
const regularNestTypes = ['bowl', 'cavity', 'ground', 'platform']

const thresholdMatchRule = (bonusCardId: number): BonusScoreRule =>
  (bonusCard: BonusCard, birds: GameHelperScoredBird[]) =>
    scoreThresholdsFromVp(bonusCard.VP, birds.filter(bird => matchesBonus(bonusCardId, bird.card)).length)

const perBirdMatchRule = (bonusCardId: number, points: number): BonusScoreRule =>
  (_bonusCard: BonusCard, birds: GameHelperScoredBird[]) =>
    birds.filter(bird => matchesBonus(bonusCardId, bird.card)).length * points

const columnPowerColorRule = (points: number): BonusScoreRule =>
  (_bonusCard: BonusCard, birds: GameHelperScoredBird[]) =>
    boardColumns(birds)
      .filter(column => new Set(column.map(bird => bird.card.Color || 'white')).size >= 3)
      .length * points

const rowPowerColorRule = (points: number): BonusScoreRule =>
  (_bonusCard: BonusCard, birds: GameHelperScoredBird[]) => {
    const colorsByHabitat = birds.reduce((acc, bird) => {
      acc[bird.habitat].add(bird.card.Color || 'white')
      return acc
    }, {
      forest: new Set<string>(),
      grassland: new Set<string>(),
      wetland: new Set<string>(),
    })

    return Math.max(
      colorsByHabitat.forest.size,
      colorsByHabitat.grassland.size,
      colorsByHabitat.wetland.size,
    ) * points
  }

const ecologistRule: BonusScoreRule =
  (_bonusCard: BonusCard, birds: GameHelperScoredBird[]) => {
    const fewestBirds = Math.min(...habitats.map(habitat => rowBirds(birds, habitat).length))

    return fewestBirds * 2
  }

const rowNestTypeRule = (habitat: GameHelperHabitat): BonusScoreRule =>
  (bonusCard: BonusCard, birds: GameHelperScoredBird[]) => {
    const nestTypes = birds
      .filter(bird => bird.habitat === habitat)
      .reduce((acc, bird) => {
        if (bird.card['Nest type'] !== 'none') {
          acc.add(bird.card['Nest type'])
        }

        return acc
      }, new Set<string>())

    return scoreThresholdsFromVp(bonusCard.VP, nestTypes.size)
  }

const mechanicalEngineerRule: BonusScoreRule =
  (_bonusCard: BonusCard, birds: GameHelperScoredBird[]) => {
    const nestCounts = birds.reduce((acc, bird) => {
      const nestType = bird.card['Nest type']
      acc[nestType] = (acc[nestType] || 0) + 1
      return acc
    }, {} as { [nestType: string]: number })
    const wildCount = nestCounts.wild || 0
    let sets = 0

    for (let targetSets = 1; targetSets <= 2; targetSets += 1) {
      const wildNeeded = regularNestTypes.reduce((sum, nestType) =>
        sum + Math.max(0, targetSets - (nestCounts[nestType] || 0)), 0)

      if (wildNeeded <= wildCount) {
        sets = targetSets
      }
    }

    if (sets >= 2) {
      return 8
    }

    return sets === 1 ? 3 : 0
  }

const siteSelectionExpertRule: BonusScoreRule =
  (_bonusCard: BonusCard, birds: GameHelperScoredBird[]) =>
    boardColumns(birds).reduce((sum, column) => sum + columnNestScore(column), 0)

const consecutiveWingspanRule = (habitat: GameHelperHabitat): BonusScoreRule =>
  (bonusCard: BonusCard, birds: GameHelperScoredBird[]) =>
    scoreThresholdsFromVp(
      bonusCard.VP,
      longestMonotonicRun(rowBirds(birds, habitat), bird => parseCardNumber(bird.card.Wingspan))
    )

const consecutiveVictoryPointRule = (habitat: GameHelperHabitat): BonusScoreRule =>
  (bonusCard: BonusCard, birds: GameHelperScoredBird[]) =>
    scoreThresholdsFromVp(
      bonusCard.VP,
      longestMonotonicRun(rowBirds(birds, habitat), bird => Number(bird.card['Victory points']) || 0)
    )

const scoreRules: { [bonusCardId: number]: BonusScoreRule } = {
  1000: thresholdMatchRule(1000),
  1001: thresholdMatchRule(1001),
  1002: columnPowerColorRule(3),
  1003: thresholdMatchRule(1003),
  1004: perBirdMatchRule(1004, 2),
  1005: thresholdMatchRule(1005),
  1007: thresholdMatchRule(1007),
  1009: thresholdMatchRule(1009),
  1010: ecologistRule,
  1011: thresholdMatchRule(1011),
  1012: rowPowerColorRule(2),
  1013: perBirdMatchRule(1013, 2),
  1014: thresholdMatchRule(1014),
  1015: perBirdMatchRule(1015, 2),
  1016: thresholdMatchRule(1016),
  1017: perBirdMatchRule(1017, 2),
  1018: thresholdMatchRule(1018),
  1019: thresholdMatchRule(1019),
  1020: perBirdMatchRule(1020, 2),
  1022: thresholdMatchRule(1022),
  1023: thresholdMatchRule(1023),
  1024: thresholdMatchRule(1024),
  1025: thresholdMatchRule(1025),
  1026: perBirdMatchRule(1026, 2),
  1028: thresholdMatchRule(1028),
  1029: thresholdMatchRule(1029),
  1030: thresholdMatchRule(1030),
  1031: perBirdMatchRule(1031, 3),
  1034: consecutiveWingspanRule('forest'),
  1035: consecutiveWingspanRule('grassland'),
  1036: mechanicalEngineerRule,
  1037: siteSelectionExpertRule,
  1038: consecutiveWingspanRule('wetland'),
  1040: perBirdMatchRule(1040, 3),
  1041: rowNestTypeRule('forest'),
  1042: consecutiveVictoryPointRule('forest'),
  1043: rowNestTypeRule('grassland'),
  1044: consecutiveVictoryPointRule('grassland'),
  1046: thresholdMatchRule(1046),
  1047: rowNestTypeRule('wetland'),
  1048: consecutiveVictoryPointRule('wetland'),
}

export function calculateGameHelperBirdValue(
  card: BirdCard,
  targetEntryId: number,
  birds: GameHelperScoredBird[],
  bonusCards: BonusCard[],
): BirdValueBreakdown {
  const baseValue = calculateBirdCardValue(card)
  const contributions = bonusCards.map(bonusCard =>
    calculateBonusContribution(bonusCard, targetEntryId, birds))
  const supportedContributions = contributions.filter(contribution => contribution.supported)
  const unsupportedBonusCards = contributions.filter(contribution => !contribution.supported)
  const bonusValue = supportedContributions
    .reduce((sum, contribution) => sum + contribution.value, 0)

  return {
    baseValue,
    bonusValue,
    totalValue: baseValue + bonusValue,
    contributions: supportedContributions,
    unsupportedBonusCards,
  }
}

export function isGameHelperBonusCardSupported(bonusCardId: number): boolean {
  return !!scoreRules[bonusCardId]
}

function calculateBonusContribution(
  bonusCard: BonusCard,
  targetEntryId: number,
  birds: GameHelperScoredBird[],
): BonusValueContribution {
  const rule = scoreRules[bonusCard.id]

  if (!rule) {
    return {
      bonusCardId: bonusCard.id,
      bonusCardName: bonusCard['Bonus card'],
      supported: false,
      value: 0,
    }
  }

  const scoreWithCard = rule(bonusCard, birds)
  const scoreWithoutCard = rule(
    bonusCard,
    birds.filter(bird => bird.id !== targetEntryId)
  )

  return {
    bonusCardId: bonusCard.id,
    bonusCardName: bonusCard['Bonus card'],
    supported: true,
    value: scoreWithCard - scoreWithoutCard,
  }
}

function matchesBonus(bonusCardId: number, card: BirdCard): boolean {
  return bonusSearchMap[bonusCardId] && bonusSearchMap[bonusCardId].callbackfn(card)
}

function rowBirds(birds: GameHelperScoredBird[], habitat: GameHelperHabitat): GameHelperScoredBird[] {
  return birds.filter(bird => bird.habitat === habitat)
}

function boardColumns(birds: GameHelperScoredBird[]): GameHelperScoredBird[][] {
  const rows = habitats.map(habitat => rowBirds(birds, habitat))
  const maxLength = Math.max(...rows.map(row => row.length))
  const columns: GameHelperScoredBird[][] = []

  for (let index = 0; index < maxLength; index += 1) {
    columns.push(rows.reduce((acc, row) => {
      if (row[index]) {
        acc.push(row[index])
      }

      return acc
    }, [] as GameHelperScoredBird[]))
  }

  return columns
}

function columnNestScore(column: GameHelperScoredBird[]): number {
  const nestCounts = column.reduce((acc, bird) => {
    const nestType = bird.card['Nest type']

    if (nestType !== 'none') {
      acc[nestType] = (acc[nestType] || 0) + 1
    }

    return acc
  }, {} as { [nestType: string]: number })
  const wildCount = nestCounts.wild || 0
  const maxMatchingNests = Math.max(
    wildCount,
    ...regularNestTypes.map(nestType => (nestCounts[nestType] || 0) + wildCount)
  )

  if (maxMatchingNests >= 3) {
    return 3
  }

  return maxMatchingNests >= 2 ? 1 : 0
}

function longestMonotonicRun(birds: GameHelperScoredBird[], selector: BirdNumberSelector): number {
  let bestRun = 0
  let ascendingRun = 0
  let descendingRun = 0
  let previousValue: number | null = null

  birds.forEach(bird => {
    const value = selector(bird)

    if (value === null) {
      ascendingRun = 0
      descendingRun = 0
      previousValue = null
      return
    }

    if (previousValue === null) {
      ascendingRun = 1
      descendingRun = 1
    } else if (value > previousValue) {
      ascendingRun += 1
      descendingRun = 1
    } else if (value < previousValue) {
      descendingRun += 1
      ascendingRun = 1
    } else {
      ascendingRun = 1
      descendingRun = 1
    }

    bestRun = Math.max(bestRun, ascendingRun, descendingRun)
    previousValue = value
  })

  return bestRun
}

function parseCardNumber(value: string | number): number | null {
  const parsedValue = Number(value)

  return Number.isNaN(parsedValue) ? null : parsedValue
}

function scoreThresholdsFromVp(vp: string, count: number): number {
  if (!vp) {
    return 0
  }

  const thresholds = vp.split(';')
    .map(value => parseThreshold(value))
    .filter(Boolean)

  return thresholds.reduce((score, threshold) => {
    const max = threshold.max === null ? Number.POSITIVE_INFINITY : threshold.max

    if (count >= threshold.min && count <= max) {
      return Math.max(score, threshold.points)
    }

    return score
  }, 0)
}

function parseThreshold(value: string): { min: number, max: number | null, points: number } | null {
  const parts = value.split(':')

  if (parts.length < 2) {
    return null
  }

  const condition = parts[0]
  const pointsMatch = parts[1].match(/(\d+)\[point\]/)

  if (!pointsMatch) {
    return null
  }

  const points = Number(pointsMatch[1])
  const rangeMatch = condition.match(/(\d+)\s+to\s+(\d+)/)

  if (rangeMatch) {
    return {
      min: Number(rangeMatch[1]),
      max: Number(rangeMatch[2]),
      points,
    }
  }

  const plusMatch = condition.match(/(\d+)\+/)

  if (plusMatch) {
    return {
      min: Number(plusMatch[1]),
      max: null,
      points,
    }
  }

  const exactMatch = condition.match(/(\d+)/)

  if (exactMatch) {
    const exact = Number(exactMatch[1])

    return {
      min: exact,
      max: exact,
      points,
    }
  }

  return null
}
