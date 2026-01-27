import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { ConsumerGroupService } from '../../../core/services/consumer-group.service';
import { PeriodPaymentSummary } from '../../../core/models/period-payment-summary.model';

@Injectable({
  providedIn: 'root'
})
export class PeriodPaymentsService {
  private readonly api = inject(ApiService);
  private readonly groupService = inject(ConsumerGroupService);

  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  async getPeriodPaymentSummary(periodId: string): Promise<PeriodPaymentSummary> {
    this.isLoading.set(true);
    this.error.set(null);

    try {
      const groupId = this.groupService.selectedGroupId();
      if (!groupId) {
        throw new Error('No group selected');
      }

      return await this.api.get<PeriodPaymentSummary>(
        `orders/by-period/${periodId}`,
        { groupId }
      );
    } catch (err: any) {
      this.error.set(err?.error?.message || 'Error carregant resum de pagaments');
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async markAsPaid(periodId: string, userId: string): Promise<PeriodPaymentSummary> {
    const wasLoading = this.isLoading();
    if (!wasLoading) {
      this.isLoading.set(true);
    }
    this.error.set(null);

    try {
      const groupId = this.groupService.selectedGroupId();
      if (!groupId) {
        throw new Error('No group selected');
      }

      console.log(`Marking as paid: periodId=${periodId}, userId=${userId}, groupId=${groupId}`);
      const result = await this.api.patch<PeriodPaymentSummary>(
        `orders/by-period/${periodId}/user/${userId}/mark-as-paid`,
        {},
        { groupId }
      );
      console.log(`Marked as paid successfully:`, result);
      return result;
    } catch (err: any) {
      console.error(`Error marking as paid:`, err);
      this.error.set(err?.error?.message || 'Error marcant comandes com a pagades');
      throw err;
    } finally {
      if (!wasLoading) {
        this.isLoading.set(false);
      }
    }
  }

  async markAsUnpaid(periodId: string, userId: string): Promise<PeriodPaymentSummary> {
    const wasLoading = this.isLoading();
    if (!wasLoading) {
      this.isLoading.set(true);
    }
    this.error.set(null);

    try {
      const groupId = this.groupService.selectedGroupId();
      if (!groupId) {
        throw new Error('No group selected');
      }

      console.log(`Marking as unpaid: periodId=${periodId}, userId=${userId}, groupId=${groupId}`);
      const result = await this.api.patch<PeriodPaymentSummary>(
        `orders/by-period/${periodId}/user/${userId}/mark-as-unpaid`,
        {},
        { groupId }
      );
      console.log(`Marked as unpaid successfully:`, result);
      return result;
    } catch (err: any) {
      console.error(`Error marking as unpaid:`, err);
      this.error.set(err?.error?.message || 'Error marcant comandes com a no pagades');
      throw err;
    } finally {
      if (!wasLoading) {
        this.isLoading.set(false);
      }
    }
  }
}
