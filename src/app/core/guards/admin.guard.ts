import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { UserRole } from '../models/user-role.enum';

/**
 * Guard per a rutes que requereixen rol d'administrador
 * Permet accés a SuperAdmin i Admin
 */
export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.currentUser();

  if (!currentUser) {
    router.navigate(['/login']);
    return false;
  }

  // SuperAdmin i Admin tenen accés
  const hasAccess = authService.hasAnyRole(UserRole.SUPER_ADMIN, UserRole.ADMIN);

  if (!hasAccess) {
    router.navigate(['/home']);
    return false;
  }

  return true;
};

