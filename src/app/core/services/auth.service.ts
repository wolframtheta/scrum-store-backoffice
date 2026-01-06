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
  readonly isAdmin = computed(() => this.currentUser()?.roles.includes(UserRole.ADMIN) || false);
  // isPreparer ara es comprova a nivell de grup, no com a rol global
  // readonly isPreparer = computed(() => this.currentUser()?.roles.includes(UserRole.PREPARER) || false);
  readonly isClient = computed(() => {
    const user = this.currentUser();
    if (!user) return false;
    // És client si només té el rol CLIENT (no té altres rols que donin accés al gestor)
    // PREPARER no és un rol global, es gestiona a nivell de grup
    return user.roles.includes(UserRole.CLIENT) && 
           !user.roles.includes(UserRole.SUPER_ADMIN) &&
           !user.roles.includes(UserRole.ADMIN);
  });
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

  /**
   * Comprova si l'usuari té algun dels rols especificats
   */
  hasAnyRole(...roles: UserRole[]): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return roles.some(role => user.roles.includes(role));
  }

  /**
   * Comprova si l'usuari té tots els rols especificats
   */
  hasAllRoles(...roles: UserRole[]): boolean {
    const user = this.currentUser();
    if (!user) return false;
    return roles.every(role => user.roles.includes(role));
  }

  /**
   * Comprova si l'usuari pot accedir al gestor (no és només client)
   */
  canAccessBackoffice(): boolean {
    return this.hasAnyRole(UserRole.SUPER_ADMIN, UserRole.ADMIN) || 
           this.isManagerOfAnyGroup();
  }

  /**
   * Comprova si l'usuari és manager d'almenys un grup
   * Això es comprova a través del ConsumerGroupService
   */
  private isManagerOfAnyGroup(): boolean {
    // Aquesta lògica es gestiona al ConsumerGroupService
    // Es comprova al authGuard
    return false;
  }
}

