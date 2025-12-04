import { Component, input, output, signal, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { CheckboxModule } from 'primeng/checkbox';
import { InputMaskModule } from 'primeng/inputmask';
import { Supplier } from '../../../../core/models/supplier.model';
import { ConsumerGroupService } from '../../../../core/services/consumer-group.service';

@Component({
  selector: 'app-supplier-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    TextareaModule,
    CheckboxModule,
    InputMaskModule,
  ],
  templateUrl: './supplier-form.component.html',
  styleUrl: './supplier-form.component.scss',
})
export class SupplierFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly groupService = inject(ConsumerGroupService);

  // Inputs/Outputs
  readonly visible = input.required<boolean>();
  readonly supplier = input<Supplier | null>(null);
  readonly visibleChange = output<boolean>();
  readonly save = output<any>();

  // State
  protected readonly form: FormGroup;
  protected readonly isEditMode = signal<boolean>(false);

  // Custom validators
  private emailValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(control.value) ? null : { invalidEmail: true };
  }

  private ibanValidator(control: AbstractControl): ValidationErrors | null {
    if (!control.value) return null;
    // Eliminar espais
    const iban = control.value.replace(/\s/g, '');
    // IBAN espanyol: ES + 2 dígits + 20 caràcters
    const ibanRegex = /^ES\d{22}$/;
    return ibanRegex.test(iban) ? null : { invalidIban: true };
  }

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      taxId: ['', Validators.maxLength(50)],
      email: ['', [this.emailValidator.bind(this), Validators.maxLength(255)]],
      phone: [''],
      city: ['', Validators.maxLength(255)],
      address: [''],
      postalCode: ['', [Validators.maxLength(50), Validators.pattern(/^\d{5}$/)]],
      bankAccount: ['', this.ibanValidator.bind(this)],
      notes: [''],
      isActive: [true],
    });

    // Effect per carregar dades del proveïdor quan canvia
    effect(() => {
      const supplier = this.supplier();
      if (supplier) {
        this.isEditMode.set(true);
        this.form.patchValue({
          name: supplier.name,
          taxId: supplier.taxId || '',
          email: supplier.email || '',
          phone: supplier.phone || '',
          city: supplier.city || '',
          address: supplier.address || '',
          postalCode: supplier.postalCode || '',
          bankAccount: supplier.bankAccount || '',
          notes: supplier.notes || '',
          isActive: supplier.isActive,
        });
      } else {
        this.isEditMode.set(false);
        this.form.reset({
          isActive: true,
        });
      }
    });
  }

  protected onHide(): void {
    this.visibleChange.emit(false);
    this.form.reset({ isActive: true });
  }

  protected onSubmit(): void {
    console.log('Supplier form submitted', this.form.value);
    console.log('Form valid:', this.form.valid);

    if (this.form.valid) {
      const groupId = this.groupService.selectedGroupId();
      console.log('Group ID:', groupId);

      if (!groupId) {
        console.error('No group ID available');
        return;
      }

      const formData = {
        ...this.form.value,
        consumerGroupId: groupId,
      };

      console.log('Emitting save with data:', formData);
      this.save.emit(formData);
    } else {
      console.log('Form is invalid:', this.form.errors);
      // Marcar tots els camps com a touched per mostrar errors
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
    }
  }
}

