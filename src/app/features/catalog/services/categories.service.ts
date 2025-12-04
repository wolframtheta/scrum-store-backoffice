import { Injectable, inject, signal } from '@angular/core';
import { ApiService } from '../../../core/services/api.service';
import { ConsumerGroupService } from '../../../core/services/consumer-group.service';
import { Category } from '../../../core/models/category.model';

@Injectable({
  providedIn: 'root'
})
export class CategoriesService {
  private readonly api = inject(ApiService);
  private readonly groupService = inject(ConsumerGroupService);

  readonly categories = signal<Category[]>([]);
  readonly isLoading = signal<boolean>(false);

  async loadCategories(): Promise<void> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) return;

    this.isLoading.set(true);
    try {
      const response = await this.api.get<Category[]>(`categories?consumerGroupId=${groupId}`);
      this.categories.set(response);
    } finally {
      this.isLoading.set(false);
    }
  }

  async getUniqueCategories(): Promise<string[]> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) return [];

    return await this.api.get<string[]>(`categories/unique-categories?consumerGroupId=${groupId}`);
  }

  async getProductsByCategory(category: string): Promise<string[]> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) return [];

    return await this.api.get<string[]>(`categories/products?consumerGroupId=${groupId}&category=${encodeURIComponent(category)}`);
  }

  async getVarietiesByProduct(category: string, product: string): Promise<string[]> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) return [];

    return await this.api.get<string[]>(`categories/varieties?consumerGroupId=${groupId}&category=${encodeURIComponent(category)}&product=${encodeURIComponent(product)}`);
  }

  async createCategory(data: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>): Promise<Category> {
    const category = await this.api.post<Category>('categories', data);
    await this.loadCategories();
    return category;
  }

  async updateCategory(id: string, data: Partial<Category>): Promise<Category> {
    const groupId = this.groupService.selectedGroupId();
    const category = await this.api.patch<Category>(`categories/${id}?consumerGroupId=${groupId}`, data);
    await this.loadCategories();
    return category;
  }

  async deleteCategory(id: string): Promise<void> {
    const groupId = this.groupService.selectedGroupId();
    await this.api.delete(`categories/${id}?consumerGroupId=${groupId}`);
    await this.loadCategories();
  }
}

