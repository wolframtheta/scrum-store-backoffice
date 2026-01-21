import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { ConsumerGroupService } from '../../../core/services/consumer-group.service';
import { Article, UnitMeasure, PriceHistory } from '../../../core/models/article.model';

export interface CreateArticleDto {
  category: string;
  product: string;
  variety?: string;
  description?: string;
  unitMeasure: UnitMeasure;
  pricePerUnit: number;
  city?: string;
  producerId?: string;
  isEco?: boolean;
  taxRate?: number;
  consumerGroupId: string;
  maxQuantity?: number;
}

export interface UpdateArticleDto {
  category?: string;
  product?: string;
  variety?: string;
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
  private readonly _productSearchTerm = signal<string>('');
  private readonly _showcaseFilter = signal<boolean | null>(null);
  private readonly _ecoFilter = signal<boolean | null>(null);
  private readonly _seasonalFilter = signal<boolean | null>(null);
  private readonly _categoryFilter = signal<string[]>([]);
  private readonly _producerFilter = signal<string[]>([]);
  private readonly _supplierFilter = signal<string[]>([]);

  // Public readonly signals
  public readonly articles = this._articles.asReadonly();
  public readonly isLoading = this._isLoading.asReadonly();
  public readonly error = this._error.asReadonly();
  public readonly searchTerm = this._searchTerm.asReadonly();
  public readonly productSearchTerm = this._productSearchTerm.asReadonly();
  public readonly showcaseFilter = this._showcaseFilter.asReadonly();
  public readonly ecoFilter = this._ecoFilter.asReadonly();
  public readonly seasonalFilter = this._seasonalFilter.asReadonly();
  public readonly categoryFilter = this._categoryFilter.asReadonly();
  public readonly producerFilter = this._producerFilter.asReadonly();
  public readonly supplierFilter = this._supplierFilter.asReadonly();

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

      if (this._productSearchTerm()) {
        params.productSearch = this._productSearchTerm();
      }

      if (this._showcaseFilter() !== null) {
        params.inShowcase = this._showcaseFilter();
      }

      if (this._ecoFilter() !== null) {
        params.isEco = this._ecoFilter();
      }

      if (this._seasonalFilter() !== null) {
        params.isSeasonal = this._seasonalFilter();
      }

      if (this._categoryFilter().length > 0) {
        params.categories = this._categoryFilter().join(',');
      }

      if (this._producerFilter().length > 0) {
        params.producerIds = this._producerFilter().join(',');
      }

      if (this._supplierFilter().length > 0) {
        params.supplierIds = this._supplierFilter().join(',');
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
   * Crear múltiples articles en batch
   */
  async createArticlesBatch(dtos: CreateArticleDto[]): Promise<{ created: number; failed: number; articles: Article[] }> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const result = await this.api.post<{ created: number; failed: number; articles: Article[] }>('articles/batch', dtos);

      // Afegir els articles nous a la llista local
      if (result.articles.length > 0) {
        this._articles.update(articles => [...result.articles, ...articles]);
      }

      return result;
    } catch (error: any) {
      this._error.set(error?.error?.message || 'Error creant articles');
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
      const groupId = this.groupService.selectedGroupId();
      const params = groupId ? { groupId } : undefined;
      const updatedArticle = await this.api.patch<Article>(`articles/${articleId}`, dto, params);

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
   * Establir filtre de cerca per article
   */
  setProductSearchTerm(term: string): void {
    this._productSearchTerm.set(term);
  }

  /**
   * Establir filtre d'aparador
   */
  setShowcaseFilter(inShowcase: boolean | null): void {
    this._showcaseFilter.set(inShowcase);
  }

  /**
   * Establir filtre ecològic
   */
  setEcoFilter(isEco: boolean | null): void {
    this._ecoFilter.set(isEco);
  }

  /**
   * Establir filtre de temporada
   */
  setSeasonalFilter(isSeasonal: boolean | null): void {
    this._seasonalFilter.set(isSeasonal);
  }

  /**
   * Establir filtre de categories
   */
  setCategoryFilter(categories: string[]): void {
    this._categoryFilter.set(categories);
  }

  /**
   * Establir filtre de productors
   */
  setProducerFilter(producerIds: string[]): void {
    this._producerFilter.set(producerIds);
  }

  /**
   * Establir filtre de proveïdors
   */
  setSupplierFilter(supplierIds: string[]): void {
    this._supplierFilter.set(supplierIds);
  }

  /**
   * Netejar filtres
   */
  clearFilters(): void {
    this._searchTerm.set('');
    this._productSearchTerm.set('');
    this._showcaseFilter.set(null);
    this._ecoFilter.set(null);
    this._seasonalFilter.set(null);
    this._categoryFilter.set([]);
    this._producerFilter.set([]);
    this._supplierFilter.set([]);
  }

  /**
   * Netejar estat
   */
  clearState(): void {
    this._articles.set([]);
    this._error.set(null);
    this.clearFilters();
  }

  /**
   * Eliminar múltiples articles en batch
   */
  async batchDelete(articleIds: string[]): Promise<{ deleted: number; failed: number }> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const result = await this.api.post<{ deleted: number; failed: number }>('articles/batch/delete', {
        articleIds,
      });

      // Eliminar de la llista local
      this._articles.update(articles => articles.filter(a => !articleIds.includes(a.id)));

      return result;
    } catch (error: any) {
      this._error.set(error?.error?.message || 'Error eliminant articles');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Canviar visibilitat a l'aparador de múltiples articles en batch
   */
  async batchToggleShowcase(articleIds: string[], inShowcase: boolean): Promise<{ updated: number; failed: number }> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const result = await this.api.post<{ updated: number; failed: number }>('articles/batch/toggle-showcase', {
        articleIds,
        inShowcase,
      });

      // Actualitzar a la llista local
      this._articles.update(articles =>
        articles.map(a => articleIds.includes(a.id) ? { ...a, inShowcase } : a)
      );

      return result;
    } catch (error: any) {
      this._error.set(error?.error?.message || 'Error canviant estat de l\'aparador');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Canviar estat de temporada de múltiples articles en batch
   */
  async batchToggleSeasonal(articleIds: string[], isSeasonal: boolean): Promise<{ updated: number; failed: number }> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const result = await this.api.post<{ updated: number; failed: number }>('articles/batch/toggle-seasonal', {
        articleIds,
        isSeasonal,
      });

      // Actualitzar a la llista local
      this._articles.update(articles =>
        articles.map(a => articleIds.includes(a.id) ? { ...a, isSeasonal } : a)
      );

      return result;
    } catch (error: any) {
      this._error.set(error?.error?.message || 'Error canviant estat de temporada');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Canviar estat ecològic de múltiples articles en batch
   */
  async batchToggleEco(articleIds: string[], isEco: boolean): Promise<{ updated: number; failed: number }> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const result = await this.api.post<{ updated: number; failed: number }>('articles/batch/toggle-eco', {
        articleIds,
        isEco,
      });

      // Actualitzar a la llista local
      this._articles.update(articles =>
        articles.map(a => articleIds.includes(a.id) ? { ...a, isEco } : a)
      );

      return result;
    } catch (error: any) {
      this._error.set(error?.error?.message || 'Error canviant estat ecològic');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Obtenir article per ID
   */
  async getArticleById(articleId: string): Promise<Article> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const groupId = this.groupService.selectedGroupId();
      const params = groupId ? { groupId } : undefined;
      const article = await this.api.get<Article>(`articles/${articleId}`, params);
      return article;
    } catch (error: any) {
      this._error.set(error?.error?.message || 'Error carregant article');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Obtenir històric de preus d'un article
   */
  async getPriceHistory(articleId: string): Promise<PriceHistory[]> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const history = await this.api.get<PriceHistory[]>(`articles/${articleId}/price-history`);
      return history;
    } catch (error: any) {
      this._error.set(error?.error?.message || 'Error carregant històric de preus');
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

}

