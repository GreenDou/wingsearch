export interface SupportedLanguage {
  value: string
  display: string
}

export const supportedLanguages: SupportedLanguage[] = [
  { value: 'de', display: 'Deutsch' },
  { value: 'dk', display: 'dansk' },
  { value: 'en', display: 'English' },
  { value: 'es', display: 'Español' },
  { value: 'fr', display: 'Français' },
  { value: 'jp', display: '日本語' },
  { value: 'lt', display: 'lietuvių' },
  { value: 'nl', display: 'Nederlands' },
  { value: 'pl', display: 'Polski' },
  { value: 'pt', display: 'Português' },
  { value: 'tr', display: 'Türkçe' },
  { value: 'uk', display: 'українська' },
  { value: 'zh', display: '简体中文' },
]

const languageAliases = {
  da: 'dk',
  ja: 'jp',
}

export const languageFromCode = (languageCode: string): string => {
  if (!languageCode) return ''

  const normalized = languageCode.toLowerCase()
  const exactMatch = supportedLanguages.find(language => language.value === normalized)
  if (exactMatch) return exactMatch.value

  const baseLanguage = normalized.split(/[-_]/)[0]
  const aliasedLanguage = languageAliases[baseLanguage] || baseLanguage
  return supportedLanguages.find(language => language.value === aliasedLanguage) ? aliasedLanguage : ''
}

export const browserLanguage = (): string => {
  if (typeof navigator === 'undefined') return 'en'

  const browserLanguages = navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language]

  return browserLanguages.reduce((match, languageCode) => match || languageFromCode(languageCode), '') || 'en'
}

export const preferredLanguage = (savedLanguage: string): string => {
  return languageFromCode(savedLanguage) || browserLanguage()
}
