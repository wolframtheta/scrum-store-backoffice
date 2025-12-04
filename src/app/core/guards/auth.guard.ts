import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ConsumerGroupService } from '../services/consumer-group.service';

export const authGuard: CanActivateFn = async () => {
  const authService = inject(AuthService);
  const groupService = inject(ConsumerGroupService);
  const router = inject(Router);

  // Comprovar autenticació
  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // Comprovar si és SuperAdmin
  if (authService.isSuperAdmin()) {
    return true;
  }

  // Comprovar si és manager d'almenys un grup
  // Carregar grups si no estan carregats
  if (groupService.userGroups().length === 0) {
    await groupService.loadUserGroups();
  }

  // Comprovar si és manager d'algun grup
  const hasManagerRole = groupService.userGroups().some(group => group.role?.isManager === true);

  if (!hasManagerRole) {
    // L'usuari no és SuperAdmin ni manager, redirigir a una pàgina d'error o logout
    await authService.logout();
    router.navigate(['/login'], { 
      queryParams: { error: 'access_denied' } 
    });
    return false;
  }

  return true;
};


