import { Component, Input, Output, EventEmitter } from '@angular/core';
import { Sale } from '../../../../core/models/sale.model';

@Component({
  selector: 'app-payment-modal',
  standalone: true,
  template: `<!-- TODO: Implement payment modal -->`,
})
export class PaymentModalComponent {
  @Input() visible = false;
  @Input() sale: Sale | null = null;
  @Output() visibleChange = new EventEmitter<boolean>();
  @Output() paymentRegistered = new EventEmitter<void>();
}





