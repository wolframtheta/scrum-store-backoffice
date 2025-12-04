import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const superAdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.currentUser();

  if (!currentUser) {
    router.navigate(['/login']);
    return false;
  }

  // Check if user has SUPER_ADMIN role
  const isSuperAdmin = currentUser.roles?.includes('super_admin');

  if (!isSuperAdmin) {
    // Redirect to home if user is not SuperAdmin
    router.navigate(['/home']);
    return false;
  }

  return true;
};


