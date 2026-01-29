import { Component, inject, signal, effect, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray, FormControl, FormsModule, AbstractControl } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { ToastModule } from 'primeng/toast';
import { AccordionModule } from 'primeng/accordion';
import { MessageService } from 'primeng/api';
import { Period, PeriodRecurrence, CreatePeriodArticleDto } from '../../../../core/models/period.model';
import { Article } from '../../../../core/models/article.model';
import { CatalogService } from '../../../catalog/services/catalog.service';
import { SuppliersService } from '../../../suppliers/services/suppliers.service';
import { PeriodsService } from '../../services/periods.service';
import { ConsumerGroupService } from '../../../../core/services/consumer-group.service';
import { removeAccents } from '../../../../core/utils/string.utils';

@Component({
  selector: 'app-period-form-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    InputNumberModule,
    AutoCompleteModule,
    TableModule,
    TooltipModule,
    DatePickerModule,
    ToastModule,
    AccordionModule,
  ],
  providers: [MessageService],
  templateUrl: './period-form-page.component.html',
  styleUrl: './period-form-page.component.scss',
})
export class PeriodFormPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly catalogService = inject(CatalogService);
  private readonly suppliersService = inject(SuppliersService);
  private readonly periodsService = inject(PeriodsService);
  private readonly groupService = inject(ConsumerGroupService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly messageService = inject(MessageService);
  private readonly translateService = inject(TranslateService);

  // State
  protected readonly form: FormGroup;
  protected readonly isEditMode = signal<boolean>(false);
  protected readonly periodId = signal<string | null>(null);
  protected readonly supplierId = signal<string | null>(null);
  private readonly originalPeriodSupplierId = signal<string | null>(null);
  protected readonly articles = signal<Article[]>([]);
  protected readonly filteredArticles = signal<Article[]>([]);
  protected readonly selectedArticle = signal<Article | null>(null);
  protected readonly articleSearchTerm = signal<string>('');
  protected readonly suppliers = this.suppliersService.suppliers;
  protected readonly isLoading = signal<boolean>(false);

  protected readonly recurrenceOptions = [
    { label: 'Diari', value: PeriodRecurrence.DAILY },
    { label: 'Setmanal', value: PeriodRecurrence.WEEKLY },
    { label: 'Quinzanal', value: PeriodRecurrence.BIWEEKLY },
    { label: 'Mensual', value: PeriodRecurrence.MONTHLY },
    { label: 'Trimestral', value: PeriodRecurrence.QUARTERLY },
    { label: 'Anual', value: PeriodRecurrence.YEARLY },
    { label: 'Personalitzat', value: PeriodRecurrence.CUSTOM },
  ];

  get periodArticles(): FormArray {
    return this.form.get('articles') as FormArray;
  }

  protected get articlesHeader(): string {
    const count = this.periodArticles.length;
    return `${this.translateService.instant('periods.form.articles')} (${count})`;
  }

  protected readonly dateRange = signal<Date[] | null>(null);
  protected readonly accordionValue = signal<string[]>([]);

  constructor() {
    this.form = this.fb.group({
      supplierId: ['', Validators.required],
      name: ['', [Validators.required, Validators.maxLength(255)]],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      deliveryDate: [null, [Validators.required, this.deliveryDateAfterEndValidator.bind(this)]],
      recurrence: [PeriodRecurrence.WEEKLY, Validators.required],
      articles: this.fb.array([]),
    });

    // Actualitzar validació de deliveryDate quan canvia endDate
    this.form.get('endDate')?.valueChanges.subscribe(() => {
      this.form.get('deliveryDate')?.updateValueAndValidity();
      this.cdr.markForCheck();
    });

    // Recarregar articles quan canvia el proveïdor
    this.form.get('supplierId')?.valueChanges.subscribe(async (supplierId) => {
      if (supplierId) {
        this.supplierId.set(supplierId);
        // Recarregar articles amb el nou filtre de proveïdor
        await this.loadArticles();
      }
    });
  }

  async ngOnInit(): Promise<void> {
    const periodIdParam = this.route.snapshot.paramMap.get('id');
    const supplierIdParam = this.route.snapshot.queryParamMap.get('supplierId');
    const isDuplicate = this.route.snapshot.queryParamMap.get('duplicate') === 'true';

    if (periodIdParam) {
      this.periodId.set(periodIdParam);
      this.isEditMode.set(true);
      await this.loadPeriod(periodIdParam);
    } else if (isDuplicate) {
      // Duplicar període: carregar dades des de query params
      await this.loadDuplicateData();
    } else if (supplierIdParam) {
      this.supplierId.set(supplierIdParam);
      this.form.patchValue({ supplierId: supplierIdParam });
    }

    await this.loadArticles();
    await this.loadSuppliers();
  }

  private async loadDuplicateData(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const supplierIdParam = params.get('supplierId');
    const nameParam = params.get('name');
    const startDateParam = params.get('startDate');
    const endDateParam = params.get('endDate');
    const deliveryDateParam = params.get('deliveryDate');
    const recurrenceParam = params.get('recurrence');
    const articlesParam = params.get('articles');

    if (supplierIdParam) {
      this.supplierId.set(supplierIdParam);
    }

    // Calcular noves dates (incrementar per un període similar)
    let startDate: Date | null = null;
    let endDate: Date | null = null;
    let deliveryDate: Date | null = null;

    if (startDateParam && endDateParam && deliveryDateParam) {
      const oldStart = new Date(startDateParam);
      const oldEnd = new Date(endDateParam);
      const oldDelivery = new Date(deliveryDateParam);

      // Calcular la durada del període original
      const periodDuration = oldEnd.getTime() - oldStart.getTime();
      const deliveryOffset = oldDelivery.getTime() - oldEnd.getTime();

      // Noves dates: començar des d'avui o des de la data de fi original + 1 dia
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const oldEndPlusOne = new Date(oldEnd);
      oldEndPlusOne.setDate(oldEndPlusOne.getDate() + 1);
      oldEndPlusOne.setHours(0, 0, 0, 0);

      // Utilitzar la data més recent
      startDate = oldEndPlusOne > today ? oldEndPlusOne : today;
      endDate = new Date(startDate.getTime() + periodDuration);
      deliveryDate = new Date(endDate.getTime() + deliveryOffset);
    }

    this.form.patchValue({
      supplierId: supplierIdParam || '',
      name: nameParam ? `${nameParam} (Còpia)` : '',
      startDate,
      endDate,
      deliveryDate,
      recurrence: recurrenceParam || PeriodRecurrence.WEEKLY,
    });

    if (startDate && endDate) {
      this.dateRange.set([startDate, endDate]);
    }

    // Carregar articles si n'hi ha
    if (articlesParam) {
      try {
        const articles = JSON.parse(articlesParam);
        this.periodArticles.clear();
        articles.forEach((article: any) => {
          this.addPeriodArticle(article.articleId, article.pricePerUnit);
        });
      } catch (error) {
        console.error('Error parsing articles:', error);
      }
    }
  }

  private async loadPeriod(id: string): Promise<void> {
    this.isLoading.set(true);
    try {
      const period = await this.periodsService.getPeriod(id);
      const startDate = typeof period.startDate === 'string' ? new Date(period.startDate) : period.startDate;
      const endDate = typeof period.endDate === 'string' ? new Date(period.endDate) : period.endDate;
      const deliveryDate = typeof period.deliveryDate === 'string' ? new Date(period.deliveryDate) : period.deliveryDate;

      this.supplierId.set(period.supplierId);
      this.originalPeriodSupplierId.set(period.supplierId);
      this.form.patchValue({
        supplierId: period.supplierId,
        name: period.name,
        startDate,
        endDate,
        deliveryDate,
        recurrence: period.recurrence,
      });
      this.dateRange.set([startDate, endDate]);

      // Carregar articles del període
      if (period.periodArticles && period.periodArticles.length > 0) {
        this.periodArticles.clear();
        period.periodArticles.forEach(pa => {
          this.addPeriodArticle(pa.articleId, pa.pricePerUnit);
        });
      }

      // Actualitzar validació del formulari després de carregar les dades
      // Actualitzar validació de deliveryDate després de carregar endDate
      this.form.get('deliveryDate')?.updateValueAndValidity();
      this.form.updateValueAndValidity();
      this.cdr.markForCheck();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'ha pogut carregar el període'
      });
      this.router.navigate(['/periods']);
    } finally {
      this.isLoading.set(false);
    }
  }

  protected onDateRangeChange(range: Date[] | null): void {
    if (range && range.length === 2) {
      this.form.patchValue({
        startDate: range[0],
        endDate: range[1],
        deliveryDate: null, // Esborrar la data d'entrega quan canvia el rang
      });
    } else if (!range) {
      this.form.patchValue({
        startDate: null,
        endDate: null,
        deliveryDate: null, // Esborrar la data d'entrega quan s'esborra el rang
      });
    }
  }

  protected getMinDeliveryDate(): Date | null {
    const endDate = this.form.get('endDate')?.value;
    if (!endDate) return null;
    
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    const minDate = new Date(end);
    minDate.setDate(minDate.getDate() + 1);
    return minDate;
  }

  private deliveryDateAfterEndValidator(control: FormControl): { [key: string]: any } | null {
    const endDate = this.form?.get('endDate')?.value;
    const deliveryDate = control.value;

    if (!endDate || !deliveryDate) {
      return null;
    }

    const end = new Date(endDate);
    const delivery = new Date(deliveryDate);
    end.setHours(0, 0, 0, 0);
    delivery.setHours(0, 0, 0, 0);

    if (delivery <= end) {
      return { deliveryDateAfterEnd: true };
    }

    return null;
  }

  private async loadSuppliers(): Promise<void> {
    try {
      await this.suppliersService.loadSuppliers(true);
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  }

  private async loadArticles(): Promise<void> {
    try {
      // Netejar filtres previs
      this.catalogService.clearFilters();

      const currentSupplierId = this.supplierId() || this.form.get('supplierId')?.value;
      
      if (currentSupplierId) {
        // Si estem editant un període i el proveïdor no ha canviat, filtrar per període i proveïdor
        if (this.isEditMode() && this.periodId() && currentSupplierId === this.originalPeriodSupplierId()) {
          // Filtrar per període i proveïdor per mostrar només articles d'aquest període i proveïdor
          this.catalogService.setPeriodFilter(this.periodId()!);
          this.catalogService.setSupplierFilter([currentSupplierId]);
        } else {
          // Si estem creant un període nou o el proveïdor ha canviat, filtrar només per proveïdor
          this.catalogService.setSupplierFilter([currentSupplierId]);
        }
      }

      await this.catalogService.loadArticles();
      const allArticles = this.catalogService.articles();
      this.articles.set(allArticles);
      this.filteredArticles.set(allArticles);
    } catch (error) {
      console.error('Error loading articles:', error);
    }
  }

  protected filterArticles(event: any): void {
    const query = removeAccents(event.query);
    const allArticles = this.articles();
    const filtered = allArticles.filter(article => {
      const searchText = removeAccents(`${article.product} ${article.variety || ''} ${article.category}`);
      return searchText.includes(query);
    });
    this.filteredArticles.set(filtered);
    this.articleSearchTerm.set(query);
  }

  protected onArticleSelect(event: any): void {
    const article = event.value || event;
    this.selectedArticle.set(article);
  }

  protected addArticleToPeriod(): void {
    const article = this.selectedArticle();
    if (!article) return;

    const existing = this.periodArticles.controls.find(control => 
      control.get('articleId')?.value === article.id
    );

    if (existing) {
      return;
    }

    this.addPeriodArticle(article.id, article.pricePerUnit || 0);
    this.selectedArticle.set(null);
    this.articleSearchTerm.set('');
    this.cdr.markForCheck();
  }

  private addPeriodArticle(articleId: string, pricePerUnit: number): void {
    const articleGroup = this.fb.group({
      articleId: [articleId, Validators.required],
      pricePerUnit: [pricePerUnit, [Validators.required, Validators.min(0)]],
    });
    this.periodArticles.push(articleGroup);
  }

  protected removeArticle(index: number): void {
    this.periodArticles.removeAt(index);
    this.cdr.markForCheck();
  }

  protected getArticleName(articleId: string): string {
    const article = this.articles().find(a => a.id === articleId);
    if (!article) return '-';
    return `${article.product}${article.variety ? ` - ${article.variety}` : ''}`;
  }

  protected getArticleUnit(articleId: string): string {
    const article = this.articles().find(a => a.id === articleId);
    return article?.unitMeasure || '-';
  }

  protected onCancel(): void {
    this.router.navigate(['/periods']);
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.valid) {
      this.isLoading.set(true);
      try {
        const formValue = this.form.value;
        const formatDate = (date: Date | string | null): string => {
          if (!date) return '';
          const d = typeof date === 'string' ? new Date(date) : date;
          const year = d.getFullYear();
          const month = String(d.getMonth() + 1).padStart(2, '0');
          const day = String(d.getDate()).padStart(2, '0');
          return `${year}-${month}-${day}`;
        };

        const supplierId = formValue.supplierId;
        if (!supplierId) {
          this.form.get('supplierId')?.markAsTouched();
          return;
        }

        const periodData = {
          name: formValue.name,
          supplierId: supplierId,
          startDate: formatDate(formValue.startDate),
          endDate: formatDate(formValue.endDate),
          deliveryDate: formatDate(formValue.deliveryDate),
          recurrence: formValue.recurrence,
          articles: formValue.articles.map((a: any) => ({
            articleId: a.articleId,
            pricePerUnit: a.pricePerUnit,
          })) as CreatePeriodArticleDto[],
        };

        if (this.isEditMode() && this.periodId()) {
          await this.periodsService.updatePeriod(this.periodId()!, supplierId, periodData);
          this.messageService.add({
            severity: 'success',
            summary: 'Èxit',
            detail: 'Període actualitzat correctament'
          });
        } else {
          await this.periodsService.createPeriod(periodData);
          this.messageService.add({
            severity: 'success',
            summary: 'Èxit',
            detail: 'Període creat correctament'
          });
        }

        this.router.navigate(['/periods']);
      } catch (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'No s\'ha pogut desar el període'
        });
      } finally {
        this.isLoading.set(false);
      }
    } else {
      Object.keys(this.form.controls).forEach(key => {
        this.form.get(key)?.markAsTouched();
      });
      this.periodArticles.controls.forEach(control => {
        if (control instanceof FormGroup) {
          Object.keys(control.controls).forEach(key => {
            control.get(key)?.markAsTouched();
          });
        }
      });
    }
  }
}

