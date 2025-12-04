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

import { AdminGroupsService, ConsumerGroupAdmin } from '../../../core/services/admin-groups.service';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { CreateGroupDialogComponent } from './create-group-dialog/create-group-dialog.component';

@Component({
  selector: 'app-groups-list',
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
    AutoCompleteModule,
    ToastModule,
    ConfirmDialogModule,
    CreateGroupDialogComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './groups-list.component.html',
  styleUrl: './groups-list.component.scss',
})
export class GroupsListComponent implements OnInit {
  protected readonly adminGroupsService = inject(AdminGroupsService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);

  // State
  protected readonly searchTerm = signal<string>('');
  protected readonly selectedStatus = signal<{ label: string; value: boolean | null }>({
    label: 'admin.groups.filters.all',
    value: null
  });
  protected readonly showCreateDialog = signal<boolean>(false);

  protected readonly statusOptions = [
    { label: 'admin.groups.filters.all', value: null },
    { label: 'admin.groups.filters.active', value: true },
    { label: 'admin.groups.filters.inactive', value: false },
  ];

  async ngOnInit() {
    await this.loadGroups();
  }

  protected async loadGroups() {
    try {
      await this.adminGroupsService.loadGroups({
        page: this.adminGroupsService.currentPage(),
        limit: 10,
        search: this.searchTerm() || undefined,
        isActive: this.selectedStatus().value ?? undefined,
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'admin.groups.errors.loadFailed',
      });
    }
  }

  protected async onPageChange(event: any) {
    await this.adminGroupsService.loadGroups({
      page: event.page + 1,
      limit: event.rows,
      search: this.searchTerm() || undefined,
      isActive: this.selectedStatus().value ?? undefined,
    });
  }

  protected async onSearch() {
    await this.loadGroups();
  }

  protected async onStatusChange() {
    await this.loadGroups();
  }

  protected viewGroupDetail(group: ConsumerGroupAdmin) {
    this.router.navigate(['/admin/groups', group.id]);
  }

  protected openCreateDialog() {
    this.showCreateDialog.set(true);
  }

  protected onGroupCreated(group: ConsumerGroupAdmin) {
    this.showCreateDialog.set(false);
    this.messageService.add({
      severity: 'success',
      summary: 'Èxit',
      detail: 'admin.groups.success.created',
    });
    this.loadGroups();
  }

  protected async toggleGroupStatus(group: ConsumerGroupAdmin) {
    this.confirmationService.confirm({
      message: `¿Segur que vols ${group.isActive ? 'desactivar' : 'activar'} aquest grup?`,
      header: 'Confirmació',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await this.adminGroupsService.updateGroupStatus(group.id, !group.isActive);
          this.messageService.add({
            severity: 'success',
            summary: 'Èxit',
            detail: `Grup ${!group.isActive ? 'activat' : 'desactivat'} correctament`,
          });
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'admin.groups.errors.statusUpdateFailed',
          });
        }
      },
    });
  }

  protected deleteGroup(group: ConsumerGroupAdmin) {
    this.confirmationService.confirm({
      message: `¿Segur que vols eliminar el grup "${group.name}"? Aquesta acció no es pot desfer.`,
      header: 'Confirmar eliminació',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          await this.adminGroupsService.deleteGroup(group.id);
          this.messageService.add({
            severity: 'success',
            summary: 'Èxit',
            detail: 'admin.groups.success.deleted',
          });
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'admin.groups.errors.deleteFailed',
          });
        }
      },
    });
  }

  protected getStatusSeverity(isActive: boolean): 'success' | 'danger' {
    return isActive ? 'success' : 'danger';
  }

  protected getStatusLabel(isActive: boolean): string {
    return isActive ? 'admin.groups.status.active' : 'admin.groups.status.inactive';
  }
}

