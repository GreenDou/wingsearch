import { Component, OnInit, ViewChild } from '@angular/core'
import { Store } from '@ngrx/store'
import { search, bonusCardSearch, changeLanguage, resetLanguage, changeAssetPack } from '../store/app.actions'
import { AppState, BonusCard, CardSort } from '../store/app.interfaces'
import { Observable } from 'rxjs'
import { Options } from 'ng5-slider'
import { FormControl } from '@angular/forms'
import { MatAutocompleteSelectedEvent, MatAutocompleteTrigger } from '@angular/material/autocomplete'
import { MatDialog } from '@angular/material/dialog'
import { LanguageDialogComponent } from './language-dialog/language-dialog.component'
import { AssetPackDialogComponent } from './asset-pack-dialog/asset-pack-dialog.component'
import { AnalyticsService } from '../analytics.service'
import { preferredLanguage, supportedLanguages } from '../languages'
import { PreferencesStorageService, SearchQueryPreference } from '../preferences-storage.service'

@Component({
  selector: 'app-search',
  templateUrl: './search.component.html',
  styleUrls: ['./search.component.scss']
})
export class SearchComponent implements OnInit {

  readonly supportedLanguages = supportedLanguages

  readonly supportedExpansions = [
    { value: 'core', display: 'Base game' },
    { value: 'european', display: 'European expansion' },
    { value: 'oceania', display: 'Oceania expansion' },
    { value: 'asia', display: 'Asia' },
    { value: 'americas', display: 'Americas expansion' },
  ]

  readonly assetPacks = [
    { value: 'silhouette', display: "Silhouettes" },
    { value: 'robbie', display: "Robbie's birds" },
    { value: 'diffusion', display: "Stable Diffusion"}
  ]

  readonly sortOptions = [
    { value: CardSort.Default, display: 'Default' },
    { value: CardSort.BirdValueDescending, display: 'Value: high to low' },
    { value: CardSort.BirdValueAscending, display: 'Value: low to high' },
  ]

  query: SearchQueryPreference = {
    main: '',
    bonus: [],
    sort: CardSort.Default,
    stats: {
      habitat: {
        forest: 0,
        grassland: 0,
        wetland: 0
      },
      birds: true,
      hummingbirds: true,
      bonuses: true,
    },
    expansion: {
      core: true,
      european: true,
      oceania: true,
      asia: true,
      americas: true,
    },
    promoPack: {
      promoAsia: true,
      promoCA: true,
      promoEurope: true,
      promoNZ: true,
      promoUK: true,
      promoUS: true
    },
    eggs: {
      min: 0,
      max: 6
    },
    points: {
      min: 0,
      max: 9
    },
    wingspan: {
      min: 0,
      max: 500
    },
    foodCost: {
      min: 0,
      max: 3
    },
    colors: {
      brown: true,
      pink: true,
      white: true,
      teal: true,
      yellow: true
    },
    food: {
      invertebrate: 0,
      seed: 0,
      fruit: 0,
      fish: 0,
      rodent: 0,
      nectar: 0,
      'no-food': 0,
      'wild (food)': 0
    },
    nest: {
      bowl: true,
      cavity: true,
      ground: true,
      none: true,
      platform: true,
      wild: true
    },
    beak: {
      left: true,
      right: true
    }
  }

  swiftStartEnabled(): boolean {
    return this.query.expansion.core
      || this.query.expansion.asia
  }

  tealColorEnabled(): boolean {
    return this.query.expansion.european
      || this.query.expansion.asia
      || this.query.expansion.americas
      || this.query.promoPack.promoAsia
      || this.query.promoPack.promoCA
      || this.query.promoPack.promoEurope
      || this.query.promoPack.promoNZ
      || this.query.promoPack.promoUK
      || this.query.promoPack.promoUS
  }

  yellowColorEnabled(): boolean {
    return this.query.expansion.oceania
      || this.query.expansion.asia
      || this.query.expansion.americas
      || this.query.promoPack.promoAsia
      || this.query.promoPack.promoCA
      || this.query.promoPack.promoEurope
      || this.query.promoPack.promoNZ
      || this.query.promoPack.promoUK
      || this.query.promoPack.promoUS
  }

  nectarEnabled(): boolean {
    return this.query.expansion.oceania
      || this.query.expansion.americas
      || this.query.promoPack.promoAsia
      || this.query.promoPack.promoNZ
  }

  bonusControl = new FormControl()

  filteredBonusCards: Observable<BonusCard[]>
  bonusCards: Observable<BonusCard[]>

  canFitStats: boolean

  eggOptions: Options = {
    showTicksValues: true,
    stepsArray: Array.from(Array(7).keys()).map(key => ({ value: key }))
  }

  pointOptions: Options = {
    showTicksValues: true,
    stepsArray: Array.from(Array(10).keys()).map(key => ({ value: key }))
  }

  wingspanOptions: Options = {
    showTicksValues: true,
    stepsArray: [0, 30, 40, 50, 65, 75, 100, 500].map(key => ({ value: key })),
    translate: value => {
      if (value === 0) { return 'min'; }
      else if (value === 500) { return 'max'; }
      else { return value.toString(); }
    }
  }

  foodCostOptions: Options = {
    showTicksValues: true,
    stepsArray: Array.from(Array(4).keys()).map(key => ({ value: key })),
  }

  eggs = {
    min: 0,
    max: 6
  }

  points = {
    min: 0,
    max: 9
  }

  wingspan = {
    min: 0,
    max: 500
  }

  foodCost = {
    min: 0,
    max: 3
  }

  language = 'en'
  selectedExpansions = ['core', 'european', 'oceania', 'asia', 'americas']
  assetPack = 'silhouette'

  @ViewChild(MatAutocompleteTrigger)
  autocomplete: MatAutocompleteTrigger

  constructor(
    private store: Store<{ app: AppState }>,
    private preferences: PreferencesStorageService,
    public dialog: MatDialog,
    private analytics: AnalyticsService
  ) {
    this.filteredBonusCards = this.store.select(({ app }) => app.activeBonusCards)
    this.bonusCards = this.store.select(({ app }) => app.bonusCards)
    this.language = preferredLanguage(this.preferences.getLanguage())
    this.assetPack = this.preferences.getAssetPack(this.assetPack)
    this.query = this.preferences.getSearchQuery(this.query)
    this.eggs = { ...this.query.eggs }
    this.points = { ...this.query.points }
    this.wingspan = { ...this.query.wingspan }
    this.foodCost = { ...this.query.foodCost }

    this.selectedExpansions = Object.entries(this.query.expansion).reduce((acc, entry) => entry[1] ? [...acc, entry[0]] : acc, [])
    store.dispatch(search(this.query))
  }

  ngOnInit(): void {
    this.canFitStats = window.innerWidth >= 600
    this.bonusControl.valueChanges.subscribe(() => this.onBonusChange())
  }

  onQueryChange() {
    this.preferences.saveSearchQuery(this.query)
    this.store.dispatch(search(this.query))
  }

  onBonusChange() {
    this.store.dispatch(bonusCardSearch({ bonus: this.query.bonus, bonusfield: this.bonusControl.value, expansion: this.query.expansion }))
  }

  sortChange(sort: CardSort) {
    this.query = { ...this.query, sort }
    this.onQueryChange()
  }

  onKeyDown(event: KeyboardEvent) {
    if (event.key === ' ') {
      event.stopPropagation()
    }
  }

  onResize() {
    this.canFitStats = window.innerWidth >= 600
  }

  onStatsChange(stats) {
    this.query.stats = stats
    this.onQueryChange()
  }

  clearFilter() {
    this.eggs = { min: 0, max: 6 }
    this.points = { min: 0, max: 9 }
    this.wingspan = { min: 0, max: 500 }
    this.foodCost = { min: 0, max: 3 }
    this.query = {
      ...this.query,
      main: '',
      bonus: [],
      sort: CardSort.Default,
      stats: {
        habitat: { forest: 0, grassland: 0, wetland: 0 },
        birds: true,
        hummingbirds: true,
        bonuses: true
      },
      eggs: { ...this.eggs },
      points: { ...this.points },
      wingspan: { ...this.wingspan },
      foodCost: { ...this.foodCost },
      colors: { brown: true, pink: true, white: true, teal: true, yellow: true },
      food: { invertebrate: 0, seed: 0, fruit: 0, fish: 0, rodent: 0, nectar: 0, 'wild (food)': 0, 'no-food': 0 },
      nest: { bowl: true, cavity: true, ground: true, none: true, platform: true, wild: true },
      beak: { left: true, right: true }
    }
    this.bonusControl.setValue('')
    this.onBonusChange()
    this.onQueryChange()
  }

  onEggsChange() {
    this.query = { ...this.query, eggs: { ...this.eggs } }
    this.onQueryChange()
  }

  onPointsChange() {
    this.query = { ...this.query, points: { ...this.points } }
    this.onQueryChange()
  }

  onWingspanChange() {
    this.query = { ...this.query, wingspan: { ...this.wingspan } }
    this.onQueryChange()
  }

  onFoodCostChange() {
    this.query = { ...this.query, foodCost: { ...this.foodCost } }
    this.onQueryChange()
  }
  
  addBonus(event: MatAutocompleteSelectedEvent) {
    this.query = { ...this.query, bonus: [...this.query.bonus, event.option.value] }
    this.bonusControl.setValue('')
    this.onBonusChange()
    this.onQueryChange()
  }

  removeBonus(bonus: number) {
    this.query = { ...this.query, bonus: this.query.bonus.filter(id => id !== bonus) }
    this.onBonusChange()
    this.onQueryChange()
  }

  openPanel() {
    this.autocomplete.openPanel()
  }

  togglePack(promoPack: string) {
    this.query = {
      ...this.query,
      promoPack: {
        ...this.query.promoPack, [promoPack]: !this.query.promoPack[promoPack]
      }
    }

    this.onQueryChange()
  }

  togglePower(color: string) {
    this.query = { ...this.query, colors: { ...this.query.colors, [color]: !this.query.colors[color] } }
    this.onQueryChange()
  }

  toggleFood(food: string) {
    this.query = { ...this.query, food: { ...this.query.food, [food]: (this.query.food[food] + 1) % 3 } }
    this.onQueryChange()
  }

  toggleNest(nest: string) {
    this.query = { ...this.query, nest: { ...this.query.nest, [nest]: !this.query.nest[nest] } }
    this.onQueryChange()
  }

  toggleBeak(beak: string) {
    this.query = { ...this.query, beak: { ...this.query.beak, [beak]: !this.query.beak[beak] } }
    this.onQueryChange()
  }

  languageChange(language: string) {
    this.preferences.saveLanguage(language)

    if (language === 'en') {
      this.store.dispatch(resetLanguage({ expansion: this.query.expansion }))
    } else {
      this.store.dispatch(changeLanguage({ language: language, expansion: this.query.expansion, promoPack: this.query.promoPack }))
    }

    this.analytics.setLanguage(language)
  }

  openLanguageDialog() {
    this.dialog.open(LanguageDialogComponent, { closeOnNavigation: true, maxWidth: 'min(700px, 80vw)' })
  }

  assetPackChange(assetPack: string) {
    this.preferences.saveAssetPack(assetPack)

    if (assetPack === 'silhouette') {
      this.store.dispatch(changeAssetPack({ assetPack }))
    } else {
      this.store.dispatch(changeAssetPack({ assetPack }))
      this.dialog.open(AssetPackDialogComponent, { closeOnNavigation: true, maxWidth: 'min(700px, 80vw)', data: {assetPack} })
    }
  }

  currentAssetPackDisplay() {
    return this.assetPacks.find(a => a.value == this.assetPack).display;
  }

  expansionChange(selectedExpansions: string[]) {
    this.query = {
      ...this.query,
      // @ts-ignore
      expansion: {
        ...Object.keys(this.query.expansion).reduce((acc, val) => ({ ...acc, [val]: false }), {}),
        ...selectedExpansions.reduce((acc, val) => ({ ...acc, [val]: true }), {})
      }
    }

    this.onBonusChange()
    this.onQueryChange()
  }
}
