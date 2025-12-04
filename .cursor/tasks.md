# Tareas Backoffice - Scrum Store

## Fase 1: Setup Inicial y Configuración

### 1.1 Instalación de Dependencias
- [ ] Instalar dependencias principales:
  - primeng + primeicons
  - bulma
  - @ngx-translate/core + @ngx-translate/http-loader
  - chart.js (para gráficas)
- [ ] Configurar estructura de carpetas según arquitectura

### 1.2 Configuración de Entorno
- [ ] Crear `environment.ts` y `environment.prod.ts`:
  - API_URL
  - AWS_S3_BASE_URL
  - DEFAULT_LANGUAGE
- [ ] Configurar variables en `angular.json`

### 1.3 Configuración de Estilos
- [ ] Importar PrimeNG themes en `styles.scss`
- [ ] Importar Bulma CSS
- [ ] Crear `styles/_primeng-overrides.scss`
- [ ] Crear `styles/_bulma-overrides.scss`
- [ ] Crear `styles/_variables.scss`

### 1.4 Internacionalización (i18n)
- [ ] Configurar @ngx-translate en `app.config.ts`
- [ ] Crear `assets/i18n/ca.json`
- [ ] Crear `assets/i18n/es.json`
- [ ] Traducir textos de la interfaz

---

## Fase 2: Core - Servicios Fundamentales ⭐ PRIORIDAD 1

### 2.1 LocalStorageService
- [ ] Crear `core/services/local-storage.service.ts`
- [ ] Métodos:
  - set(key, value)
  - get(key)
  - remove(key)
  - clear()
- [ ] Constantes para keys

### 2.2 ApiService
- [ ] Crear `core/services/api.service.ts`
- [ ] Métodos HTTP:
  - get<T>(endpoint)
  - post<T>(endpoint, body)
  - patch<T>(endpoint, body)
  - delete<T>(endpoint)
  - uploadFile(endpoint, file)

### 2.3 AuthService
- [ ] Crear `core/services/auth.service.ts`
- [ ] Signals:
  - currentUser
  - isAuthenticated
  - isManager
- [ ] Métodos:
  - login(email, password)
  - logout()
  - refreshToken()
  - loadUserFromStorage()
- [ ] Verificar que el usuario es gestor al hacer login

### 2.4 Interceptores
- [ ] Crear `core/interceptors/auth.interceptor.ts`
  - Añadir Bearer token
- [ ] Crear `core/interceptors/error.interceptor.ts`
  - Gestión de 401 (refresh token)
  - Mostrar mensajes de error con MessageService de PrimeNG

### 2.5 Guards
- [ ] Crear `core/guards/auth.guard.ts`
  - Verificar autenticación
- [ ] Crear `core/guards/manager.guard.ts`
  - Verificar que el usuario es gestor de al menos un grupo
  - Manejar error 403 si no tiene permisos

### 2.6 Modelos/Interfaces
- [ ] Crear interfaces en `core/models/`:
  - user.interface.ts
  - consumer-group.interface.ts
  - article.interface.ts
  - sale.interface.ts
  - message.interface.ts
  - payment.interface.ts

---

## Fase 3: Layout y Navegación ⭐ PRIORIDAD 1

### 3.1 AuthLayoutComponent
- [ ] Crear `layout/auth-layout/auth-layout.component.ts`
- [ ] Layout simple para login
- [ ] Centrado, con logo y formulario

### 3.2 MainLayoutComponent
- [ ] Crear `layout/main-layout/main-layout.component.ts`
- [ ] Estructura: Sidebar + Main content
- [ ] Responsive (colapsable en mobile)

### 3.3 SidebarComponent
- [ ] Crear `layout/sidebar/sidebar.component.ts`
- [ ] Menu items con PrimeNG Menu o custom
- [ ] Items:
  - Dashboard
  - Aparador
  - Catàleg
  - Ventes
  - Usuaris
  - Mur
  - Perfil del grup
- [ ] Resaltar item activo

### 3.4 TopbarComponent
- [ ] Crear `layout/topbar/topbar.component.ts`
- [ ] Logo/nombre del grupo actual
- [ ] Selector de grupo (si tiene más de uno)
- [ ] Menú de usuario (perfil, cerrar sesión)
- [ ] Selector de idioma

### 3.5 GroupSelectorComponent
- [ ] Crear `shared/components/group-selector/group-selector.component.ts`
- [ ] Dropdown con grupos del gestor
- [ ] Cambiar grupo actual
- [ ] Guardar en localStorage

---

## Fase 4: Autenticación ⭐ PRIORIDAD 1

### 4.1 Página de Login
- [ ] Crear `features/auth/pages/login/login.component.ts`
- [ ] Formulario con PrimeNG:
  - p-inputText para email
  - p-password para password
  - p-button para submit
- [ ] Validaciones reactivas
- [ ] Implementar lógica de login
- [ ] Verificar que el usuario es gestor
- [ ] Si no es gestor → Mostrar error 403
- [ ] Si no tiene grupos → Mostrar error 401
- [ ] Navegar a dashboard tras login exitoso

---

## Fase 5: Grupos de Consumo ⭐ PRIORIDAD 2

### 5.1 ConsumerGroupService
- [ ] Crear `core/services/consumer-group.service.ts`
- [ ] Signals:
  - managerGroups (solo grupos donde es gestor)
  - currentGroup
- [ ] Métodos:
  - loadManagerGroups()
  - setCurrentGroup(groupId)
  - getGroupDetail(groupId)
  - updateGroup(groupId, data)

### 5.2 Inicialización de Grupos
- [ ] Al hacer login, cargar grupos del gestor
- [ ] Si tiene más de uno, seleccionar el por defecto
- [ ] Si solo tiene uno, seleccionarlo automáticamente
- [ ] Guardar selección en localStorage

---

## Fase 6: Dashboard (Home) ⭐ PRIORIDAD 2

### 6.1 Página de Dashboard
- [ ] Crear `features/home/pages/dashboard/dashboard.component.ts`
- [ ] Cards con métricas usando PrimeNG Card:
  - Total ventas del mes
  - Pendiente de cobro
  - Artículos en aparador
  - Número de miembros
- [ ] Gráfica de ventas con p-chart
- [ ] Tabla de ventas pendientes (últimas 10)
- [ ] Accesos rápidos a secciones importantes

---

## Fase 7: Aparador (Showcase) ⭐ PRIORIDAD 3

### 7.1 ShowcaseService
- [ ] Crear `features/showcase/services/showcase.service.ts`
- [ ] Signals:
  - showcaseArticles
  - loading
- [ ] Métodos:
  - loadShowcaseArticles(groupId)
  - removeFromShowcase(articleId)

### 7.2 Página de Aparador
- [ ] Crear `features/showcase/pages/showcase-list/showcase-list.component.ts`
- [ ] Tabla con p-table:
  - Columnas: Imagen, Nombre, Descripción, Unidad, Precio, Ciudad, Empresa, Demanda/Max
  - Ordenamiento por columnas
  - Filtro global por nombre
- [ ] Acciones por fila:
  - Editar (navegar a catálogo con ID)
  - Quitar del aparador (con confirmación)
- [ ] Botón "Afegir article" → Navegar a catálogo
- [ ] Mostrar cantidad demandada (suma de ventas pendientes)

---

## Fase 8: Catálogo ⭐ PRIORIDAD 3

### 8.1 CatalogService
- [ ] Crear `features/catalog/services/catalog.service.ts`
- [ ] Signals:
  - articles
  - selectedArticle
  - priceHistory
  - articleSales
  - loading
- [ ] Métodos:
  - loadArticles(groupId, filters?)
  - getArticleDetail(id)
  - createArticle(data)
  - updateArticle(id, data)
  - deleteArticle(id)
  - toggleShowcase(id, inShowcase)
  - loadPriceHistory(id)
  - loadArticleSales(id)
  - uploadImage(id, file)
  - deleteImage(id)

### 8.2 Página de Lista de Catálogo
- [ ] Crear `features/catalog/pages/catalog-list/catalog-list.component.ts`
- [ ] Tabla con p-table:
  - Columnas: Imagen, Nombre, Precio/Unidad, Ciudad, Empresa, Max, En Aparador
  - Paginación
  - Ordenamiento
  - Filtros: nombre, ciudad, productor, en aparador
- [ ] Acciones:
  - Click en fila → Ver detalle
  - Botón "Nou article" → Formulario de creación
- [ ] Badge/Tag para indicar si está en aparador

### 8.3 Página de Detalle de Artículo
- [ ] Crear `features/catalog/pages/article-detail/article-detail.component.ts`
- [ ] Secciones con p-tabView:
  - **Informació**: Formulario de edición
  - **Històric de preus**: Gráfica con p-chart
  - **Ventas**: Tabla de compras del artículo
- [ ] Formulario de edición:
  - Todos los campos del artículo
  - Upload de imagen con preview
  - Toggle para "En aparador"
  - Botón "Guardar"
- [ ] Gráfica de histórico de precios (line chart)
- [ ] Tabla de ventas del artículo:
  - Fecha, Cliente, Cantidad, Precio, Total, Pagado

### 8.4 Componente de Formulario de Artículo
- [ ] Crear `features/catalog/components/article-form/article-form.component.ts`
- [ ] Reutilizable para crear/editar
- [ ] Campos:
  - Nombre, descripción
  - Tipo de unidad (peso/volumen)
  - Unidad de medida (dropdown)
  - Precio por unidad
  - Ciudad, productor
  - Cantidad máxima
  - En aparador (checkbox)
- [ ] Validaciones
- [ ] Upload de imagen con preview

### 8.5 Componente de Gestión de Imagen
- [ ] Crear `shared/components/image-upload/image-upload.component.ts`
- [ ] Preview de imagen actual
- [ ] Botón para subir nueva imagen
- [ ] Botón para eliminar imagen
- [ ] Usar p-fileUpload

---

## Fase 9: Ventas ⭐ PRIORIDAD 3

### 9.1 SalesService
- [ ] Crear `features/sales/services/sales.service.ts`
- [ ] Signals:
  - unpaidSales
  - paidSales
  - selectedSale
  - loading
- [ ] Métodos:
  - loadSales(groupId, filters)
  - getSaleDetail(id)
  - registerPayment(saleId, paymentData)
  - markAsFullyPaid(saleId)

### 9.2 Página de Ventas
- [ ] Crear `features/sales/pages/sales-list/sales-list.component.ts`
- [ ] Tabs con p-tabView: "No pagades" y "Pagades"
- [ ] Tabla en cada tab con p-table:
  - Columnas: Fecha, Cliente, Total, Pagado, Pendent, Estat
  - Paginación
  - Filtros por fecha, cliente
- [ ] Colores condicionales:
  - Rojo: No pagado
  - Naranja: Parcial (con tooltip del monto pendiente)
  - Verde: Pagado
- [ ] Acciones:
  - Click en fila (no pagades) → Modal de pago
  - Click en fila (pagades) → Ver detalle en nueva página

### 9.3 Modal de Pago
- [ ] Crear `features/sales/pages/payment-modal/payment-modal.component.ts`
- [ ] Usar p-dialog
- [ ] Mostrar información de la venta
- [ ] Tabla con items de la venta:
  - Artículo, Cantidad, Precio unitario, Total, Pagado
  - Input numérico para cantidad pagada (si no está pagado)
  - Checkbox para marcar como pagado completo
- [ ] Totales:
  - Total de la venta
  - Total pagado
  - Pendent
- [ ] Botones:
  - "Pagar tot" → Marcar todos como pagados
  - "Guardar pagament" → Guardar pagos parciales
  - "Cancel·lar"
- [ ] Al guardar, recalcular totales y actualizar estado

### 9.4 Página de Detalle de Venta
- [ ] Crear `features/sales/pages/sale-detail/sale-detail.component.ts`
- [ ] Mostrar:
  - Info del cliente
  - Fecha de la venta
  - Tabla con items de la venta
  - Totales
  - Estado de pago
- [ ] Si está en "Pagades" pero se quiere editar:
  - Permitir modificar pagos
  - Mismo formulario que modal de pago

---

## Fase 10: Usuarios

### 10.1 UsersService
- [ ] Crear `features/users/services/users.service.ts`
- [ ] Signals:
  - groupUsers
  - selectedUser
  - userSales
  - loading
- [ ] Métodos:
  - loadGroupUsers(groupId)
  - getUserDetail(email)
  - updateUserRole(groupId, email, roles)
  - removeUserFromGroup(groupId, email)
  - inviteUser(groupId, email)
  - generateInviteLink(groupId)
  - getUserDebt(email, groupId)

### 10.2 Página de Lista de Usuarios
- [ ] Crear `features/users/pages/users-list/users-list.component.ts`
- [ ] Tabla con p-table:
  - Columnas: Avatar, Nombre, Email, Teléfono, Roles, Deuda
  - Paginación
  - Filtro por nombre, email
- [ ] Tags para roles (Client/Gestor) con p-tag
- [ ] Acciones:
  - Click en fila → Ver detalle
  - Botón "Convidar usuari"
- [ ] Badge de deuda en rojo si tiene pendiente

### 10.3 Modal de Invitación
- [ ] Crear `features/users/components/invite-modal/invite-modal.component.ts`
- [ ] Dos opciones:
  - Invitar por email (input + botón enviar)
  - Generar enlace de invitación (mostrar link, copiar al portapapeles)

### 10.4 Página de Detalle de Usuario
- [ ] Crear `features/users/pages/user-detail/user-detail.component.ts`
- [ ] Secciones con p-card:
  - **Informació personal**:
    - Avatar, nombre, email, teléfono
  - **Resum financer**:
    - Total pagado
    - Total pendiente
    - Mensaje de alerta si tiene deuda
  - **Historial de compres**:
    - Tabla de ventas del usuario
    - Estado de pago
    - Click en venta → Modal/página de pago
  - **Gestió de rols**:
    - Checkboxes para Client/Gestor
    - Botón "Guardar roles"
  - **Accions**:
    - Botón "Eliminar del grup" (con confirmación)

---

## Fase 11: Muro de Publicaciones ⭐ PRIORIDAD 4

### 11.1 MessagesService
- [ ] Crear `features/messages/services/messages.service.ts`
- [ ] Signals:
  - messages
  - loading
- [ ] Métodos:
  - loadMessages(groupId, pagination)
  - sendMessage(groupId, text, image?)
  - deleteMessage(id)
  - canDelete(messageId) - Verificar permisos

### 11.2 Página de Muro
- [ ] Crear `features/messages/pages/messages-wall/messages-wall.component.ts`
- [ ] Lista de mensajes con p-virtualScroller
- [ ] Componentes de mensaje:
  - Avatar del remitente
  - Nombre y rol (con badge si es gestor)
  - Contenido del mensaje
  - Imagen (si tiene)
  - Fecha/hora
  - Botón eliminar (si es propio)
- [ ] Input fijo abajo para nuevo mensaje:
  - p-inputTextarea
  - Botón para adjuntar imagen
  - Botón enviar
- [ ] Auto-scroll al enviar
- [ ] Paginación infinita (load more al scroll)

---

## Fase 12: Perfil del Grupo

### 12.1 Página de Perfil
- [ ] Crear `features/profile/pages/group-profile/group-profile.component.ts`
- [ ] Formulario con p-card:
  - Nombre, email, descripción
  - Ciudad, dirección
  - Upload de imagen del grupo
  - Redes sociales/contacto
- [ ] Sección de horarios:
  - Tabla/grid con días de la semana
  - Para cada día:
    - Checkbox "Cerrado"
    - Time picker para hora apertura
    - Time picker para hora cierre
  - Usar p-calendar con timeOnly
- [ ] Botón "Guardar canvis"

### 12.2 Componente de Horarios
- [ ] Crear `features/profile/components/schedule-editor/schedule-editor.component.ts`
- [ ] Grid con días de semana
- [ ] Por cada día:
  - Checkbox closed
  - p-calendar para hora apertura
  - p-calendar para hora cierre
- [ ] Retornar objeto JSON con formato del backend

---

## Fase 13: Componentes Compartidos

### 13.1 PageHeader
- [ ] Crear `shared/components/page-header/page-header.component.ts`
- [ ] Mostrar título de página
- [ ] Slot para botones de acción
- [ ] Breadcrumbs (opcional)

### 13.2 LoadingSpinner
- [ ] Crear `shared/components/loading-spinner/loading-spinner.component.ts`
- [ ] Usar p-progressSpinner
- [ ] Centrado y overlay

### 13.3 ConfirmDialog
- [ ] Configurar p-confirmDialog global
- [ ] Usar ConfirmationService de PrimeNG
- [ ] Estilo consistente

### 13.4 PriceHistoryChart
- [ ] Crear `shared/components/price-history-chart/price-history-chart.component.ts`
- [ ] Usar p-chart con Chart.js
- [ ] Gráfica de líneas
- [ ] Input: array de { price, date }

### 13.5 EmptyState
- [ ] Crear `shared/components/empty-state/empty-state.component.ts`
- [ ] Icono, mensaje, acción opcional
- [ ] Uso en tablas vacías

---

## Fase 14: Pipes Personalizados

### 14.1 Currency Pipe (€)
- [ ] Crear pipe para formatear precios con € y coma decimal

### 14.2 Date Pipe (Catalán/Castellano)
- [ ] Formatear fechas según idioma

### 14.3 Unit Measure Pipe
- [ ] Formatear unidades de medida (2.5 kg, 500 ml)

---

## Fase 15: Optimizaciones y Polish

### 15.1 Performance
- [ ] ChangeDetection OnPush en todos los componentes
- [ ] TrackBy en *ngFor de tablas
- [ ] Lazy loading de módulos
- [ ] Virtual scrolling en listas largas

### 15.2 UX Improvements
- [ ] Toasts consistentes con MessageService
- [ ] Confirmaciones antes de eliminar
- [ ] Loading states en todas las acciones
- [ ] Deshabilitarbotones durante carga
- [ ] Validaciones visuales en formularios

### 15.3 Accesibilidad
- [ ] Labels en todos los inputs
- [ ] ARIA attributes
- [ ] Navegación por teclado
- [ ] Contraste adecuado

### 15.4 Responsive
- [ ] Adaptar tablas a mobile (opcional, prioridad baja)
- [ ] Sidebar colapsable en tablets
- [ ] Menu mobile

---

## Fase 16: Testing Manual y Ajustes

### 16.1 Testing de Funcionalidades
- [ ] Probar flujo completo de gestión de artículos
- [ ] Probar flujo de ventas y pagos
- [ ] Probar gestión de usuarios
- [ ] Verificar permisos de gestor

### 16.2 Ajustes Finales
- [ ] Refinar estilos de PrimeNG + Bulma
- [ ] Unificar espaciado
- [ ] Revisar traducciones
- [ ] Optimizar queries a la API

---

## Orden de Implementación Recomendado

1. **Setup + Core Services** (Fases 1-2) ⭐
2. **Layout y Navegación** (Fase 3) ⭐
3. **Autenticación** (Fase 4) ⭐
4. **Grupos de Consumo + Dashboard** (Fases 5-6) ⭐
5. **Aparador** (Fase 7) ⭐
6. **Catálogo** (Fase 8) ⭐
7. **Ventas** (Fase 9) ⭐
8. **Usuarios** (Fase 10)
9. **Muro de Publicaciones** (Fase 11) ⭐
10. **Perfil del Grupo** (Fase 12)
11. **Componentes Compartidos** (Fase 13)
12. **Pipes** (Fase 14)
13. **Optimizaciones** (Fase 15)
14. **Testing** (Fase 16)

---

## Dependencias Entre Features

```
Auth → (todos los demás)
Core Services → (todos los demás)
Groups → Dashboard, Showcase, Catalog, Sales, Users, Messages, Profile
Showcase ← Catalog (navegación)
Sales ← Catalog (info de artículos)
Users ← Sales (historial de compras)
Messages → Groups
Profile → Groups
```

---

## Notas Importantes

- Usar PrimeNG para componentes de formulario y tablas
- Usar Bulma para layout y utilidades CSS
- Todos los listados con paginación y filtros
- Confirmaciones antes de acciones destructivas
- Mostrar loading states durante llamadas API
- Gestionar errores con MessageService (toasts)
- Usar p-confirmDialog para confirmaciones
- Responsive opcional (prioridad baja, enfoque desktop)

