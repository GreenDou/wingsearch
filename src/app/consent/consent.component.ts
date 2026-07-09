import { Component, EventEmitter, OnInit, Output } from '@angular/core'
import { AnalyticsService } from '../analytics.service'
import { CookiesService } from '../cookies.service'
import { preferredLanguage } from '../languages'
import { PreferencesStorageService } from '../preferences-storage.service'

@Component({
  selector: 'app-consent',
  templateUrl: './consent.component.html',
  styleUrls: ['./consent.component.scss']
})
export class ConsentComponent implements OnInit {
  @Output()
  consentChange = new EventEmitter<string>()

  constructor(
    private cookies: CookiesService,
    private analytics: AnalyticsService,
    private preferences: PreferencesStorageService
  ) { }

  ngOnInit(): void {
  }

  setConsent(value: string) {
    this.cookies.setCookie('consent', value, 180, true)
    this.consentChange.emit(value)

    if (value === '1')
      this.analytics.setLanguage(preferredLanguage(this.preferences.getLanguage()))
  }
}
