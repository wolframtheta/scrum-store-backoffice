import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { MessageService, ConfirmationService } from 'primeng/api';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { CheckboxModule } from 'primeng/checkbox';

import { CatalogService } from '../../services/catalog.service';
import { Article } from '../../../../core/models/article.model';
import { MultiSelectModule } from 'primeng/multiselect';
import { ArticleFormComponent } from '../../components/article-form/article-form.component';
import { CategoriesService } from '../../services/categories.service';

@Component({
  selector: 'app-catalog-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    ButtonModule,
    TableModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    MultiSelectModule,
    ToastModule,
    ConfirmDialogModule,
    TagModule,
    TooltipModule,
    CheckboxModule,
    ArticleFormComponent,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './catalog-list.component.html',
  styleUrl: './catalog-list.component.scss',
})
export class CatalogListComponent implements OnInit {
  protected readonly catalogService = inject(CatalogService);
  protected readonly categoriesService = inject(CategoriesService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);

  // Form
  protected readonly filtersForm: FormGroup;

  // Local state
  protected readonly showcaseFilterOptions = [
    { label: this.translate.instant('catalog.filters.inShowcase'), value: true },
    { label: this.translate.instant('catalog.filters.notInShowcase'), value: false },
  ];
  protected readonly categories = signal<string[]>([]);
  protected readonly showFormDialog = signal<boolean>(false);
  protected readonly editingArticle = signal<Article | null>(null);
  protected readonly selectedArticles = signal<Article[]>([]);

  constructor() {
    this.filtersForm = this.fb.group({
      search: [''],
      showcaseFilter: [[]],
      categoryFilter: [[]]
    });
  }

  async ngOnInit() {
    await this.loadArticles();
    await this.loadCategories();
  }

  private async loadCategories() {
    const categories = await this.categoriesService.getUniqueCategories();
    this.categories.set(categories);
  }

  protected async loadArticles() {
    try {
      await this.catalogService.loadArticles();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error carregant articles',
      });
    }
  }

  protected async onSearch() {
    const searchValue = this.filtersForm.get('search')?.value || '';
    this.catalogService.setSearchTerm(searchValue);
    await this.loadArticles();
  }

  protected async onShowcaseFilterChange() {
    const selectedFilters = this.filtersForm.get('showcaseFilter')?.value || [];

    // Si no hi ha cap filtre seleccionat, mostrem tots
    if (selectedFilters.length === 0) {
      this.catalogService.setShowcaseFilter(null);
    } else if (selectedFilters.length === 2) {
      // Si estan tots seleccionats, també mostrem tots
      this.catalogService.setShowcaseFilter(null);
    } else {
      // Si només n'hi ha un seleccionat, apliquem aquest filtre
      this.catalogService.setShowcaseFilter(selectedFilters[0].value);
    }

    await this.loadArticles();
  }

  protected async clearFilters() {
    this.filtersForm.patchValue({
      search: '',
      showcaseFilter: [],
      categoryFilter: []
    });
    this.catalogService.clearFilters();
    await this.loadArticles();
  }

  protected async toggleShowcase(article: Article) {
    const action = article.inShowcase ? 'treure' : 'afegir';
    const actionPast = article.inShowcase ? 'tret' : 'afegit';
    const articleName = this.getArticleName(article);

    try {
      await this.catalogService.toggleShowcase(article.id, !article.inShowcase);
      await this.loadArticles(); // Recarregar articles per actualitzar l'estat
      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: `Article ${actionPast} ${article.inShowcase ? 'a' : 'de'} l'aparador correctament`,
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.error?.message || `Error ${action}int article`,
      });
    }
  }

  protected deleteArticle(article: Article) {
    const articleName = this.getArticleName(article);

    this.confirmationService.confirm({
      message: `¿Segur que vols eliminar "${articleName}"? Aquesta acció no es pot desfer.`,
      header: 'Confirmar eliminació',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          await this.catalogService.deleteArticle(article.id);
          this.messageService.add({
            severity: 'success',
            summary: 'Èxit',
            detail: 'Article eliminat correctament',
          });
        } catch (error: any) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error?.error?.message || 'Error eliminant article',
          });
        }
      },
    });
  }

  protected formatPrice(price: number): string {
    return new Intl.NumberFormat('ca-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  }

  protected getShowcaseSeverity(inShowcase: boolean): 'success' | 'secondary' {
    return inShowcase ? 'success' : 'secondary';
  }

  protected getShowcaseLabel(inShowcase: boolean): string {
    return inShowcase ? 'catalog.status.inShowcase' : 'catalog.status.notInShowcase';
  }

  protected openCreateDialog() {
    this.editingArticle.set(null);
    this.showFormDialog.set(true);
  }

  protected openEditDialog(article: Article) {
    this.editingArticle.set(article);
    this.showFormDialog.set(true);
  }

  protected async onSaveArticle(data: any) {
    try {
      if (this.editingArticle()) {
        // Editar article existent
        await this.catalogService.updateArticle(this.editingArticle()!.id, data);
        this.messageService.add({
          severity: 'success',
          summary: 'Èxit',
          detail: 'Article actualitzat correctament',
        });
      } else {
        // Crear nou article
        await this.catalogService.createArticle(data);
        this.messageService.add({
          severity: 'success',
          summary: 'Èxit',
          detail: 'Article creat correctament',
        });
      }
      this.showFormDialog.set(false);
      this.editingArticle.set(null);
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.error?.message || 'Error desant article',
      });
    }
  }

  protected getArticleName(article: Article): string {
    const parts = [article.category, article.product, article.variety].filter(Boolean);
    return parts.join(' - ');
  }

  protected onSelectionChange(articles: Article[]): void {
    this.selectedArticles.set(articles);
  }

  protected getSelectedCount(): number {
    return this.selectedArticles().length;
  }

  protected hasSelection(): boolean {
    return this.selectedArticles().length > 0;
  }

  protected async batchDelete(): Promise<void> {
    const selected = this.selectedArticles();
    if (selected.length === 0) return;

    const count = selected.length;
    const articleNames = selected.map(a => this.getArticleName(a)).join(', ');

    this.confirmationService.confirm({
      message: `¿Segur que vols eliminar ${count} article${count > 1 ? 's' : ''}? Aquesta acció no es pot desfer.`,
      header: 'Confirmar eliminació massiva',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      accept: async () => {
        try {
          const result = await this.catalogService.batchDelete(selected.map(a => a.id));
          await this.loadArticles();
          this.selectedArticles.set([]);
          
          let message = `${result.deleted} article${result.deleted !== 1 ? 's' : ''} eliminat${result.deleted !== 1 ? 's' : ''} correctament`;
          if (result.failed > 0) {
            message += `. ${result.failed} article${result.failed !== 1 ? 's' : ''} no s'ha${result.failed !== 1 ? 'n' : ''} pogut eliminar`;
          }
          
          this.messageService.add({
            severity: result.failed > 0 ? 'warn' : 'success',
            summary: 'Eliminació massiva',
            detail: message,
          });
        } catch (error: any) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error?.error?.message || 'Error eliminant articles',
          });
        }
      },
    });
  }

  protected async batchToggleShowcase(inShowcase: boolean): Promise<void> {
    const selected = this.selectedArticles();
    if (selected.length === 0) return;

    const action = inShowcase ? 'afegir a' : 'treure de';
    const actionPast = inShowcase ? 'afegits a' : 'tret de';

    try {
      const result = await this.catalogService.batchToggleShowcase(
        selected.map(a => a.id),
        inShowcase
      );
      await this.loadArticles();
      this.selectedArticles.set([]);
      
      let message = `${result.updated} article${result.updated !== 1 ? 's' : ''} ${actionPast} l'aparador correctament`;
      if (result.failed > 0) {
        message += `. ${result.failed} article${result.failed !== 1 ? 's' : ''} no s'ha${result.failed !== 1 ? 'n' : ''} pogut actualitzar`;
      }
      
      this.messageService.add({
        severity: result.failed > 0 ? 'warn' : 'success',
        summary: 'Acció massiva',
        detail: message,
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.error?.message || `Error ${action}int articles a l'aparador`,
      });
    }
  }

  protected async batchToggleSeasonal(isSeasonal: boolean): Promise<void> {
    const selected = this.selectedArticles();
    if (selected.length === 0) return;

    const action = isSeasonal ? 'marcar com' : 'desmarcar com';
    const actionPast = isSeasonal ? 'marcats com' : 'desmarcats com';

    try {
      const result = await this.catalogService.batchToggleSeasonal(
        selected.map(a => a.id),
        isSeasonal
      );
      await this.loadArticles();
      this.selectedArticles.set([]);
      
      let message = `${result.updated} article${result.updated !== 1 ? 's' : ''} ${actionPast} de temporada correctament`;
      if (result.failed > 0) {
        message += `. ${result.failed} article${result.failed !== 1 ? 's' : ''} no s'ha${result.failed !== 1 ? 'n' : ''} pogut actualitzar`;
      }
      
      this.messageService.add({
        severity: result.failed > 0 ? 'warn' : 'success',
        summary: 'Acció massiva',
        detail: message,
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.error?.message || `Error ${action} de temporada`,
      });
    }
  }

  protected async batchToggleEco(isEco: boolean): Promise<void> {
    const selected = this.selectedArticles();
    if (selected.length === 0) return;

    const action = isEco ? 'marcar com' : 'desmarcar com';
    const actionPast = isEco ? 'marcats com' : 'desmarcats com';

    try {
      const result = await this.catalogService.batchToggleEco(
        selected.map(a => a.id),
        isEco
      );
      await this.loadArticles();
      this.selectedArticles.set([]);
      
      let message = `${result.updated} article${result.updated !== 1 ? 's' : ''} ${actionPast} ecològic${result.updated !== 1 ? 's' : ''} correctament`;
      if (result.failed > 0) {
        message += `. ${result.failed} article${result.failed !== 1 ? 's' : ''} no s'ha${result.failed !== 1 ? 'n' : ''} pogut actualitzar`;
      }
      
      this.messageService.add({
        severity: result.failed > 0 ? 'warn' : 'success',
        summary: 'Acció massiva',
        detail: message,
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.error?.message || `Error ${action} ecològic`,
      });
    }
  }
}

