import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { ConsumerGroupService } from '../../../core/services/consumer-group.service';
import { Supplier } from '../../../core/models/supplier.model';

@Injectable({
  providedIn: 'root'
})
export class SuppliersService {
  private readonly api = inject(ApiService);
  private readonly groupService = inject(ConsumerGroupService);

  readonly suppliers = signal<Supplier[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  async loadSuppliers(activeOnly: boolean = true): Promise<void> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) return;

    this.isLoading.set(true);
    this.error.set(null);
    try {
      const response = await this.api.get<Supplier[]>(`suppliers?consumerGroupId=${groupId}&activeOnly=${activeOnly}`);
      this.suppliers.set(response);
    } catch (error) {
      this.error.set('Error al carregar els proveïdors');
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  async createSupplier(data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<Supplier> {
    this.error.set(null);
    try {
      const supplier = await this.api.post<Supplier>('suppliers', data);
      await this.loadSuppliers(false);
      return supplier;
    } catch (error) {
      this.error.set('Error al crear el proveïdor');
      throw error;
    }
  }

  async updateSupplier(id: string, data: Partial<Supplier>): Promise<Supplier> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) {
      throw new Error('No group selected');
    }

    this.error.set(null);
    try {
      const supplier = await this.api.patch<Supplier>(`suppliers/${id}?consumerGroupId=${groupId}`, data);
      await this.loadSuppliers(false);
      return supplier;
    } catch (error) {
      this.error.set('Error al actualitzar el proveïdor');
      throw error;
    }
  }

  async deleteSupplier(id: string): Promise<void> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) {
      throw new Error('No group selected');
    }

    this.error.set(null);
    try {
      await this.api.delete(`suppliers/${id}?consumerGroupId=${groupId}`);
      await this.loadSuppliers(false);
    } catch (error) {
      this.error.set('Error al eliminar el proveïdor');
      throw error;
    }
  }

  async toggleActive(id: string): Promise<Supplier> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) {
      throw new Error('No group selected');
    }

    this.error.set(null);
    try {
      const supplier = await this.api.patch<Supplier>(`suppliers/${id}/toggle-active?consumerGroupId=${groupId}`, {});
      await this.loadSuppliers(false);
      return supplier;
    } catch (error) {
      this.error.set('Error al canviar l\'estat del proveïdor');
      throw error;
    }
  }

  clearError(): void {
    this.error.set(null);
  }
}

