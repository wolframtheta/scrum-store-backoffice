import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { getErrorMessage } from '../../../../core/models/http-error.model';
import { AvatarModule } from 'primeng/avatar';
import { ImageModule } from 'primeng/image';

import { NoticesService, Notice } from '../../services/notices.service';
import { ConsumerGroupService } from '../../../../core/services/consumer-group.service';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';

@Component({
  selector: 'app-notices-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    ButtonModule,
    CardModule,
    ToastModule,
    ConfirmDialogModule,
    AvatarModule,
    ImageModule,
    InputTextModule,
    TextareaModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './notices-list.component.html',
  styleUrl: './notices-list.component.scss',
})
export class NoticesListComponent implements OnInit {
  protected readonly noticesService = inject(NoticesService);
  protected readonly groupService = inject(ConsumerGroupService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  // State
  protected readonly newNoticeContent = signal<string>('');
  protected readonly editingNoticeId = signal<string | null>(null);
  protected readonly editingContent = signal<string>('');
  protected readonly selectedFile = signal<File | null>(null);

  async ngOnInit() {
    await this.loadNotices();
  }

  protected async loadNotices() {
    try {
      await this.noticesService.loadNotices();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error carregant avisos',
      });
    }
  }

  protected async createNotice() {
    const content = this.newNoticeContent().trim();
    if (!content) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenció',
        detail: 'El contingut de l\'avís no pot estar buit',
      });
      return;
    }

    try {
      const notice = await this.noticesService.createNotice(content);

      // Si hay una imagen seleccionada, subirla
      if (this.selectedFile()) {
        await this.noticesService.uploadImage(notice.id, this.selectedFile()!);
      }

      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: 'Avís creat correctament',
      });

      // Limpiar formulario
      this.newNoticeContent.set('');
      this.selectedFile.set(null);
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: getErrorMessage(error, 'Error creant avís'),
      });
    }
  }

  protected startEdit(notice: Notice) {
    this.editingNoticeId.set(notice.id);
    this.editingContent.set(notice.content);
  }

  protected cancelEdit() {
    this.editingNoticeId.set(null);
    this.editingContent.set('');
  }

  protected async saveEdit(noticeId: string) {
    const content = this.editingContent().trim();
    if (!content) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Atenció',
        detail: 'El contingut de l\'avís no pot estar buit',
      });
      return;
    }

    try {
      await this.noticesService.updateNotice(noticeId, content);
      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: 'Avís actualitzat correctament',
      });
      this.cancelEdit();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: getErrorMessage(error, 'Error actualitzant avís'),
      });
    }
  }

  protected deleteNotice(notice: Notice) {
    this.confirmationService.confirm({
      message: '¿Segur que vols eliminar aquest avís?',
      header: 'Confirmar eliminació',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          await this.noticesService.deleteNotice(notice.id);
          this.messageService.add({
            severity: 'success',
            summary: 'Èxit',
            detail: 'Avís eliminat correctament',
          });
        } catch (error: any) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: getErrorMessage(error, 'Error eliminant avís'),
          });
        }
      },
    });
  }

  protected onFileSelect(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];

      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Atenció',
          detail: 'Només es poden pujar imatges',
        });
        return;
      }

      // Validar tamaño (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Atenció',
          detail: 'La imatge no pot superar els 5MB',
        });
        return;
      }

      this.selectedFile.set(file);
    }
  }

  protected removeSelectedFile() {
    this.selectedFile.set(null);
  }

  protected getAuthorFullName(notice: Notice): string {
    return `${notice.author.firstName} ${notice.author.lastName}`;
  }

  protected getAuthorInitials(notice: Notice): string {
    return `${notice.author.firstName.charAt(0)}${notice.author.lastName.charAt(0)}`;
  }

  protected formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('ca-ES', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}

