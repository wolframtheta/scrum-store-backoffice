import { Injectable, inject, signal } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';

export type Language = 'es' | 'ca';

@Injectable({
  providedIn: 'root'
})
export class LanguageService {
  private readonly translate = inject(TranslateService);
  
  // Signal para el idioma actual
  readonly currentLanguage = signal<Language>('ca');
  
  constructor() {
    // Cargar idioma guardado o usar catalán por defecto
    const savedLang = this.getSavedLanguage();
    this.setLanguage(savedLang);
  }

  /**
   * Cambia el idioma de la aplicación
   */
  setLanguage(lang: Language): void {
    this.translate.use(lang);
    this.currentLanguage.set(lang);
    localStorage.setItem('language', lang);
  }

  /**
   * Alterna entre español y catalán
   */
  toggleLanguage(): void {
    const newLang = this.currentLanguage() === 'es' ? 'ca' : 'es';
    this.setLanguage(newLang);
  }

  /**
   * Obtiene el idioma guardado en localStorage
   */
  private getSavedLanguage(): Language {
    const saved = localStorage.getItem('language');
    return (saved === 'ca' || saved === 'es') ? saved : 'ca';
  }

  /**
   * Obtiene una traducción de forma síncrona
   */
  instant(key: string, params?: object): string {
    return this.translate.instant(key, params);
  }

  /**
   * Obtiene una traducción de forma asíncrona (Observable)
   */
  get(key: string, params?: object) {
    return this.translate.get(key, params);
  }
}

