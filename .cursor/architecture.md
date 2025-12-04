# Arquitectura Backoffice - Scrum Store

## Visión General

Aplicación web de gestión con Angular + PrimeNG + Bulma CSS para que los gestores de grupos de consumo puedan administrar artículos, ventas, usuarios y contenido del grupo.

## Stack Tecnológico

- **Framework**: Angular 20
- **UI Components**: PrimeNG
- **CSS Framework**: Bulma CSS
- **i18n**: @ngx-translate (Catalán por defecto, Castellano)
- **State Management**: Angular Signals
- **Routing**: Angular Router

## Estructura de la Aplicación

```
src/
├── app/
│   ├── core/                    # Singleton services
│   │   ├── services/            # Auth, API, Storage
│   │   ├── guards/              # Auth, Manager
│   │   ├── interceptors/        # Auth, Error
│   │   └── models/              # Interfaces
│   ├── shared/                  # Componentes compartidos
│   │   ├── components/
│   │   ├── pipes/
│   │   └── directives/
│   ├── features/                # Features del backoffice
│   │   ├── auth/                # Login
│   │   ├── home/                # Dashboard
│   │   ├── showcase/            # Gestión aparador
│   │   ├── catalog/             # Gestión catálogo
│   │   ├── sales/               # Gestión ventas
│   │   ├── users/               # Gestión usuarios
│   │   ├── messages/            # Muro
│   │   └── profile/             # Perfil grupo
│   ├── layout/
│   │   ├── main-layout/         # Layout con sidebar
│   │   └── auth-layout/         # Layout login
├── assets/
│   ├── i18n/                    # ca.json, es.json
│   └── images/
├── styles/                      # Estilos globales
└── environments/                # Configuración
```

## Características Principales

### Standalone Components
- Sin NgModules
- ChangeDetection OnPush
- Imports explícitos

### State Management con Signals
- Signals para estado reactivo
- Computed para derivaciones
- Sin RxJS Subject/BehaviorSubject

### Layout Principal
- Sidebar con menú de navegación
- Topbar con selector de grupo y usuario
- Content area con router-outlet
- Responsive (sidebar colapsable)

## Servicios Core

### AuthService
- Login/Logout
- Gestión de tokens (access + refresh)
- Verificar que el usuario es gestor
- Signal de usuario actual

### ApiService
- Métodos HTTP genéricos
- Upload de archivos
- Gestión de errores

### LocalStorageService
- Wrapper de localStorage
- Tokens, usuario, grupo, idioma

### ConsumerGroupService
- Signal de grupos donde es gestor
- Signal de grupo actual
- Cambiar grupo actual

## Guards

### authGuard
- Verificar token válido
- Redirigir a login si no

### managerGuard
- Verificar que el usuario es gestor de al menos un grupo
- Mostrar error 403 si no tiene permisos

## Interceptores

### authInterceptor
- Añadir Bearer token

### errorInterceptor
- Gestión 401 (refresh)
- Mostrar mensajes con MessageService
- Logging de errores

## Internacionalización

- @ngx-translate con archivos JSON
- Catalán por defecto, Castellano secundario
- Organización por secciones (COMMON, MENU, DASHBOARD, etc.)
- Cambio dinámico de idioma

## PrimeNG Components Utilizados

### Tablas y Datos
- p-table: Tablas con paginación, sorting, filtros
- p-paginator: Paginación
- p-virtualScroller: Scroll virtual

### Formularios
- p-inputText, p-password, p-inputNumber
- p-dropdown: Selects
- p-calendar: Date/time pickers
- p-checkbox, p-radioButton
- p-fileUpload: Upload de archivos

### Overlays
- p-dialog: Modales
- p-confirmDialog: Confirmaciones
- p-toast: Notificaciones
- p-sidebar: Sidebar

### Visualización
- p-card: Cards
- p-chart: Gráficas (Chart.js)
- p-tag, p-badge: Etiquetas
- p-tabView: Tabs

## Flujo de Autenticación

1. Login con email/password
2. Backend verifica que es gestor
3. Si no es gestor → Error 403
4. Si no tiene grupos → Error 401
5. Cargar grupos donde es gestor
6. Seleccionar grupo (por defecto o último)
7. Navegar a dashboard

## Gestión de Permisos

- Solo gestores pueden acceder
- Filtrar grupos por rol de gestor
- Validar permisos en cada acción
- Guards en rutas sensibles

## Funcionalidades por Módulo

### Dashboard (Home)
- Cards con métricas del grupo
- Gráficas de ventas
- Lista de ventas pendientes
- Accesos rápidos

### Aparador (Showcase)
- Tabla de artículos en aparador
- Editar, quitar del aparador
- Ver demanda vs. máximo

### Catálogo (Catalog)
- Tabla de todos los artículos
- CRUD completo
- Upload/delete de imágenes
- Gráfica de histórico de precios
- Historial de ventas por artículo
- Toggle aparador

### Ventas (Sales)
- Tabs: No pagadas / Pagadas
- Tabla con estado de pago
- Modal para registrar pagos (parciales o totales)
- Filtros por fecha, cliente

### Usuarios (Users)
- Tabla de miembros del grupo
- Ver deuda de cada usuario
- Editar roles (client/gestor)
- Invitar usuarios (email o link)
- Eliminar del grupo
- Detalle: info, historial compras, gestionar roles

### Muro (Messages)
- Lista de mensajes
- Escribir nuevo mensaje
- Adjuntar imagen
- Eliminar mensaje (propios)
- Badge "Gestor" si aplica

### Perfil del Grupo (Profile)
- Editar info del grupo
- Configurar horarios de apertura
- Upload de imagen del grupo
- Gestionar redes sociales/contacto

## Componentes Reutilizables

### GroupSelector
- Dropdown en topbar
- Cambiar grupo actual

### PageHeader
- Título y botones de acción
- Breadcrumbs

### ArticleForm
- Form para crear/editar artículos
- Validaciones

### PaymentModal
- Registrar pagos de ventas
- Totales y parciales

### ImageUpload
- Preview y upload de imágenes
- Eliminar imagen

### PriceHistoryChart
- Gráfica de histórico de precios

## Integración PrimeNG + Bulma

- Importar themes de PrimeNG
- Importar Bulma CSS
- Overrides para colores consistentes
- Usar Bulma para layout
- Usar PrimeNG para componentes

## Persistencia Local

- Tokens en localStorage
- Grupo seleccionado en localStorage
- Idioma en localStorage

## Principios de Diseño

1. **Desktop First**: Optimizado para escritorio
2. **Data-centric**: Tablas y formularios
3. **CRUD Operations**: Crear, editar, eliminar
4. **Feedback Visual**: Toasts y confirmaciones
5. **Responsive**: Adaptable a tablets
