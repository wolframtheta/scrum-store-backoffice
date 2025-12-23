import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, from } from 'rxjs';
import { ApiService } from './api.service';
import { LocalStorageService } from './local-storage.service';
import { User, AuthResponse, LoginCredentials, RegisterData } from '../models/user.model';
import { UserRole } from '../models/user-role.enum';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly localStorage = inject(LocalStorageService);
  private readonly router = inject(Router);

  // Signals
  readonly currentUser = signal<User | null>(null);
  readonly isAuthenticated = computed(() => !!this.currentUser());
  readonly isSuperAdmin = computed(() => this.currentUser()?.roles.includes(UserRole.SUPER_ADMIN) || false);
  readonly isLoading = signal(false);

  constructor() {
    // Cargar usuario desde localStorage al iniciar
    this.loadUserFromStorage();
  }

  private loadUserFromStorage(): void {
    const user = this.localStorage.getUser<User>();
    const token = this.localStorage.getToken();

    if (user && token) {
      this.currentUser.set(user);
    }
  }

  async login(credentials: LoginCredentials): Promise<void> {
    this.isLoading.set(true);

    try {
      const response = await this.api.post<AuthResponse>('auth/login', credentials);
      this.setSession(response);
    } finally {
      this.isLoading.set(false);
    }
  }

  async register(data: RegisterData): Promise<void> {
    this.isLoading.set(true);

    try {
      const response = await this.api.post<AuthResponse>('auth/register', data);
      this.setSession(response);
    } finally {
      this.isLoading.set(false);
    }
  }

  async logout(): Promise<void> {
    const refreshToken = this.localStorage.getRefreshToken();

    if (refreshToken) {
      try {
        await this.api.post('auth/logout', { refreshToken });
      } catch (error) {
        console.error('Error during logout:', error);
      } finally {
        this.clearSession();
      }
    } else {
      this.clearSession();
    }
  }

  async refreshTokenAsync(): Promise<AuthResponse> {
    const refreshToken = this.localStorage.getRefreshToken();

    if (!refreshToken) {
      this.clearSession();
      throw new Error('No refresh token available');
    }

    const response = await this.api.post<AuthResponse>('auth/refresh', { refreshToken });
    this.localStorage.setToken(response.accessToken);
    this.localStorage.setRefreshToken(response.refreshToken);
    return response;
  }

  refreshToken(token: string): Observable<AuthResponse> {
    return from(this.api.post<AuthResponse>('auth/refresh', { refreshToken: token }));
  }

  private setSession(authResponse: AuthResponse): void {
    this.localStorage.setToken(authResponse.accessToken);
    this.localStorage.setRefreshToken(authResponse.refreshToken);
    this.localStorage.setUser(authResponse.user);

    this.currentUser.set(authResponse.user);
  }

  private clearSession(): void {
    this.localStorage.removeTokens();
    this.localStorage.removeUser();
    this.localStorage.removeSelectedGroup();

    this.currentUser.set(null);

    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.localStorage.getToken();
  }
}

