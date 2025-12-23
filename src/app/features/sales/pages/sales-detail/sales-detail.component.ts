import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { SalesService } from '../../services/sales.service';
import { Sale, PaymentStatus } from '../../../../core/models/sale.model';

@Component({
  selector: 'app-sales-detail',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    ButtonModule,
    CardModule,
    TableModule,
    TagModule,
    DividerModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './sales-detail.component.html',
  styleUrl: './sales-detail.component.scss'
})
export class SalesDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly salesService = inject(SalesService);
  private readonly messageService = inject(MessageService);

  protected readonly sale = signal<Sale | null>(null);
  protected readonly isLoading = signal<boolean>(true);
  protected readonly PaymentStatus = PaymentStatus;

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.loadSale(id);
    }
  }

  private async loadSale(id: string) {
    this.isLoading.set(true);
    try {
      const sale = await this.salesService.getSaleById(id);
      this.sale.set(sale);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error carregant la comanda'
      });
      this.goBack();
    } finally {
      this.isLoading.set(false);
    }
  }

  protected goBack(): void {
    this.router.navigate(['/sales']);
  }

  protected getStatusLabel(paymentStatus?: PaymentStatus): string {
    switch (paymentStatus) {
      case PaymentStatus.PAID: return 'sales.status.paid';
      case PaymentStatus.PARTIAL: return 'sales.status.partial';
      case PaymentStatus.UNPAID: return 'sales.status.unpaid';
      default: return 'sales.status.unpaid';
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

  protected getTotalPaid(): number {
    const sale = this.sale();
    return sale?.paidAmount || 0;
  }

  protected getTotalRemaining(): number {
    const sale = this.sale();
    if (!sale) return 0;
    return (sale.totalAmount || 0) - (sale.paidAmount || 0);
  }

  protected formatPrice(price: number | undefined | null): string {
    if (price === undefined || price === null) return '0,00';
    return price.toFixed(2).replace('.', ',');
  }

  protected formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('ca-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  protected getArticleName(article: any): string {
    if (!article) return '-';
    const parts = [article.category, article.product, article.variety].filter(Boolean);
    return parts.length > 0 ? parts.join(' - ') : '-';
  }
}





