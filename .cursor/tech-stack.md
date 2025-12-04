# Tech Stack & Configuration - Backoffice

## Tecnologías Principales

- **Angular**: v20.x - Framework web
- **TypeScript**: v5.9+
- **PrimeNG**: v19.x - Componentes UI
- **PrimeIcons**: Iconos
- **Bulma CSS**: v1.0+ - Framework CSS
- **Chart.js**: v4.x - Gráficas
- **@ngx-translate**: Sistema i18n

---

## Configuración de Entornos

### environment.ts (Development)
- apiUrl: URL del backend local
- s3BaseUrl: URL base de S3
- defaultLanguage: 'ca'
- tokenExpiresIn: Tiempo en ms

### environment.prod.ts (Production)
- apiUrl: URL producción
- Resto igual

---

## Configuración de Aplicación

### app.config.ts

Configurar providers:
- Router
- HttpClient con interceptores
- provideAnimations() (requerido por PrimeNG)
- MessageService (PrimeNG)
- ConfirmationService (PrimeNG)
- TranslateModule con loader

**Interceptores:**
- authInterceptor
- errorInterceptor

---

## Configuración de Estilos

### styles.scss

Importar en orden:
1. Theme de PrimeNG (lara-light-blue)
2. PrimeNG base CSS
3. PrimeIcons
4. Bulma CSS
5. Variables personalizadas
6. Overrides de PrimeNG
7. Overrides de Bulma
8. Estilos de layout
9. Utilidades

### styles/_variables.scss
- Colores principales
- Espaciado
- Dimensiones de layout (sidebar, topbar)

### styles/_primeng-overrides.scss
- Personalizar colores de PrimeNG
- Variables CSS root
- Ajustes de tablas, botones, cards

### styles/_bulma-overrides.scss
- Colores de Bulma para match

### styles/_layout.scss
- Estilos del layout principal
- Sidebar, topbar, content
- Responsive

### styles/_utilities.scss
- Clases de utilidad
- Badges, cursors, overlays

---

## Internacionalización

### Estructura de traducciones

Archivos JSON en `assets/i18n/`:
- `ca.json` - Catalán
- `es.json` - Castellano

**Secciones:**
- COMMON: Textos comunes
- MENU: Items del menú
- AUTH: Autenticación
- DASHBOARD: Dashboard
- SHOWCASE, CATALOG, SALES, USERS, MESSAGES, PROFILE

---

## Storage Keys

Constantes en `core/constants/`:
- ACCESS_TOKEN
- REFRESH_TOKEN
- CURRENT_USER
- CURRENT_GROUP
- LANGUAGE

---

## Routing

### app.routes.ts

Estructura:
- `/auth` - AuthLayout con login
- `/` - MainLayout con sidebar
  - dashboard, showcase, catalog, sales, users, messages, profile
  - Guards: authGuard, managerGuard
- Redirect a /dashboard

### Lazy Loading
- Usar loadComponent y loadChildren
- Separar rutas por feature

---

## Layout

### MainLayoutComponent
- Estructura: sidebar + main-content
- Sidebar con menú
- Topbar con selector de grupo y usuario
- Router-outlet para contenido
- Responsive

### AuthLayoutComponent
- Layout simple centrado
- Para login

### Sidebar
- Menú de navegación
- Items con iconos PrimeNG
- Highlight item activo
- Colapsable en mobile

### Topbar
- Logo/nombre grupo
- GroupSelector dropdown
- Menú de usuario
- Selector de idioma

---

## Servicios por Feature

### CatalogService
- CRUD de artículos
- Histórico de precios
- Ventas por artículo
- Upload/delete imagen

### SalesService
- Listar ventas (pagadas/no pagadas)
- Detalle de venta
- Registrar pagos
- Calcular totales

### UsersService
- Listar usuarios del grupo
- Detalle de usuario
- Actualizar roles
- Invitar/eliminar
- Calcular deuda

### MessagesService
- Listar mensajes
- Crear mensaje
- Eliminar mensaje (propios)

### GroupProfileService
- Obtener info del grupo
- Actualizar grupo
- Gestionar horarios

---

## PrimeNG Modules

Importar solo los necesarios:
- TableModule, PaginatorModule
- ButtonModule, InputTextModule
- DropdownModule, CalendarModule
- DialogModule, ConfirmDialogModule
- ToastModule, CardModule
- ChartModule, FileUploadModule
- TagModule, BadgeModule
- TabViewModule, VirtualScrollerModule

---

## Guards

### authGuard
- Verificar token
- Redirigir a login

### managerGuard
- Cargar grupos del gestor
- Verificar permisos
- Error si no es gestor

---

## Interceptores

### authInterceptor
- Añadir Bearer token

### errorInterceptor
- Capturar errores
- Si 401: refresh token
- Mostrar toasts con MessageService

---

## Componentes Compartidos

### GroupSelector
- Dropdown de grupos
- Cambiar grupo actual

### PageHeader
- Título + acciones
- Breadcrumbs

### LoadingSpinner
- Overlay con spinner

### ConfirmDialog
- Usar p-confirmDialog global
- ConfirmationService

### EmptyState
- Para listas vacías

---

## Pipes Personalizados

### Currency
- Formatear precios con €

### Date
- Formatear según idioma

### Unit Measure
- Formatear unidades (kg, ml, etc.)

---

## Convenciones de Código

### Nomenclatura
- Componentes: kebab-case
- Servicios: kebab-case + .service
- Interfaces: PascalCase
- Signals: camelCase

### Estructura
- Standalone: true
- ChangeDetection: OnPush
- Imports explícitos
- Inject() en lugar de constructor

---

## Scripts NPM

- `start` - ng serve
- `build` - ng build
- `build:prod` - Build producción
- `test` - Tests
- `lint` - Linting

---

## Buenas Prácticas

### Performance
- ChangeDetection OnPush
- TrackBy en ngFor
- Lazy loading
- Virtual scroll en tablas largas

### UX
- Toasts para feedback
- Confirmaciones antes de eliminar
- Loading states
- Deshabilitar botones durante carga

### Tablas
- Paginación siempre
- Ordenamiento por columnas
- Filtros globales y por columna
- Exportar datos (opcional)

### Formularios
- Validaciones reactivas
- Mensajes de error claros
- Deshabilitar submit hasta válido

### Accesibilidad
- Labels en inputs
- ARIA attributes
- Navegación por teclado
- Contraste
