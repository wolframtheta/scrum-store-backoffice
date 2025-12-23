import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { superAdminGuard } from './core/guards/super-admin.guard';
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
      {
        path: 'notices',
        loadComponent: () => import('./features/notices/pages/notices-list/notices-list.component').then(m => m.NoticesListComponent)
      },
      {
        path: 'showcase',
        loadComponent: () => import('./features/showcase/pages/showcase-list/showcase-list.component').then(m => m.ShowcaseListComponent)
      },
      {
        path: 'catalog',
        loadComponent: () => import('./features/catalog/pages/catalog-list/catalog-list.component').then(m => m.CatalogListComponent)
      },
      {
        path: 'producers',
        loadComponent: () => import('./features/producers/pages/producers-list/producers-list.component').then(m => m.ProducersListComponent)
      },
      {
        path: 'suppliers',
        loadComponent: () => import('./features/suppliers/pages/suppliers-list').then(m => m.SuppliersListComponent)
      },
      {
        path: 'orders',
        loadComponent: () => import('./features/orders/pages/orders-list/orders-list.component').then(m => m.OrdersListComponent)
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/pages/users-list/users-list.component').then(m => m.UsersListComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./features/settings/pages/group-settings/group-settings.component').then(m => m.GroupSettingsComponent)
      },
      {
        path: 'admin',
        canActivate: [superAdminGuard],
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
