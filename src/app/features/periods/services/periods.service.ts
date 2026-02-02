import { Injectable, inject, signal } from '@angular/core';
import { getErrorMessage } from '../../../core/models/http-error.model';
import { ApiService } from '../../../core/services/api.service';
import { ConsumerGroupService } from '../../../core/services/consumer-group.service';
import { Period, CreatePeriodDto } from '../../../core/models/period.model';

@Injectable({
  providedIn: 'root'
})
export class PeriodsService {
  private readonly api = inject(ApiService);
  private readonly groupService = inject(ConsumerGroupService);

  readonly periods = signal<Period[]>([]);
  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  async loadPeriods(supplierId?: string): Promise<void> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) return;

    this.isLoading.set(true);
    this.error.set(null);
    try {
      const url = supplierId 
        ? `periods?consumerGroupId=${groupId}&supplierId=${supplierId}`
        : `periods?consumerGroupId=${groupId}`;
      const response = await this.api.get<Period[]>(url);
      this.periods.set(response);
    } catch (error) {
      this.error.set(getErrorMessage(error, 'Error al carregar els períodes'));
      throw error;
    } finally {
      this.isLoading.set(false);
    }
  }

  async getPeriod(id: string): Promise<Period> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) {
      throw new Error('No group selected');
    }

    this.error.set(null);
    try {
      return await this.api.get<Period>(`periods/${id}?consumerGroupId=${groupId}`);
    } catch (error) {
      this.error.set(getErrorMessage(error, 'Error al carregar el període'));
      throw error;
    }
  }

  async createPeriod(data: CreatePeriodDto): Promise<Period> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) {
      throw new Error('No group selected');
    }

    this.error.set(null);
    try {
      const period = await this.api.post<Period>(`periods?consumerGroupId=${groupId}`, data);
      await this.loadPeriods(data.supplierId);
      return period;
    } catch (error) {
      this.error.set(getErrorMessage(error, 'Error al crear el període'));
      throw error;
    }
  }

  async updatePeriod(id: string, supplierId: string, data: Partial<CreatePeriodDto>): Promise<Period> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) {
      throw new Error('No group selected');
    }

    this.error.set(null);
    try {
      const period = await this.api.patch<Period>(`periods/${id}?consumerGroupId=${groupId}`, data);
      await this.loadPeriods(supplierId);
      return period;
    } catch (error) {
      this.error.set(getErrorMessage(error, 'Error al actualitzar el període'));
      throw error;
    }
  }

  async deletePeriod(id: string, supplierId: string): Promise<void> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) {
      throw new Error('No group selected');
    }

    this.error.set(null);
    try {
      await this.api.delete(`periods/${id}?consumerGroupId=${groupId}`);
      await this.loadPeriods(supplierId);
    } catch (error) {
      this.error.set(getErrorMessage(error, 'Error al eliminar el període'));
      throw error;
    }
  }

  clearError(): void {
    this.error.set(null);
  }
}

