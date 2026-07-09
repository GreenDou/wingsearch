import { Component, OnDestroy } from '@angular/core'
import { FormControl } from '@angular/forms'
import { MatAutocompleteSelectedEvent } from '@angular/material/autocomplete'
import { Store } from '@ngrx/store'
import { Subscription } from 'rxjs'
import { GameHelperBirdPreference, GameHelperPreference, PreferencesStorageService } from '../preferences-storage.service'
import { AppState, BirdCard } from '../store/app.interfaces'

type Habitat = 'forest' | 'grassland' | 'wetland'
type TurnType = 'food' | 'eggs' | 'cards'

interface HabitatOption {
  value: Habitat
  display: string
  icon: string
}

interface HelperBirdEntry {
  id: number
  cardId: number | null
  name: string
  habitat: Habitat
  inHand: boolean
}

interface HelperEstimate {
  foodNeeded: number
  foodTurns: number
  eggsNeeded: number
  eggTurns: number
  drawTurns: number
  playTurns: number
  totalTurns: number
  rowCounts: { [key: string]: number }
  overfilledRows: Habitat[]
}

@Component({
  selector: 'app-game-helper',
  templateUrl: './game-helper.component.html',
  styleUrls: ['./game-helper.component.scss']
})
export class GameHelperComponent implements OnDestroy {
  readonly turnsPerRound = [8, 7, 6, 5]
  readonly habitats: HabitatOption[] = [
    { value: 'forest', display: 'Forest', icon: 'forest' },
    { value: 'grassland', display: 'Grassland', icon: 'grassland' },
    { value: 'wetland', display: 'Wetland', icon: 'wetland' },
  ]

  currentRound = 1
  cubesLeft = 8

  planCardControl = new FormControl('')
  playedCardControl = new FormControl('')

  planHabitat: Habitat = 'forest'
  playedHabitat: Habitat = 'forest'
  planInHand = true

  plannedBirds: HelperBirdEntry[] = []
  playedBirds: HelperBirdEntry[] = []

  manualFoodTurns: number | null = null
  manualEggTurns: number | null = null
  manualCardTurns: number | null = null

  birdCards: BirdCard[] = []
  filteredPlanBirdCards: BirdCard[] = []
  filteredPlayedBirdCards: BirdCard[] = []

  displayBird = (card: BirdCard | string): string => {
    if (!card) {
      return ''
    }

    return typeof card === 'string' ? card : this.birdName(card)
  }

  private nextEntryId = 1
  private subscription = new Subscription()

  constructor(
    private store: Store<{ app: AppState }>,
    private preferences: PreferencesStorageService
  ) {
    this.restorePreferences()

    this.subscription.add(
      this.store.select(({ app }) => app.birdCards).subscribe(cards => {
        this.birdCards = [...cards].sort((a, b) => this.birdName(a).localeCompare(this.birdName(b)))
        this.refreshEntryNames()
        this.updatePlanOptions()
        this.updatePlayedOptions()
      })
    )

    this.subscription.add(this.planCardControl.valueChanges.subscribe(() => this.updatePlanOptions()))
    this.subscription.add(this.playedCardControl.valueChanges.subscribe(() => this.updatePlayedOptions()))
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe()
  }

  addPlannedBird(): void {
    const entry = this.createEntry(this.planCardControl.value, this.planHabitat, this.planInHand)

    if (!entry.name.trim()) {
      entry.name = 'Undrawn bird'
      entry.inHand = false
    }

    this.plannedBirds = [...this.plannedBirds, entry]
    this.planCardControl.setValue('')
    this.planInHand = true
    this.savePreferences()
  }

  addPlayedBird(): void {
    const entry = this.createEntry(this.playedCardControl.value, this.playedHabitat, true)

    if (!entry.name.trim()) {
      entry.name = 'Played bird'
    }

    this.playedBirds = [...this.playedBirds, entry]
    this.playedCardControl.setValue('')
    this.savePreferences()
  }

  removePlannedBird(id: number): void {
    this.plannedBirds = this.plannedBirds.filter(bird => bird.id !== id)
    this.savePreferences()
  }

  removePlayedBird(id: number): void {
    this.playedBirds = this.playedBirds.filter(bird => bird.id !== id)
    this.savePreferences()
  }

  selectPlanBird(event: MatAutocompleteSelectedEvent): void {
    this.planCardControl.setValue(event.option.value as BirdCard)
  }

  selectPlayedBird(event: MatAutocompleteSelectedEvent): void {
    this.playedCardControl.setValue(event.option.value as BirdCard)
  }

  setManualTurns(type: TurnType, value: string | number): void {
    const parsedValue = this.parseWholeNumber(value)

    if (type === 'food') {
      this.manualFoodTurns = parsedValue
    } else if (type === 'eggs') {
      this.manualEggTurns = parsedValue
    } else {
      this.manualCardTurns = parsedValue
    }

    this.savePreferences()
  }

  resetManualTurns(type: TurnType): void {
    if (type === 'food') {
      this.manualFoodTurns = null
    } else if (type === 'eggs') {
      this.manualEggTurns = null
    } else {
      this.manualCardTurns = null
    }

    this.savePreferences()
  }

  setCurrentRound(value: string | number): void {
    this.currentRound = this.toRound(this.parseWholeNumber(value))
    this.savePreferences()
  }

  setCubesLeft(value: string | number): void {
    this.cubesLeft = this.parseWholeNumber(value) || 0
    this.savePreferences()
  }

  setPlanHabitat(habitat: Habitat): void {
    this.planHabitat = this.toHabitat(habitat)
    this.savePreferences()
  }

  setPlayedHabitat(habitat: Habitat): void {
    this.playedHabitat = this.toHabitat(habitat)
    this.savePreferences()
  }

  setPlanInHand(inHand: boolean): void {
    this.planInHand = inHand
    this.savePreferences()
  }

  savePreferences(): void {
    this.preferences.saveGameHelper(this.currentPreferences())
  }

  turnInputValue(type: TurnType): number {
    const estimate = this.estimate()

    if (type === 'food') {
      return this.manualFoodTurns === null ? estimate.foodTurns : this.manualFoodTurns
    }

    if (type === 'eggs') {
      return this.manualEggTurns === null ? estimate.eggTurns : this.manualEggTurns
    }

    return this.manualCardTurns === null ? estimate.drawTurns : this.manualCardTurns
  }

  turnIsAutomatic(type: TurnType): boolean {
    return (type === 'food' && this.manualFoodTurns === null)
      || (type === 'eggs' && this.manualEggTurns === null)
      || (type === 'cards' && this.manualCardTurns === null)
  }

  totalPlannedTurns(): number {
    return this.plannedBirds.length
      + this.turnInputValue('food')
      + this.turnInputValue('eggs')
      + this.turnInputValue('cards')
  }

  totalTurnsLeft(): number {
    return this.cubesLeft + this.futureRoundTurns()
  }

  futureRoundTurns(): number {
    const currentRoundIndex = this.currentRound - 1
    return this.turnsPerRound
      .slice(currentRoundIndex + 1)
      .reduce((sum, turns) => sum + turns, 0)
  }

  turnBalance(): number {
    return this.totalTurnsLeft() - this.totalPlannedTurns()
  }

  estimate(): HelperEstimate {
    const rowCounts = this.habitats.reduce((acc, habitat) => {
      acc[habitat.value] = this.playedBirds.filter(bird => bird.habitat === habitat.value).length
      return acc
    }, {})

    let eggsNeeded = 0

    this.plannedBirds.forEach(bird => {
      const nextSlot = rowCounts[bird.habitat] + 1
      eggsNeeded += this.eggCostForSlot(nextSlot)
      rowCounts[bird.habitat] += 1
    })

    const foodNeeded = this.plannedBirds.reduce((sum, bird) => sum + this.foodCostFor(bird), 0)
    const drawTurns = this.plannedBirds.filter(bird => !bird.inHand).length
    const foodTurns = Math.ceil(foodNeeded / 2)
    const eggTurns = Math.ceil(eggsNeeded / 2)
    const playTurns = this.plannedBirds.length
    const overfilledRows = this.habitats
      .filter(habitat => rowCounts[habitat.value] > 5)
      .map(habitat => habitat.value)

    return {
      foodNeeded,
      foodTurns,
      eggsNeeded,
      eggTurns,
      drawTurns,
      playTurns,
      totalTurns: foodTurns + eggTurns + drawTurns + playTurns,
      rowCounts,
      overfilledRows,
    }
  }

  foodCostFor(entry: HelperBirdEntry): number {
    if (!entry.inHand || entry.cardId === null) {
      return 2
    }

    const card = this.findCard(entry.cardId)
    return card ? Number(card['Total food cost']) || 0 : 2
  }

  habitatLabel(habitat: Habitat): string {
    const option = this.habitats.find(item => item.value === habitat)
    return option ? option.display : habitat
  }

  overfilledRowLabels(): string {
    return this.estimate().overfilledRows.map(row => this.habitatLabel(row)).join(', ')
  }

  trackEntry(index: number, entry: HelperBirdEntry): number {
    return entry.id
  }

  private createEntry(value: BirdCard | string, habitat: Habitat, inHand: boolean): HelperBirdEntry {
    const card = typeof value === 'string' ? this.findCardByName(value) : value
    const typedName = typeof value === 'string' ? value.trim() : ''

    return {
      id: this.nextEntryId++,
      cardId: card ? card.id : null,
      name: card ? this.birdName(card) : typedName,
      habitat,
      inHand,
    }
  }

  private updatePlanOptions(): void {
    this.filteredPlanBirdCards = this.filterBirdCards(this.planCardControl.value)
  }

  private updatePlayedOptions(): void {
    this.filteredPlayedBirdCards = this.filterBirdCards(this.playedCardControl.value)
  }

  private filterBirdCards(value: BirdCard | string): BirdCard[] {
    const query = typeof value === 'string' ? value.toLowerCase().trim() : this.birdName(value).toLowerCase()

    if (!query) {
      return this.birdCards.slice(0, 25)
    }

    return this.birdCards.filter(card => {
      const commonName = this.birdName(card).toLowerCase()
      const scientificName = (card['Scientific name'] || '').toLowerCase()
      const nativeName = String(card['Native name'] || '').toLowerCase()
      return commonName.includes(query) || scientificName.includes(query) || nativeName.includes(query)
    }).slice(0, 25)
  }

  private birdName(card: BirdCard): string {
    return card['Common name']
  }

  private findCard(cardId: number): BirdCard | null {
    return this.birdCards.find(card => card.id === cardId) || null
  }

  private findCardByName(name: string): BirdCard | null {
    const normalizedName = name.trim().toLowerCase()

    if (!normalizedName) {
      return null
    }

    return this.birdCards.find(card => this.birdName(card).toLowerCase() === normalizedName) || null
  }

  private eggCostForSlot(slot: number): number {
    if (slot <= 1) {
      return 0
    }

    if (slot <= 3) {
      return 1
    }

    return 2
  }

  private parseWholeNumber(value: string | number): number | null {
    if (value === '' || value === null || value === undefined) {
      return null
    }

    const parsedValue = Number(value)

    if (Number.isNaN(parsedValue)) {
      return null
    }

    return Math.max(0, Math.floor(parsedValue))
  }

  private toRound(round: number | null): number {
    if (round === null) {
      return 1
    }

    return Math.min(this.turnsPerRound.length, Math.max(1, round))
  }

  private restorePreferences(): void {
    const preferences = this.preferences.getGameHelper(this.currentPreferences())

    this.currentRound = this.toRound(this.parseWholeNumber(preferences.currentRound))
    this.cubesLeft = this.parseWholeNumber(preferences.cubesLeft) || 0
    this.planHabitat = this.toHabitat(preferences.planHabitat)
    this.playedHabitat = this.toHabitat(preferences.playedHabitat)
    this.planInHand = preferences.planInHand
    this.plannedBirds = this.restoreEntries(preferences.plannedBirds)
    this.playedBirds = this.restoreEntries(preferences.playedBirds)
    this.manualFoodTurns = this.parseManualTurns(preferences.manualFoodTurns)
    this.manualEggTurns = this.parseManualTurns(preferences.manualEggTurns)
    this.manualCardTurns = this.parseManualTurns(preferences.manualCardTurns)
    this.nextEntryId = Math.max(
      0,
      ...this.plannedBirds.map(bird => bird.id),
      ...this.playedBirds.map(bird => bird.id)
    ) + 1
  }

  private currentPreferences(): GameHelperPreference {
    return {
      currentRound: this.currentRound,
      cubesLeft: this.cubesLeft,
      planHabitat: this.planHabitat,
      playedHabitat: this.playedHabitat,
      planInHand: this.planInHand,
      plannedBirds: this.plannedBirds,
      playedBirds: this.playedBirds,
      manualFoodTurns: this.manualFoodTurns,
      manualEggTurns: this.manualEggTurns,
      manualCardTurns: this.manualCardTurns,
    }
  }

  private restoreEntries(entries: GameHelperBirdPreference[]): HelperBirdEntry[] {
    return entries
      .filter(entry => entry && entry.name)
      .map(entry => ({
        id: this.parseWholeNumber(entry.id) || this.nextEntryId++,
        cardId: entry.cardId === null ? null : this.parseWholeNumber(entry.cardId),
        name: String(entry.name),
        habitat: this.toHabitat(entry.habitat),
        inHand: !!entry.inHand,
      }))
  }

  private refreshEntryNames(): void {
    this.plannedBirds = this.plannedBirds.map(entry => this.refreshEntryName(entry))
    this.playedBirds = this.playedBirds.map(entry => this.refreshEntryName(entry))
  }

  private refreshEntryName(entry: HelperBirdEntry): HelperBirdEntry {
    if (entry.cardId === null) {
      return entry
    }

    const card = this.findCard(entry.cardId)
    return card ? { ...entry, name: this.birdName(card) } : entry
  }

  private toHabitat(habitat: string): Habitat {
    return this.habitats.some(option => option.value === habitat) ? habitat as Habitat : 'forest'
  }

  private parseManualTurns(value: number | null): number | null {
    return value === null ? null : this.parseWholeNumber(value)
  }
}
