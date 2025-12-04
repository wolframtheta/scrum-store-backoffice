import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserAdmin {
  id: string;
  email: string;
  name: string;
  surname: string;
  phone?: string;
  profileImage?: string;
  roles: string[];
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UsersListResponse {
  data: UserAdmin[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface UserActivity {
  userEmail: string;
  lastLogin?: string;
  totalLogins: number;
  lastActions: any[];
  stats?: {
    totalPurchases: number;
    totalSales: number;
  };
}

export interface CreateUserDto {
  email: string;
  name: string;
  surname: string;
  phone?: string;
  password: string;
  roles: string[];
}

@Injectable({
  providedIn: 'root'
})
export class AdminUsersService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/admin/users`;

  // State
  private readonly _users = signal<UserAdmin[]>([]);
  private readonly _totalUsers = signal<number>(0);
  private readonly _currentPage = signal<number>(1);
  private readonly _totalPages = signal<number>(1);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  public readonly users = this._users.asReadonly();
  public readonly totalUsers = this._totalUsers.asReadonly();
  public readonly currentPage = this._currentPage.asReadonly();
  public readonly totalPages = this._totalPages.asReadonly();
  public readonly isLoading = this._isLoading.asReadonly();
  public readonly error = this._error.asReadonly();

  /**
   * Load all users with pagination and filters
   */
  async loadUsers(options?: {
    page?: number;
    limit?: number;
    search?: string;
    role?: string;
    isActive?: boolean;
  }): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      let params = new HttpParams();
      
      if (options?.page) params = params.set('page', options.page.toString());
      if (options?.limit) params = params.set('limit', options.limit.toString());
      if (options?.search) params = params.set('search', options.search);
      if (options?.role) params = params.set('role', options.role);
      if (options?.isActive !== undefined) params = params.set('isActive', options.isActive.toString());

      const response = await firstValueFrom(
        this.http.get<UsersListResponse>(this.apiUrl, { params })
      );

      this._users.set(response.data);
      this._totalUsers.set(response.meta.total);
      this._currentPage.set(response.meta.page);
      this._totalPages.set(response.meta.totalPages);
    } catch (error: any) {
      console.error('Error loading users:', error);
      this._error.set(error.message || 'Error loading users');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Get user detail by email
   */
  async getUserDetail(email: string): Promise<UserAdmin> {
    try {
      return await firstValueFrom(
        this.http.get<UserAdmin>(`${this.apiUrl}/${email}`)
      );
    } catch (error: any) {
      console.error('Error loading user detail:', error);
      throw error;
    }
  }

  /**
   * Create new user
   */
  async createUser(userData: CreateUserDto): Promise<UserAdmin> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const newUser = await firstValueFrom(
        this.http.post<UserAdmin>(this.apiUrl, userData)
      );

      // Refresh list
      await this.loadUsers({ page: this._currentPage() });

      return newUser;
    } catch (error: any) {
      console.error('Error creating user:', error);
      this._error.set(error.message || 'Error creating user');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Update user
   */
  async updateUser(email: string, userData: Partial<CreateUserDto>): Promise<UserAdmin> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const updatedUser = await firstValueFrom(
        this.http.patch<UserAdmin>(`${this.apiUrl}/${email}`, userData)
      );

      // Update in list
      const users = this._users();
      const index = users.findIndex(u => u.email === email);
      if (index !== -1) {
        const newUsers = [...users];
        newUsers[index] = updatedUser;
        this._users.set(newUsers);
      }

      return updatedUser;
    } catch (error: any) {
      console.error('Error updating user:', error);
      this._error.set(error.message || 'Error updating user');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Update user roles
   */
  async updateUserRoles(email: string, roles: string[]): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(`${this.apiUrl}/${email}/roles`, { roles })
      );

      // Update in list
      const users = this._users();
      const index = users.findIndex(u => u.email === email);
      if (index !== -1) {
        const newUsers = [...users];
        newUsers[index] = { ...newUsers[index], roles };
        this._users.set(newUsers);
      }
    } catch (error: any) {
      console.error('Error updating user roles:', error);
      this._error.set(error.message || 'Error updating user roles');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Update user status (activate/deactivate)
   */
  async updateUserStatus(email: string, isActive: boolean): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.patch(`${this.apiUrl}/${email}/status`, { isActive })
      );

      // Update in list
      const users = this._users();
      const index = users.findIndex(u => u.email === email);
      if (index !== -1) {
        const newUsers = [...users];
        newUsers[index] = { ...newUsers[index], isActive };
        this._users.set(newUsers);
      }
    } catch (error: any) {
      console.error('Error updating user status:', error);
      this._error.set(error.message || 'Error updating user status');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Delete user
   */
  async deleteUser(email: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await firstValueFrom(
        this.http.delete(`${this.apiUrl}/${email}`)
      );

      // Remove from list
      const users = this._users();
      this._users.set(users.filter(u => u.email !== email));
      this._totalUsers.set(this._totalUsers() - 1);
    } catch (error: any) {
      console.error('Error deleting user:', error);
      this._error.set(error.message || 'Error deleting user');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Get user groups
   */
  async getUserGroups(email: string): Promise<any> {
    try {
      return await firstValueFrom(
        this.http.get(`${this.apiUrl}/${email}/groups`)
      );
    } catch (error: any) {
      console.error('Error loading user groups:', error);
      throw error;
    }
  }

  /**
   * Get user activity
   */
  async getUserActivity(email: string): Promise<UserActivity> {
    try {
      return await firstValueFrom(
        this.http.get<UserActivity>(`${this.apiUrl}/${email}/activity`)
      );
    } catch (error: any) {
      console.error('Error loading user activity:', error);
      throw error;
    }
  }

  /**
   * Reset user password
   */
  async resetUserPassword(email: string): Promise<string> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await firstValueFrom(
        this.http.post<{ message: string; temporaryPassword: string }>(
          `${this.apiUrl}/${email}/reset-password`,
          {}
        )
      );

      return response.temporaryPassword;
    } catch (error: any) {
      console.error('Error resetting password:', error);
      this._error.set(error.message || 'Error resetting password');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Clear state
   */
  clearState(): void {
    this._users.set([]);
    this._totalUsers.set(0);
    this._currentPage.set(1);
    this._totalPages.set(1);
    this._error.set(null);
  }
}

