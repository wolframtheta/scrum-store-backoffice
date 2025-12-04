import { Injectable, signal, computed, inject } from '@angular/core';
import { ApiService } from './api.service';
import { Sale, ItemPayment, PaymentStatus } from '../models/sale.model';

export interface SalesMetrics {
  monthSales: number;
  pendingPayment: number;
  totalArticles: number;
  totalMembers: number;
}

@Injectable({
  providedIn: 'root',
})
export class SalesService {
  private readonly api = inject(ApiService);

  private readonly salesState = signal<Sale[]>([]);
  private readonly metricsState = signal<SalesMetrics | null>(null);
  private readonly loadingState = signal<boolean>(false);

  readonly sales = this.salesState.asReadonly();
  readonly metrics = this.metricsState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();

  readonly pendingSales = computed(() =>
    this.salesState().filter((sale) => sale.paymentStatus !== PaymentStatus.PAID)
  );

  async loadSalesByGroup(groupId: string): Promise<void> {
    this.loadingState.set(true);
    try {
      const sales = await this.api.get<Sale[]>(`sales/by-group/${groupId}`);
      this.salesState.set(sales);
    } finally {
      this.loadingState.set(false);
    }
  }

  async loadMetrics(groupId: string): Promise<void> {
    try {
      // Por ahora calculamos métricas en el frontend
      // En producción sería mejor un endpoint dedicado
      const sales = await this.api.get<Sale[]>(`sales/by-group/${groupId}`);
      const articles = await this.api.get<any[]>(`articles?groupId=${groupId}`);
      const members = await this.api.get<any[]>(`consumer-groups/${groupId}/members`);

      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();

      const monthSales = sales
        .filter((sale) => {
          const saleDate = new Date(sale.createdAt);
          return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
        })
        .reduce((sum, sale) => sum + sale.totalAmount, 0);

      const pendingPayment = sales
        .filter((sale) => sale.paymentStatus !== PaymentStatus.PAID)
        .reduce((sum, sale) => sum + (sale.totalAmount - sale.paidAmount), 0);

      this.metricsState.set({
        monthSales,
        pendingPayment,
        totalArticles: articles.length,
        totalMembers: members.length,
      });
    } catch (error) {
      console.error('Error loading metrics:', error);
    }
  }

  async registerPayment(saleId: string, payments: ItemPayment[]): Promise<void> {
    await this.api.patch(`sales/${saleId}/payment`, { payments });
    // Recargar ventas después del pago
    const groupId = this.salesState()[0]?.consumerGroupId;
    if (groupId) {
      await this.loadSalesByGroup(groupId);
    }
  }

  async getSaleById(saleId: string): Promise<Sale> {
    return await this.api.get<Sale>(`sales/${saleId}`);
  }

  getSalesChartData(): any {
    const sales = this.salesState();
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Agrupar ventas por semana del mes actual
    const weeks = ['Semana 1', 'Semana 2', 'Semana 3', 'Semana 4'];
    const weekSales = [0, 0, 0, 0];

    sales
      .filter((sale) => {
        const saleDate = new Date(sale.createdAt);
        return saleDate.getMonth() === currentMonth && saleDate.getFullYear() === currentYear;
      })
      .forEach((sale) => {
        const saleDate = new Date(sale.createdAt);
        const weekOfMonth = Math.floor((saleDate.getDate() - 1) / 7);
        weekSales[weekOfMonth] += sale.totalAmount;
      });

    return {
      labels: weeks,
      datasets: [
        {
          label: 'Ventas (€)',
          data: weekSales,
          backgroundColor: 'rgba(11, 119, 169, 0.2)',
          borderColor: 'rgba(11, 119, 169, 1)',
          borderWidth: 2,
          tension: 0.4,
        },
      ],
    };
  }
}

