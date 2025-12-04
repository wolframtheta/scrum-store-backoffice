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

    this.confirmationService.confirm({
      message: `¿Segur que vols ${action} "${article.name}" ${article.inShowcase ? 'de' : 'a'} l'aparador?`,
      header: 'Confirmar',
      icon: 'pi pi-exclamation-triangle',
      accept: async () => {
        try {
          await this.catalogService.toggleShowcase(article.id, !article.inShowcase);
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
      },
    });
  }

  protected deleteArticle(article: Article) {
    this.confirmationService.confirm({
      message: `¿Segur que vols eliminar "${article.name}"? Aquesta acció no es pot desfer.`,
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

}

