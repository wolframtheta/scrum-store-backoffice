import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from './api.service';

export interface SystemConfigResponse {
  key: string;
  value: string;
  description?: string;
  updatedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class SystemConfigService {
  private readonly api = inject(ApiService);

  private readonly _loginEnabled = signal<boolean>(true);
  private readonly _isLoading = signal<boolean>(false);

  readonly loginEnabled = this._loginEnabled.asReadonly();
  readonly isLoading = this._isLoading.asReadonly();

  async loadLoginEnabled(): Promise<void> {
    this._isLoading.set(true);
    try {
      const config = await this.api.get<SystemConfigResponse>('config-system/login-enabled');
      this._loginEnabled.set(config.value === 'true');
    } catch (error) {
      console.error('Error loading login enabled status:', error);
      // Por defecto, asumir que está habilitado
      this._loginEnabled.set(true);
    } finally {
      this._isLoading.set(false);
    }
  }

  async updateLoginEnabled(enabled: boolean): Promise<void> {
    this._isLoading.set(true);
    try {
      const config = await this.api.patch<SystemConfigResponse>('config-system/login-enabled', {
        value: enabled ? 'true' : 'false'
      });
      this._loginEnabled.set(config.value === 'true');
    } catch (error) {
      console.error('Error updating login enabled status:', error);
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }
}

