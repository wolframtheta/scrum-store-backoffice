import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
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
import { ProducersService } from '../../../producers/services/producers.service';
import { SuppliersService } from '../../../suppliers/services/suppliers.service';
import { PeriodsService } from '../../../periods/services/periods.service';
import { SelectModule } from 'primeng/select';

@Component({
  selector: 'app-catalog-list',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterModule,
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
    SelectModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './catalog-list.component.html',
  styleUrl: './catalog-list.component.scss',
})
export class CatalogListComponent implements OnInit {
  protected readonly catalogService = inject(CatalogService);
  protected readonly categoriesService = inject(CategoriesService);
  protected readonly producersService = inject(ProducersService);
  protected readonly suppliersService = inject(SuppliersService);
  protected readonly periodsService = inject(PeriodsService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly fb = inject(FormBuilder);
  private readonly translate = inject(TranslateService);
  private readonly router = inject(Router);

  // Form
  protected readonly filtersForm: FormGroup;

  // Local state
  protected readonly categories = signal<string[]>([]);
  protected readonly producers = signal<{ id: string; name: string }[]>([]);
  protected readonly suppliers = signal<{ id: string; name: string }[]>([]);
  protected readonly showFormDialog = signal<boolean>(false);
  protected readonly editingArticle = signal<Article | null>(null);
  protected readonly selectedArticles = signal<Article[]>([]);

  protected readonly showcaseFilterState = signal<'all' | 'in' | 'out'>('all');
  protected readonly ecoFilterState = signal<'all' | 'yes' | 'no'>('all');
  protected readonly seasonalFilterState = signal<'all' | 'yes' | 'no'>('all');

  constructor() {
    this.filtersForm = this.fb.group({
      search: [''],
      productSearch: [''],
      categoryFilter: [[]],
      producerFilter: [[]],
      supplierFilter: [[]],
      periodFilter: [null]
    });
  }

  async ngOnInit() {
    await this.loadArticles();
    await this.loadCategories();
    await this.loadProducers();
    await this.loadSuppliers();
    await this.loadPeriods();
  }

  private async loadCategories() {
    const categories = await this.categoriesService.getUniqueCategories();
    this.categories.set(categories);
  }

  private async loadProducers() {
    try {
      await this.producersService.loadProducers(true);
      const producers = this.producersService.producers().map(p => ({
        id: p.id,
        name: p.name
      }));
      this.producers.set(producers);
    } catch (error) {
      console.error('Error loading producers:', error);
    }
  }

  private async loadSuppliers() {
    try {
      await this.suppliersService.loadSuppliers(true);
      const suppliers = this.suppliersService.suppliers().map(s => ({
        id: s.id,
        name: s.name
      }));
      this.suppliers.set(suppliers);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  }

  private async loadPeriods() {
    try {
      await this.periodsService.loadPeriods();
    } catch (error) {
      console.error('Error loading periods:', error);
    }
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

  protected async onProductSearch() {
    const productSearchValue = this.filtersForm.get('productSearch')?.value || '';
    this.catalogService.setProductSearchTerm(productSearchValue);
    await this.loadArticles();
  }

  protected async toggleShowcaseFilter() {
    const currentState = this.showcaseFilterState();
    let nextState: 'all' | 'in' | 'out';
    let filterValue: boolean | null;

    // Rotar entre els tres estats: all -> in -> out -> all
    if (currentState === 'all') {
      nextState = 'in';
      filterValue = true;
    } else if (currentState === 'in') {
      nextState = 'out';
      filterValue = false;
    } else {
      nextState = 'all';
      filterValue = null;
    }

    this.showcaseFilterState.set(nextState);
    this.catalogService.setShowcaseFilter(filterValue);
    await this.loadArticles();
  }

  protected getShowcaseFilterLabel(): string {
    const state = this.showcaseFilterState();
    if (state === 'in') {
      return this.translate.instant('catalog.filters.inShowcase');
    } else if (state === 'out') {
      return this.translate.instant('catalog.filters.notInShowcase');
    } else {
      return this.translate.instant('catalog.filters.showcase');
    }
  }

  protected getShowcaseFilterIcon(): string {
    const state = this.showcaseFilterState();
    if (state === 'in') {
      return 'pi pi-eye';
    } else if (state === 'out') {
      return 'pi pi-eye-slash';
    } else {
      return 'pi pi-filter';
    }
  }

  protected getShowcaseFilterSeverity(): 'success' | 'warn' | 'secondary' {
    const state = this.showcaseFilterState();
    if (state === 'in') {
      return 'success';
    } else if (state === 'out') {
      return 'warn';
    } else {
      return 'secondary';
    }
  }

  protected async toggleEcoFilter() {
    const currentState = this.ecoFilterState();
    let nextState: 'all' | 'yes' | 'no';
    let filterValue: boolean | null;

    // Rotar entre els tres estats: all -> yes -> no -> all
    if (currentState === 'all') {
      nextState = 'yes';
      filterValue = true;
    } else if (currentState === 'yes') {
      nextState = 'no';
      filterValue = false;
    } else {
      nextState = 'all';
      filterValue = null;
    }

    this.ecoFilterState.set(nextState);
    this.catalogService.setEcoFilter(filterValue);
    await this.loadArticles();
  }

  protected getEcoFilterLabel(): string {
    const state = this.ecoFilterState();
    if (state === 'yes') {
      return this.translate.instant('catalog.filters.ecoYes');
    } else if (state === 'no') {
      return this.translate.instant('catalog.filters.ecoNo');
    } else {
      return this.translate.instant('catalog.filters.eco');
    }
  }

  protected getEcoFilterIcon(): string {
    const state = this.ecoFilterState();
    if (state === 'yes') {
      return 'pi pi-check-circle';
    } else if (state === 'no') {
      return 'pi pi-times-circle';
    } else {
      return 'pi pi-filter';
    }
  }

  protected getEcoFilterSeverity(): 'success' | 'danger' | 'secondary' {
    const state = this.ecoFilterState();
    if (state === 'yes') {
      return 'success';
    } else if (state === 'no') {
      return 'danger';
    } else {
      return 'secondary';
    }
  }

  protected async toggleSeasonalFilter() {
    const currentState = this.seasonalFilterState();
    let nextState: 'all' | 'yes' | 'no';
    let filterValue: boolean | null;

    // Rotar entre els tres estats: all -> yes -> no -> all
    if (currentState === 'all') {
      nextState = 'yes';
      filterValue = true;
    } else if (currentState === 'yes') {
      nextState = 'no';
      filterValue = false;
    } else {
      nextState = 'all';
      filterValue = null;
    }

    this.seasonalFilterState.set(nextState);
    this.catalogService.setSeasonalFilter(filterValue);
    await this.loadArticles();
  }

  protected getSeasonalFilterLabel(): string {
    const state = this.seasonalFilterState();
    if (state === 'yes') {
      return this.translate.instant('catalog.filters.seasonalYes');
    } else if (state === 'no') {
      return this.translate.instant('catalog.filters.seasonalNo');
    } else {
      return this.translate.instant('catalog.filters.seasonal');
    }
  }

  protected getSeasonalFilterIcon(): string {
    const state = this.seasonalFilterState();
    if (state === 'yes') {
      return 'pi pi-leaf';
    } else if (state === 'no') {
      return 'pi pi-times';
    } else {
      return 'pi pi-filter';
    }
  }

  protected getSeasonalFilterSeverity(): 'success' | 'danger' | 'secondary' {
    const state = this.seasonalFilterState();
    if (state === 'yes') {
      return 'success';
    } else if (state === 'no') {
      return 'danger';
    } else {
      return 'secondary';
    }
  }

  protected async onCategoryFilterChange() {
    const selectedCategories = this.filtersForm.get('categoryFilter')?.value || [];
    this.catalogService.setCategoryFilter(selectedCategories);
    await this.loadArticles();
  }

  protected async onProducerFilterChange() {
    const selectedProducers = this.filtersForm.get('producerFilter')?.value || [];
    this.catalogService.setProducerFilter(selectedProducers);
    await this.loadArticles();
  }

  protected async onSupplierFilterChange() {
    const selectedSuppliers = this.filtersForm.get('supplierFilter')?.value || [];
    this.catalogService.setSupplierFilter(selectedSuppliers);
    await this.loadArticles();
  }

  protected async onPeriodFilterChange() {
    const selectedPeriod = this.filtersForm.get('periodFilter')?.value;
    this.catalogService.setPeriodFilter(selectedPeriod);
    await this.loadArticles();
  }

  protected async clearFilters() {
    this.filtersForm.patchValue({
      search: '',
      productSearch: '',
      categoryFilter: [],
      producerFilter: [],
      supplierFilter: [],
      periodFilter: null
    });
    this.showcaseFilterState.set('all');
    this.ecoFilterState.set('all');
    this.seasonalFilterState.set('all');
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

  protected goToDetail(article: Article): void {
    this.router.navigate(['/catalog', article.id]);
  }
}

