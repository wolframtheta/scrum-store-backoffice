import { Component, inject, signal, model, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';

import { Dialog, DialogModule } from 'primeng/dialog';
import { Button, ButtonModule } from 'primeng/button';
import { InputText, InputTextModule } from 'primeng/inputtext';
import { Textarea, TextareaModule } from 'primeng/textarea';
import { MessageService } from 'primeng/api';
import { getErrorMessage } from '../../../../core/models/http-error.model';

import { AdminGroupsService, ConsumerGroupAdmin } from '../../../../core/services/admin-groups.service';

@Component({
  selector: 'app-create-group-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
  ],
  templateUrl: './create-group-dialog.component.html',
  styleUrl: './create-group-dialog.component.scss',
})
export class CreateGroupDialogComponent {
  private readonly adminGroupsService = inject(AdminGroupsService);
  private readonly messageService = inject(MessageService);
  private readonly fb = inject(FormBuilder);

  visible = model.required<boolean>();
  groupCreated = output<ConsumerGroupAdmin>();

  protected readonly isSubmitting = signal<boolean>(false);

  protected readonly form: FormGroup = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    description: [''],
    city: ['', Validators.required],
    address: [''],
    managerEmail: ['', [Validators.required, Validators.email]],
  });

  protected onCancel() {
    this.form.reset();
    this.visible.set(false);
  }

  protected async onSubmit() {
    if (this.form.invalid) {
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
      return;
    }

    this.isSubmitting.set(true);

    try {
      const groupData = this.form.value;
      const newGroup = await this.adminGroupsService.createGroup(groupData);

      this.groupCreated.emit(newGroup);
      this.form.reset();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: getErrorMessage(error, 'admin.groups.errors.createFailed'),
      });
    } finally {
      this.isSubmitting.set(false);
    }
  }

  protected isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field?.invalid && field?.touched);
  }

  protected getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (!field || !field.errors || !field.touched) return '';

    if (field.errors['required']) return 'common.validation.required';
    if (field.errors['email']) return 'common.validation.invalidEmail';
    if (field.errors['minlength']) return 'common.validation.minLength';

    return '';
  }
}

