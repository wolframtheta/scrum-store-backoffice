import { Injectable, inject } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { ConsumerGroupService } from '../../../core/services/consumer-group.service';

export interface BasketScheduleConfig {
  preferredWeekday: number | null;
  preferredTime: string | null;
}

export type VoteStatus = 'yes' | 'no' | 'if_needed';

export interface CalendarVote {
  date: string;
  userEmail: string;
  userName?: string;
  status: VoteStatus;
}

export interface CalendarAssignment {
  date: string;
  assignedUserEmail: string;
  assignedUserName?: string;
}

export interface BasketScheduleCalendar {
  config: BasketScheduleConfig;
  votes: CalendarVote[];
  assignments: CalendarAssignment[];
}

export interface BasketSchedulePreparer {
  userEmail: string;
  name: string;
}

@Injectable({ providedIn: 'root' })
export class BasketScheduleService {
  private readonly api = inject(ApiService);
  private readonly groupService = inject(ConsumerGroupService);

  private get groupId(): string {
    const id = this.groupService.selectedGroupId();
    if (!id) throw new Error('No group selected');
    return id;
  }

  async getConfig(): Promise<BasketScheduleConfig> {
    return this.api.get<BasketScheduleConfig>(`consumer-groups/${this.groupId}/basket-schedule/config`);
  }

  async updateConfig(dto: Partial<BasketScheduleConfig>): Promise<BasketScheduleConfig> {
    return this.api.put<BasketScheduleConfig>(`consumer-groups/${this.groupId}/basket-schedule/config`, dto);
  }

  async getCalendar(year: number, month: number): Promise<BasketScheduleCalendar> {
    return this.api.get<BasketScheduleCalendar>(
      `consumer-groups/${this.groupId}/basket-schedule/calendar`,
      { year: String(year), month: String(month) }
    );
  }

  /** Set vote for a date. If userEmail is provided (manager only), set that user's vote. */
  async setVote(date: string, status: VoteStatus, userEmail?: string): Promise<void> {
    const body: { date: string; status: VoteStatus; userEmail?: string } = { date, status };
    if (userEmail) body.userEmail = userEmail;
    await this.api.put(`consumer-groups/${this.groupId}/basket-schedule/votes`, body);
  }

  /** Clear vote for a date. If userEmail is provided (manager only), clear that user's vote. */
  async clearVote(date: string, userEmail?: string): Promise<void> {
    const params = userEmail ? { date, userEmail } : { date };
    await this.api.delete(
      `consumer-groups/${this.groupId}/basket-schedule/votes`,
      params as Record<string, string>
    );
  }

  async setAssignment(date: string, assignedUserEmail: string): Promise<void> {
    await this.api.put(`consumer-groups/${this.groupId}/basket-schedule/assignments`, {
      date,
      assignedUserEmail,
    });
  }

  async clearAssignment(date: string): Promise<void> {
    await this.api.delete(
      `consumer-groups/${this.groupId}/basket-schedule/assignments`,
      { date }
    );
  }

  async getPreparers(): Promise<BasketSchedulePreparer[]> {
    return this.api.get<BasketSchedulePreparer[]>(
      `consumer-groups/${this.groupId}/basket-schedule/preparers`
    );
  }
}
