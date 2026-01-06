import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { adminGuard } from './core/guards/admin.guard';
import { managerGuard } from './core/guards/manager.guard';
import { preparerGuard } from './core/guards/preparer.guard';
import { LayoutComponent } from './core/components/layout/layout.component';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then(m => m.RegisterComponent)
  },
  {
    path: 'invitation-success',
    loadComponent: () => import('./features/auth/invitation-success/invitation-success.component').then(m => m.InvitationSuccessComponent)
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./features/auth/reset-password/reset-password.component').then(m => m.ResetPasswordComponent)
  },
  {
    path: '',
    component: LayoutComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'home',
        loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent)
      },
      {
        path: 'profile',
        loadComponent: () => import('./features/profile/profile.component').then(m => m.ProfileComponent)
      },
      // Rutes accessibles per preparador (avisos, comandes, preparació)
      {
        path: 'notices',
        canActivate: [preparerGuard],
        loadComponent: () => import('./features/notices/pages/notices-list/notices-list.component').then(m => m.NoticesListComponent)
      },
      {
        path: 'sales',
        canActivate: [preparerGuard],
        loadComponent: () => import('./features/sales/pages/sales-list/sales-list.component').then(m => m.SalesListComponent)
      },
      {
        path: 'basket-preparation',
        canActivate: [preparerGuard],
        loadComponent: () => import('./features/sales/pages/basket-preparation/basket-preparation.component').then(m => m.BasketPreparationComponent)
      },
      // Rutes només per gestor (manager)
      {
        path: 'showcase',
        canActivate: [managerGuard],
        loadComponent: () => import('./features/showcase/pages/showcase-list/showcase-list.component').then(m => m.ShowcaseListComponent)
      },
      {
        path: 'catalog',
        canActivate: [managerGuard],
        loadComponent: () => import('./features/catalog/pages/catalog-list/catalog-list.component').then(m => m.CatalogListComponent)
      },
      {
        path: 'catalog/:id',
        canActivate: [managerGuard],
        loadComponent: () => import('./features/catalog/pages/article-detail/article-detail.component').then(m => m.ArticleDetailComponent)
      },
      {
        path: 'producers',
        canActivate: [managerGuard],
        loadComponent: () => import('./features/producers/pages/producers-list/producers-list.component').then(m => m.ProducersListComponent)
      },
      {
        path: 'suppliers',
        canActivate: [managerGuard],
        loadComponent: () => import('./features/suppliers/pages/suppliers-list').then(m => m.SuppliersListComponent)
      },
      {
        path: 'periods/:periodId/orders-summary',
        canActivate: [managerGuard],
        loadComponent: () => import('./features/periods/pages/period-orders-summary/period-orders-summary.component').then(m => m.PeriodOrdersSummaryComponent)
      },
      {
        path: 'periods/new',
        canActivate: [managerGuard],
        loadComponent: () => import('./features/periods/pages/period-form/period-form-page.component').then(m => m.PeriodFormPageComponent)
      },
      {
        path: 'periods/edit/:id',
        canActivate: [managerGuard],
        loadComponent: () => import('./features/periods/pages/period-form/period-form-page.component').then(m => m.PeriodFormPageComponent)
      },
      {
        path: 'periods/:supplierId',
        canActivate: [managerGuard],
        loadComponent: () => import('./features/periods/pages/periods-list/periods-list.component').then(m => m.PeriodsListComponent)
      },
      {
        path: 'periods',
        canActivate: [managerGuard],
        loadComponent: () => import('./features/periods/pages/periods-list/periods-list.component').then(m => m.PeriodsListComponent)
      },
      {
        path: 'users',
        canActivate: [managerGuard],
        loadComponent: () => import('./features/users/pages/users-list/users-list.component').then(m => m.UsersListComponent)
      },
      {
        path: 'settings',
        canActivate: [managerGuard],
        loadComponent: () => import('./features/settings/pages/group-settings/group-settings.component').then(m => m.GroupSettingsComponent)
      },
      {
        path: 'csv-import',
        canActivate: [managerGuard],
        loadComponent: () => import('./features/csv/pages/csv-viewer/csv-viewer.component').then(m => m.CsvViewerComponent)
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        children: [
          {
            path: '',
            redirectTo: 'groups',
            pathMatch: 'full'
          },
          {
            path: 'groups',
            loadComponent: () => import('./features/admin/groups/groups-list.component').then(m => m.GroupsListComponent)
          },
          {
            path: 'users',
            loadComponent: () => import('./features/admin/users/users-list.component').then(m => m.UsersListComponent)
          },
          {
            path: 'users/:email',
            loadComponent: () => import('./features/admin/users/user-detail/user-detail.component').then(m => m.UserDetailComponent)
          }
        ]
      }
    ]
  },
  {
    path: '**',
    redirectTo: 'login'
  }
];
