import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { TableModule } from 'primeng/table';
import { TabsModule, TabPanels } from 'primeng/tabs';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

import { AdminUsersService, UserAdmin, UserActivity } from '../../../../core/services/admin-users.service';
import { UserRole } from '../../../../core/models/user-role.enum';

interface UserGroup {
  id: string;
  name: string;
  role: {
    isClient: boolean;
    isManager: boolean;
    isDefault: boolean;
  };
  joinedAt: string;
}

@Component({
  selector: 'app-user-detail',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    ButtonModule,
    CardModule,
    TagModule,
    TableModule,
    TabsModule,
    ProgressSpinnerModule,
    ToastModule,
    TooltipModule,
    CheckboxModule,
    ConfirmDialogModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './user-detail.component.html',
  styleUrl: './user-detail.component.scss'
})
export class UserDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly adminUsersService = inject(AdminUsersService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  protected readonly userEmail = signal<string>('');
  protected readonly user = signal<UserAdmin | null>(null);
  protected readonly userGroups = signal<UserGroup[]>([]);
  protected readonly userActivity = signal<UserActivity | null>(null);
  protected readonly isLoading = signal<boolean>(false);
  protected readonly isLoadingGroups = signal<boolean>(false);
  protected readonly isLoadingActivity = signal<boolean>(false);
  protected readonly activeTab = signal<string>('general');
  protected readonly selectedRoles = signal<UserRole[]>([]);
  protected readonly isSavingRoles = signal<boolean>(false);
  protected readonly roleStates = signal<Record<string, boolean>>({});

  // Available roles
  protected readonly availableRoles = [
    { value: UserRole.SUPER_ADMIN, label: 'admin.users.roles.superAdmin' },
    { value: UserRole.ADMIN, label: 'admin.users.roles.admin' },
    { value: UserRole.CLIENT, label: 'admin.users.roles.client' },
    { value: UserRole.PREPARER, label: 'admin.users.roles.preparer' }
  ];

  async ngOnInit(): Promise<void> {
    const email = this.route.snapshot.paramMap.get('email');
    if (!email) {
      this.router.navigate(['/admin/users']);
      return;
    }

    this.userEmail.set(email);
    await this.loadUserDetail();
    await this.loadUserGroups();
    await this.loadUserActivity();
  }

  protected async loadUserDetail(): Promise<void> {
    this.isLoading.set(true);
    try {
      const user = await this.adminUsersService.getUserDetail(this.userEmail());
      this.user.set(user);
      // Initialize selected roles with current user roles
      this.selectedRoles.set([...user.roles]);
      // Initialize role states for ngModel
      const roleStates: Record<string, boolean> = {};
      this.availableRoles.forEach(role => {
        roleStates[role.value] = user.roles.includes(role.value);
      });
      this.roleStates.set(roleStates);
    } catch (error: any) {
      console.error('Error loading user detail:', error);
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('common.error'),
        detail: this.translate.instant('admin.users.errors.loadFailed')
      });
      this.router.navigate(['/admin/users']);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected async loadUserGroups(): Promise<void> {
    this.isLoadingGroups.set(true);
    try {
      const response = await this.adminUsersService.getUserGroups(this.userEmail());
      // Backend retorna { userEmail, groups: [] }
      const groups = Array.isArray(response) ? response : (response.groups || []);
      this.userGroups.set(groups);
    } catch (error) {
      console.error('Error loading user groups:', error);
    } finally {
      this.isLoadingGroups.set(false);
    }
  }

  protected async loadUserActivity(): Promise<void> {
    this.isLoadingActivity.set(true);
    try {
      const activity = await this.adminUsersService.getUserActivity(this.userEmail());
      this.userActivity.set(activity);
    } catch (error) {
      console.error('Error loading user activity:', error);
    } finally {
      this.isLoadingActivity.set(false);
    }
  }

  protected goBack(): void {
    this.router.navigate(['/admin/users']);
  }

  protected getStatusSeverity(isActive: boolean): 'success' | 'danger' {
    return isActive ? 'success' : 'danger';
  }

  protected getStatusLabel(isActive: boolean): string {
    return isActive ? 'admin.users.status.active' : 'admin.users.status.inactive';
  }

  protected getRoleSeverity(role: UserRole): 'danger' | 'warn' | 'info' {
    const severityMap: Record<UserRole, 'danger' | 'warn' | 'info'> = {
      [UserRole.SUPER_ADMIN]: 'danger',
      [UserRole.ADMIN]: 'warn',
      [UserRole.CLIENT]: 'info',
      [UserRole.PREPARER]: 'info',
    };
    return severityMap[role] || 'info';
  }

  protected getRoleLabel(role: UserRole): string {
    const labelMap: Record<UserRole, string> = {
      [UserRole.SUPER_ADMIN]: 'admin.users.roles.superAdmin',
      [UserRole.ADMIN]: 'admin.users.roles.admin',
      [UserRole.CLIENT]: 'admin.users.roles.client',
      [UserRole.PREPARER]: 'admin.users.roles.preparer',
    };
    return labelMap[role] || role;
  }

  protected onRoleChange(role: UserRole): void {
    const roleStates = this.roleStates();
    const checked = roleStates[role];

    const currentRoles = this.selectedRoles();
    if (checked) {
      if (!currentRoles.includes(role)) {
        this.selectedRoles.set([...currentRoles, role]);
      }
    } else {
      this.selectedRoles.set(currentRoles.filter(r => r !== role));
    }
  }

  protected getRoleState(role: UserRole): boolean {
    return this.roleStates()[role] || false;
  }

  protected setRoleState(role: UserRole, value: boolean): void {
    const roleStates = { ...this.roleStates() };
    roleStates[role] = value;
    this.roleStates.set(roleStates);
    this.onRoleChange(role);
  }

  protected hasRoleChanges(): boolean {
    const currentRoles = this.user()?.roles || [];
    const selectedRoles = this.selectedRoles();
    return JSON.stringify([...currentRoles].sort()) !== JSON.stringify([...selectedRoles].sort());
  }

  protected async saveRoles(): Promise<void> {
    if (!this.hasRoleChanges()) {
      return;
    }

    this.confirmationService.confirm({
      message: this.translate.instant('admin.users.detail.confirmRoleChange'),
      header: this.translate.instant('common.confirm'),
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        this.isSavingRoles.set(true);
        try {
          await this.adminUsersService.updateUserRoles(this.userEmail(), this.selectedRoles());

          // Reload user detail to get updated data
          await this.loadUserDetail();

          this.messageService.add({
            severity: 'success',
            summary: this.translate.instant('common.success'),
            detail: this.translate.instant('admin.users.detail.rolesUpdated')
          });
        } catch (error: any) {
          console.error('Error updating roles:', error);
          this.messageService.add({
            severity: 'error',
            summary: this.translate.instant('common.error'),
            detail: this.translate.instant('admin.users.errors.updateRolesFailed')
          });
          // Reset to original roles on error
          const user = this.user();
          if (user) {
            this.selectedRoles.set([...user.roles]);
            const roleStates: Record<string, boolean> = {};
            this.availableRoles.forEach(role => {
              roleStates[role.value] = user.roles.includes(role.value);
            });
            this.roleStates.set(roleStates);
          }
        } finally {
          this.isSavingRoles.set(false);
        }
      }
    });
  }
}

