import { Component, inject, OnInit, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { ConsumerGroupService } from '../../core/services/consumer-group.service';
import { ButtonModule } from 'primeng/button';
import { ModuleCardComponent, ModuleCardConfig } from './components/module-card/module-card.component';

@Component({
  selector: 'app-home',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TranslateModule,
    ButtonModule,
    ModuleCardComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
})
export class HomeComponent implements OnInit {
  protected readonly authService = inject(AuthService);
  protected readonly groupService = inject(ConsumerGroupService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  protected readonly isSuperAdmin = computed(() =>
    this.authService.currentUser()?.roles?.includes('super_admin') ?? false
  );

  protected readonly modules = computed<ModuleCardConfig[]>(() => {
    const baseModules: ModuleCardConfig[] = [
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
        id: 'sales',
        title: this.translate.instant('home.modules.sales.title'),
        description: this.translate.instant('home.modules.sales.description'),
        icon: 'pi-shopping-cart',
        color: '#10b981',
        route: '/sales'
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
        id: 'settings',
        title: this.translate.instant('home.modules.settings.title'),
        description: this.translate.instant('home.modules.settings.description'),
        icon: 'pi-cog',
        color: '#0C75AC',
        route: '/settings'
      }
    ];

    // Add admin modules if super admin
    if (this.isSuperAdmin()) {
      baseModules.push(
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
      );
    }

    return baseModules;
  });

  async ngOnInit(): Promise<void> {
    await this.groupService.loadUserGroups();
  }

  protected onModuleClick(route: string): void {
    this.router.navigate([route]);
  }

  protected async logout(): Promise<void> {
    await this.authService.logout();
  }
}
