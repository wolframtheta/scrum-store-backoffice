import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ConsumerGroupService } from '../services/consumer-group.service';
import { UserRole } from '../models/user-role.enum';

/**
 * Guard principal que comprova si l'usuari pot accedir al gestor
 * Permet accés a:
 * - SuperAdmin
 * - Admin
 * - Preparer
 * - Manager (d'almenys un grup)
 * 
 * Bloqueja accés a:
 * - Client (només amb rol CLIENT, sense altres rols)
 */
export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const groupService = inject(ConsumerGroupService);
  const router = inject(Router);

  // Comprovar autenticació
  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // SuperAdmin té accés total
  if (authService.isSuperAdmin()) {
    return true;
  }

  // Admin té accés
  if (authService.isAdmin()) {
    return true;
  }

  // Carregar grups si no estan carregats per comprovar rols a nivell de grup
  if (groupService.userGroups().length === 0) {
    await groupService.loadUserGroups();
  }

  // Comprovar si és preparador d'almenys un grup
  const hasPreparerRole = groupService.userGroups().some(group => group.role?.isPreparer === true);
  
  if (hasPreparerRole) {
    return true;
  }

  // Comprovar si és manager d'almenys un grup
  // Carregar grups si no estan carregats
  if (groupService.userGroups().length === 0) {
    await groupService.loadUserGroups();
  }

  // Comprovar si és manager d'algun grup
  const hasManagerRole = groupService.userGroups().some(group => group.role?.isManager === true);

  if (hasManagerRole) {
    return true;
  }

  // Si només té rol CLIENT (sense altres rols), no pot accedir al gestor
  if (authService.isClient()) {
    await authService.logout();
    router.navigate(['/login'], { 
      queryParams: { error: 'access_denied' } 
    });
    return false;
  }

  // Per defecte, denegar accés
  await authService.logout();
  router.navigate(['/login'], { 
    queryParams: { error: 'access_denied' } 
  });
  return false;
};


