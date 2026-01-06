import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly API_URL = environment.apiUrl;

  // GET request
  async get<T>(
    endpoint: string,
    params?: Record<string, string | number | boolean>
  ): Promise<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    return firstValueFrom(
      this.http.get<T>(`${this.API_URL}/${endpoint}`, { params: httpParams })
    );
  }

  // POST request
  async post<T>(endpoint: string, body?: unknown): Promise<T> {
    return firstValueFrom(
      this.http.post<T>(`${this.API_URL}/${endpoint}`, body)
    );
  }

  // PUT request
  async put<T>(endpoint: string, body?: unknown): Promise<T> {
    return firstValueFrom(
      this.http.put<T>(`${this.API_URL}/${endpoint}`, body)
    );
  }

  // PATCH request
  async patch<T>(endpoint: string, body?: unknown, params?: Record<string, string | number | boolean>): Promise<T> {
    let httpParams = new HttpParams();
    if (params) {
      Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== null) {
          httpParams = httpParams.set(key, params[key].toString());
        }
      });
    }

    return firstValueFrom(
      this.http.patch<T>(`${this.API_URL}/${endpoint}`, body, { params: httpParams })
    );
  }

  // DELETE request
  async delete<T>(endpoint: string): Promise<T> {
    return firstValueFrom(
      this.http.delete<T>(`${this.API_URL}/${endpoint}`)
    );
  }

  // DELETE request with body
  async deleteWithBody<T>(endpoint: string, body: unknown): Promise<T> {
    return firstValueFrom(
      this.http.delete<T>(`${this.API_URL}/${endpoint}`, { body })
    );
  }

  // POST with FormData (para upload de archivos)
  async postFile<T>(endpoint: string, formData: FormData): Promise<T> {
    return firstValueFrom(
      this.http.post<T>(`${this.API_URL}/${endpoint}`, formData)
    );
  }

  // GET full URL (para descargar archivos, imágenes, etc.)
  getFullUrl(path: string): string {
    if (path.startsWith('http')) {
      return path;
    }
    return `${this.API_URL.replace('/api/v1', '')}/${path}`;
  }
}


