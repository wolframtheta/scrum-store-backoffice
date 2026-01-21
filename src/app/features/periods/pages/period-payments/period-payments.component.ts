import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PeriodPaymentsService } from '../../services/period-payments.service';
import { PeriodsService } from '../../services/periods.service';
import { ConsumerGroupService } from '../../../../core/services/consumer-group.service';
import { PeriodPaymentSummary, UserPaymentSummary } from '../../../../core/models/period-payment-summary.model';
import { Period } from '../../../../core/models/period.model';
import { PaymentStatus } from '../../../../core/models/sale.model';

@Component({
  selector: 'app-period-payments',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TranslateModule,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './period-payments.component.html',
  styleUrl: './period-payments.component.scss',
})
export class PeriodPaymentsComponent implements OnInit {
  private readonly paymentsService = inject(PeriodPaymentsService);
  private readonly periodsService = inject(PeriodsService);
  private readonly groupService = inject(ConsumerGroupService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);

  protected readonly periodId = signal<string | null>(null);
  protected readonly period = signal<Period | null>(null);
  protected readonly paymentSummary = signal<PeriodPaymentSummary | null>(null);
  
  protected readonly isLoading = computed(() => 
    this.paymentsService.isLoading() || this.periodsService.isLoading()
  );

  protected readonly PaymentStatus = PaymentStatus;

  async ngOnInit(): Promise<void> {
    const periodId = this.route.snapshot.paramMap.get('periodId');
    if (!periodId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Període no trobat'
      });
      this.router.navigate(['/periods']);
      return;
    }

    this.periodId.set(periodId);
    await Promise.all([
      this.loadPeriod(periodId),
      this.loadPaymentSummary(periodId)
    ]);
  }

  private async loadPeriod(periodId: string): Promise<void> {
    try {
      const period = await this.periodsService.getPeriod(periodId);
      this.period.set(period);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'ha pogut carregar el període'
      });
      this.router.navigate(['/periods']);
    }
  }

  private async loadPaymentSummary(periodId: string): Promise<void> {
    try {
      const summary = await this.paymentsService.getPeriodPaymentSummary(periodId);
      this.paymentSummary.set(summary);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'ha pogut carregar el resum de pagaments'
      });
    }
  }

  protected goBack(): void {
    this.router.navigate(['/periods']);
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

  protected getPaymentStatusSeverity(status: PaymentStatus): 'success' | 'warn' | 'danger' | 'info' {
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

  protected async markAsPaid(user: UserPaymentSummary): Promise<void> {
    const periodId = this.periodId();
    if (!periodId) return;

    this.confirmationService.confirm({
      message: `Vols marcar les comandes de ${user.userName} com a pagades?`,
      header: 'Confirmar pagament',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: async () => {
        try {
          const summary = await this.paymentsService.markAsPaid(periodId, user.userId);
          this.paymentSummary.set(summary);
          this.messageService.add({
            severity: 'success',
            summary: 'Èxit',
            detail: `Comandes de ${user.userName} marcades com a pagades`
          });
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No s\'ha pogut marcar les comandes com a pagades'
          });
        }
      }
    });
  }

  protected async markAsUnpaid(user: UserPaymentSummary): Promise<void> {
    const periodId = this.periodId();
    if (!periodId) return;

    this.confirmationService.confirm({
      message: `Vols marcar les comandes de ${user.userName} com a no pagades?`,
      header: 'Confirmar canvi',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí',
      rejectLabel: 'No',
      accept: async () => {
        try {
          const summary = await this.paymentsService.markAsUnpaid(periodId, user.userId);
          this.paymentSummary.set(summary);
          this.messageService.add({
            severity: 'success',
            summary: 'Èxit',
            detail: `Comandes de ${user.userName} marcades com a no pagades`
          });
        } catch (error) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'No s\'ha pogut marcar les comandes com a no pagades'
          });
        }
      }
    });
  }
}
