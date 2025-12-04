import { Component, signal, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
  protected readonly title = signal('scrum-store-backoffice');
  private readonly translate = inject(TranslateService);

  constructor() {
    // Configurar idioma por defecto
    const savedLanguage = localStorage.getItem('language') || 'ca';
    this.translate.setDefaultLang('ca');
    this.translate.use(savedLanguage);
  }
}
