import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ChartModule } from 'primeng/chart';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { Select } from 'primeng/select';
import { CheckboxModule } from 'primeng/checkbox';

import { CatalogService } from '../../services/catalog.service';
import { PeriodsService } from '../../../periods/services/periods.service';
import { Article, PriceHistory, CustomizationOption } from '../../../../core/models/article.model';
import { Period, PeriodRecurrence } from '../../../../core/models/period.model';

@Component({
  selector: 'app-article-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    ButtonModule,
    CardModule,
    TagModule,
    DividerModule,
    ToastModule,
    ChartModule,
    DialogModule,
    InputTextModule,
    Select,
    CheckboxModule,
  ],
  providers: [MessageService],
  templateUrl: './article-detail.component.html',
  styleUrl: './article-detail.component.scss',
})
export class ArticleDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly catalogService = inject(CatalogService);
  private readonly periodsService = inject(PeriodsService);
  private readonly messageService = inject(MessageService);
  private readonly translateService = inject(TranslateService);
  private readonly fb = inject(FormBuilder);

  protected readonly article = signal<Article | null>(null);
  protected readonly priceHistory = signal<PriceHistory[]>([]);
  protected readonly periods = signal<Period[]>([]);
  protected readonly isLoading = signal<boolean>(true);
  protected readonly chartData = signal<any>(null);
  protected readonly chartOptions = signal<any>(null);
  protected readonly showOptionsDialog = signal<boolean>(false);
  protected readonly optionsForm!: FormGroup;

  protected readonly optionTypes = [
    { label: 'Boolean (Sí/No)', value: 'boolean' },
    { label: 'Numèric', value: 'numeric' },
    { label: 'Text', value: 'string' },
    { label: 'Selecció única', value: 'select' },
    { label: 'Selecció múltiple', value: 'multiselect' },
  ];

  constructor() {
    this.optionsForm = this.fb.group({
      options: this.fb.array([])
    });
  }

  async ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      await this.loadArticle(id);
      await Promise.all([
        this.loadPriceHistory(id),
        this.loadPeriods(id)
      ]);
      // Actualitzar gràfica després de carregar totes les dades
      this.updateChart();
    }
  }

  private async loadArticle(id: string) {
    this.isLoading.set(true);
    try {
      const article = await this.catalogService.getArticleById(id);
      this.article.set(article);
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: error?.error?.message || 'Error carregant article',
      });
      this.router.navigate(['/catalog']);
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadPriceHistory(id: string) {
    try {
      const history = await this.catalogService.getPriceHistory(id);
      this.priceHistory.set(history);
    } catch (error: any) {
      console.error('Error loading price history:', error);
    }
  }

  private async loadPeriods(articleId: string) {
    try {
      await this.periodsService.loadPeriods();
      const allPeriods = this.periodsService.periods();
      // Filtrar períodes que contenen aquest article
      const periodsWithArticle = allPeriods.filter(period => 
        period.periodArticles?.some(pa => pa.articleId === articleId)
      );
      this.periods.set(periodsWithArticle);
    } catch (error: any) {
      console.error('Error loading periods:', error);
    }
  }

  private updateChart() {
    const history = this.priceHistory();
    const periods = this.periods();
    const articleId = this.article()?.id;

    if (!articleId || periods.length === 0) {
      this.chartData.set(null);
      return;
    }

    // Filtrar períodes del darrer any
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    oneYearAgo.setHours(0, 0, 0, 0);

    const lastYearPeriods = periods.filter(p => {
      const startDate = typeof p.startDate === 'string' ? new Date(p.startDate) : p.startDate;
      startDate.setHours(0, 0, 0, 0);
      return startDate >= oneYearAgo;
    });

    if (lastYearPeriods.length === 0) {
      this.chartData.set(null);
      return;
    }

    // Ordenar períodes per data d'inici (més antic a més recent)
    const sortedPeriods = [...lastYearPeriods].sort((a, b) => {
      const startDateA = typeof a.startDate === 'string' ? new Date(a.startDate) : a.startDate;
      const startDateB = typeof b.startDate === 'string' ? new Date(b.startDate) : b.startDate;
      return startDateA.getTime() - startDateB.getTime();
    });

    // Agrupar per recurrència i mantenir info del període
    const groupedByRecurrence = new Map<PeriodRecurrence, { periodName: string; periodId: string; price: number; startDate: Date }[]>();
    
    sortedPeriods.forEach(period => {
      const startDate = typeof period.startDate === 'string' ? new Date(period.startDate) : period.startDate;
      startDate.setHours(0, 0, 0, 0);
      
      // Trobar el preu d'aquest article en aquest període
      const periodArticle = period.periodArticles?.find(pa => pa.articleId === articleId);
      if (!periodArticle) return;

      const recurrence = period.recurrence || PeriodRecurrence.CUSTOM;
      
      if (!groupedByRecurrence.has(recurrence)) {
        groupedByRecurrence.set(recurrence, []);
      }
      groupedByRecurrence.get(recurrence)!.push({ 
        periodName: period.name,
        periodId: period.id,
        price: Number(periodArticle.pricePerUnit),
        startDate
      });
    });

    // Crear labels úniques amb noms de períodes (ordenats per data d'inici)
    const labels = sortedPeriods
      .filter(p => p.periodArticles?.some(pa => pa.articleId === articleId))
      .map(p => p.name);

    // Colors per cada recurrència
    const recurrenceColors: Record<PeriodRecurrence, { border: string; background: string }> = {
      [PeriodRecurrence.DAILY]: { border: 'rgb(255, 99, 132)', background: 'rgba(255, 99, 132, 0.2)' },
      [PeriodRecurrence.WEEKLY]: { border: 'rgb(54, 162, 235)', background: 'rgba(54, 162, 235, 0.2)' },
      [PeriodRecurrence.BIWEEKLY]: { border: 'rgb(255, 206, 86)', background: 'rgba(255, 206, 86, 0.2)' },
      [PeriodRecurrence.MONTHLY]: { border: 'rgb(75, 192, 192)', background: 'rgba(75, 192, 192, 0.2)' },
      [PeriodRecurrence.QUARTERLY]: { border: 'rgb(153, 102, 255)', background: 'rgba(153, 102, 255, 0.2)' },
      [PeriodRecurrence.YEARLY]: { border: 'rgb(255, 159, 64)', background: 'rgba(255, 159, 64, 0.2)' },
      [PeriodRecurrence.CUSTOM]: { border: 'rgb(201, 203, 207)', background: 'rgba(201, 203, 207, 0.2)' },
    };

    const recurrenceLabels: Record<PeriodRecurrence, string> = {
      [PeriodRecurrence.DAILY]: 'Diari',
      [PeriodRecurrence.WEEKLY]: 'Setmanal',
      [PeriodRecurrence.BIWEEKLY]: 'Quinzanal',
      [PeriodRecurrence.MONTHLY]: 'Mensual',
      [PeriodRecurrence.QUARTERLY]: 'Trimestral',
      [PeriodRecurrence.YEARLY]: 'Anual',
      [PeriodRecurrence.CUSTOM]: 'Personalitzat',
    };

    // Crear datasets per cada recurrència
    const datasets = Array.from(groupedByRecurrence.entries()).map(([recurrence, data]) => {
      // Crear array de preus per cada label (null si no hi ha dada)
      const prices = labels.map(periodName => {
        const dataPoint = data.find(d => d.periodName === periodName);
        return dataPoint ? dataPoint.price : null;
      });

      const colors = recurrenceColors[recurrence] || recurrenceColors[PeriodRecurrence.CUSTOM];

      return {
        label: recurrenceLabels[recurrence],
        data: prices,
        fill: false,
        borderColor: colors.border,
        backgroundColor: colors.background,
        tension: 0.1,
        spanGaps: true,
      };
    });

    this.chartData.set({
      labels,
      datasets,
    });

    this.chartOptions.set({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          callbacks: {
            title: (tooltipItems: any) => {
              // Mostrar el nom del període com a títol
              return tooltipItems[0]?.label || '';
            },
            label: (context: any) => {
              if (context.parsed.y === null) return '';
              return `${context.dataset.label}: ${context.parsed.y.toFixed(2)} €`;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          ticks: {
            callback: (value: any) => {
              return `${value.toFixed(2)} €`;
            },
          },
        },
      },
    });
  }

  protected goBack() {
    this.router.navigate(['/catalog']);
  }

  protected formatPrice(price: number): string {
    return new Intl.NumberFormat('ca-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  }

  protected formatDate(date: Date | string): string {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ca-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  // Customization Options Management
  get optionsArray(): FormArray {
    return this.optionsForm.get('options') as FormArray;
  }

  protected openOptionsDialog() {
    this.initOptionsForm();
    this.showOptionsDialog.set(true);
  }

  protected closeOptionsDialog() {
    this.showOptionsDialog.set(false);
  }

  private initOptionsForm() {
    const article = this.article();
    this.optionsArray.clear();
    
    if (article?.customizationOptions) {
      article.customizationOptions.forEach(opt => {
        this.optionsArray.push(this.createOptionGroup(opt));
      });
    }
  }

  private createOptionGroup(option?: CustomizationOption): FormGroup {
    const group = this.fb.group({
      id: [option?.id || this.generateId()],
      title: [option?.title || '', Validators.required],
      type: [option?.type || 'string', Validators.required],
      required: [option?.required || false],
      price: [option?.price || 0, [Validators.min(0)]],
      values: this.fb.array(option?.values?.map(v => this.createValueGroup(v)) || [])
    });
    return group;
  }

  private createValueGroup(value?: { id: string; label: string; price?: number }): FormGroup {
    return this.fb.group({
      id: [value?.id || this.generateId()],
      label: [value?.label || '', Validators.required],
      price: [value?.price || 0, [Validators.min(0)]]
    });
  }

  private generateId(): string {
    return `opt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  protected addOption() {
    this.optionsArray.push(this.createOptionGroup());
  }

  protected removeOption(index: number) {
    this.optionsArray.removeAt(index);
  }

  protected getValuesArray(optionIndex: number): FormArray {
    return this.optionsArray.at(optionIndex).get('values') as FormArray;
  }

  protected addValue(optionIndex: number) {
    this.getValuesArray(optionIndex).push(this.createValueGroup());
  }

  protected removeValue(optionIndex: number, valueIndex: number) {
    this.getValuesArray(optionIndex).removeAt(valueIndex);
  }

  protected needsValues(type: string): boolean {
    return type === 'select' || type === 'multiselect';
  }

  protected async saveOptions() {
    if (this.optionsForm.invalid) {
      this.messageService.add({
        severity: 'warn',
        summary: this.translateService.instant('common.warning'),
        detail: this.translateService.instant('catalog.detail.fillRequiredFields')
      });
      return;
    }

    const article = this.article();
    if (!article) return;

    try {
      // Processar i validar les opcions abans d'enviar-les
      const customizationOptions = this.optionsForm.value.options.map((opt: any) => ({
        ...opt,
        price: opt.price ? parseFloat(opt.price) || 0 : 0,
        values: opt.values?.map((val: any) => ({
          ...val,
          price: val.price ? parseFloat(val.price) || 0 : 0
        })) || []
      }));
      
      const updatedArticle = await this.catalogService.updateArticle(article.id, {
        customizationOptions
      });

      this.article.set(updatedArticle);
      this.showOptionsDialog.set(false);
      
      this.messageService.add({
        severity: 'success',
        summary: this.translateService.instant('common.success'),
        detail: this.translateService.instant('catalog.detail.optionsSaved')
      });
    } catch (error: any) {
      this.messageService.add({
        severity: 'error',
        summary: this.translateService.instant('common.error'),
        detail: error?.error?.message || this.translateService.instant('catalog.detail.optionsError')
      });
    }
  }
}

