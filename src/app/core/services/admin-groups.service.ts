import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface ConsumerGroupAdmin {
  id: string;
  email: string;
  name: string;
  description?: string;
  city: string;
  address?: string;
  image?: string;
  openingSchedule?: any;
  isActive: boolean;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface GroupsListResponse {
  data: ConsumerGroupAdmin[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface GroupDetailAdmin extends ConsumerGroupAdmin {
  stats: {
    totalMembers: number;
    totalManagers: number;
  };
}

export interface GroupStatistics {
  groupId: string;
  groupName: string;
  totalMembers: number;
  activeMembers: number;
  totalArticles: number;
  totalSales: number;
  salesThisMonth: number;
  pendingPayments: number;
}

export interface CreateGroupDto {
  email: string;
  name: string;
  description?: string;
  city: string;
  address?: string;
  managerEmail: string;
  openingSchedule?: any;
}

@Injectable({
  providedIn: 'root'
})
export class AdminGroupsService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/groups`;

  // State
  private readonly _groups = signal<ConsumerGroupAdmin[]>([]);
  private readonly _totalGroups = signal<number>(0);
  private readonly _currentPage = signal<number>(1);
  private readonly _totalPages = signal<number>(1);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  public readonly groups = this._groups.asReadonly();
  public readonly totalGroups = this._totalGroups.asReadonly();
  public readonly currentPage = this._currentPage.asReadonly();
  public readonly totalPages = this._totalPages.asReadonly();
  public readonly isLoading = this._isLoading.asReadonly();
  public readonly error = this._error.asReadonly();

  /**
   * Load all groups with pagination and filters
   */
  async loadGroups(options?: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
  }): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      let params = new HttpParams();
      
      if (options?.page) params = params.set('page', options.page.toString());
      if (options?.limit) params = params.set('limit', options.limit.toString());
      if (options?.search) params = params.set('search', options.search);
      if (options?.isActive !== undefined) params = params.set('isActive', options.isActive.toString());

      const response = await firstValueFrom(
        this.http.get<GroupsListResponse>(this.apiUrl, { params })
      );

      this._groups.set(response.data);
      this._totalGroups.set(response.meta.total);
      this._currentPage.set(response.meta.page);
      this._totalPages.set(response.meta.totalPages);
    } catch (error: any) {
      console.error('Error loading groups:', error);
      this._error.set(error.message || 'Error loading groups');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Get group detail by ID
   */
  async getGroupDetail(id: string): Promise<GroupDetailAdmin> {
    try {
      return await firstValueFrom(
        this.http.get<GroupDetailAdmin>(`${this.apiUrl}/${id}`)
      );
    } catch (error: any) {
      console.error('Error loading group detail:', error);
      throw error;
    }
  }

  /**
   * Create new group
   */
  async createGroup(groupData: CreateGroupDto): Promise<ConsumerGroupAdmin> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const newGroup = await firstValueFrom(
        this.http.post<ConsumerGroupAdmin>(this.apiUrl, groupData)
      );

      // Refresh list
      await this.loadGroups({ page: this._currentPage() });

      return newGroup;
    } catch (error: any) {
      console.error('Error creating group:', error);
      this._error.set(error.message || 'Error creating group');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Update group
   */
  async updateGroup(id: string, groupData: Partial<CreateGroupDto>): Promise<ConsumerGroupAdmin> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const updatedGroup = await firstValueFrom(
        this.http.patch<ConsumerGroupAdmin>(`${this.apiUrl}/${id}`, groupData)
      );

      // Update in list
      const groups = this._groups();
      const index = groups.findIndex(g => g.id === id);
      if (index !== -1) {
        const newGroups = [...groups];
        newGroups[index] = updatedGroup;
        this._groups.set(newGroups);
      }

      return updatedGroup;
    } catch (error: any) {
      console.error('Error updating group:', error);
      this._error.set(error.message || 'Error updating group');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Update group status (activate/deactivate)
   */
  async updateGroupStatus(id: string, isActive: boolean): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(`${this.apiUrl}/${id}/status`, { isActive })
      );

      // Update in list
      const groups = this._groups();
      const index = groups.findIndex(g => g.id === id);
      if (index !== -1) {
        const newGroups = [...groups];
        newGroups[index] = { ...newGroups[index], isActive };
        this._groups.set(newGroups);
      }
    } catch (error: any) {
      console.error('Error updating group status:', error);
      this._error.set(error.message || 'Error updating group status');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Delete group
   */
  async deleteGroup(id: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/${id}`)
      );

      // Remove from list
      const groups = this._groups();
      this._groups.set(groups.filter(g => g.id !== id));
      this._totalGroups.set(this._totalGroups() - 1);
    } catch (error: any) {
      console.error('Error deleting group:', error);
      this._error.set(error.message || 'Error deleting group');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Get group members
   */
  async getGroupMembers(id: string): Promise<any[]> {
    try {
      return await firstValueFrom(
        this.http.get<any[]>(`${this.apiUrl}/${id}/members`)
      );
    } catch (error: any) {
      console.error('Error loading group members:', error);
      throw error;
    }
  }

  /**
   * Get group statistics
   */
  async getGroupStatistics(id: string): Promise<GroupStatistics> {
    try {
      return await firstValueFrom(
        this.http.get<GroupStatistics>(`${this.apiUrl}/${id}/statistics`)
      );
    } catch (error: any) {
      console.error('Error loading group statistics:', error);
      throw error;
    }
  }

  /**
   * Clear state
   */
  clearState(): void {
    this._groups.set([]);
    this._totalGroups.set(0);
    this._currentPage.set(1);
    this._totalPages.set(1);
    this._error.set(null);
  }
}


