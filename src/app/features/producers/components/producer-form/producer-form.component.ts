import { Component, input, output, signal, effect, inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CheckboxModule } from 'primeng/checkbox';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { InputMaskModule } from 'primeng/inputmask';
import { Producer } from '../../../../core/models/producer.model';
import { ConsumerGroupService } from '../../../../core/services/consumer-group.service';
import { SuppliersService } from '../../../suppliers/services/suppliers.service';
import { SupplierFormComponent } from '../../../suppliers/components/supplier-form/supplier-form.component';
import { TextareaModule } from 'primeng/textarea';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-producer-form',
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
    AutoCompleteModule,
    InputMaskModule,
    SupplierFormComponent,
    TooltipModule,
  ],
  templateUrl: './producer-form.component.html',
  styleUrl: './producer-form.component.scss',
})
export class ProducerFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly groupService = inject(ConsumerGroupService);
  private readonly suppliersService = inject(SuppliersService);

  // Inputs/Outputs
  readonly visible = input.required<boolean>();
  readonly producer = input<Producer | null>(null);
  readonly visibleChange = output<boolean>();
  readonly save = output<any>();

  // State
  protected readonly form: FormGroup;
  protected readonly isEditMode = signal<boolean>(false);

  // Suppliers
  protected readonly suppliers = this.suppliersService.suppliers;
  protected readonly filteredSuppliers = signal(this.suppliersService.suppliers());

  // Dialogs
  protected readonly showSupplierDialog = signal<boolean>(false);

  constructor() {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.maxLength(255)]],
      supplier: [null], // Ara guardem l'objecte complet
      email: ['', [Validators.email, Validators.maxLength(255)]],
      phone: ['', Validators.maxLength(50)],
      city: ['', Validators.maxLength(255)],
      address: [''],
      notes: [''],
      isActive: [true],
    });

    // Carregar suppliers quan s'obre el diàleg
    effect(() => {
      if (this.visible()) {
        this.suppliersService.loadSuppliers();
      }
    });

    // Actualitzar suppliers filtrats quan canvien
    effect(() => {
      this.filteredSuppliers.set(this.suppliers());
    });

    // Effect per carregar dades del productor quan canvia
    effect(() => {
      const producer = this.producer();
      if (producer) {
        this.isEditMode.set(true);
        
        // Trobar el supplier complet per l'ID
        const supplier = producer.supplierId 
          ? this.suppliers().find(s => s.id === producer.supplierId)
          : null;
        
        this.form.patchValue({
          name: producer.name,
          supplier: supplier || null,
          email: producer.email || '',
          phone: producer.phone || '',
          city: producer.city || '',
          address: producer.address || '',
          notes: producer.notes || '',
          isActive: producer.isActive,
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
    if (this.form.valid) {
      const groupId = this.groupService.selectedGroupId();

      if (!groupId) {
        console.error('No group ID available');
        return;
      }

      const formValue = this.form.value;
      const formData: any = {
        name: formValue.name,
        isActive: formValue.isActive,
      };

      // Afegir camps opcionals només si tenen valor (no null/undefined/empty string)
      if (formValue.supplier?.id) {
        formData.supplierId = formValue.supplier.id;
      }
      if (formValue.email?.trim()) {
        formData.email = formValue.email.trim();
      }
      if (formValue.phone?.trim()) {
        formData.phone = formValue.phone.trim();
      }
      if (formValue.city?.trim()) {
        formData.city = formValue.city.trim();
      }
      if (formValue.address?.trim()) {
        formData.address = formValue.address.trim();
      }
      if (formValue.notes?.trim()) {
        formData.notes = formValue.notes.trim();
      }

      // Només afegir consumerGroupId quan es crea (no quan s'actualitza)
      if (!this.isEditMode()) {
        formData.consumerGroupId = groupId;
      }

      this.save.emit(formData);
    }
  }

  protected filterSuppliers(event: any): void {
    const query = event.query?.toLowerCase() || '';
    this.filteredSuppliers.set(
      this.suppliers().filter(supplier =>
        supplier.name.toLowerCase().includes(query)
      )
    );
  }

  protected openSupplierDialog(): void {
    this.showSupplierDialog.set(true);
  }

  protected closeSupplierDialog(): void {
    this.showSupplierDialog.set(false);
  }

  protected async onSupplierCreated(supplierData: any): Promise<void> {
    try {
      await this.suppliersService.createSupplier(supplierData);
      this.closeSupplierDialog();
      // Seleccionar automàticament el supplier creat
      const suppliers = this.suppliersService.suppliers();
      if (suppliers.length > 0) {
        const newSupplier = suppliers[suppliers.length - 1];
        this.form.patchValue({ supplierId: newSupplier.id });
      }
    } catch (error) {
      console.error('Error creating supplier:', error);
    }
  }
}

