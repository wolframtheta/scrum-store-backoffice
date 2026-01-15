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
    const paidAmount = sale?.paidAmount || 0;
    return typeof paidAmount === 'string' ? parseFloat(paidAmount) : paidAmount;
  }

  protected getTotalRemaining(): number {
    const totalWithTax = this.getTotalWithTax();
    const paidAmount = this.getTotalPaid();
    return totalWithTax - paidAmount;
  }

  protected formatPrice(price: number | string | undefined | null): string {
    if (price === undefined || price === null || price === '') return '0,00';
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    if (isNaN(numPrice)) return '0,00';
    return numPrice.toFixed(2).replace('.', ',');
  }

  protected formatQuantity(quantity: number | string | undefined | null): string {
    if (quantity === undefined || quantity === null || quantity === '') return '0,00';
    const numQuantity = typeof quantity === 'string' ? parseFloat(quantity) : quantity;
    if (isNaN(numQuantity)) return '0,00';
    return numQuantity.toFixed(2).replace('.', ',');
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

  protected getItemSubtotalWithoutTax(item: any): number {
    // pricePerUnit i totalPrice són sense IVA segons l'usuari
    const totalPrice = item.totalPrice || 0;
    return typeof totalPrice === 'string' ? parseFloat(totalPrice) : totalPrice;
  }

  protected getItemTaxAmount(item: any): number {
    const taxRate = item.article?.taxRate || 0;
    const numTaxRate = typeof taxRate === 'string' ? parseFloat(taxRate) : taxRate;
    const subtotal = this.getItemSubtotalWithoutTax(item);
    return subtotal * (numTaxRate / 100);
  }

  protected getSubtotalWithoutTax(): number {
    const sale = this.sale();
    if (!sale) return 0;
    return sale.items.reduce((sum, item) => sum + this.getItemSubtotalWithoutTax(item), 0);
  }

  protected getTotalTaxAmount(): number {
    const sale = this.sale();
    if (!sale) return 0;
    return sale.items.reduce((sum, item) => sum + this.getItemTaxAmount(item), 0);
  }

  protected getTotalWithTax(): number {
    return this.getSubtotalWithoutTax() + this.getTotalTaxAmount();
  }

  protected getItemTotalWithTax(item: any): number {
    return this.getItemSubtotalWithoutTax(item) + this.getItemTaxAmount(item);
  }

  protected getItemRemaining(item: any): number {
    const totalWithTax = this.getItemTotalWithTax(item);
    const paidAmount = typeof item.paidAmount === 'string' ? parseFloat(item.paidAmount || '0') : (item.paidAmount || 0);
    return totalWithTax - paidAmount;
  }
}





