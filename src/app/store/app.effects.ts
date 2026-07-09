import { HttpClient } from '@angular/common/http'
import { Injectable } from '@angular/core'
import { Actions, createEffect, ofType, ROOT_EFFECTS_INIT } from '@ngrx/effects'
import { from, of } from 'rxjs'
import { map, mergeMap } from 'rxjs/operators'
import { languageFromCode, preferredLanguage } from '../languages'
import { PreferencesStorageService } from '../preferences-storage.service'
import { changeLanguage } from './app.actions'

@Injectable()
export class AppEffects {
    readonly I18N_FOLDER = 'assets/data/i18n/'
    private readonly defaultExpansion = {
        core: true,
        european: true,
        oceania: true,
        asia: true,
        americas: true,
    }
    private readonly defaultPromoPack = {
        promoAsia: true,
        promoCA: true,
        promoEurope: true,
        promoNZ: true,
        promoUK: true,
        promoUS: true
    }

    loadLanguage$ = createEffect(() => this.actions$.pipe(
        ofType(ROOT_EFFECTS_INIT, changeLanguage),
        mergeMap((action) => {
            const requestedLanguage = languageFromCode((action as any).language)
            const savedLanguage = this.preferences.getLanguage()
            const language = requestedLanguage || preferredLanguage(savedLanguage)
            if (language && language !== 'en')
            {
              const expansion = (action as any).expansion || PreferencesStorageService.getInitialExpansion(this.defaultExpansion)
              const promoPack = (action as any).promoPack || PreferencesStorageService.getInitialPromoPack(this.defaultPromoPack)
              return from(this.http.get(this.I18N_FOLDER + language + '.json')).pipe(
                map((data) => ({ type: '[App] Set language', payload: data, language: language, expansion: expansion, promoPack: promoPack }))
              )
            }
            else
                return of({ type: '[App] English' })
        })
    ))

    constructor(
        private actions$: Actions,
        private preferences: PreferencesStorageService,
        private http: HttpClient
    ) { }
}
