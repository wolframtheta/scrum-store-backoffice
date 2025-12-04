import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';

import { ConsumerGroupService } from '../../../../core/services/consumer-group.service';
import { GroupSettingsService } from '../../../settings/services/group-settings.service';
import { GroupMember } from '../../../settings/models/group-member.model';
import { AddMemberModalComponent } from '../../components/add-member-modal/add-member-modal.component';
import { InviteMemberModalComponent } from '../../components/invite-member-modal/invite-member-modal.component';

@Component({
  selector: 'app-users-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TranslateModule,
    ButtonModule,
    TableModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule,
    TooltipModule,
    AddMemberModalComponent,
    InviteMemberModalComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './users-list.component.html',
  styleUrl: './users-list.component.scss'
})
export class UsersListComponent implements OnInit {
  protected readonly groupService = inject(ConsumerGroupService);
  protected readonly settingsService = inject(GroupSettingsService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);

  protected readonly members = signal<GroupMember[]>([]);
  protected readonly showAddMemberModal = signal<boolean>(false);
  protected readonly showInviteModal = signal<boolean>(false);
  protected readonly currentGroupId = this.groupService.selectedGroupId;
  protected readonly currentGroup = this.groupService.selectedGroup;
  protected readonly isManager = this.groupService.isManager;

  async ngOnInit(): Promise<void> {
    await this.loadMembers();
  }

  protected async loadMembers(): Promise<void> {
    const groupId = this.currentGroupId();
    if (!groupId) return;

    try {
      const members = await this.settingsService.getGroupMembers(groupId);
      this.members.set(members);
    } catch (error) {
      console.error('Error loading members:', error);
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('common.error'),
        detail: this.translate.instant('users.errors.loadMembers')
      });
    }
  }

  protected openAddMemberModal(): void {
    this.showAddMemberModal.set(true);
  }

  protected openInviteModal(): void {
    this.showInviteModal.set(true);
  }

  protected async onMemberAdded(data: { userEmail: string; isManager: boolean; isClient: boolean }): Promise<void> {
    const groupId = this.currentGroupId();
    if (!groupId) return;

    try {
      await this.settingsService.addMember(groupId, data);
      await this.loadMembers();
      this.showAddMemberModal.set(false);
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('common.success'),
        detail: this.translate.instant('users.memberAdded')
      });
    } catch (error: any) {
      console.error('Error adding member:', error);
      const errorMessage = error?.error?.message || this.translate.instant('users.errors.addMember');
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('common.error'),
        detail: errorMessage
      });
    }
  }

  protected async toggleManager(member: GroupMember): Promise<void> {
    const groupId = this.currentGroupId();
    if (!groupId) return;

    try {
      await this.settingsService.updateMemberRole(groupId, member.userEmail, {
        isManager: !member.isManager,
        isClient: member.isClient
      });
      await this.loadMembers();
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('common.success'),
        detail: this.translate.instant('users.roleUpdated')
      });
    } catch (error: any) {
      console.error('Error updating role:', error);
      const errorMessage = error?.error?.message || this.translate.instant('users.errors.updateRole');
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('common.error'),
        detail: errorMessage
      });
    }
  }

  protected async toggleClient(member: GroupMember): Promise<void> {
    const groupId = this.currentGroupId();
    if (!groupId) return;

    try {
      await this.settingsService.updateMemberRole(groupId, member.userEmail, {
        isManager: member.isManager,
        isClient: !member.isClient
      });
      await this.loadMembers();
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('common.success'),
        detail: this.translate.instant('users.roleUpdated')
      });
    } catch (error: any) {
      console.error('Error updating role:', error);
      const errorMessage = error?.error?.message || this.translate.instant('users.errors.updateRole');
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('common.error'),
        detail: errorMessage
      });
    }
  }

  protected confirmRemoveMember(member: GroupMember): void {
    this.confirmationService.confirm({
      message: this.translate.instant('users.confirmRemove', { email: member.userEmail }),
      header: this.translate.instant('common.confirmDelete'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('common.yes'),
      rejectLabel: this.translate.instant('common.no'),
      accept: () => this.removeMember(member)
    });
  }

  private async removeMember(member: GroupMember): Promise<void> {
    const groupId = this.currentGroupId();
    if (!groupId) return;

    try {
      await this.settingsService.removeMember(groupId, member.userEmail);
      await this.loadMembers();
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('common.success'),
        detail: this.translate.instant('users.memberRemoved')
      });
    } catch (error) {
      console.error('Error removing member:', error);
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('common.error'),
        detail: this.translate.instant('users.errors.removeMember')
      });
    }
  }
}

