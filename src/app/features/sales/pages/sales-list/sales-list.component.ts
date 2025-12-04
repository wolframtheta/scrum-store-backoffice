import { Component, OnInit, inject, signal, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { SalesService } from '../../services/sales.service';
import { ConsumerGroupService } from '../../../../core/services/consumer-group.service';
import { Sale, PaymentStatus } from '../../../../core/models/sale.model';
import { PaymentModalComponent } from '../../components/payment-modal/payment-modal.component';
import { TabPanels, TabsModule } from 'primeng/tabs';

@Component({
  selector: 'app-sales-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TranslateModule,
    ButtonModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
    PaymentModalComponent,
    TabsModule,
    TooltipModule,
    TabPanels
  ],
  providers: [MessageService],
  templateUrl: './sales-list.component.html',
  styleUrl: './sales-list.component.scss',
})
export class SalesListComponent implements OnInit {
  protected readonly salesService = inject(SalesService);
  protected readonly groupService = inject(ConsumerGroupService);
  private readonly messageService = inject(MessageService);

  protected readonly selectedSale = signal<Sale | null>(null);
  protected readonly showPaymentModal = signal<boolean>(false);
  protected readonly activeTab = signal<string>('unpaid');
  protected readonly PaymentStatus = PaymentStatus;

  // Computed sales filtered by payment status
  protected readonly unpaidSales = computed(() =>
    this.salesService.sales().filter(s => s.paymentStatus === PaymentStatus.UNPAID)
  );

  protected readonly partialSales = computed(() =>
    this.salesService.sales().filter(s => s.paymentStatus === PaymentStatus.PARTIAL)
  );

  protected readonly paidSales = computed(() =>
    this.salesService.sales().filter(s => s.paymentStatus === PaymentStatus.PAID)
  );

  async ngOnInit() {
    await this.loadSales();
  }

  private async loadSales() {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No hi ha cap grup seleccionat'
      });
      return;
    }

    try {
      await this.salesService.loadSalesByGroup(groupId);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error carregant les vendes'
      });
    }
  }

  protected openPaymentModal(sale: Sale): void {
    this.selectedSale.set(sale);
    this.showPaymentModal.set(true);
  }

  protected async onPaymentRegistered(): Promise<void> {
    this.showPaymentModal.set(false);
    this.selectedSale.set(null);

    this.messageService.add({
      severity: 'success',
      summary: 'Èxit',
      detail: 'Pagament registrat correctament'
    });

    await this.loadSales();
  }

  protected getStatusSeverity(status: PaymentStatus): 'success' | 'warn' | 'danger' {
    switch (status) {
      case PaymentStatus.PAID:
        return 'success';
      case PaymentStatus.PARTIAL:
        return 'warn';
      case PaymentStatus.UNPAID:
        return 'danger';
      default:
        return 'danger';
    }
  }

  protected getStatusLabel(status: PaymentStatus): string {
    switch (status) {
      case PaymentStatus.PAID:
        return 'sales.status.paid';
      case PaymentStatus.PARTIAL:
        return 'sales.status.partial';
      case PaymentStatus.UNPAID:
        return 'sales.status.unpaid';
      default:
        return '';
    }
  }

  protected getRemainingAmount(sale: Sale): number {
    return sale.totalAmount - sale.paidAmount;
  }
}

