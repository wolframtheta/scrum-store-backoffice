import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';

export interface VersionInfo {
  app?: {
    version: string;
    buildTag: string;
    timestamp: string;
  };
  backoffice?: {
    version: string;
    buildTag: string;
    timestamp: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class VersionService {
  private readonly versionInfo = signal<VersionInfo | null>(null);
  private readonly isLoading = signal(false);

  constructor(private http: HttpClient) {}

  async loadVersion(): Promise<void> {
    if (this.versionInfo()) {
      return; // Ya cargado
    }

    this.isLoading.set(true);
    try {
      const data = await firstValueFrom(
        this.http.get<VersionInfo>('./assets/version.json')
      );
      this.versionInfo.set(data);
    } catch (error) {
      console.warn('No se pudo cargar version.json:', error);
      // Fallback a versión por defecto
      this.versionInfo.set({
        backoffice: {
          version: '0.0.0',
          buildTag: 'unknown',
          timestamp: ''
        }
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  getVersion(): string {
    const info = this.versionInfo();
    return info?.backoffice?.version || '0.0.0';
  }

  getBuildTag(): string {
    const info = this.versionInfo();
    return info?.backoffice?.buildTag || 'unknown';
  }

  getVersionInfo() {
    return this.versionInfo.asReadonly();
  }

  isLoadingVersion() {
    return this.isLoading.asReadonly();
  }
}

