import { Component, inject, signal, computed, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { RippleModule } from 'primeng/ripple';
import { MessageService, ConfirmationService } from 'primeng/api';
import { PeriodsService } from '../../services/periods.service';
import { SalesService } from '../../../sales/services/sales.service';
import { ConsumerGroupService } from '../../../../core/services/consumer-group.service';
import { Period } from '../../../../core/models/period.model';
import { Sale, SelectedOption } from '../../../../core/models/sale.model';

interface CustomizationVariant {
  customizationKey: string;
  customizationLabel: string;
  quantity: number;
  ordersCount: number;
}

interface ArticleSummary {
  articleId: string;
  articleName: string;
  totalQuantity: number;
  unitMeasure?: string;
  ordersCount: number;
  variants: CustomizationVariant[];
}

@Component({
  selector: 'app-period-orders-summary',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    TableModule,
    ButtonModule,
    InputNumberModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    TooltipModule,
    RippleModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './period-orders-summary.component.html',
  styleUrl: './period-orders-summary.component.scss',
})
export class PeriodOrdersSummaryComponent implements OnInit {
  private readonly periodsService = inject(PeriodsService);
  private readonly salesService = inject(SalesService);
  private readonly groupService = inject(ConsumerGroupService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly route = inject(ActivatedRoute);
  protected readonly router = inject(Router);

  protected readonly periodId = signal<string | null>(null);
  protected readonly period = signal<Period | null>(null);
  protected readonly isLoading = computed(() => 
    this.periodsService.isLoading() || this.salesService.isLoading()
  );
  protected readonly articlesSummary = signal<ArticleSummary[]>([]);
  protected readonly totalOrders = signal<number>(0);
  protected readonly uniqueUsers = signal<number>(0);
  protected readonly transportCost = signal<number | null>(null);
  protected readonly isEditingTransport = signal<boolean>(false);
  protected readonly isSavingTransport = signal<boolean>(false);
  protected readonly expandedRows = signal<Record<string, boolean>>({});

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
      this.transportCost.set(period.transportCost ?? null);
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

      // Comptar usuaris únics
      const uniqueUserIds = new Set<string>();
      periodOrders.forEach(order => {
        const userId = order.userId || order.userEmail;
        if (userId) {
          uniqueUserIds.add(userId);
        }
      });
      this.uniqueUsers.set(uniqueUserIds.size);

      // Obtenir els IDs dels articles del període per filtrar
      const periodArticleIds = new Set(
        period.periodArticles?.map(pa => pa.articleId) || []
      );

      // Agregar articles només si pertanyen al període
      const articlesMap = new Map<string, ArticleSummary>();
      const variantsMap = new Map<string, Map<string, { quantity: number; ordersCount: number }>>();

      periodOrders.forEach(order => {
        order.items.forEach(item => {
          const articleId = item.articleId;
          
          // Només processar si l'article està al període
          if (!periodArticleIds.has(articleId)) {
            return;
          }

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
              variants: [],
            });
            variantsMap.set(articleId, new Map());
          }

          const summary = articlesMap.get(articleId)!;
          const quantity = typeof item.quantity === 'string' 
            ? parseFloat(item.quantity) 
            : Number(item.quantity);
          summary.totalQuantity += quantity;
          summary.ordersCount += 1;

          // Crear clau única per a la combinació de personalitzacions
          let customizationKey = '';
          let customizationLabel = 'Sense personalitzacions';
          
          if (item.selectedOptions && Array.isArray(item.selectedOptions) && item.selectedOptions.length > 0) {
            const customizationParts: string[] = [];
            const sortedOptions = [...item.selectedOptions].sort((a: any, b: any) => {
              const aTitle = (a.title || a.optionTitle || '').toString();
              const bTitle = (b.title || b.optionTitle || '').toString();
              return aTitle.localeCompare(bTitle);
            });
            
            sortedOptions.forEach((option: any) => {
              const optionTitle = option.title || option.optionTitle || 'Personalització';
              const valueStr = this.formatCustomizationValue(option);
              customizationParts.push(`${optionTitle}: ${valueStr}`);
            });
            
            customizationKey = customizationParts.join(' | ');
            customizationLabel = customizationParts.join(', ');
          }

          // Agregar variant
          const articleVariants = variantsMap.get(articleId)!;
          if (!articleVariants.has(customizationKey)) {
            articleVariants.set(customizationKey, { quantity: 0, ordersCount: 0 });
          }
          
          const variant = articleVariants.get(customizationKey)!;
          variant.quantity += quantity;
          variant.ordersCount += 1;
        });
      });

      // Convertir les variants al format final
      articlesMap.forEach((summary, articleId) => {
        const articleVariants = variantsMap.get(articleId);
        if (articleVariants && articleVariants.size > 0) {
          summary.variants = Array.from(articleVariants.entries())
            .map(([key, data]) => ({
              customizationKey: key,
              customizationLabel: key || 'Sense personalitzacions',
              quantity: data.quantity,
              ordersCount: data.ordersCount,
            }))
            .sort((a, b) => {
              // Ordenar: primer sense personalitzacions, després alfabèticament
              if (a.customizationKey === '' && b.customizationKey !== '') return -1;
              if (a.customizationKey !== '' && b.customizationKey === '') return 1;
              return a.customizationLabel.localeCompare(b.customizationLabel);
            });
        } else {
          // Si no hi ha variants, crear una variant per defecte
          summary.variants = [{
            customizationKey: '',
            customizationLabel: 'Sense personalitzacions',
            quantity: summary.totalQuantity,
            ordersCount: summary.ordersCount,
          }];
        }
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

  protected formatCustomizationValue(option: any): string {
    if (!option) return '';
    const type = option.type || 'string';
    const value = option.value;
    
    if (type === 'boolean') {
      return value ? 'Sí' : 'No';
    }
    if (type === 'multiselect' && Array.isArray(value)) {
      return value.join(', ');
    }
    if (value === null || value === undefined) {
      return '-';
    }
    return String(value);
  }

  protected formatPrice(price: number | undefined): string {
    if (price === undefined || price === null) return '';
    return `(+${price.toFixed(2).replace('.', ',')} €)`;
  }

  protected hasCustomizations(article: ArticleSummary): boolean {
    const hasVariants = !!(article.variants && article.variants.length > 0);
    // Debug: descomentar per veure què passa
    // console.log('Article:', article.articleName, 'Variants:', article.variants?.length, 'Has variants:', hasVariants);
    return hasVariants;
  }

  protected hasMultipleVariants(article: ArticleSummary): boolean {
    return article.variants && article.variants.length > 1;
  }

  protected getSingleCustomization(article: ArticleSummary): CustomizationVariant | null {
    if (article.variants && article.variants.length === 1) {
      const variant = article.variants[0];
      // Si la variant té personalització (no és "Sense personalitzacions")
      if (variant.customizationKey && variant.customizationKey !== '') {
        return variant;
      }
    }
    return null;
  }

  protected toggleRow(articleId: string): void {
    const current = { ...this.expandedRows() };
    current[articleId] = !current[articleId];
    this.expandedRows.set(current);
  }

  protected isRowExpanded(articleId: string): boolean {
    return !!this.expandedRows()[articleId];
  }

  protected goBack(): void {
    this.router.navigate(['/periods']);
  }

  protected duplicatePeriod(): void {
    const period = this.period();
    if (!period) return;

    const params: any = {
      duplicate: 'true',
      name: period.name,
      supplierId: period.supplierId,
      startDate: typeof period.startDate === 'string' ? period.startDate : period.startDate.toISOString().split('T')[0],
      endDate: typeof period.endDate === 'string' ? period.endDate : period.endDate.toISOString().split('T')[0],
      deliveryDate: typeof period.deliveryDate === 'string' ? period.deliveryDate : period.deliveryDate.toISOString().split('T')[0],
      recurrence: period.recurrence,
    };
    
    if (period.periodArticles && period.periodArticles.length > 0) {
      params.articles = JSON.stringify(period.periodArticles.map(pa => ({
        articleId: pa.articleId,
        pricePerUnit: pa.pricePerUnit,
      })));
    }
    
    this.router.navigate(['/periods/new'], { queryParams: params });
  }

  protected openEditDialog(): void {
    const period = this.period();
    if (!period) return;
    this.router.navigate(['/periods/edit', period.id]);
  }

  protected confirmDelete(): void {
    const period = this.period();
    if (!period) return;

    this.confirmationService.confirm({
      message: `Estàs segur que vols eliminar el període "${period.name}"?`,
      header: 'Confirmació d\'eliminació',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancel·lar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deletePeriod()
    });
  }

  private async deletePeriod(): Promise<void> {
    const period = this.period();
    if (!period) return;

    try {
      await this.periodsService.deletePeriod(period.id, period.supplierId);
      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: 'Període eliminat correctament'
      });
      this.router.navigate(['/periods']);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'ha pogut eliminar el període'
      });
    }
  }

  protected exportToVcfAndEmail(): void {
    const period = this.period();
    if (!period) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No hi ha dades del període'
      });
      return;
    }

    // Generar contenido con solo los artículos
    const content = this.generateArticlesContent();

    // Crear y descargar archivo con UTF-8 BOM para preservar acentos
    const bom = '\uFEFF';
    const blob = new Blob([bom + content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'comandes.txt';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private generateArticlesContent(): string {
    const lines: string[] = [];
    
    this.articlesSummaryList().forEach(article => {
      const unit = article.unitMeasure ? ` ${article.unitMeasure}` : '';
      
      // Si no hi ha variants amb personalitzacions, mostrar només el total
      const variantsWithCustomizations = article.variants.filter(
        v => v.customizationKey && v.customizationKey !== ''
      );
      
      if (variantsWithCustomizations.length === 0) {
        lines.push(`${article.articleName}. Total ${article.totalQuantity}${unit}`);
        return;
      }
      
      // Agrupar variants per opció i valor
      const optionGroups = new Map<string, Map<string, number>>();
      
      variantsWithCustomizations.forEach(variant => {
        // Parsejar el customizationKey que té format "Option1: Value1 | Option2: Value2"
        const optionPairs = variant.customizationKey.split(' | ');
        
        optionPairs.forEach(pair => {
          // Trobar el primer ": " per separar títol i valor (el valor pot contenir ":" però no ": ")
          const colonIndex = pair.indexOf(': ');
          if (colonIndex === -1) return;
          
          const optionTitle = pair.substring(0, colonIndex).trim();
          const optionValue = pair.substring(colonIndex + 2).trim();
          
          if (!optionTitle || !optionValue) return;
          
          if (!optionGroups.has(optionTitle)) {
            optionGroups.set(optionTitle, new Map());
          }
          
          const valueMap = optionGroups.get(optionTitle)!;
          const currentQty = valueMap.get(optionValue) || 0;
          valueMap.set(optionValue, currentQty + variant.quantity);
        });
      });
      
      // Construir la línia amb el format: "ArticleName. Option1? Value1: qty1; Value2: qty2"
      let line = article.articleName;
      
      const customizationParts: string[] = [];
      // Ordenar opcions alfabèticament per consistència
      const sortedOptions = Array.from(optionGroups.entries()).sort((a, b) => 
        a[0].localeCompare(b[0])
      );
      
      sortedOptions.forEach(([optionTitle, valueMap]) => {
        const valueParts: string[] = [];
        // Ordenar valors: primer "Sí", després "No", després alfabèticament
        const sortedValues = Array.from(valueMap.entries()).sort((a, b) => {
          if (a[0] === 'Sí') return -1;
          if (b[0] === 'Sí') return 1;
          if (a[0] === 'No') return -1;
          if (b[0] === 'No') return 1;
          return a[0].localeCompare(b[0]);
        });
        
        sortedValues.forEach(([value, qty]) => {
          valueParts.push(`${value}: ${qty}`);
        });
        
        customizationParts.push(`${optionTitle} ${valueParts.join('; ')}`);
      });
      
      if (customizationParts.length > 0) {
        line += `. ${customizationParts.join('. ')}`;
      }
      
      line += `. Total ${article.totalQuantity}${unit}`;
      lines.push(line);
    });
    
    return lines.join('\n');
  }

  protected startEditingTransport(): void {
    this.isEditingTransport.set(true);
  }

  protected cancelEditingTransport(): void {
    const period = this.period();
    this.transportCost.set(period?.transportCost ?? null);
    this.isEditingTransport.set(false);
  }

  protected async saveTransportCost(): Promise<void> {
    const period = this.period();
    if (!period) return;

    this.isSavingTransport.set(true);
    try {
      const updatedPeriod = await this.periodsService.updatePeriod(
        period.id,
        period.supplierId,
        { transportCost: this.transportCost() ?? undefined }
      );
      this.period.set(updatedPeriod);
      this.isEditingTransport.set(false);
      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: 'Cost de transport actualitzat correctament'
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No s\'ha pogut actualitzar el cost de transport'
      });
    } finally {
      this.isSavingTransport.set(false);
    }
  }
}
