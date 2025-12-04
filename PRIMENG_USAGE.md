# Uso de PrimeNG en Scrum Store Backoffice

## Regla obligatoria: SIEMPRE usar componentes de PrimeNG

En el desarrollo del Backoffice de Scrum Store, **es obligatorio** usar componentes de PrimeNG siempre que sea posible, en lugar de elementos HTML planos.

### Componentes a usar:

#### Formularios
- **Inputs**: `<input pInputText>` en lugar de `<input>`
- **Password**: `<p-password>` en lugar de `<input type="password">`
- **Dropdown**: `<p-dropdown>` en lugar de `<select>`
- **Calendar**: `<p-calendar>` en lugar de `<input type="date">`
- **Checkbox**: `<p-checkbox>` en lugar de `<input type="checkbox">`
- **Radio**: `<p-radioButton>` en lugar de `<input type="radio">`
- **TextArea**: `<textarea pInputTextarea>` en lugar de `<textarea>`
- **FileUpload**: `<p-fileUpload>` en lugar de `<input type="file">`

#### Tablas
- **Table**: `<p-table>` con todas sus características (paginación, ordenamiento, filtros)

#### Botones
- **Button**: `<p-button>` en lugar de `<button>`
- **Split Button**: `<p-splitButton>` para menús desplegables

#### Navegación
- **Menu**: `<p-menu>` para menús contextuales
- **MenuBar**: `<p-menubar>` para barras de navegación
- **TabMenu**: `<p-tabMenu>` para navegación por pestañas
- **Breadcrumb**: `<p-breadcrumb>` para rutas de navegación

#### Diálogos y Mensajes
- **Dialog**: `<p-dialog>` para modales
- **Toast**: `<p-toast>` para notificaciones toast
- **Message**: `<p-message>` para mensajes inline
- **Confirm Dialog**: `<p-confirmDialog>` para confirmaciones

#### Paneles y Layout
- **Panel**: `<p-panel>` para secciones colapsables
- **Card**: `<p-card>` para tarjetas
- **Accordion**: `<p-accordion>` para contenido colapsable
- **TabView**: `<p-tabView>` para pestañas

#### Data Display
- **DataView**: `<p-dataView>` para listas personalizadas
- **Timeline**: `<p-timeline>` para cronologías
- **Tree**: `<p-tree>` para estructuras jerárquicas

### Temas y personalización

- Seguir el tema de PrimeNG y personalizarlo con CSS variables cuando sea necesario
- Mantener la consistencia del branding de Scrum Store:
  - **Color primario**: `#0C75AC` (Azul)
  - **Color secundario**: `#fccb34` (Amarillo/Dorado)
  - **Color terciario**: `#AC0C74` (Magenta)

### Imports necesarios

Siempre importar los módulos de PrimeNG en los componentes standalone:

```typescript
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
// ... otros módulos según necesidad

@Component({
  imports: [
    InputTextModule,
    PasswordModule,
    ButtonModule,
    // ... otros módulos
  ]
})
```

### Ejemplo de uso correcto

**❌ Incorrecto:**
```html
<input type="email" class="input" [(ngModel)]="email">
<button class="button">Enviar</button>
```

**✅ Correcto:**
```html
<input pInputText type="email" [(ngModel)]="email">
<p-button label="Enviar" icon="pi pi-send" />
```

### Recursos

- [PrimeNG Documentation](https://primeng.org/)
- [PrimeNG Showcase](https://primeng.org/showcase)
- [PrimeIcons](https://primeng.org/icons)


