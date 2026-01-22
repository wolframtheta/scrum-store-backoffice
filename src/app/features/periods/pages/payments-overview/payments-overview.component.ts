import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { CardModule } from 'primeng/card';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { PeriodPaymentsService } from '../../services/period-payments.service';
import { PeriodsService } from '../../services/periods.service';
import { ConsumerGroupService } from '../../../../core/services/consumer-group.service';
import { PeriodPaymentSummary, UserPaymentSummary } from '../../../../core/models/period-payment-summary.model';
import { Period } from '../../../../core/models/period.model';
import { PaymentStatus } from '../../../../core/models/sale.model';

interface PeriodPaymentData {
  period: Period;
  summary: PeriodPaymentSummary;
}

interface SupplierPaymentData {
  supplierId: string;
  supplierName: string;
  periods: PeriodPaymentData[];
  users: Map<string, {
    userId: string;
    userName: string;
    subtotal: number;
    transportCost: number;
    total: number;
    ordersCount: number;
    paidAmount: number;
    paymentStatus: PaymentStatus;
  }>;
}

interface AggregatedUserPayment {
  userId: string;
  userName: string;
  periods: Array<{
    periodId: string;
    periodName: string;
    subtotal: number;
    transportCost: number;
    total: number;
    ordersCount: number;
    paidAmount: number;
    paymentStatus: PaymentStatus;
  }>;
  totalSubtotal: number;
  totalTransportCost: number;
  totalAmount: number;
  totalPaidAmount: number;
  overallPaymentStatus: PaymentStatus;
}

@Component({
  selector: 'app-payments-overview',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TranslateModule,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    CardModule,
    TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './payments-overview.component.html',
  styleUrl: './payments-overview.component.scss',
})
export class PaymentsOverviewComponent implements OnInit {
  private readonly paymentsService = inject(PeriodPaymentsService);
  private readonly periodsService = inject(PeriodsService);
  private readonly groupService = inject(ConsumerGroupService);
  private readonly messageService = inject(MessageService);
  protected readonly router = inject(Router);

  protected readonly periodsData = signal<PeriodPaymentData[]>([]);
  protected readonly isLoading = computed(() => 
    this.paymentsService.isLoading() || this.periodsService.isLoading()
  );

  protected readonly PaymentStatus = PaymentStatus;

  protected readonly suppliersData = computed<SupplierPaymentData[]>(() => {
    const data = this.periodsData();
    const supplierMap = new Map<string, SupplierPaymentData>();

    // Agrupar per proveïdor
    for (const periodData of data) {
      const supplierId = periodData.period.supplierId;
      const supplierName = periodData.period.supplier?.name || 'Desconegut';

      if (!supplierMap.has(supplierId)) {
        supplierMap.set(supplierId, {
          supplierId,
          supplierName,
          periods: [],
          users: new Map(),
        });
      }

      const supplierData = supplierMap.get(supplierId)!;
      supplierData.periods.push(periodData);

      // Agregar usuaris per proveïdor
      for (const user of periodData.summary.users) {
        if (!supplierData.users.has(user.userId)) {
          supplierData.users.set(user.userId, {
            userId: user.userId,
            userName: user.userName,
            subtotal: 0,
            transportCost: 0,
            total: 0,
            ordersCount: 0,
            paidAmount: 0,
            paymentStatus: PaymentStatus.UNPAID,
          });
        }

        const supplierUser = supplierData.users.get(user.userId)!;
        supplierUser.subtotal += user.subtotal;
        supplierUser.transportCost += user.transportCost;
        supplierUser.total += user.total;
        supplierUser.ordersCount += user.ordersCount;
        supplierUser.paidAmount += user.paidAmount;
      }
    }

    // Calcular estat de pagament per usuari i proveïdor
    const suppliersArray = Array.from(supplierMap.values());
    for (const supplier of suppliersArray) {
      for (const user of supplier.users.values()) {
        if (user.paidAmount >= user.total) {
          user.paymentStatus = PaymentStatus.PAID;
        } else if (user.paidAmount > 0) {
          user.paymentStatus = PaymentStatus.PARTIAL;
        } else {
          user.paymentStatus = PaymentStatus.UNPAID;
        }
      }
    }

    // Ordenar per nom de proveïdor
    return suppliersArray.sort((a, b) => a.supplierName.localeCompare(b.supplierName));
  });

  protected readonly aggregatedUsers = computed<AggregatedUserPayment[]>(() => {
    const data = this.periodsData();
    const userMap = new Map<string, AggregatedUserPayment>();

    // Agregar dades per usuari
    for (const periodData of data) {
      for (const user of periodData.summary.users) {
        if (!userMap.has(user.userId)) {
          userMap.set(user.userId, {
            userId: user.userId,
            userName: user.userName,
            periods: [],
            totalSubtotal: 0,
            totalTransportCost: 0,
            totalAmount: 0,
            totalPaidAmount: 0,
            overallPaymentStatus: PaymentStatus.UNPAID,
          });
        }

        const aggregatedUser = userMap.get(user.userId)!;
        aggregatedUser.periods.push({
          periodId: periodData.period.id,
          periodName: periodData.period.name,
          subtotal: user.subtotal,
          transportCost: user.transportCost,
          total: user.total,
          ordersCount: user.ordersCount,
          paidAmount: user.paidAmount,
          paymentStatus: user.paymentStatus,
        });

        aggregatedUser.totalSubtotal += user.subtotal;
        aggregatedUser.totalTransportCost += user.transportCost;
        aggregatedUser.totalAmount += user.total;
        aggregatedUser.totalPaidAmount += user.paidAmount;
      }
    }

    // Calcular estat de pagament general per usuari
    const aggregatedArray = Array.from(userMap.values());
    for (const user of aggregatedArray) {
      if (user.totalPaidAmount >= user.totalAmount) {
        user.overallPaymentStatus = PaymentStatus.PAID;
      } else if (user.totalPaidAmount > 0) {
        user.overallPaymentStatus = PaymentStatus.PARTIAL;
      } else {
        user.overallPaymentStatus = PaymentStatus.UNPAID;
      }
    }

    // Ordenar per nom
    return aggregatedArray.sort((a, b) => a.userName.localeCompare(b.userName));
  });

  protected readonly totalSummary = computed(() => {
    const users = this.aggregatedUsers();
    return {
      totalSubtotal: users.reduce((sum, u) => sum + u.totalSubtotal, 0),
      totalTransportCost: users.reduce((sum, u) => sum + u.totalTransportCost, 0),
      totalAmount: users.reduce((sum, u) => sum + u.totalAmount, 0),
      totalPaidAmount: users.reduce((sum, u) => sum + u.totalPaidAmount, 0),
    };
  });

  async ngOnInit(): Promise<void> {
    await this.loadPaymentsData();
  }

  private async loadPaymentsData(): Promise<void> {
    try {
      const groupId = this.groupService.selectedGroupId();
      if (!groupId) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No hi ha grup seleccionat'
        });
        this.router.navigate(['/home']);
        return;
      }

      // Carregar tots els períodes
      await this.periodsService.loadPeriods();
      const allPeriods = this.periodsService.periods();

      // Filtrar períodes que ja han passat la seva data d'entrega
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const relevantPeriods = allPeriods.filter(period => {
        const deliveryDate = new Date(period.deliveryDate);
        deliveryDate.setHours(0, 0, 0, 0);
        return deliveryDate <= today;
      });

      // Carregar resums de pagaments per cada període rellevant
      const periodsData: PeriodPaymentData[] = [];
      for (const period of relevantPeriods) {
        try {
          const summary = await this.paymentsService.getPeriodPaymentSummary(period.id);
          // Només afegir si hi ha usuaris amb comandes
          if (summary.users.length > 0) {
            periodsData.push({
              period,
              summary,
            });
          }
        } catch (error) {
          // Si hi ha error, continuar amb el següent període
          console.error(`Error loading payment summary for period ${period.id}:`, error);
        }
      }

      this.periodsData.set(periodsData);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'ha pogut carregar les dades de pagaments'
      });
    }
  }

  protected goBack(): void {
    this.router.navigate(['/home']);
  }

  protected formatPrice(value: number): string {
    return new Intl.NumberFormat('ca-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(value);
  }

  protected formatDate(date: Date | string): string {
    return new Date(date).toLocaleDateString('ca-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  protected getPaymentStatusSeverity(status: PaymentStatus): 'success' | 'secondary' | 'info' | 'warn' | 'danger' | 'contrast' {
    switch (status) {
      case PaymentStatus.PAID:
        return 'success';
      case PaymentStatus.PARTIAL:
        return 'warn';
      case PaymentStatus.UNPAID:
        return 'danger';
      default:
        return 'info';
    }
  }

  protected getPaymentStatusLabel(status: PaymentStatus): string {
    switch (status) {
      case PaymentStatus.PAID:
        return 'Pagat';
      case PaymentStatus.PARTIAL:
        return 'Parcial';
      case PaymentStatus.UNPAID:
        return 'No pagat';
      default:
        return status;
    }
  }

  protected openPeriodPayments(periodId: string): void {
    this.router.navigate(['/periods', periodId, 'payments']);
  }

  protected openPeriodOrders(periodId: string): void {
    this.router.navigate(['/periods', periodId, 'orders-summary']);
  }

  protected getUserPeriodsForSupplier(supplierData: SupplierPaymentData, userId: string): PeriodPaymentData[] {
    return supplierData.periods.filter(periodData => 
      periodData.summary.users.some(user => user.userId === userId)
    );
  }

  protected getSupplierUsersArray(supplierData: SupplierPaymentData): Array<{
    userId: string;
    userName: string;
    subtotal: number;
    transportCost: number;
    total: number;
    ordersCount: number;
    paidAmount: number;
    paymentStatus: PaymentStatus;
  }> {
    return Array.from(supplierData.users.values());
  }

  protected getTooltipText(action: string, periodName: string): string {
    return `${action} - ${periodName}`;
  }

  protected async markAsPaid(periodId: string, userId: string): Promise<void> {
    try {
      await this.paymentsService.markAsPaid(periodId, userId);
      await this.loadPaymentsData();
      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: 'Comandes marcades com a pagades'
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'ha pogut marcar les comandes com a pagades'
      });
    }
  }

  protected async markAsUnpaid(periodId: string, userId: string): Promise<void> {
    try {
      await this.paymentsService.markAsUnpaid(periodId, userId);
      await this.loadPaymentsData();
      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: 'Comandes marcades com a no pagades'
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'ha pogut marcar les comandes com a no pagades'
      });
    }
  }
}
