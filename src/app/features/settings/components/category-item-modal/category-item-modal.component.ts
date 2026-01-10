import { Component, OnInit, inject, signal, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { ButtonModule } from 'primeng/button';

export interface CategoryItemModalData {
  type: 'category' | 'product' | 'variety';
  parentName?: string;
  grandparentName?: string;
  editMode?: boolean;
  currentName?: string;
}

export interface CategoryItemResult {
  names: string[];
  type: 'category' | 'product' | 'variety';
}

@Component({
  selector: 'app-category-item-modal',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    DialogModule,
    InputTextModule,
    TextareaModule,
    ButtonModule
  ],
  templateUrl: './category-item-modal.component.html',
  styleUrl: './category-item-modal.component.scss'
})
export class CategoryItemModalComponent implements OnInit {
  readonly visible = input<boolean>(false);
  readonly data = input.required<CategoryItemModalData>();
  
  readonly visibleChange = output<boolean>();
  readonly confirm = output<CategoryItemResult>();

  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  protected readonly form: FormGroup;
  protected readonly isSaving = signal<boolean>(false);

  constructor() {
    this.form = this.fb.group({
      names: ['', [Validators.required]]
    });
  }

  ngOnInit(): void {
    if (this.data().editMode && this.data().currentName) {
      this.form.patchValue({ names: this.data().currentName });
    }
  }

  protected get title(): string {
    const type = this.data().type;
    const editMode = this.data().editMode;
    const key = editMode 
      ? `settings.categories.edit${this.capitalize(type)}` 
      : `settings.categories.add${this.capitalize(type)}`;
    return this.translate.instant(key);
  }

  protected get label(): string {
    const type = this.data().type;
    return this.translate.instant(`settings.categories.${type}Name`);
  }

  protected get contextInfo(): string {
    const data = this.data();
    if (data.type === 'product' && data.parentName) {
      return this.translate.instant('settings.categories.inCategory', { name: data.parentName });
    }
    if (data.type === 'variety' && data.parentName && data.grandparentName) {
      return this.translate.instant('settings.categories.inProduct', { 
        product: data.parentName, 
        category: data.grandparentName 
      });
    }
    return '';
  }

  protected onHide(): void {
    this.form.reset();
    this.visibleChange.emit(false);
  }

  protected onSave(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const input = this.form.value.names.trim();
    if (!input) {
      this.form.markAllAsTouched();
      return;
    }

    // Parsear múltiples noms separats per comes o línies
    const names = input
      .split(/[,\n]/)
      .map((name: string) => name.trim())
      .filter((name: string) => name.length > 0);

    if (names.length === 0) {
      this.form.markAllAsTouched();
      return;
    }

    this.confirm.emit({
      names,
      type: this.data().type
    });

    this.form.reset();
    this.visibleChange.emit(false); // Tancar el modal després de confirmar
  }

  protected isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field?.invalid && (field?.dirty || field?.touched));
  }

  protected getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.hasError('required')) return 'validation.required';
    return '';
  }

  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

