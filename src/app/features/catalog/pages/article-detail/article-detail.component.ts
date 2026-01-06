import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { DividerModule } from 'primeng/divider';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { ChartModule } from 'primeng/chart';

import { CatalogService } from '../../services/catalog.service';
import { PeriodsService } from '../../../periods/services/periods.service';
import { Article, PriceHistory } from '../../../../core/models/article.model';
import { Period, PeriodRecurrence } from '../../../../core/models/period.model';

@Component({
  selector: 'app-article-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TranslateModule,
    ButtonModule,
    CardModule,
    TagModule,
    DividerModule,
    ToastModule,
    ChartModule,
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

  protected readonly article = signal<Article | null>(null);
  protected readonly priceHistory = signal<PriceHistory[]>([]);
  protected readonly periods = signal<Period[]>([]);
  protected readonly isLoading = signal<boolean>(true);
  protected readonly chartData = signal<any>(null);
  protected readonly chartOptions = signal<any>(null);

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

    // Agrupar per recurrència
    const groupedByRecurrence = new Map<PeriodRecurrence, { date: Date; price: number }[]>();
    
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
        date: startDate, 
        price: Number(periodArticle.pricePerUnit) 
      });
    });

    // Crear labels úniques (totes les dates d'inici de període ordenades)
    const allDates = sortedPeriods.map(p => {
      const startDate = typeof p.startDate === 'string' ? new Date(p.startDate) : p.startDate;
      startDate.setHours(0, 0, 0, 0);
      return startDate;
    });
    const uniqueDates = Array.from(new Set(allDates.map(d => d.getTime())))
      .map(time => new Date(time))
      .sort((a, b) => a.getTime() - b.getTime());

    const labels = uniqueDates.map(date => 
      date.toLocaleDateString('ca-ES', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
      })
    );

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
      const prices = uniqueDates.map(date => {
        const dataPoint = data.find(d => 
          d.date.getTime() === date.getTime()
        );
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
}

