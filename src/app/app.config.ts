import { ApplicationConfig, provideZoneChangeDetection, APP_INITIALIZER, LOCALE_ID } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { providePrimeNG } from 'primeng/config';
import Lara from '@primeuix/themes/lara';
import { provideTranslateService, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader, TRANSLATE_HTTP_LOADER_CONFIG } from '@ngx-translate/http-loader';
import { registerLocaleData } from '@angular/common';
import localeEs from '@angular/common/locales/es';
import { FaIconLibrary } from '@fortawesome/angular-fontawesome';
import {
  faUser, faHouse, faBox, faUsers, faChartSimple, faCog, faRightFromBracket,
  faPlus, faPencil, faTrash, faEye, faSearch, faFilter, faFileExport, faFileImport,
  faCheck, faXmark, faBars, faChevronDown, faChevronUp, faChevronLeft, faChevronRight
} from '@fortawesome/pro-solid-svg-icons';
import {
  faCircleCheck, faCircleXmark, faBell
} from '@fortawesome/pro-regular-svg-icons';

import { routes } from './app.routes';
import { authInterceptor } from './core/interceptors/auth.interceptor';
import { errorInterceptor } from './core/interceptors/error.interceptor';
import { ConsumerGroupService } from './core/services/consumer-group.service';
import { AuthService } from './core/services/auth.service';

// Registrar locale espanyol
registerLocaleData(localeEs);

// Factory function per inicialitzar FontAwesome
function initializeFontAwesome(library: FaIconLibrary): () => void {
  return () => {
    // Icons solid més comuns
    library.addIcons(
      faUser, faHouse, faBox, faUsers, faChartSimple, faCog, faRightFromBracket,
      faPlus, faPencil, faTrash, faEye, faSearch, faFilter, faFileExport, faFileImport,
      faCheck, faXmark, faBars, faChevronDown, faChevronUp, faChevronLeft, faChevronRight
    );
    // Icons regular
    library.addIcons(faCircleCheck, faCircleXmark, faBell);
  };
}

// Factory function per carregar grups d'usuari al iniciar l'app
function initializeApp(
  groupService: ConsumerGroupService,
  authService: AuthService
): () => Promise<void> {
  return async () => {
    // Només carregar grups si l'usuari està autenticat
    if (authService.isAuthenticated()) {
      try {
        await groupService.loadUserGroups();
      } catch (error) {
        console.error('Error loading user groups on app init:', error);
      }
    }
  };
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes),
    provideHttpClient(
      withInterceptors([authInterceptor, errorInterceptor])
    ),
    provideAnimationsAsync(),
    providePrimeNG({
      theme: {
        preset: Lara,
        options: {
          darkModeSelector: false,
        }
      },
    }),
    { provide: LOCALE_ID, useValue: 'es-ES' },
    {
      provide: TRANSLATE_HTTP_LOADER_CONFIG,
      useValue: {
        prefix: './assets/i18n/',
        suffix: '.json'
      }
    },
    provideTranslateService({
      defaultLanguage: 'ca',
      loader: {
        provide: TranslateLoader,
        useClass: TranslateHttpLoader
      }
    }),
    {
      provide: APP_INITIALIZER,
      useFactory: initializeFontAwesome,
      deps: [FaIconLibrary],
      multi: true
    },
    {
      provide: APP_INITIALIZER,
      useFactory: initializeApp,
      deps: [ConsumerGroupService, AuthService],
      multi: true
    }
  ]
};
