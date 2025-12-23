import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { MessageService } from 'primeng/api';
import { SalesService } from '../../services/sales.service';
import { ConsumerGroupService } from '../../../../core/services/consumer-group.service';
import { Sale, PaymentStatus } from '../../../../core/models/sale.model';
import { TabPanels, TabsModule } from 'primeng/tabs';
import { PaymentModalComponent } from '../../components/payment-modal/payment-modal.component';

@Component({
  selector: 'app-sales-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    ButtonModule,
    TableModule,
    TagModule,
    ToastModule,
    TooltipModule,
    CheckboxModule,
    TabsModule,
    TabPanels,
    PaymentModalComponent
  ],
  providers: [MessageService],
  templateUrl: './sales-list.component.html',
  styleUrl: './sales-list.component.scss',
})
export class SalesListComponent implements OnInit {
  protected readonly salesService = inject(SalesService);
  protected readonly groupService = inject(ConsumerGroupService);
  private readonly messageService = inject(MessageService);
  private readonly router = inject(Router);

  protected readonly selectedSale = signal<Sale | null>(null);
  protected readonly showPaymentModal = signal<boolean>(false);
  protected readonly activeTab = signal<string>('unpaid');
  protected readonly PaymentStatus = PaymentStatus;

  async ngOnInit() {
    await this.loadSales();
  }

  protected async onTabChange(value: string | number | undefined) {
    if (typeof value !== 'string') return;
    console.log('Tab changed to:', value);
    this.activeTab.set(value);
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

    // Pass the string value directly
    const paymentStatus = this.activeTab(); // 'unpaid', 'partial', 'paid'
    console.log('Loading sales with paymentStatus:', paymentStatus);

    try {
      await this.salesService.loadSalesByGroup(groupId, paymentStatus);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error carregant les comandes'
      });
    }
  }

  protected openPaymentModal(sale: Sale): void {
    this.selectedSale.set(sale);
    this.showPaymentModal.set(true);
  }

  protected viewDetail(sale: Sale): void {
    this.router.navigate(['/sales', sale.id]);
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

  protected async toggleDelivered(sale: Sale): Promise<void> {
    try {
      await this.salesService.updateDeliveryStatus(sale.id, !sale.isDelivered);
      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: sale.isDelivered ? 'Comanda marcada com no entregada' : 'Comanda marcada com entregada'
      });
      await this.loadSales();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error actualitzant l\'estat d\'entrega'
      });
    }
  }

  protected getStatusSeverity(paymentStatus?: PaymentStatus): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    switch (paymentStatus) {
      case PaymentStatus.PAID: return 'success';
      case PaymentStatus.PARTIAL: return 'warn';
      case PaymentStatus.UNPAID: return 'danger';
      default: return 'secondary';
    }
  }

  protected getStatusLabel(paymentStatus?: PaymentStatus): string {
    switch (paymentStatus) {
      case PaymentStatus.PAID: return 'sales.status.paid';
      case PaymentStatus.PARTIAL: return 'sales.status.partial';
      case PaymentStatus.UNPAID: return 'sales.status.unpaid';
      default: return 'sales.status.unpaid';
    }
  }

  protected getRemainingAmount(sale: Sale): number {
    return (sale.totalAmount || 0) - (sale.paidAmount || 0);
  }
}
