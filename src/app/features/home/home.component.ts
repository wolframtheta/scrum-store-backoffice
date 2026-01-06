import { Component, inject, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { ConsumerGroupService } from '../../core/services/consumer-group.service';
import { SystemConfigService } from '../../core/services/system-config.service';
import { ButtonModule } from 'primeng/button';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ModuleCardComponent, ModuleCardConfig } from './components/module-card/module-card.component';
import { UserRole } from '../../core/models/user-role.enum';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TranslateModule,
    ButtonModule,
    ConfirmDialogModule,
    ToastModule,
    ModuleCardComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly groupService = inject(ConsumerGroupService);
  protected readonly systemConfigService = inject(SystemConfigService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  protected readonly isSuperAdmin = computed(() =>
    this.authService.currentUser()?.roles?.includes(UserRole.SUPER_ADMIN) ?? false
  );

  protected readonly isAdmin = computed(() =>
    this.authService.currentUser()?.roles?.includes(UserRole.ADMIN) ?? false
  );

  protected readonly canManageLogin = computed(() =>
    this.isSuperAdmin() || this.isAdmin()
  );

  protected readonly isPreparer = computed(() => {
    const hasGroups = this.groupService.userGroups().length > 0;
    if (!hasGroups) return false;
    return this.groupService.userGroups().some(group => group.role?.isPreparer === true);
  });

  protected readonly isManager = computed(() => {
    const hasGroups = this.groupService.userGroups().length > 0;
    if (!hasGroups) return false;
    return this.groupService.userGroups().some(group => group.role?.isManager === true);
  });

  protected readonly modules = computed<ModuleCardConfig[]>(() => {
    const hasGroups = this.groupService.userGroups().length > 0;
    
    // Mòduls d'administració (només per SuperAdmin i Admin)
    const adminModules: ModuleCardConfig[] = [
      {
        id: 'admin-groups',
        title: this.translate.instant('home.modules.adminGroups.title'),
        description: this.translate.instant('home.modules.adminGroups.description'),
        icon: 'pi-building',
        color: '#ea580c',
        route: '/admin/groups'
      },
      {
        id: 'admin-users',
        title: this.translate.instant('home.modules.adminUsers.title'),
        description: this.translate.instant('home.modules.adminUsers.description'),
        icon: 'pi-shield',
        color: '#dc2626',
        route: '/admin/users'
      }
    ];

    // Mòduls per preparador (només avisos, comandes i preparació)
    const preparerModules: ModuleCardConfig[] = [
      {
        id: 'notices',
        title: this.translate.instant('home.modules.notices.title'),
        description: this.translate.instant('home.modules.notices.description'),
        icon: 'pi-megaphone',
        color: '#8b5cf6',
        route: '/notices'
      },
      {
        id: 'sales',
        title: this.translate.instant('home.modules.sales.title'),
        description: this.translate.instant('home.modules.sales.description'),
        icon: 'pi-shopping-cart',
        color: '#10b981',
        route: '/sales'
      },
      {
        id: 'basket-preparation',
        title: this.translate.instant('home.modules.basketPreparation.title'),
        description: this.translate.instant('home.modules.basketPreparation.description'),
        icon: 'pi-shopping-bag',
        color: '#8b5cf6',
        route: '/basket-preparation'
      }
    ];

    // Si és preparador, només mostrar els seus mòduls
    if (this.isPreparer() && !this.isManager() && !this.isSuperAdmin()) {
      return preparerModules;
    }

    // Si és admin sense grups, només mostrar mòduls d'admin
    if (this.isAdmin() && !hasGroups && !this.isSuperAdmin()) {
      return adminModules;
    }

    // Mòduls base del gestor (requereixen grup)
    const managerModules: ModuleCardConfig[] = [
      {
        id: 'catalog',
        title: this.translate.instant('home.modules.catalog.title'),
        description: this.translate.instant('home.modules.catalog.description'),
        icon: 'pi-box',
        color: '#3b82f6',
        route: '/catalog'
      },
      {
        id: 'showcase',
        title: this.translate.instant('home.modules.showcase.title'),
        description: this.translate.instant('home.modules.showcase.description'),
        icon: 'pi-eye',
        color: '#a855f7',
        route: '/showcase'
      },
      {
        id: 'producers',
        title: this.translate.instant('home.modules.producers.title'),
        description: this.translate.instant('home.modules.producers.description'),
        icon: 'pi-truck',
        color: '#06b6d4',
        route: '/producers'
      },
      {
        id: 'suppliers',
        title: this.translate.instant('home.modules.suppliers.title'),
        description: this.translate.instant('home.modules.suppliers.description'),
        icon: 'pi-briefcase',
        color: '#8b5cf6',
        route: '/suppliers'
      },
      {
        id: 'periods',
        title: this.translate.instant('home.modules.periods.title'),
        description: this.translate.instant('home.modules.periods.description'),
        icon: 'pi-calendar',
        color: '#f97316',
        route: '/periods'
      },
      {
        id: 'sales',
        title: this.translate.instant('home.modules.sales.title'),
        description: this.translate.instant('home.modules.sales.description'),
        icon: 'pi-shopping-cart',
        color: '#10b981',
        route: '/sales'
      },
      {
        id: 'basket-preparation',
        title: this.translate.instant('home.modules.basketPreparation.title'),
        description: this.translate.instant('home.modules.basketPreparation.description'),
        icon: 'pi-shopping-bag',
        color: '#8b5cf6',
        route: '/basket-preparation'
      },
      {
        id: 'users',
        title: this.translate.instant('home.modules.users.title'),
        description: this.translate.instant('home.modules.users.description'),
        icon: 'pi-users',
        color: '#f59e0b',
        route: '/users'
      },
      {
        id: 'notices',
        title: this.translate.instant('home.modules.notices.title'),
        description: this.translate.instant('home.modules.notices.description'),
        icon: 'pi-megaphone',
        color: '#8b5cf6',
        route: '/notices'
      },
      {
        id: 'csv-import',
        title: this.translate.instant('home.modules.csvImport.title'),
        description: this.translate.instant('home.modules.csvImport.description'),
        icon: 'pi-file-import',
        color: '#14b8a6',
        route: '/csv-import'
      },
      {
        id: 'settings',
        title: this.translate.instant('home.modules.settings.title'),
        description: this.translate.instant('home.modules.settings.description'),
        icon: 'pi-cog',
        color: '#0C75AC',
        route: '/settings'
      }
    ];

    // SuperAdmin amb grups: tot
    if (this.isSuperAdmin() && hasGroups) {
      return [...managerModules, ...adminModules];
    }

    // SuperAdmin sense grups: només admin
    if (this.isSuperAdmin() && !hasGroups) {
      return adminModules;
    }

    // Admin amb grups: admin + gestor
    if (this.isAdmin() && hasGroups) {
      return [...managerModules, ...adminModules];
    }

    // Gestor: només mòduls del gestor
    if (this.isManager()) {
      return managerModules;
    }

    // Preparador amb gestor: preparador + gestor
    if (this.isPreparer() && this.isManager()) {
      return [...preparerModules, ...managerModules];
    }

    // Per defecte, retornar mòduls de preparador si és preparador
    if (this.isPreparer()) {
      return preparerModules;
    }

    // Si no hi ha cap rol vàlid, retornar array buit
    return [];
  });

  async ngOnInit(): Promise<void> {
    await this.groupService.loadUserGroups();
    if (this.canManageLogin()) {
      await this.systemConfigService.loadLoginEnabled();
    }
  }

  protected onModuleClick(route: string): void {
    this.router.navigate([route]);
  }

  protected async logout(): Promise<void> {
    await this.authService.logout();
  }

  protected async toggleLoginStatus(): Promise<void> {
    const currentStatus = this.systemConfigService.loginEnabled();
    const newStatus = !currentStatus;
    
    const confirmMessage = newStatus
      ? this.translate.instant('home.systemConfig.confirmEnable')
      : this.translate.instant('home.systemConfig.confirmDisable');

    this.confirmationService.confirm({
      message: confirmMessage,
      header: this.translate.instant('common.confirm'),
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          await this.systemConfigService.updateLoginEnabled(newStatus);
          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('common.success'),
            detail: this.translate.instant('home.systemConfig.statusUpdated')
          });
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('common.error'),
            detail: this.translate.instant('home.systemConfig.errorUpdating')
          });
        }
      }
    });
  }
}
