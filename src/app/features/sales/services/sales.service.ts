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

  async loadSalesByGroup(groupId: string, paymentStatus?: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      // Si no es passa paymentStatus, carregar totes les comandes
      const params = paymentStatus ? `?paymentStatus=${paymentStatus}` : '';
      const sales = await this.api.get<Sale[]>(`orders/by-group/${groupId}${params}`);
      this.sales.set(sales);
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Error carregant comandes');
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async getSaleById(id: string): Promise<Sale> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      return await this.api.get<Sale>(`orders/${id}`);
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Error carregant comanda');
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateOrderStatus(orderId: string, status: string): Promise<Sale> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const order = await this.api.patch<Sale>(`orders/${orderId}/status`, { status });

      // Update the sales list
      const currentSales = this.sales();
      const index = currentSales.findIndex(s => s.id === orderId);
      if (index !== -1) {
        const updatedSales = [...currentSales];
        updatedSales[index] = order;
        this.sales.set(updatedSales);
      }

      return order;
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Error actualitzant estat de la comanda');
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async registerPayment(saleId: string, paymentDto: RegisterPaymentDto): Promise<Sale> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const sale = await this.api.patch<Sale>(`orders/${saleId}/payment`, paymentDto);

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

  async updateDeliveryStatus(saleId: string, isDelivered: boolean): Promise<Sale> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const sale = await this.api.patch<Sale>(`orders/${saleId}/delivery`, { isDelivered });

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
      this.error.set(err?.error?.message || 'Error actualitzant estat d\'entrega');
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteOrder(orderId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      await this.api.delete(`orders/${orderId}`);

      // Remove from the local list
      const currentSales = this.sales();
      this.sales.set(currentSales.filter(s => s.id !== orderId));
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Error eliminant comanda');
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteOrderItem(orderId: string, itemId: string): Promise<Sale> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const updatedOrder = await this.api.delete<Sale>(`orders/${orderId}/items/${itemId}`);

      // Update the sales list
      const currentSales = this.sales();
      const index = currentSales.findIndex(s => s.id === orderId);
      if (index !== -1) {
        const updatedSales = [...currentSales];
        // If order has no items left, remove it from the list
        if (updatedOrder.items && updatedOrder.items.length === 0) {
          updatedSales.splice(index, 1);
        } else {
          updatedSales[index] = updatedOrder;
        }
        this.sales.set(updatedSales);
      }

      return updatedOrder;
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Error eliminant article de la comanda');
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  clearError(): void {
    this.error.set(null);
  }
}
