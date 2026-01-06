import { Component, input, output, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';

import { InvitationService, Invitation } from '../../services/invitation.service';

@Component({
  selector: 'app-invite-member-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    DialogModule,
    ButtonModule,
    CheckboxModule,
    InputTextModule,
    TooltipModule
  ],
  templateUrl: './invite-member-modal.component.html',
  styleUrl: './invite-member-modal.component.scss'
})
export class InviteMemberModalComponent {
  readonly visible = input.required<boolean>();
  readonly groupId = input.required<string>();
  readonly groupName = input.required<string>();
  readonly visibleChange = output<boolean>();

  private readonly fb = inject(FormBuilder);
  private readonly invitationService = inject(InvitationService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  protected readonly form: FormGroup;
  protected readonly invitation = signal<Invitation | null>(null);
  protected readonly invitationLink = signal<string>('');
  protected readonly isGenerating = signal<boolean>(false);

  constructor() {
    this.form = this.fb.group({
      isManager: [false],
      isClient: [true],
      isPreparer: [false]
    });
  }

  protected onHide(): void {
    this.form.reset({
      isManager: false,
      isClient: true,
      isPreparer: false
    });
    this.invitation.set(null);
    this.invitationLink.set('');
    this.visibleChange.emit(false);
  }

  protected async generateInvitation(): Promise<void> {
    const groupId = this.groupId();
    if (!groupId) return;

    this.isGenerating.set(true);
    try {
      const formValue = this.form.value;
      const invitation = await this.invitationService.createInvitation(groupId, {
        isManager: formValue.isManager,
        isClient: formValue.isClient,
        isPreparer: formValue.isPreparer,
        expirationDays: 0 // Sense expiració
      });

      this.invitation.set(invitation);
      const link = this.invitationService.generateInvitationLink(invitation.token);
      this.invitationLink.set(link);

      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('common.success'),
        detail: this.translate.instant('users.invitation.generated')
      });
    } catch (error) {
      console.error('Error generating invitation:', error);
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('common.error'),
        detail: this.translate.instant('users.invitation.errors.generate')
      });
    } finally {
      this.isGenerating.set(false);
    }
  }

  protected async copyLink(): Promise<void> {
    const link = this.invitationLink();
    if (!link) return;

    try {
      await this.invitationService.copyToClipboard(link);
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('common.success'),
        detail: this.translate.instant('users.invitation.copied')
      });
    } catch (error) {
      console.error('Error copying link:', error);
    }
  }

  protected shareViaWhatsApp(): void {
    const link = this.invitationLink();
    const groupName = this.groupName();
    if (!link) return;

    const whatsappLink = this.invitationService.generateWhatsAppLink(link, groupName);
    window.open(whatsappLink, '_blank');
  }

  protected shareViaEmail(): void {
    const link = this.invitationLink();
    const groupName = this.groupName();
    if (!link) return;

    const emailLink = this.invitationService.generateEmailLink(link, groupName);
    window.location.href = emailLink;
  }
}

