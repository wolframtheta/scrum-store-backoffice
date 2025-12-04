import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { ConsumerGroupService } from '../../../core/services/consumer-group.service';
import { Sale, PaymentStatus, RegisterPaymentDto } from '../../../core/models/sale.model';

@Injectable({
  providedIn: 'root'
})
export class SalesService {
  private readonly api = inject(ApiService);
  private readonly groupService = inject(ConsumerGroupService);

  readonly sales = signal<Sale[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  async loadSalesByGroup(groupId: string, paymentStatus?: PaymentStatus): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const params = paymentStatus ? `?paymentStatus=${paymentStatus}` : '';
      const sales = await this.api.get<Sale[]>(`sales/by-group/${groupId}${params}`);
      this.sales.set(sales);
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Error carregant vendes');
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async getSaleById(id: string): Promise<Sale> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      return await this.api.get<Sale>(`sales/${id}`);
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Error carregant venda');
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async registerPayment(saleId: string, paymentDto: RegisterPaymentDto): Promise<Sale> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const sale = await this.api.patch<Sale>(`sales/${saleId}/payment`, paymentDto);
      
      // Update the sales list
      const currentSales = this.sales();
      const index = currentSales.findIndex(s => s.id === saleId);
      if (index !== -1) {
        const updatedSales = [...currentSales];
        updatedSales[index] = sale;
        this.sales.set(updatedSales);
      }

      return sale;
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Error registrant pagament');
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  clearError(): void {
    this.error.set(null);
  }
}

