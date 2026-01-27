import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ConsumerGroupService } from '../services/consumer-group.service';
import { UserRole } from '../models/user-role.enum';

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

  // Comprovar si és preparador d'almenys un grup
  const hasPreparerRole = groupService.userGroups().some(group => group.role?.isPreparer === true);
  
  // Manager també té accés (perquè pot veure tot del grup)
  const isManager = groupService.isManager();
  
  if (hasPreparerRole || isManager) {
    return true;
  }

  // Si no té cap d'aquests rols, denegar accés
  router.navigate(['/home']);
  return false;
};

