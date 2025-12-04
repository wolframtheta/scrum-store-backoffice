import { Component, input, output, signal, effect, inject, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TableModule } from 'primeng/table';
import { MessageService } from 'primeng/api';
import { Sale, RegisterPaymentDto, ItemPayment } from '../../../../core/models/sale.model';
import { SalesService } from '../../services/sales.service';
import { TooltipModule } from 'primeng/tooltip';

@Component({
  selector: 'app-payment-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    DialogModule,
    ButtonModule,
    InputNumberModule,
    TableModule,
    TooltipModule
  ],
  templateUrl: './payment-modal.component.html',
  styleUrl: './payment-modal.component.scss',
})
export class PaymentModalComponent {
  private readonly fb = inject(FormBuilder);
  private readonly salesService = inject(SalesService);
  private readonly messageService = inject(MessageService);

  // Inputs/Outputs
  readonly visible = input.required<boolean>();
  readonly sale = input<Sale | null>(null);
  readonly visibleChange = output<boolean>();
  readonly paymentRegistered = output<void>();

  // State
  protected form: FormGroup;
  protected readonly isSaving = signal<boolean>(false);

  // Computed values
  protected readonly totalPayment = computed(() => {
    if (!this.form) return 0;
    const formValue = this.form.value;
    return Object.keys(formValue).reduce((sum, key) => {
      if (key.startsWith('item_')) {
        return sum + (formValue[key] || 0);
      }
      return sum;
    }, 0);
  });

  protected readonly remainingAfterPayment = computed(() => {
    const sale = this.sale();
    if (!sale) return 0;
    const currentRemaining = sale.totalAmount - sale.paidAmount;
    return currentRemaining - this.totalPayment();
  });

  constructor() {
    this.form = this.fb.group({});

    // Effect to rebuild form when sale changes
    effect(() => {
      const sale = this.sale();
      if (sale) {
        this.buildForm(sale);
      }
    });
  }

  private buildForm(sale: Sale): void {
    const formControls: Record<string, any> = {};

    sale.items.forEach(item => {
      const remainingForItem = item.totalPrice - item.paidAmount;
      formControls[`item_${item.id}`] = [0];
    });

    this.form = this.fb.group(formControls);
  }

  protected onHide(): void {
    this.visibleChange.emit(false);
    this.form.reset();
  }

  protected getRemainingForItem(item: any): number {
    return item.totalPrice - item.paidAmount;
  }

  protected payAllForItem(item: any): void {
    const remaining = this.getRemainingForItem(item);
    this.form.get(`item_${item.id}`)?.setValue(remaining);
  }

  protected payAllRemaining(): void {
    const sale = this.sale();
    if (!sale) return;

    sale.items.forEach(item => {
      const remaining = this.getRemainingForItem(item);
      this.form.get(`item_${item.id}`)?.setValue(remaining);
    });
  }

  protected async onSubmit(): Promise<void> {
    const sale = this.sale();
    if (!sale) return;

    this.isSaving.set(true);

    try {
      const formValue = this.form.value;
      const items: ItemPayment[] = [];

      // Build payment items array
      Object.keys(formValue).forEach(key => {
        if (key.startsWith('item_')) {
          const itemId = key.replace('item_', '');
          const amount = formValue[key];
          if (amount > 0) {
            items.push({ itemId, amount });
          }
        }
      });

      if (items.length === 0) {
        this.messageService.add({
          severity: 'warn',
          summary: 'Avís',
          detail: 'Has d\'introduir almenys un pagament'
        });
        return;
      }

      const paymentDto: RegisterPaymentDto = { items };

      await this.salesService.registerPayment(sale.id, paymentDto);

      this.paymentRegistered.emit();
      this.onHide();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.error?.message || 'Error registrant el pagament'
      });
    } finally {
      this.isSaving.set(false);
    }
  }
}

