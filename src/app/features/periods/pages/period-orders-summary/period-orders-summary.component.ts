import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { TooltipModule } from 'primeng/tooltip';
import { MessageService } from 'primeng/api';
import { PeriodsService } from '../../services/periods.service';
import { SalesService } from '../../../sales/services/sales.service';
import { ConsumerGroupService } from '../../../../core/services/consumer-group.service';
import { Period } from '../../../../core/models/period.model';
import { Sale } from '../../../../core/models/sale.model';

interface ArticleSummary {
  articleId: string;
  articleName: string;
  totalQuantity: number;
  unitMeasure?: string;
  ordersCount: number;
}

@Component({
  selector: 'app-period-orders-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TranslateModule,
    TableModule,
    ButtonModule,
    TagModule,
    ToastModule,
    TooltipModule,
  ],
  providers: [MessageService],
  templateUrl: './period-orders-summary.component.html',
  styleUrl: './period-orders-summary.component.scss',
})
export class PeriodOrdersSummaryComponent implements OnInit {
  private readonly periodsService = inject(PeriodsService);
  private readonly salesService = inject(SalesService);
  private readonly groupService = inject(ConsumerGroupService);
  private readonly messageService = inject(MessageService);
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);

  protected readonly periodId = signal<string | null>(null);
  protected readonly period = signal<Period | null>(null);
  protected readonly isLoading = computed(() => 
    this.periodsService.isLoading() || this.salesService.isLoading()
  );
  protected readonly articlesSummary = signal<ArticleSummary[]>([]);
  protected readonly totalOrders = signal<number>(0);

  protected readonly articlesSummaryList = computed(() => {
    return this.articlesSummary().sort((a, b) => 
      a.articleName.localeCompare(b.articleName)
    );
  });

  async ngOnInit(): Promise<void> {
    const periodId = this.route.snapshot.paramMap.get('periodId');
    if (!periodId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Període no trobat'
      });
      this.router.navigate(['/periods']);
      return;
    }

    this.periodId.set(periodId);
    await this.loadPeriod(periodId);
    await this.loadOrders();
  }

  private async loadPeriod(periodId: string): Promise<void> {
    try {
      const period = await this.periodsService.getPeriod(periodId);
      this.period.set(period);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'ha pogut carregar el període'
      });
      this.router.navigate(['/periods']);
    }
  }

  private async loadOrders(): Promise<void> {
    try {
      const groupId = this.groupService.selectedGroupId();
      if (!groupId) {
        return;
      }

      const period = this.period();
      if (!period) {
        return;
      }

      // Carregar totes les comandes del grup
      await this.salesService.loadSalesByGroup(groupId);

      // Filtrar comandes que pertanyen a aquest període
      const allSales = this.salesService.sales();
      const periodStart = new Date(period.startDate);
      const periodEnd = new Date(period.endDate);
      periodEnd.setHours(23, 59, 59, 999);

      const periodOrders = allSales.filter(sale => {
        const orderDate = new Date(sale.createdAt);
        return orderDate >= periodStart && orderDate <= periodEnd;
      });

      this.totalOrders.set(periodOrders.length);

      // Agregar articles
      const articlesMap = new Map<string, ArticleSummary>();

      periodOrders.forEach(order => {
        order.items.forEach(item => {
          const articleId = item.articleId;
          let articleName = `Article ${articleId}`;

          if (item.article) {
            const parts: string[] = [];
            if (item.article.category) parts.push(item.article.category);
            if (item.article.product) parts.push(item.article.product);
            if (item.article.variety) parts.push(item.article.variety);
            if (parts.length > 0) {
              articleName = parts.join(' - ');
            }
          }

          if (!articlesMap.has(articleId)) {
            articlesMap.set(articleId, {
              articleId,
              articleName,
              totalQuantity: 0,
              unitMeasure: item.article?.unitMeasure,
              ordersCount: 0,
            });
          }

          const summary = articlesMap.get(articleId)!;
          const quantity = typeof item.quantity === 'string' 
            ? parseFloat(item.quantity) 
            : Number(item.quantity);
          summary.totalQuantity += quantity;
          summary.ordersCount += 1;
        });
      });

      this.articlesSummary.set(Array.from(articlesMap.values()));
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'han pogut carregar les comandes'
      });
    }
  }

  protected formatDate(date: Date | string): string {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ca-ES');
  }

  protected goBack(): void {
    this.router.navigate(['/periods']);
  }
}
