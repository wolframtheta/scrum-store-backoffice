import { Component, OnInit, OnDestroy, inject, signal, computed, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
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
import { removeAccents } from '../../../../core/utils/string.utils';
import { getErrorMessage } from '../../../../core/models/http-error.model';

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
    DatePickerModule,
    SelectModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './sales-list.component.html',
  styleUrl: './sales-list.component.scss',
})
export class SalesListComponent implements OnInit, OnDestroy {
  protected readonly salesService = inject(SalesService);
  protected readonly groupService = inject(ConsumerGroupService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);
  
  private readonly destroy$ = new Subject<void>();
  private readonly userSearchSubject = new Subject<string>();
  private userSearchSubscription?: any;

  protected readonly PaymentStatus = PaymentStatus;
  protected readonly selectedSales = signal<Set<string>>(new Set());

  // Filtres
  protected readonly filterUserId = signal<string | null>(null);
  protected readonly filterUserText = signal<string>('');
  protected readonly filterDateFrom = signal<Date | null>(null);
  protected readonly filterDateTo = signal<Date | null>(null);
  protected readonly filterDelivered = signal<'all' | 'delivered' | 'undelivered'>('all');

  // Llista d'usuaris únics de les comandes carregades
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
    const userTextFilter = this.filterUserText().trim();
    
    if (userIdFilter) {
      sales = sales.filter(sale => 
        (sale.userId || sale.userEmail) === userIdFilter
      );
    } else if (userTextFilter) {
      // Filtrar per text del nom d'usuari o email (sense accents)
      const normalizedSearch = removeAccents(userTextFilter);
      sales = sales.filter(sale => {
        const userName = removeAccents(sale.userName || sale.userEmail || '');
        const userEmail = removeAccents(sale.userEmail || '');
        return userName.includes(normalizedSearch) || userEmail.includes(normalizedSearch);
      });
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

  get filterUserTextValue(): string {
    return this.filterUserText();
  }
  set filterUserTextValue(value: string) {
    this.filterUserText.set(value);
    this.userSearchSubject.next(value);
  }

  protected onUserSearch(): void {
    const searchText = this.filterUserText().trim();
    
    if (!searchText) {
      this.filterUserId.set(null);
      return;
    }
    
    // Buscar l'usuari que coincideixi amb el text (sense accents)
    const normalizedSearch = removeAccents(searchText);
    const matchingUser = this.uniqueUsers().find(user => {
      const normalizedUserName = removeAccents(user.userName);
      const normalizedUserId = removeAccents(user.userId);
      return normalizedUserName.includes(normalizedSearch) || normalizedUserId.includes(normalizedSearch);
    });
    
    if (matchingUser) {
      this.filterUserId.set(matchingUser.userId);
    } else {
      // Si no hi ha coincidència exacta, només filtrar per text
      this.filterUserId.set(null);
    }
  }

  protected onUserClear(): void {
    this.filterUserText.set('');
    this.filterUserId.set(null);
  }

  protected clearFilters(): void {
    this.filterUserId.set(null);
    this.filterUserText.set('');
    this.filterDateFrom.set(null);
    this.filterDateTo.set(null);
    this.filterDelivered.set('all');
  }

  async ngOnInit() {
    await this.loadSales();

    // Debounce search input
    this.userSearchSubscription = this.userSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.onUserSearch();
    });
  }

  ngOnDestroy(): void {
    this.userSearchSubscription?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
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

  protected viewDetail(sale: Sale): void {
    this.router.navigate(['/sales', sale.id]);
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
      case PaymentStatus.UNPAID: return 'danger';
      default: return 'secondary';
    }
  }

  protected getStatusLabel(paymentStatus?: PaymentStatus): string {
    switch (paymentStatus) {
      case PaymentStatus.PAID: return 'sales.status.paid';
      case PaymentStatus.UNPAID: return 'sales.status.unpaid';
      default: return 'sales.status.unpaid';
    }
  }

  protected getRemainingAmount(sale: Sale): number {
    const totalWithTax = this.getTotalWithTax(sale);
    const paid = typeof sale.paidAmount === 'string' ? parseFloat(sale.paidAmount) : (sale.paidAmount || 0);
    return totalWithTax - paid;
  }

  protected getSubtotalWithoutTax(sale: Sale): number {
    // totalAmount és sense IVA segons l'usuari
    const total = sale.totalAmount || 0;
    return typeof total === 'string' ? parseFloat(total) : total;
  }

  protected getTaxAmount(sale: Sale): number {
    if (!sale.items || sale.items.length === 0) return 0;
    return sale.items.reduce((sum, item) => {
      const taxRate = typeof item.article?.taxRate === 'string' ? parseFloat(item.article.taxRate) : (item.article?.taxRate || 0);
      const subtotal = typeof item.totalPrice === 'string' ? parseFloat(item.totalPrice) : (item.totalPrice || 0);
      return sum + (subtotal * (taxRate / 100));
    }, 0);
  }

  protected getTotalWithTax(sale: Sale): number {
    return this.getSubtotalWithoutTax(sale) + this.getTaxAmount(sale);
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
            detail: getErrorMessage(error, 'Error eliminant comanda'),
          });
        }
      },
    });
  }

  protected canMarkAsPaid(sale: Sale): boolean {
    return sale.paymentStatus !== PaymentStatus.PAID;
  }

  protected async markAsPaid(sale: Sale): Promise<void> {
    try {
      await this.salesService.markAsPaid(sale.id);
      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: 'Comanda marcada com a pagada correctament',
      });
      await this.loadSales();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: getErrorMessage(error, 'Error marcant comanda com a pagada'),
      });
    }
  }

  protected isSaleSelected(saleId: string): boolean {
    return this.selectedSales().has(saleId);
  }

  protected toggleSaleSelection(saleId: string): void {
    const selected = new Set(this.selectedSales());
    if (selected.has(saleId)) {
      selected.delete(saleId);
    } else {
      selected.add(saleId);
    }
    this.selectedSales.set(selected);
  }

  protected readonly selectableSales = computed(() => {
    return this.filteredSales().filter(sale => this.canMarkAsPaid(sale));
  });

  protected readonly allSelectableSelected = computed(() => {
    const selectable = this.selectableSales();
    if (selectable.length === 0) return false;
    return selectable.every(sale => this.selectedSales().has(sale.id));
  });

  protected readonly someSelectableSelected = computed(() => {
    const selectable = this.selectableSales();
    return selectable.some(sale => this.selectedSales().has(sale.id));
  });

  protected toggleSelectAll(): void {
    const selectable = this.selectableSales();
    const selected = new Set(this.selectedSales());
    
    if (this.allSelectableSelected()) {
      // Deseleccionar totes les seleccionables
      selectable.forEach((sale: Sale) => selected.delete(sale.id));
    } else {
      // Seleccionar totes les seleccionables
      selectable.forEach((sale: Sale) => selected.add(sale.id));
    }
    
    this.selectedSales.set(selected);
  }

  protected async markSelectedAsPaid(): Promise<void> {
    const selectedIds = Array.from(this.selectedSales());
    const selectableIds = this.selectableSales().map((s: Sale) => s.id);
    const toMark = selectedIds.filter(id => selectableIds.includes(id));
    
    if (toMark.length === 0) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Advertència',
        detail: 'No hi ha comandes seleccionades per marcar com a pagades',
      });
      return;
    }

    try {
      // Marcar totes les seleccionades
      await Promise.all(toMark.map(id => this.salesService.markAsPaid(id)));
      
      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: `${toMark.length} comanda${toMark.length > 1 ? 's' : ''} marcada${toMark.length > 1 ? 's' : ''} com a pagada${toMark.length > 1 ? 's' : ''} correctament`,
      });
      
      // Netejar selecció
      this.selectedSales.set(new Set());
      
      await this.loadSales();
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: getErrorMessage(error, 'Error marcant comandes com a pagades'),
      });
    }
  }
}
