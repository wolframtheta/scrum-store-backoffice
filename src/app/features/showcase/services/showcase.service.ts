import { Injectable, inject, signal } from '@angular/core';
import { getErrorMessage } from '../../../core/models/http-error.model';
import { ApiService } from '../../../core/services/api.service';
import { ConsumerGroupService } from '../../../core/services/consumer-group.service';
import { Article } from '../../../core/models/article.model';

@Injectable({
  providedIn: 'root'
})
export class ShowcaseService {
  private readonly api = inject(ApiService);
  private readonly groupService = inject(ConsumerGroupService);

  // State
  private readonly _articles = signal<Article[]>([]);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  public readonly articles = this._articles.asReadonly();
  public readonly isLoading = this._isLoading.asReadonly();
  public readonly error = this._error.asReadonly();

  /**
   * Carregar articles de l'aparador del grup seleccionat
   */
  async loadShowcaseArticles(): Promise<void> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) {
      this._error.set('No hi ha cap grup seleccionat');
      return;
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const articles = await this.api.get<Article[]>('articles', {
        groupId,
        inShowcase: true,
      });

      this._articles.set(articles);
    } catch (error: any) {
      this._error.set(getErrorMessage(error, 'Error carregant articles de l\'aparador'));
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Afegir article a l'aparador
   */
  async addToShowcase(articleId: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await this.api.patch<Article>(`articles/${articleId}/toggle-showcase`, {
        inShowcase: true,
      });

      // Recarregar la llista
      await this.loadShowcaseArticles();
    } catch (error: any) {
      this._error.set(getErrorMessage(error, 'Error afegint article a l\'aparador'));
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Treure article de l'aparador
   */
  async removeFromShowcase(articleId: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await this.api.patch<Article>(`articles/${articleId}/toggle-showcase`, {
        inShowcase: false,
      });

      // Eliminar de la llista local
      this._articles.update(articles => articles.filter(a => a.id !== articleId));
    } catch (error: any) {
      this._error.set(getErrorMessage(error, 'Error traient article de l\'aparador'));
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Netejar estat
   */
  clearState(): void {
    this._articles.set([]);
    this._error.set(null);
  }
}

