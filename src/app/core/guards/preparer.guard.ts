import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ConsumerGroupService } from '../services/consumer-group.service';

/**
 * Guard per a rutes que requereixen rol de preparador
 * Permet accés a SuperAdmin, Admin, Manager i Preparer (a nivell de grup)
 */
export const preparerGuard: CanActivateFn = async (route, state) => {
  const authService = inject(AuthService);
  const groupService = inject(ConsumerGroupService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // SuperAdmin té accés a tot
  if (authService.isSuperAdmin()) {
    return true;
  }

  // Admin té accés
  if (authService.isAdmin()) {
    return true;
  }

  // Carregar grups si no estan carregats
  if (groupService.userGroups().length === 0) {
    await groupService.loadUserGroups();
  }

  const groups = groupService.userGroups();
  // Comprovar si és preparador d'almenys un grup (acceptar qualsevol valor truthy)
  const hasPreparerRole = groups.some(group => Boolean(group.role?.isPreparer));
  // Manager en qualsevol grup (no només el seleccionat) també té accés
  const hasManagerRole = groups.some(group => Boolean(group.role?.isManager));

  if (hasPreparerRole || hasManagerRole) {
    return true;
  }

  // Si no té cap d'aquests rols, denegar accés
  router.navigate(['/home']);
  return false;
};

