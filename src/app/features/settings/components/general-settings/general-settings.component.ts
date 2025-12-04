import { Component, OnInit, input, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';

import { ConsumerGroupWithRole } from '../../../../core/models/consumer-group.model';
import { GroupSettingsService } from '../../services/group-settings.service';
import { ConsumerGroupService } from '../../../../core/services/consumer-group.service';

@Component({
  selector: 'app-general-settings',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    InputTextModule,
    TextareaModule,
    ButtonModule,
    SelectModule
  ],
  templateUrl: './general-settings.component.html',
  styleUrl: './general-settings.component.scss'
})
export class GeneralSettingsComponent implements OnInit {
  readonly group = input.required<ConsumerGroupWithRole | null>();

  private readonly fb = inject(FormBuilder);
  private readonly settingsService = inject(GroupSettingsService);
  private readonly groupService = inject(ConsumerGroupService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  protected readonly form: FormGroup;
  protected readonly isSaving = signal<boolean>(false);
  protected readonly languages = [
    { label: 'Català', value: 'ca' },
    { label: 'Español', value: 'es' }
  ];

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      description: ['', Validators.maxLength(1000)],
      city: ['', Validators.maxLength(255)],
      address: ['', Validators.maxLength(500)],
      phone: ['', Validators.maxLength(20)],
      email: ['', [Validators.email, Validators.maxLength(255)]],
      defaultLanguage: ['ca']
    });
  }

  ngOnInit(): void {
    const currentGroup = this.group();
    if (currentGroup) {
      this.form.patchValue({
        name: currentGroup.name,
        description: currentGroup.description || '',
        city: currentGroup.city || '',
        address: currentGroup.address || '',
        phone: currentGroup.phone || '',
        email: currentGroup.email || '',
        defaultLanguage: 'ca' // TODO: afegir camp a l'entitat
      });
    }
  }

  protected async onSave(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const currentGroup = this.group();
    if (!currentGroup) return;

    this.isSaving.set(true);
    try {
      await this.settingsService.updateGroupSettings(currentGroup.id, this.form.value);
      await this.groupService.loadUserGroups(); // Reload to get updated data

      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('common.success'),
        detail: this.translate.instant('settings.general.saveSuccess')
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('common.error'),
        detail: this.translate.instant('settings.general.saveError')
      });
    } finally {
      this.isSaving.set(false);
    }
  }

  protected isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }

  protected getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.hasError('required')) return 'validation.required';
    if (field?.hasError('email')) return 'validation.invalidEmail';
    if (field?.hasError('maxlength')) return 'validation.maxLength';
    return '';
  }
}

