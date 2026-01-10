import { Component, OnInit, input, inject, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { TreeTableModule } from 'primeng/treetable';
import { TreeNode } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { TagModule } from 'primeng/tag';

import { GroupSettingsService } from '../../services/group-settings.service';
import { CategoryTreeItem, CategoryNode } from '../../models/category-tree.model';
import { CategoryItemModalComponent, CategoryItemModalData, CategoryItemResult } from '../category-item-modal/category-item-modal.component';

@Component({
  selector: 'app-categories-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    TreeTableModule,
    ButtonModule,
    InputTextModule,
    TooltipModule,
    ConfirmDialogModule,
    TagModule,
    CategoryItemModalComponent
  ],
  templateUrl: './categories-settings.component.html',
  styleUrl: './categories-settings.component.scss'
})
export class CategoriesSettingsComponent implements OnInit {
  readonly groupId = input.required<string>();

  private readonly settingsService = inject(GroupSettingsService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);
  private readonly translate = inject(TranslateService);

  protected readonly rawCategories = signal<CategoryTreeItem[]>([]);
  protected readonly isLoading = signal<boolean>(false);
  protected readonly editingNode = signal<string | null>(null);
  protected readonly editingValue = signal<string>('');
  protected readonly modalVisible = signal<boolean>(false);
  protected readonly modalData = signal<CategoryItemModalData>({ type: 'category' });

  protected readonly treeNodes = computed<TreeNode[]>(() => {
    return this.buildTree(this.rawCategories());
  });

  constructor() {
    // Effect per fer focus a l'input quan s'inicia l'edició
    effect(() => {
      const editingNodeKey = this.editingNode();
      if (editingNodeKey) {
        // Esperar al següent cicle de detecció de canvis
        setTimeout(() => {
          const input = document.querySelector('.edit-input') as HTMLInputElement;
          if (input) {
            input.focus();
            input.select(); // Selecciona tot el text
          }
        }, 0);
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadCategories();
  }

  private async loadCategories(): Promise<void> {
    const groupId = this.groupId();
    if (!groupId) return;

    this.isLoading.set(true);
    try {
      const categories = await this.settingsService.getCategoryTree(groupId);
      this.rawCategories.set(categories);
    } catch (error) {
      console.error('Error loading categories:', error);
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('common.error'),
        detail: this.translate.instant('settings.categories.loadError')
      });
    } finally {
      this.isLoading.set(false);
    }
  }

  private buildTree(items: CategoryTreeItem[]): TreeNode[] {
    // Agrupar per categoria
    const categoryMap = new Map<string, { products: Map<string, Set<string>> }>();

    items.forEach(item => {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, { products: new Map() });
      }

      const categoryData = categoryMap.get(item.category)!;

      if (item.product) {
        if (!categoryData.products.has(item.product)) {
          categoryData.products.set(item.product, new Set());
        }

        if (item.variety) {
          categoryData.products.get(item.product)!.add(item.variety);
        }
      }
    });

    // Construir l'arbre
    const tree: TreeNode[] = [];

    categoryMap.forEach((categoryData, categoryName) => {
      const categoryChildren: TreeNode[] = [];

      categoryData.products.forEach((varieties, productName) => {
        const productChildren: TreeNode[] = [];

        varieties.forEach(varietyName => {
          productChildren.push({
            key: `cat-${categoryName}-prod-${productName}-var-${varietyName}`,
            data: {
              type: 'variety',
              name: varietyName,
              level: this.translate.instant('settings.categories.variety'),
              parent: productName,
              grandparent: categoryName
            },
            leaf: true // Les varietats sempre són fulles
          });
        });

        const productNode: TreeNode = {
          key: `cat-${categoryName}-prod-${productName}`,
          data: {
            type: 'product',
            name: productName,
            level: this.translate.instant('settings.categories.product'),
            parent: categoryName
          },
          children: productChildren.length > 0 ? productChildren : undefined,
          leaf: productChildren.length === 0 // Si no té varietats, és una fulla
        };

        categoryChildren.push(productNode);
      });

      const categoryNode: TreeNode = {
        key: `cat-${categoryName}`,
        data: {
          type: 'category',
          name: categoryName,
          level: this.translate.instant('settings.categories.category')
        },
        children: categoryChildren.length > 0 ? categoryChildren : undefined,
        leaf: categoryChildren.length === 0 // Si no té productes, és una fulla
      };

      tree.push(categoryNode);
    });

    return tree;
  }

  protected startEdit(node: TreeNode): void {
    this.editingNode.set(node.key as string);
    this.editingValue.set(node.data.name); // Pre-omplir amb el nom actual
  }

  protected cancelEdit(): void {
    this.editingNode.set(null);
    this.editingValue.set('');
  }

  protected async saveEdit(node: TreeNode): Promise<void> {
    const newValue = this.editingValue().trim();
    if (!newValue) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translate.instant('common.warning'),
        detail: this.translate.instant('settings.categories.emptyName')
      });
      return;
    }

    const oldName = node.data.name;
    if (oldName === newValue) {
      this.cancelEdit();
      return;
    }

    try {
      const type = node.data.type;

      if (type === 'category') {
        await this.settingsService.updateCategoryName(this.groupId(), oldName, newValue);
      } else if (type === 'product') {
        await this.settingsService.updateProductName(
          this.groupId(),
          node.data.parent,
          oldName,
          newValue
        );
      } else if (type === 'variety') {
        await this.settingsService.updateVarietyName(
          this.groupId(),
          node.data.grandparent,
          node.data.parent,
          oldName,
          newValue
        );
      }

      await this.loadCategories();

      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('common.success'),
        detail: this.translate.instant('settings.categories.updateSuccess')
      });

      this.cancelEdit();
    } catch (error) {
      console.error('Error updating node:', error);
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('common.error'),
        detail: this.translate.instant('settings.categories.updateError')
      });
    }
  }

  protected confirmDelete(node: TreeNode): void {
    this.confirmationService.confirm({
      message: this.translate.instant('settings.categories.deleteConfirm', { name: node.data.name }),
      header: this.translate.instant('common.confirmDelete'),
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: this.translate.instant('common.yes'),
      rejectLabel: this.translate.instant('common.no'),
      accept: () => this.deleteNode(node)
    });
  }

  private async deleteNode(node: TreeNode): Promise<void> {
    try {
      const type = node.data.type;
      const name = node.data.name;

      if (type === 'category') {
        await this.settingsService.deleteCategoryByName(this.groupId(), name);
      } else if (type === 'product') {
        await this.settingsService.deleteProductByName(
          this.groupId(),
          node.data.parent,
          name
        );
      } else if (type === 'variety') {
        await this.settingsService.deleteVarietyByName(
          this.groupId(),
          node.data.grandparent,
          node.data.parent,
          name
        );
      }

      await this.loadCategories();

      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('common.success'),
        detail: this.translate.instant('settings.categories.deleteSuccess')
      });
    } catch (error) {
      console.error('Error deleting node:', error);
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('common.error'),
        detail: this.translate.instant('settings.categories.deleteError')
      });
    }
  }

  protected async addCategory(): Promise<void> {
    this.modalData.set({ type: 'category' });
    this.modalVisible.set(true);
  }

  protected async addProduct(categoryNode: TreeNode): Promise<void> {
    this.modalData.set({
      type: 'product',
      parentName: categoryNode.data.name
    });
    this.modalVisible.set(true);
  }

  protected async addVariety(productNode: TreeNode): Promise<void> {
    this.modalData.set({
      type: 'variety',
      parentName: productNode.data.name,
      grandparentName: productNode.data.parent
    });
    this.modalVisible.set(true);
  }

  protected async onModalConfirm(result: CategoryItemResult): Promise<void> {
    const data = this.modalData();

    try {
      const itemsToCreate: CategoryTreeItem[] = result.names.map(name => {
        if (result.type === 'category') {
          return {
            category: name,
            consumerGroupId: this.groupId()
          };
        } else if (result.type === 'product') {
          return {
            category: data.parentName!,
            product: name,
            consumerGroupId: this.groupId()
          };
        } else {
          return {
            category: data.grandparentName!,
            product: data.parentName!,
            variety: name,
            consumerGroupId: this.groupId()
          };
        }
      });

      const batchResult = await this.settingsService.createCategoriesBatch(itemsToCreate);

      await this.loadCategories();

      const count = batchResult.created;
      const typeKey = result.type === 'category' ? 'categories' : result.type === 'product' ? 'products' : 'varieties';
      
      this.messageService.add({
        severity: 'success',
        summary: this.translate.instant('common.success'),
        detail: this.translate.instant('settings.categories.batchCreated', { 
          count, 
          type: this.translate.instant(`settings.categories.${typeKey}`) 
        })
      });

      this.modalVisible.set(false);
    } catch (error) {
      console.error(`Error creating ${result.type}:`, error);
      this.messageService.add({
        severity: 'error',
        summary: this.translate.instant('common.error'),
        detail: this.translate.instant('settings.categories.createError')
      });
    }
  }
}

