import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { ConsumerGroupService } from '../services/consumer-group.service';

export const managerGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const groupService = inject(ConsumerGroupService);
  const router = inject(Router);

  if (!authService.isAuthenticated()) {
    router.navigate(['/login']);
    return false;
  }

  // SuperAdmins tienen acceso a todo sin necesidad de grupo
  if (authService.isSuperAdmin()) {
    return true;
  }

  const selectedGroupId = groupService.selectedGroupId();
  if (!selectedGroupId) {
    router.navigate(['/home']);
    return false;
  }

  // Verificar que el usuario es manager del grupo seleccionado usando signals
  const isManager = groupService.isManager();

  if (!isManager) {
    router.navigate(['/home']);
    return false;
  }

  return true;
};

