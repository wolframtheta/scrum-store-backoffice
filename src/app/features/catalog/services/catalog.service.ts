import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { ConsumerGroupService } from '../../../core/services/consumer-group.service';
import { Article, UnitMeasure } from '../../../core/models/article.model';

export interface CreateArticleDto {
  name: string;
  description?: string;
  unitMeasure: UnitMeasure;
  pricePerUnit: number;
  city?: string;
  producer?: string;
  consumerGroupId: string;
  maxQuantity?: number;
}

export interface UpdateArticleDto {
  name?: string;
  description?: string;
  unitMeasure?: UnitMeasure;
  pricePerUnit?: number;
  city?: string;
  producer?: string;
  maxQuantity?: number;
}

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private readonly api = inject(ApiService);
  private readonly groupService = inject(ConsumerGroupService);

  // State
  private readonly _articles = signal<Article[]>([]);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Filters
  private readonly _searchTerm = signal<string>('');
  private readonly _showcaseFilter = signal<boolean | null>(null);

  // Public readonly signals
  public readonly articles = this._articles.asReadonly();
  public readonly isLoading = this._isLoading.asReadonly();
  public readonly error = this._error.asReadonly();
  public readonly searchTerm = this._searchTerm.asReadonly();
  public readonly showcaseFilter = this._showcaseFilter.asReadonly();

  /**
   * Carregar tots els articles del grup
   */
  async loadArticles(): Promise<void> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) {
      this._error.set('No hi ha cap grup seleccionat');
      return;
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const params: any = { groupId };
      
      if (this._searchTerm()) {
        params.search = this._searchTerm();
      }
      
      if (this._showcaseFilter() !== null) {
        params.inShowcase = this._showcaseFilter();
      }

      const articles = await this.api.get<Article[]>('articles', params);
      this._articles.set(articles);
    } catch (error: any) {
      this._error.set(error?.error?.message || 'Error carregant articles');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Crear nou article
   */
  async createArticle(dto: CreateArticleDto): Promise<Article> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const article = await this.api.post<Article>('articles', dto);
      
      // Afegir a la llista local
      this._articles.update(articles => [article, ...articles]);
      
      return article;
    } catch (error: any) {
      this._error.set(error?.error?.message || 'Error creant article');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Actualitzar article
   */
  async updateArticle(articleId: string, dto: UpdateArticleDto): Promise<Article> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const updatedArticle = await this.api.patch<Article>(`articles/${articleId}`, dto);
      
      // Actualitzar a la llista local
      this._articles.update(articles =>
        articles.map(a => a.id === articleId ? updatedArticle : a)
      );
      
      return updatedArticle;
    } catch (error: any) {
      this._error.set(error?.error?.message || 'Error actualitzant article');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Eliminar article
   */
  async deleteArticle(articleId: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await this.api.delete(`articles/${articleId}`);
      
      // Eliminar de la llista local
      this._articles.update(articles => articles.filter(a => a.id !== articleId));
    } catch (error: any) {
      this._error.set(error?.error?.message || 'Error eliminant article');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Afegir/treure article de l'aparador
   */
  async toggleShowcase(articleId: string, inShowcase: boolean): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const updatedArticle = await this.api.patch<Article>(
        `articles/${articleId}/toggle-showcase`,
        { inShowcase }
      );
      
      // Actualitzar a la llista local
      this._articles.update(articles =>
        articles.map(a => a.id === articleId ? updatedArticle : a)
      );
    } catch (error: any) {
      this._error.set(error?.error?.message || 'Error canviant estat de l\'aparador');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Pujar imatge d'un article
   */
  async uploadImage(articleId: string, file: File): Promise<Article> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const updatedArticle = await this.api.postFile<Article>(
        `articles/${articleId}/image`,
        formData
      );
      
      // Actualitzar a la llista local
      this._articles.update(articles =>
        articles.map(a => a.id === articleId ? updatedArticle : a)
      );
      
      return updatedArticle;
    } catch (error: any) {
      this._error.set(error?.error?.message || 'Error pujant imatge');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Establir filtre de cerca
   */
  setSearchTerm(term: string): void {
    this._searchTerm.set(term);
  }

  /**
   * Establir filtre d'aparador
   */
  setShowcaseFilter(inShowcase: boolean | null): void {
    this._showcaseFilter.set(inShowcase);
  }

  /**
   * Netejar filtres
   */
  clearFilters(): void {
    this._searchTerm.set('');
    this._showcaseFilter.set(null);
  }

  /**
   * Netejar estat
   */
  clearState(): void {
    this._articles.set([]);
    this._error.set(null);
    this.clearFilters();
  }
}

