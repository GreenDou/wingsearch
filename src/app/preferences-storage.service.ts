import { Injectable } from '@angular/core'
import { CardSort, Expansion, PromoPack } from './store/app.interfaces'

const PREFERENCES_KEY = 'wingsearch.preferences.v1'
const PREFERENCES_VERSION = 1

export interface RangePreference {
  min: number
  max: number
}

export interface SearchQueryPreference {
  main: string
  bonus: number[]
  sort: CardSort
  stats: {
    habitat: {
      forest: number
      grassland: number
      wetland: number
    },
    birds: boolean
    bonuses: boolean
    hummingbirds: boolean
  }
  expansion: Expansion
  promoPack: PromoPack
  eggs: RangePreference
  points: RangePreference
  wingspan: RangePreference
  foodCost: RangePreference
  colors: {
    brown: boolean
    pink: boolean
    white: boolean
    teal: boolean
    yellow: boolean
  }
  food: {
    invertebrate: number
    seed: number
    fruit: number
    fish: number
    rodent: number
    nectar: number
    'wild (food)': number
    'no-food': number
  }
  nest: {
    bowl: boolean
    cavity: boolean
    ground: boolean
    none: boolean
    platform: boolean
    wild: boolean
  }
  beak: {
    left: boolean
    right: boolean
  }
}

export interface GameHelperBirdPreference {
  id: number
  cardId: number | null
  name: string
  habitat: string
  inHand?: boolean
  planned?: boolean
}

export interface GameHelperFoodPreference {
  invertebrate: number
  seed: number
  fruit: number
  fish: number
  rodent: number
  nectar: number
}

export interface GameHelperPreference {
  currentRound: number
  cubesLeft: number
  handHabitat: string
  planHabitat: string
  playedHabitat: string
  foodSupply: GameHelperFoodPreference
  selectedBonusCardIds: number[]
  handBirds: GameHelperBirdPreference[]
  plannedBirds: GameHelperBirdPreference[]
  playedBirds: GameHelperBirdPreference[]
  manualFoodTurns: number | null
  manualEggTurns: number | null
  manualCardTurns: number | null
}

interface WingsearchPreferences {
  version: number
  language?: string
  assetPack?: string
  search?: Partial<SearchQueryPreference>
  gameHelper?: Partial<GameHelperPreference>
}

@Injectable({
  providedIn: 'root'
})
export class PreferencesStorageService {
  static getSearchQuery(defaultQuery: SearchQueryPreference): SearchQueryPreference {
    const preferences = PreferencesStorageService.readPreferences()
    const query = PreferencesStorageService.mergeDefaults(defaultQuery, preferences.search || {})

    query.expansion = PreferencesStorageService.getInitialExpansion(query.expansion)
    query.promoPack = PreferencesStorageService.getInitialPromoPack(query.promoPack)
    query.sort = PreferencesStorageService.getInitialSort(query.sort)

    return query
  }

  static saveSearchQuery(query: SearchQueryPreference): void {
    PreferencesStorageService.updatePreferences({
      search: PreferencesStorageService.clone(query)
    })
  }

  static getInitialExpansion(defaultExpansion: Expansion): Expansion {
    const preferences = PreferencesStorageService.readPreferences()
    const savedExpansion = preferences.search && preferences.search.expansion
    return PreferencesStorageService.mergeDefaults(defaultExpansion, savedExpansion || {})
  }

  static getInitialPromoPack(defaultPromoPack: PromoPack): PromoPack {
    const preferences = PreferencesStorageService.readPreferences()
    const savedPromoPack = preferences.search && preferences.search.promoPack
    return PreferencesStorageService.mergeDefaults(defaultPromoPack, savedPromoPack || {})
  }

  static getInitialSort(defaultSort: CardSort): CardSort {
    const preferences = PreferencesStorageService.readPreferences()
    const savedSort = preferences.search && preferences.search.sort
    return PreferencesStorageService.isCardSort(savedSort) ? savedSort : defaultSort
  }

  static getInitialAssetPack(defaultAssetPack: string): string {
    const preferences = PreferencesStorageService.readPreferences()
    return preferences.assetPack || defaultAssetPack
  }

  getSearchQuery(defaultQuery: SearchQueryPreference): SearchQueryPreference {
    return PreferencesStorageService.getSearchQuery(defaultQuery)
  }

  saveSearchQuery(query: SearchQueryPreference): void {
    PreferencesStorageService.saveSearchQuery(query)
  }

  getLanguage(): string {
    return PreferencesStorageService.readPreferences().language || ''
  }

  saveLanguage(language: string): void {
    PreferencesStorageService.updatePreferences({ language })
  }

  getAssetPack(defaultAssetPack: string): string {
    return PreferencesStorageService.getInitialAssetPack(defaultAssetPack)
  }

  saveAssetPack(assetPack: string): void {
    PreferencesStorageService.updatePreferences({ assetPack })
  }

  getGameHelper(defaultGameHelper: GameHelperPreference): GameHelperPreference {
    const preferences = PreferencesStorageService.readPreferences()
    return PreferencesStorageService.mergeDefaults(defaultGameHelper, preferences.gameHelper || {})
  }

  saveGameHelper(gameHelper: GameHelperPreference): void {
    PreferencesStorageService.updatePreferences({
      gameHelper: PreferencesStorageService.clone(gameHelper)
    })
  }

  private static readPreferences(): WingsearchPreferences {
    const stored = PreferencesStorageService.readStoredPreferences()

    if (stored) {
      return stored
    }

    const migrated = PreferencesStorageService.migrateCookiePreferences()

    if (Object.keys(migrated).length > 1) {
      PreferencesStorageService.writePreferences(migrated)
    }

    return migrated
  }

  private static readStoredPreferences(): WingsearchPreferences | null {
    try {
      const raw = window.localStorage.getItem(PREFERENCES_KEY)

      if (!raw) {
        return null
      }

      const parsed = JSON.parse(raw)

      if (!parsed || parsed.version !== PREFERENCES_VERSION) {
        return null
      }

      return parsed
    } catch (error) {
      return null
    }
  }

  private static updatePreferences(partial: Partial<WingsearchPreferences>): void {
    PreferencesStorageService.writePreferences({
      ...PreferencesStorageService.readPreferences(),
      ...partial,
      version: PREFERENCES_VERSION
    })
  }

  private static writePreferences(preferences: WingsearchPreferences): void {
    try {
      window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
    } catch (error) {
      // Some browsers disable localStorage in private or restricted modes.
    }
  }

  private static migrateCookiePreferences(): WingsearchPreferences {
    const preferences: WingsearchPreferences = { version: PREFERENCES_VERSION }
    const language = PreferencesStorageService.readCookie('language')
    const assetPack = PreferencesStorageService.readCookie('assetPack')
    const expansionKeys = ['core', 'european', 'oceania', 'asia', 'americas']
    const promoPackKeys = ['promoAsia', 'promoCA', 'promoEurope', 'promoNZ', 'promoUK', 'promoUS']
    const hasExpansionCookie = expansionKeys.some(key => PreferencesStorageService.readCookie(`expansion.${key}`) !== '')
    const hasPromoPackCookie = promoPackKeys.some(key => PreferencesStorageService.readCookie(`expansion.${key}`) !== '')

    if (language) {
      preferences.language = language
    }

    if (assetPack) {
      preferences.assetPack = assetPack
    }

    if (hasExpansionCookie || hasPromoPackCookie) {
      preferences.search = {}
    }

    if (hasExpansionCookie) {
      preferences.search.expansion = expansionKeys.reduce((acc, key) => ({
        ...acc,
        [key]: PreferencesStorageService.readCookie(`expansion.${key}`) !== '0'
      }), {}) as Expansion
    }

    if (hasPromoPackCookie) {
      preferences.search.promoPack = promoPackKeys.reduce((acc, key) => ({
        ...acc,
        [key]: PreferencesStorageService.readCookie(`expansion.${key}`) !== '0'
      }), {}) as PromoPack
    }

    return preferences
  }

  private static readCookie(name: string): string {
    if (typeof document === 'undefined') {
      return ''
    }

    const ca: Array<string> = decodeURIComponent(document.cookie).split(';')
    const cookieName = `${name}=`

    for (let i = 0; i < ca.length; i += 1) {
      const c = ca[i].replace(/^\s+/g, '')
      if (c.indexOf(cookieName) === 0) {
        return c.substring(cookieName.length, c.length)
      }
    }

    return ''
  }

  private static mergeDefaults<T>(defaults: T, saved: any): T {
    if (saved === undefined || saved === null) {
      return PreferencesStorageService.clone(defaults)
    }

    if (Array.isArray(defaults)) {
      return (Array.isArray(saved) ? saved : PreferencesStorageService.clone(defaults)) as unknown as T
    }

    if (typeof defaults === 'object') {
      const result = {}
      Object.keys(defaults).forEach(key => {
        result[key] = PreferencesStorageService.mergeDefaults(defaults[key], saved[key])
      })
      return result as T
    }

    return saved
  }

  private static clone<T>(value: T): T {
    return JSON.parse(JSON.stringify(value))
  }

  private static isCardSort(sort: any): sort is CardSort {
    return Object.keys(CardSort).map(key => CardSort[key]).includes(sort)
  }
}
