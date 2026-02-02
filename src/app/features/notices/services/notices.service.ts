import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { ConsumerGroupService } from '../../../core/services/consumer-group.service';
import { getErrorMessage } from '../../../core/models/http-error.model';

export interface NoticeAuthor {
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl?: string;
}

export interface Notice {
  id: string;
  content: string;
  imageUrl?: string;
  author: NoticeAuthor;
  groupId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface NoticeResponse {
  notices: Notice[];
  total: number;
  pages: number;
}

export interface CreateNoticeDto {
  groupId: string;
  content: string;
}

export interface UpdateNoticeDto {
  content: string;
}

@Injectable({
  providedIn: 'root'
})
export class NoticesService {
  private readonly api = inject(ApiService);
  private readonly groupService = inject(ConsumerGroupService);

  // State
  private readonly _notices = signal<Notice[]>([]);
  private readonly _totalNotices = signal<number>(0);
  private readonly _currentPage = signal<number>(1);
  private readonly _totalPages = signal<number>(1);
  private readonly _isLoading = signal<boolean>(false);
  private readonly _error = signal<string | null>(null);

  // Public readonly signals
  public readonly notices = this._notices.asReadonly();
  public readonly totalNotices = this._totalNotices.asReadonly();
  public readonly currentPage = this._currentPage.asReadonly();
  public readonly totalPages = this._totalPages.asReadonly();
  public readonly isLoading = this._isLoading.asReadonly();
  public readonly error = this._error.asReadonly();

  /**
   * Carregar avisos d'un grup amb paginació
   */
  async loadNotices(page: number = 1, limit: number = 20): Promise<void> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) {
      this._error.set('No hi ha cap grup seleccionat');
      return;
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const response = await this.api.get<NoticeResponse>(
        `notices/group/${groupId}`,
        { page, limit }
      );

      this._notices.set(response.notices);
      this._totalNotices.set(response.total);
      this._currentPage.set(page);
      this._totalPages.set(response.pages);
    } catch (error: any) {
      this._error.set(getErrorMessage(error, 'Error carregant avisos'));
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Crear un nou avís
   */
  async createNotice(content: string): Promise<Notice> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) {
      throw new Error('No hi ha cap grup seleccionat');
    }

    this._isLoading.set(true);
    this._error.set(null);

    try {
      const createDto: CreateNoticeDto = { groupId, content };
      const notice = await this.api.post<Notice>('notices', createDto);

      // Afegir l'avís al començament de la llista
      this._notices.update(notices => [notice, ...notices]);
      this._totalNotices.update(total => total + 1);

      return notice;
    } catch (error: any) {
      this._error.set(getErrorMessage(error, 'Error creant avís'));
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Actualitzar un avís
   */
  async updateNotice(noticeId: string, content: string): Promise<Notice> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const updateDto: UpdateNoticeDto = { content };
      const updatedNotice = await this.api.patch<Notice>(
        `notices/${noticeId}`,
        updateDto
      );

      // Actualitzar l'avís a la llista
      this._notices.update(notices =>
        notices.map(n => n.id === noticeId ? updatedNotice : n)
      );

      return updatedNotice;
    } catch (error: any) {
      this._error.set(getErrorMessage(error, 'Error actualitzant avís'));
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Eliminar un avís
   */
  async deleteNotice(noticeId: string): Promise<void> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      await this.api.delete(`notices/${noticeId}`);

      // Eliminar l'avís de la llista
      this._notices.update(notices => notices.filter(n => n.id !== noticeId));
      this._totalNotices.update(total => total - 1);
    } catch (error: any) {
      this._error.set(getErrorMessage(error, 'Error eliminant avís'));
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Pujar imatge a un avís
   */
  async uploadImage(noticeId: string, file: File): Promise<Notice> {
    this._isLoading.set(true);
    this._error.set(null);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const updatedNotice = await this.api.postFile<Notice>(
        `notices/${noticeId}/image`,
        formData
      );

      // Actualitzar l'avís a la llista
      this._notices.update(notices =>
        notices.map(n => n.id === noticeId ? updatedNotice : n)
      );

      return updatedNotice;
    } catch (error: any) {
      this._error.set(getErrorMessage(error, 'Error pujant imatge'));
      throw error;
    } finally {
      this._isLoading.set(false);
    }
  }

  /**
   * Netejar estat
   */
  clearState(): void {
    this._notices.set([]);
    this._totalNotices.set(0);
    this._currentPage.set(1);
    this._totalPages.set(1);
    this._error.set(null);
  }
}

