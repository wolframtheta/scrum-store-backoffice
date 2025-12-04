import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take, tap } from 'rxjs/operators';
import { LocalStorageService } from '../services/local-storage.service';
import { AuthService } from '../services/auth.service';

let isRefreshing = false;
let refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const localStorage = inject(LocalStorageService);
  const authService = inject(AuthService);
  const token = localStorage.getToken();

  // Afegir token si existeix (excepte login, register i refresh)
  if (token && !isAuthEndpoint(req.url)) {
    req = addToken(req, token);
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Si és un 401 i no és un endpoint d'auth, intentar refresh
      if (error.status === 401 && !isAuthEndpoint(req.url)) {
        return handle401Error(req, next, authService, localStorage);
      }

      return throwError(() => error);
    })
  );
};

function addToken(request: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return request.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });
}

function isAuthEndpoint(url: string): boolean {
  return url.includes('auth/login') || 
         url.includes('auth/register') || 
         url.includes('auth/refresh');
}

function handle401Error(
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  authService: AuthService,
  localStorage: LocalStorageService
): Observable<HttpEvent<unknown>> {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshTokenSubject.next(null);

    const refreshToken = localStorage.getRefreshToken();

    if (!refreshToken) {
      // No hi ha refresh token, fer logout
      isRefreshing = false;
      authService.logout();
      return throwError(() => new Error('No refresh token available'));
    }

    return authService.refreshToken(refreshToken).pipe(
      tap((response) => {
        // Guardar els nous tokens
        localStorage.setToken(response.accessToken);
        localStorage.setRefreshToken(response.refreshToken);
      }),
      switchMap((response) => {
        isRefreshing = false;
        refreshTokenSubject.next(response.accessToken);
        
        // Reintenta la petició original amb el nou token
        return next(addToken(request, response.accessToken));
      }),
      catchError((error) => {
        isRefreshing = false;
        // Si el refresh falla, fer logout
        authService.logout();
        return throwError(() => error);
      })
    );
  } else {
    // Si ja s'està refrescant, esperar a que acabi
    return refreshTokenSubject.pipe(
      filter(token => token !== null),
      take(1),
      switchMap(token => {
        return next(addToken(request, token!));
      })
    );
  }
}
