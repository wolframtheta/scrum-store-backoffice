import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, catchError } from 'rxjs';
import { Router } from '@angular/router';

export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const router = inject(Router);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      // Gestió d'errors generals (no 401, que ja es gestiona a auth.interceptor)
      if (error.status === 403) {
        // No autoritzat - redirigir a home o mostrar error
        console.error('Access forbidden:', error);
      } else if (error.status === 404) {
        console.error('Resource not found:', error);
      } else if (error.status >= 500) {
        console.error('Server error:', error);
      }

      // Propagar l'error
      return throwError(() => error);
    })
  );
};

