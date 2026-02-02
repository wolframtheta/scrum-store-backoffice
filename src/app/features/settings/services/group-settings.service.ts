import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { ConsumerGroup } from '../../../core/models/consumer-group.model';
import { CategoryTreeItem } from '../models/category-tree.model';
import { GroupMember, AddMemberDto, UpdateMemberRoleDto } from '../models/group-member.model';
import { getErrorMessage } from '../../../core/models/http-error.model';

@Injectable({
  providedIn: 'root'
})
export class GroupSettingsService {
  private readonly api = inject(ApiService);

  readonly isLoading = signal<boolean>(false);
  readonly error = signal<string | null>(null);

  async updateGroupSettings(groupId: string, data: Partial<ConsumerGroup>): Promise<ConsumerGroup> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      return await this.api.patch<ConsumerGroup>(`consumer-groups/${groupId}`, data);
    } catch (err: any) {
      this.error.set(getErrorMessage(err, 'Error actualitzant la configuració'));
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async getCategoryTree(groupId: string): Promise<CategoryTreeItem[]> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      return await this.api.get<CategoryTreeItem[]>(`categories/tree?consumerGroupId=${groupId}`);
    } catch (err: any) {
      this.error.set(getErrorMessage(err, 'Error carregant categories'));
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async createCategory(data: CategoryTreeItem): Promise<CategoryTreeItem> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      return await this.api.post<CategoryTreeItem>('categories', data);
    } catch (err: any) {
      this.error.set(getErrorMessage(err, 'Error creant categoria'));
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async createCategoriesBatch(data: CategoryTreeItem[]): Promise<{ created: number; categories: CategoryTreeItem[] }> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      return await this.api.post<{ created: number; categories: CategoryTreeItem[] }>('categories/batch', data);
    } catch (err: any) {
      this.error.set(getErrorMessage(err, 'Error creant categories'));
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateCategoryName(groupId: string, oldName: string, newName: string): Promise<{ updated: number }> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      return await this.api.patch<{ updated: number }>(
        'categories/by-name/category',
        {
          consumerGroupId: groupId,
          oldName,
          newName
        }
      );
    } catch (err: any) {
      this.error.set(getErrorMessage(err, 'Error actualitzant categoria'));
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateProductName(groupId: string, category: string, oldName: string, newName: string): Promise<{ updated: number }> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      return await this.api.patch<{ updated: number }>(
        'categories/by-name/product',
        {
          consumerGroupId: groupId,
          category,
          oldName,
          newName
        }
      );
    } catch (err: any) {
      this.error.set(getErrorMessage(err, 'Error actualitzant producte'));
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateVarietyName(groupId: string, category: string, product: string, oldName: string, newName: string): Promise<{ updated: number }> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      return await this.api.patch<{ updated: number }>(
        'categories/by-name/variety',
        {
          consumerGroupId: groupId,
          category,
          product,
          oldName,
          newName
        }
      );
    } catch (err: any) {
      this.error.set(getErrorMessage(err, 'Error actualitzant varietat'));
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteCategoryByName(groupId: string, categoryName: string): Promise<{ deleted: number }> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      // HttpClient DELETE amb body requereix una configuració especial
      return await this.api.deleteWithBody<{ deleted: number }>(
        'categories/by-name/category',
        {
          consumerGroupId: groupId,
          category: categoryName
        }
      );
    } catch (err: any) {
      this.error.set(getErrorMessage(err, 'Error eliminant categoria'));
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteProductByName(groupId: string, category: string, productName: string): Promise<{ deleted: number }> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      return await this.api.deleteWithBody<{ deleted: number }>(
        'categories/by-name/product',
        {
          consumerGroupId: groupId,
          category,
          product: productName
        }
      );
    } catch (err: any) {
      this.error.set(getErrorMessage(err, 'Error eliminant producte'));
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async deleteVarietyByName(groupId: string, category: string, product: string, varietyName: string): Promise<{ deleted: number }> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      return await this.api.deleteWithBody<{ deleted: number }>(
        'categories/by-name/variety',
        {
          consumerGroupId: groupId,
          category,
          product,
          variety: varietyName
        }
      );
    } catch (err: any) {
      this.error.set(getErrorMessage(err, 'Error eliminant varietat'));
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  // ===== MEMBERS MANAGEMENT =====

  async getGroupMembers(groupId: string): Promise<GroupMember[]> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      return await this.api.get<GroupMember[]>(`consumer-groups/${groupId}/members`);
    } catch (err: any) {
      this.error.set(getErrorMessage(err, 'Error carregant membres'));
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async addMember(groupId: string, data: AddMemberDto): Promise<{ message: string }> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      return await this.api.post<{ message: string }>(`consumer-groups/${groupId}/join`, data);
    } catch (err: any) {
      this.error.set(getErrorMessage(err, 'Error afegint membre'));
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async updateMemberRole(groupId: string, userEmail: string, data: UpdateMemberRoleDto): Promise<{ message: string }> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      // Codificar l'email per evitar problemes amb caràcters especials (@, +, etc.)
      const encodedEmail = encodeURIComponent(userEmail);
      return await this.api.patch<{ message: string }>(`consumer-groups/${groupId}/members/${encodedEmail}/role`, data);
    } catch (err: any) {
      this.error.set(getErrorMessage(err, 'Error actualitzant rol'));
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async removeMember(groupId: string, userEmail: string): Promise<{ message: string }> {
    this.isLoading.set(true);
    this.error.set(null);
    try {
      // Codificar l'email per evitar problemes amb caràcters especials (@, +, etc.)
      const encodedEmail = encodeURIComponent(userEmail);
      return await this.api.delete<{ message: string }>(`consumer-groups/${groupId}/members/${encodedEmail}`);
    } catch (err: any) {
      this.error.set(getErrorMessage(err, 'Error eliminant membre'));
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }
}

