import { Component, input, output, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';

@Component({
  selector: 'app-add-member-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    CheckboxModule
  ],
  templateUrl: './add-member-modal.component.html',
  styleUrl: './add-member-modal.component.scss'
})
export class AddMemberModalComponent {
  readonly visible = input.required<boolean>();
  readonly visibleChange = output<boolean>();
  readonly confirm = output<{ userEmail: string; isManager: boolean; isClient: boolean }>();

  protected readonly form: FormGroup;

  constructor(private fb: FormBuilder) {
    this.form = this.fb.group({
      userEmail: ['', [Validators.required, Validators.email]],
      isManager: [false],
      isClient: [true]
    });
  }

  protected onHide(): void {
    this.form.reset({
      userEmail: '',
      isManager: false,
      isClient: true
    });
    this.visibleChange.emit(false);
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.confirm.emit(this.form.value);
    this.form.reset({
      userEmail: '',
      isManager: false,
      isClient: true
    });
  }

  protected isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  protected getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.hasError('required')) {
      return 'common.errors.required';
    }
    if (field?.hasError('email')) {
      return 'common.errors.invalidEmail';
    }
    return '';
  }
}

