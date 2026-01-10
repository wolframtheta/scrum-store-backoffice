import { Component, OnInit, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { MessageService, ConfirmationService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SalesService } from '../../services/sales.service';
import { ConsumerGroupService } from '../../../../core/services/consumer-group.service';
import { Sale, PaymentStatus } from '../../../../core/models/sale.model';
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
    ConfirmDialogModule,
    AutoCompleteModule,
    DatePickerModule,
    SelectModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    PaymentModalComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './sales-list.component.html',
  styleUrl: './sales-list.component.scss',
})
export class SalesListComponent implements OnInit {
  protected readonly salesService = inject(SalesService);
  protected readonly groupService = inject(ConsumerGroupService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  protected readonly selectedSale = signal<Sale | null>(null);
  protected readonly showPaymentModal = signal<boolean>(false);
  protected readonly PaymentStatus = PaymentStatus;

  // Filtres
  protected readonly filterUserId = signal<string | null>(null);
  protected readonly filterDateFrom = signal<Date | null>(null);
  protected readonly filterDateTo = signal<Date | null>(null);
  protected readonly filterDelivered = signal<'all' | 'delivered' | 'undelivered'>('all');

  // Llista d'usuaris únics per al filtre
  protected readonly uniqueUsers = computed(() => {
    const sales = this.salesService.sales();
    const userMap = new Map<string, { userId: string; userName: string }>();
    
    sales.forEach(sale => {
      const userId = sale.userId || sale.userEmail || '';
      const userName = sale.userName || sale.userEmail || 'Usuari desconegut';
      if (userId && !userMap.has(userId)) {
        userMap.set(userId, { userId, userName });
      }
    });
    
    return Array.from(userMap.values()).sort((a, b) => a.userName.localeCompare(b.userName));
  });

  // Comandes filtrades
  protected readonly filteredSales = computed(() => {
    let sales = this.salesService.sales();
    
    // Filtrar per estat d'entrega
    const deliveredFilter = this.filterDelivered();
    if (deliveredFilter === 'delivered') {
      sales = sales.filter(sale => sale.isDelivered);
    } else if (deliveredFilter === 'undelivered') {
      sales = sales.filter(sale => !sale.isDelivered);
    }
    
    // Filtrar per usuari
    const userIdFilter = this.filterUserId();
    if (userIdFilter) {
      sales = sales.filter(sale => 
        (sale.userId || sale.userEmail) === userIdFilter
      );
    }
    
    // Filtrar per data
    const dateFrom = this.filterDateFrom();
    const dateTo = this.filterDateTo();
    if (dateFrom || dateTo) {
      sales = sales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        saleDate.setHours(0, 0, 0, 0);
        
        if (dateFrom) {
          const from = new Date(dateFrom);
          from.setHours(0, 0, 0, 0);
          if (saleDate < from) return false;
        }
        
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (saleDate > to) return false;
        }
        
        return true;
      });
    }
    
    return sales;
  });

  protected selectedUser: { userId: string; userName: string } | null = null;
  protected userSuggestions: { userId: string; userName: string }[] = [];

  protected readonly deliveredOptions = computed(() => [
    { label: this.translate.instant('sales.filters.options.all'), value: 'all' },
    { label: this.translate.instant('sales.filters.options.delivered'), value: 'delivered' },
    { label: this.translate.instant('sales.filters.options.undelivered'), value: 'undelivered' }
  ]);

  // Getters/setters per als signals per poder usar ngModel
  get filterDateFromValue(): Date | null {
    return this.filterDateFrom();
  }
  set filterDateFromValue(value: Date | null) {
    this.filterDateFrom.set(value);
  }

  get filterDateToValue(): Date | null {
    return this.filterDateTo();
  }
  set filterDateToValue(value: Date | null) {
    this.filterDateTo.set(value);
  }

  get filterDeliveredValue(): 'all' | 'delivered' | 'undelivered' {
    return this.filterDelivered();
  }
  set filterDeliveredValue(value: 'all' | 'delivered' | 'undelivered') {
    this.filterDelivered.set(value);
  }

  protected onUserSearch(event: any): void {
    const query = event.query.toLowerCase();
    this.userSuggestions = this.uniqueUsers().filter(user =>
      user.userName.toLowerCase().includes(query)
    );
  }

  protected onUserSelect(event: any): void {
    const user = event.value || event;
    if (user && user.userId) {
      this.filterUserId.set(user.userId);
    }
  }

  protected onUserClear(): void {
    this.selectedUser = null;
    this.filterUserId.set(null);
  }

  protected clearFilters(): void {
    this.filterUserId.set(null);
    this.filterDateFrom.set(null);
    this.filterDateTo.set(null);
    this.filterDelivered.set('all');
    this.selectedUser = null;
  }

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
      // Carregar totes les comandes sense filtrar per estat de pagament
      await this.salesService.loadSalesByGroup(groupId);
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
      // sale.isDelivered ja té el valor nou després del canvi del checkbox
      await this.salesService.updateDeliveryStatus(sale.id, sale.isDelivered);
      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: sale.isDelivered ? 'Comanda marcada com entregada' : 'Comanda marcada com no entregada'
      });
      await this.loadSales();
    } catch (error) {
      // Revertir el canvi local si hi ha error
      sale.isDelivered = !sale.isDelivered;
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

  protected getSubtotalWithoutTax(sale: Sale): number {
    // totalAmount és sense IVA segons l'usuari
    return sale.totalAmount || 0;
  }

  protected getTaxAmount(sale: Sale): number {
    if (!sale.items || sale.items.length === 0) return 0;
    return sale.items.reduce((sum, item) => {
      const taxRate = item.article?.taxRate || 0;
      const subtotal = item.totalPrice || 0;
      return sum + (subtotal * (taxRate / 100));
    }, 0);
  }

  protected deleteOrder(sale: Sale): void {
    const userName = sale.userName || sale.userEmail || 'usuari desconegut';
    
    this.confirmationService.confirm({
      message: `¿Segur que vols eliminar la comanda de ${userName} del ${new Date(sale.createdAt).toLocaleDateString('ca-ES')}? Aquesta acció no es pot desfer.`,
      header: 'Confirmar eliminació',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          await this.salesService.deleteOrder(sale.id);
          this.messageService.add({
            severity: 'success',
            summary: 'Èxit',
            detail: 'Comanda eliminada correctament',
          });
        } catch (error: any) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error?.error?.message || 'Error eliminant comanda',
          });
        }
      },
    });
  }
}
