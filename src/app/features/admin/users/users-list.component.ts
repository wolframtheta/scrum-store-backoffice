import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { Router } from '@angular/router';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';

import { AdminUsersService, UserAdmin } from '../../../core/services/admin-users.service';
import { AutoCompleteModule } from 'primeng/autocomplete';

@Component({
  selector: 'app-users-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    TagModule,
    TooltipModule,
    ToastModule,
    ConfirmDialogModule,
    AutoCompleteModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss',
})
export class UsersListComponent implements OnInit {
  protected readonly adminUsersService = inject(AdminUsersService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);

  // State
  protected readonly searchTerm = signal<string>('');
  protected readonly selectedRole = signal<{ label: string; value: string | null }>({
    label: 'admin.users.filters.allRoles',
    value: null
  });
  protected readonly selectedStatus = signal<{ label: string; value: boolean | null }>({
    label: 'admin.users.filters.all',
    value: null
  });

  protected readonly roleOptions = [
    { label: 'admin.users.filters.allRoles', value: null },
    { label: 'admin.users.roles.superAdmin', value: 'super_admin' },
    { label: 'admin.users.roles.admin', value: 'admin' },
    { label: 'admin.users.roles.client', value: 'client' },
  ];

  protected readonly statusOptions = [
    { label: 'admin.users.filters.all', value: null },
    { label: 'admin.users.filters.active', value: true },
    { label: 'admin.users.filters.inactive', value: false },
  ];

  async ngOnInit() {
    await this.loadUsers();
  }

  protected async loadUsers() {
    try {
      await this.adminUsersService.loadUsers({
        page: this.adminUsersService.currentPage(),
        limit: 10,
        search: this.searchTerm() || undefined,
        role: this.selectedRole().value ?? undefined,
        isActive: this.selectedStatus().value ?? undefined,
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'admin.users.errors.loadFailed',
      });
    }
  }

  protected async onPageChange(event: any) {
    await this.adminUsersService.loadUsers({
      page: event.page + 1,
      limit: event.rows,
      search: this.searchTerm() || undefined,
      role: this.selectedRole().value ?? undefined,
      isActive: this.selectedStatus().value ?? undefined,
    });
  }

  protected async onSearch() {
    await this.loadUsers();
  }

  protected async onRoleChange() {
    await this.loadUsers();
  }

  protected async onStatusChange() {
    await this.loadUsers();
  }

  protected viewUserDetail(user: UserAdmin) {
    this.router.navigate(['/admin/users', user.email]);
  }

  protected async toggleUserStatus(user: UserAdmin) {
    this.confirmationService.confirm({
      message: `¿Segur que vols ${user.isActive ? 'desactivar' : 'activar'} aquest usuari?`,
      header: 'Confirmació',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await this.adminUsersService.updateUserStatus(user.email, !user.isActive);
          this.messageService.add({
            severity: 'success',
            summary: 'Èxit',
            detail: `Usuari ${!user.isActive ? 'activat' : 'desactivat'} correctament`,
          });
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'admin.users.errors.statusUpdateFailed',
          });
        }
      },
    });
  }

  protected async resetPassword(user: UserAdmin) {
    this.confirmationService.confirm({
      message: `¿Segur que vols restablir la contrasenya de "${user.name} ${user.surname}"?`,
      header: 'Confirmar restabliment',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          const tempPassword = await this.adminUsersService.resetUserPassword(user.email);
          this.messageService.add({
            severity: 'success',
            summary: 'Èxit',
            detail: `Contrasenya temporal: ${tempPassword}`,
            life: 10000,
          });
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'admin.users.errors.resetPasswordFailed',
          });
        }
      },
    });
  }

  protected deleteUser(user: UserAdmin) {
    this.confirmationService.confirm({
      message: `¿Segur que vols eliminar l'usuari "${user.name} ${user.surname}"? Aquesta acció no es pot desfer.`,
      header: 'Confirmar eliminació',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          await this.adminUsersService.deleteUser(user.email);
          this.messageService.add({
            severity: 'success',
            summary: 'Èxit',
            detail: 'admin.users.success.deleted',
          });
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'admin.users.errors.deleteFailed',
          });
        }
      },
    });
  }

  protected getStatusSeverity(isActive: boolean): 'success' | 'danger' {
    return isActive ? 'success' : 'danger';
  }

  protected getStatusLabel(isActive: boolean): string {
    return isActive ? 'admin.users.status.active' : 'admin.users.status.inactive';
  }

  protected getRoleSeverity(role: string): 'danger' | 'warn' | 'info' {
    const severityMap: Record<string, 'danger' | 'warn' | 'info'> = {
      'super_admin': 'danger',
      'admin': 'warn',
      'client': 'info',
    };
    return severityMap[role] || 'info';
  }

  protected getRoleLabel(role: string): string {
    const labelMap: Record<string, string> = {
      'super_admin': 'admin.users.roles.superAdmin',
      'admin': 'admin.users.roles.admin',
      'client': 'admin.users.roles.client',
    };
    return labelMap[role] || role;
  }
}

