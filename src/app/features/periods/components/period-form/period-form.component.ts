import { Component, input, output, signal, effect, inject, ChangeDetectionStrategy, ChangeDetectorRef, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray, FormControl, FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { Period, PeriodRecurrence, CreatePeriodArticleDto } from '../../../../core/models/period.model';
import { Article } from '../../../../core/models/article.model';
import { CatalogService } from '../../../catalog/services/catalog.service';
import { SuppliersService } from '../../../suppliers/services/suppliers.service';
import { ConsumerGroupService } from '../../../../core/services/consumer-group.service';

@Component({
  selector: 'app-period-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    TranslateModule,
    DialogModule,
    ButtonModule,
    InputTextModule,
    SelectModule,
    InputNumberModule,
    AutoCompleteModule,
    TableModule,
    TooltipModule,
    DatePickerModule,
  ],
  templateUrl: './period-form.component.html',
  styleUrl: './period-form.component.scss',
})
export class PeriodFormComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly catalogService = inject(CatalogService);
  private readonly suppliersService = inject(SuppliersService);
  private readonly groupService = inject(ConsumerGroupService);
  private readonly cdr = inject(ChangeDetectorRef);

  // Inputs/Outputs
  readonly visible = input.required<boolean>();
  readonly period = input<Period | null>(null);
  readonly supplierId = input<string>('');
  readonly visibleChange = output<boolean>();
  readonly save = output<any>();

  // State
  protected readonly form: FormGroup;
  protected readonly isEditMode = signal<boolean>(false);
  protected readonly articles = signal<Article[]>([]);
  protected readonly filteredArticles = signal<Article[]>([]);
  protected readonly selectedArticle = signal<Article | null>(null);
  protected readonly articleSearchTerm = signal<string>('');
  protected readonly suppliers = this.suppliersService.suppliers;

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

  protected readonly dateRange = signal<Date[] | null>(null);

  constructor() {
    this.form = this.fb.group({
      supplierId: ['', Validators.required],
      name: ['', [Validators.required, Validators.maxLength(255)]],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      deliveryDate: [null, [Validators.required, this.deliveryDateAfterStartValidator.bind(this)]],
      recurrence: [PeriodRecurrence.WEEKLY, Validators.required],
      articles: this.fb.array([]),
    });

    // Actualitzar validació de deliveryDate quan canvia startDate
    this.form.get('startDate')?.valueChanges.subscribe(() => {
      this.form.get('deliveryDate')?.updateValueAndValidity();
      this.cdr.markForCheck();
    });

    // Effect per carregar dades del període quan canvia
    effect(() => {
      const period = this.period();
      const supplierId = this.supplierId();
      
      if (period) {
        this.isEditMode.set(true);
        const startDate = typeof period.startDate === 'string' ? new Date(period.startDate) : period.startDate;
        const endDate = typeof period.endDate === 'string' ? new Date(period.endDate) : period.endDate;
        const deliveryDate = typeof period.deliveryDate === 'string' ? new Date(period.deliveryDate) : period.deliveryDate;

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
      } else if (supplierId) {
        this.isEditMode.set(false);
        this.form.patchValue({
          supplierId: supplierId,
        });
        this.periodArticles.clear();
      } else {
        this.isEditMode.set(false);
        this.form.reset({
          recurrence: PeriodRecurrence.WEEKLY,
        });
        this.periodArticles.clear();
      }
    });
  }

  async ngOnInit(): Promise<void> {
    await this.loadArticles();
    await this.loadSuppliers();
  }

  protected onDateRangeChange(range: Date[] | null): void {
    if (range && range.length === 2) {
      this.form.patchValue({
        startDate: range[0],
        endDate: range[1],
      });
    } else if (!range) {
      this.form.patchValue({
        startDate: null,
        endDate: null,
      });
    }
  }

  protected getMinDeliveryDate(): Date | null {
    const startDate = this.form.get('startDate')?.value;
    if (!startDate) return null;
    
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    // Afegir un dia per assegurar que sigui posterior
    const minDate = new Date(start);
    minDate.setDate(minDate.getDate() + 1);
    return minDate;
  }

  private deliveryDateAfterStartValidator(control: FormControl): { [key: string]: any } | null {
    const startDate = this.form?.get('startDate')?.value;
    const deliveryDate = control.value;

    if (!startDate || !deliveryDate) {
      return null;
    }

    const start = new Date(startDate);
    const delivery = new Date(deliveryDate);
    start.setHours(0, 0, 0, 0);
    delivery.setHours(0, 0, 0, 0);

    if (delivery <= start) {
      return { deliveryDateAfterStart: true };
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
      await this.catalogService.loadArticles();
      const allArticles = this.catalogService.articles();
      this.articles.set(allArticles);
      this.filteredArticles.set(allArticles);
    } catch (error) {
      console.error('Error loading articles:', error);
    }
  }

  protected filterArticles(event: any): void {
    const query = event.query.toLowerCase();
    const allArticles = this.articles();
    const filtered = allArticles.filter(article => {
      const searchText = `${article.product} ${article.variety || ''} ${article.category}`.toLowerCase();
      return searchText.includes(query);
    });
    this.filteredArticles.set(filtered);
    this.articleSearchTerm.set(query);
  }

  protected onArticleSelect(event: any): void {
    // AutoCompleteSelectEvent té una propietat 'value' amb l'article seleccionat
    const article = event.value || event;
    this.selectedArticle.set(article);
  }

  protected addArticleToPeriod(): void {
    const article = this.selectedArticle();
    if (!article) return;

    // Verificar que no estigui ja afegit
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

  protected onHide(): void {
    this.visibleChange.emit(false);
    this.form.reset({ recurrence: PeriodRecurrence.WEEKLY });
    this.periodArticles.clear();
    this.selectedArticle.set(null);
    this.articleSearchTerm.set('');
  }

  protected onSubmit(): void {
    if (this.form.valid) {
      const formValue = this.form.value;
      const formatDate = (date: Date | string | null): string => {
        if (!date) return '';
        const d = typeof date === 'string' ? new Date(date) : date;
        // Assegurar que la data està en format correcte
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const supplierId = formValue.supplierId || this.supplierId();
      if (!supplierId) {
        // Marcar el camp supplierId com a touched per mostrar l'error
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

      this.save.emit(periodData);
    } else {
      // Marcar tots els camps com a touched per mostrar errors
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

