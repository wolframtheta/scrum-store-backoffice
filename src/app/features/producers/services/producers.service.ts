import { Injectable, inject, signal } from '@angular/core';
import { getErrorMessage } from '../../../core/models/http-error.model';
import { ApiService } from '../../../core/services/api.service';
import { ConsumerGroupService } from '../../../core/services/consumer-group.service';
import { Producer } from '../../../core/models/producer.model';

@Injectable({
  providedIn: 'root'
})
export class ProducersService {
  private readonly api = inject(ApiService);
  private readonly groupService = inject(ConsumerGroupService);

  readonly producers = signal<Producer[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  async loadProducers(activeOnly: boolean = true): Promise<void> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) return;

    this.isLoading.set(true);
    this.error.set(null);
    try {
      const response = await this.api.get<any[]>(`producers?consumerGroupId=${groupId}&activeOnly=${activeOnly}`);
      // Transformar la resposta per extreure supplierName
      const producers: Producer[] = response.map(producer => ({
        ...producer,
        supplierName: producer.supplier?.name,
      }));
      this.producers.set(producers);
    } catch (error) {
      this.error.set(getErrorMessage(error, 'Error al carregar els productors'));
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  async createProducer(data: Omit<Producer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Producer> {
    this.error.set(null);
    try {
      const response = await this.api.post<any>('producers', data);
      const producer: Producer = {
        ...response,
        supplierName: response.supplier?.name,
      };
      await this.loadProducers(false); // Recarregar tots després de crear
      return producer;
    } catch (error) {
      this.error.set(getErrorMessage(error, 'Error al crear el productor'));
      throw error;
    }
  }

  async updateProducer(id: string, data: Partial<Producer>): Promise<Producer> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) {
      throw new Error('No group selected');
    }

    this.error.set(null);
    try {
      const response = await this.api.patch<any>(`producers/${id}?consumerGroupId=${groupId}`, data);
      const producer: Producer = {
        ...response,
        supplierName: response.supplier?.name,
      };
      await this.loadProducers(false); // Recarregar tots després d'actualitzar
      return producer;
    } catch (error) {
      this.error.set(getErrorMessage(error, 'Error al actualitzar el productor'));
      throw error;
    }
  }

  async deleteProducer(id: string): Promise<void> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) {
      throw new Error('No group selected');
    }

    this.error.set(null);
    try {
      await this.api.delete(`producers/${id}?consumerGroupId=${groupId}`);
      await this.loadProducers(false); // Recarregar tots després d'eliminar
    } catch (error) {
      this.error.set(getErrorMessage(error, 'Error al eliminar el productor'));
      throw error;
    }
  }

  async toggleActive(id: string): Promise<Producer> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) {
      throw new Error('No group selected');
    }

    this.error.set(null);
    try {
      const response = await this.api.patch<any>(`producers/${id}/toggle-active?consumerGroupId=${groupId}`, {});
      const producer: Producer = {
        ...response,
        supplierName: response.supplier?.name,
      };
      await this.loadProducers(false); // Recarregar tots després de canviar estat
      return producer;
    } catch (error) {
      this.error.set(getErrorMessage(error, 'Error al canviar l\'estat del productor'));
      throw error;
    }
  }

  clearError(): void {
    this.error.set(null);
  }
}

