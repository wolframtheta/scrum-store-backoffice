import { Component, OnInit, OnDestroy, inject, computed, signal, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { Subject, debounceTime, distinctUntilChanged, takeUntil } from 'rxjs';
import { CheckboxModule } from 'primeng/checkbox';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { AutoCompleteModule } from 'primeng/autocomplete';
import { DatePickerModule } from 'primeng/datepicker';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { MessageService, ConfirmationService } from 'primeng/api';
import { SalesService } from '../../services/sales.service';
import { PeriodsService } from '../../../periods/services/periods.service';
import { ConsumerGroupService } from '../../../../core/services/consumer-group.service';
import { Sale } from '../../../../core/models/sale.model';
import { Period } from '../../../../core/models/period.model';
import { TreeNode } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { TooltipModule } from 'primeng/tooltip';
import { removeAccents } from '../../../../core/utils/string.utils';
import { getErrorMessage } from '../../../../core/models/http-error.model';

interface BasketItem {
  articleId: string;
  articleName: string;
  totalQuantity: number;
  unitMeasure?: string;
  isPrepared: boolean;
  users: Array<{
    userId: string;
    userName: string;
    quantity: number;
    orderId: string;
    itemId: string;
  }>;
}

interface PeriodBasket {
  periodId: string;
  periodName: string;
  period: Period;
  isFinished: boolean;
  articles: Map<string, BasketItem>;
}

@Component({
  selector: 'app-basket-preparation',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    TranslateModule,
    CheckboxModule,
    TagModule,
    ToastModule,
    ButtonModule,
    DatePickerModule,
    SelectModule,
    InputTextModule,
    InputGroupModule,
    InputGroupAddonModule,
    ConfirmDialogModule,
    TooltipModule,
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './basket-preparation.component.html',
  styleUrl: './basket-preparation.component.scss',
})
export class BasketPreparationComponent implements OnInit, OnDestroy {
  protected readonly salesService = inject(SalesService);
  protected readonly periodsService = inject(PeriodsService);
  protected readonly groupService = inject(ConsumerGroupService);
  private readonly messageService = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly translate = inject(TranslateService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();
  private readonly userSearchSubject = new Subject<string>();
  private readonly articleSearchSubject = new Subject<string>();
  private userSearchSubscription?: any;
  private articleSearchSubscription?: any;

  // Estat local temporal dels checkboxes (només visual)
  protected readonly checkedItems = signal<Set<string>>(new Set());

  // Filtres
  protected readonly filterUserId = signal<string | null>(null);
  protected readonly filterUserText = signal<string>('');
  protected readonly filterArticleText = signal<string>('');
  protected readonly filterDateFrom = signal<Date | null>(null);
  protected readonly filterDateTo = signal<Date | null>(null);
  protected readonly filterDelivered = signal<'all' | 'delivered' | 'undelivered'>('undelivered');

  // Llista d'usuaris únics per al filtre
  protected readonly uniqueUsers = computed(() => {
    const sales = this.salesService.sales();
    const userMap = new Map<string, { userId: string; userName: string }>();
    
    sales.forEach(sale => {
      const userId = sale.userId || sale.userEmail || '';
      const userName = sale.userName || sale.userEmail || 'Usuari desconegut';
      if (userId && !userMap.has(userId)) {
        userMap.set(userId, { userId, userName });
      }
    });
    
    return Array.from(userMap.values()).sort((a, b) => a.userName.localeCompare(b.userName));
  });


  protected readonly deliveredOptions = computed(() => [
    { label: this.translate.instant('sales.filters.options.all'), value: 'all' },
    { label: this.translate.instant('sales.filters.options.delivered'), value: 'delivered' },
    { label: this.translate.instant('sales.filters.options.undelivered'), value: 'undelivered' }
  ]);

  // Getters/setters per als signals per poder usar ngModel
  get filterDateFromValue(): Date | null {
    return this.filterDateFrom();
  }
  set filterDateFromValue(value: Date | null) {
    this.filterDateFrom.set(value);
  }

  get filterDateToValue(): Date | null {
    return this.filterDateTo();
  }
  set filterDateToValue(value: Date | null) {
    this.filterDateTo.set(value);
  }

  get filterDeliveredValue(): 'all' | 'delivered' | 'undelivered' {
    return this.filterDelivered();
  }
  set filterDeliveredValue(value: 'all' | 'delivered' | 'undelivered') {
    this.filterDelivered.set(value);
  }

  get filterUserTextValue(): string {
    return this.filterUserText();
  }
  set filterUserTextValue(value: string) {
    this.filterUserText.set(value);
    this.userSearchSubject.next(value);
  }

  get filterArticleTextValue(): string {
    return this.filterArticleText();
  }
  set filterArticleTextValue(value: string) {
    this.filterArticleText.set(value);
    this.articleSearchSubject.next(value);
  }

  protected onUserSearch(): void {
    const searchText = this.filterUserText().trim();
    
    if (!searchText) {
      this.filterUserId.set(null);
      return;
    }
    
    // Buscar l'usuari que coincideixi amb el text (sense accents)
    const normalizedSearch = removeAccents(searchText);
    const matchingUser = this.uniqueUsers().find(user => {
      const normalizedUserName = removeAccents(user.userName);
      const normalizedUserId = removeAccents(user.userId);
      return normalizedUserName.includes(normalizedSearch) || normalizedUserId.includes(normalizedSearch);
    });
    
    if (matchingUser) {
      this.filterUserId.set(matchingUser.userId);
    } else {
      // Si no hi ha coincidència exacta, només filtrar per text
      this.filterUserId.set(null);
    }
  }

  protected onUserClear(): void {
    this.filterUserText.set('');
    this.filterUserId.set(null);
  }

  protected clearFilters(): void {
    this.filterUserId.set(null);
    this.filterUserText.set('');
    this.filterArticleText.set('');
    this.filterDateFrom.set(null);
    this.filterDateTo.set(null);
    this.filterDelivered.set('undelivered');
  }

  protected readonly basketTree = computed<TreeNode[]>(() => {
    const sales = this.salesService.sales();
    const periods = this.periodsService.periods();
    const now = new Date();
    
    // Aplicar filtres
    let filteredSales = sales;
    
    // Filtrar per usuari
    const userIdFilter = this.filterUserId();
    const userTextFilter = this.filterUserText().trim();
    
    if (userIdFilter) {
      filteredSales = filteredSales.filter(sale => 
        (sale.userId || sale.userEmail) === userIdFilter
      );
    } else if (userTextFilter) {
      // Filtrar per text del nom d'usuari o email (sense accents)
      const normalizedSearch = removeAccents(userTextFilter);
      filteredSales = filteredSales.filter(sale => {
        const userName = removeAccents(sale.userName || sale.userEmail || '');
        const userEmail = removeAccents(sale.userEmail || '');
        return userName.includes(normalizedSearch) || userEmail.includes(normalizedSearch);
      });
    }
    
    // Filtrar per data
    const dateFrom = this.filterDateFrom();
    const dateTo = this.filterDateTo();
    if (dateFrom || dateTo) {
      filteredSales = filteredSales.filter(sale => {
        const saleDate = new Date(sale.createdAt);
        saleDate.setHours(0, 0, 0, 0);
        
        if (dateFrom) {
          const from = new Date(dateFrom);
          from.setHours(0, 0, 0, 0);
          if (saleDate < from) return false;
        }
        
        if (dateTo) {
          const to = new Date(dateTo);
          to.setHours(23, 59, 59, 999);
          if (saleDate > to) return false;
        }
        
        return true;
      });
    }
    
    // Agrupar comandes per període
    const periodMap = new Map<string, PeriodBasket>();

    // Inicialitzar períodes
    periods.forEach(period => {
      const startDate = new Date(period.startDate);
      const endDate = new Date(period.endDate);
      const isFinished = endDate < now;

      if (!periodMap.has(period.id)) {
        periodMap.set(period.id, {
          periodId: period.id,
          periodName: period.name,
          period,
          isFinished,
          articles: new Map()
        });
      }
    });

    // Agrupar items per període: cada item va al seu període (item.periodId), no tota la comanda
    filteredSales.forEach(sale => {
      const orderDate = new Date(sale.createdAt);
      // Fallback: període per data de comanda si l'item no té periodId
      let fallbackPeriod: Period | null = null;
      for (const period of periods) {
        const startDate = new Date(period.startDate);
        const endDate = new Date(period.endDate);
        if (orderDate >= startDate && orderDate <= endDate) {
          fallbackPeriod = period;
          break;
        }
      }

      // Agrupar cada item al seu període (cada article pot ser de períodes diferents dins la mateixa comanda)
      sale.items.forEach(item => {
        // Filtrar per estat de preparació a nivell d'item
        const deliveredFilter = this.filterDelivered();
        if (deliveredFilter === 'delivered' && !item.isPrepared) {
          return; // Saltar items no preparats si el filtre és "preparats"
        } else if (deliveredFilter === 'undelivered' && item.isPrepared) {
          return; // Saltar items preparats si el filtre és "no preparats"
        }

        // Prioritat: item.periodId > fallback per data de comanda
        let assignedPeriod: Period | null = null;
        if (item.periodId) {
          assignedPeriod = periods.find(p => p.id === item.periodId) || null;
        }
        if (!assignedPeriod) {
          assignedPeriod = fallbackPeriod;
        }

        const periodId = assignedPeriod?.id || 'no-period';
        const periodName = assignedPeriod?.name || 'Sense període';
        const isFinished = assignedPeriod ? new Date(assignedPeriod.endDate) < now : false;

        if (!periodMap.has(periodId)) {
          periodMap.set(periodId, {
            periodId,
            periodName,
            period: assignedPeriod || null as any,
            isFinished,
            articles: new Map()
          });
        }

        const periodBasket = periodMap.get(periodId)!;
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

        if (!periodBasket.articles.has(articleId)) {
          periodBasket.articles.set(articleId, {
            articleId,
            articleName,
            totalQuantity: 0,
            unitMeasure: item.article?.unitMeasure,
            isPrepared: false, // S'actualitzarà després
            users: []
          });
        }

        const basketItem = periodBasket.articles.get(articleId)!;
        // Convertir quantity a número per assegurar-nos que és un número i no un string
        const quantity = typeof item.quantity === 'string' ? parseFloat(item.quantity) : Number(item.quantity);
        basketItem.totalQuantity += quantity;

        // Afegir o actualitzar usuari
        // IMPORTANT: Usar userId (que ve de l'API orders) o userEmail (que ve de sales) com a identificador únic
        const userIdentifier = sale.userId || sale.userEmail;
        if (!userIdentifier) {
          console.warn('[BasketPreparation] Sale sense userId ni userEmail:', sale);
          return;
        }

        // NO agrupar per userId - crear una entrada per cada item individual
        // Això permet marcar items de diferents comandes separadament
        basketItem.users.push({
          userId: userIdentifier,
          userName: sale.userName || userIdentifier,
          quantity: quantity,
          orderId: sale.id,
          itemId: item.id
        });
      });
    });

    // Construir l'arbre
    const activePeriods: TreeNode[] = [];
    const finishedPeriods: TreeNode[] = [];

    periodMap.forEach((periodBasket, periodId) => {
      if (periodBasket.articles.size === 0) return; // Saltar períodes sense articles

      const articleNodes: TreeNode[] = [];

      // Filtrar articles per text de cerca (sense accents)
      const articleTextFilter = this.filterArticleText().trim();
      
      periodBasket.articles.forEach((basketItem, articleId) => {
        // Filtrar per nom d'article si hi ha filtre actiu (sense accents)
        if (articleTextFilter) {
          const normalizedSearch = removeAccents(articleTextFilter);
          const normalizedArticleName = removeAccents(basketItem.articleName);
          if (!normalizedArticleName.includes(normalizedSearch)) {
            return;
          }
        }
        
        const userNodes: TreeNode[] = basketItem.users.map(user => {
          const userKey = `${periodId}-${articleId}-${user.itemId}`;
          return {
            key: userKey,
            label: user.userName,
            data: {
              type: 'user',
              userName: user.userName,
              userId: user.userId,
              quantity: user.quantity,
              unitMeasure: basketItem.unitMeasure,
              orderId: user.orderId,
              itemId: user.itemId,
              periodId: periodId,
              articleId: articleId,
              totalUsers: basketItem.users.length
            },
            leaf: true
          };
        });

        articleNodes.push({
          key: `${periodId}-${articleId}`,
          label: basketItem.articleName,
          data: {
            type: 'article',
            articleId: basketItem.articleId,
            articleName: basketItem.articleName,
            totalQuantity: basketItem.totalQuantity,
            unitMeasure: basketItem.unitMeasure,
            periodId: periodId,
            isPrepared: basketItem.isPrepared
          },
          children: userNodes,
          expanded: true
        });
      });

      // Ordenar articles alfabèticament per nom (categoria - producte - varietat)
      articleNodes.sort((a, b) => {
        const nameA = a.label || '';
        const nameB = b.label || '';
        return nameA.localeCompare(nameB, 'ca', { sensitivity: 'base' });
      });

      // Formatear la data d'entrega
      let deliveryDateStr = '';
      if (periodBasket.period?.deliveryDate) {
        const deliveryDate = new Date(periodBasket.period.deliveryDate);
        deliveryDateStr = deliveryDate.toLocaleDateString('ca-ES', {
          day: 'numeric',
          month: 'short'
        });
      }

      const periodNode: TreeNode = {
        key: periodId,
        label: deliveryDateStr 
          ? `${periodBasket.periodName} - Entrega: ${deliveryDateStr} (${articleNodes.length} articles)`
          : `${periodBasket.periodName} (${articleNodes.length} articles)`,
        data: {
          type: 'period',
          periodId: periodId,
          periodName: periodBasket.periodName,
          isFinished: periodBasket.isFinished,
          deliveryDate: periodBasket.period?.deliveryDate
        },
        children: articleNodes,
        expanded: true
      };

      if (periodBasket.isFinished) {
        finishedPeriods.push(periodNode);
      } else {
        activePeriods.push(periodNode);
      }
    });

    // Ordenar períodes alfabèticament per nom
    activePeriods.sort((a, b) => {
      const nameA = a.data?.periodName || '';
      const nameB = b.data?.periodName || '';
      return nameA.localeCompare(nameB, 'ca', { sensitivity: 'base' });
    });
    finishedPeriods.sort((a, b) => {
      const nameA = a.data?.periodName || '';
      const nameB = b.data?.periodName || '';
      return nameA.localeCompare(nameB, 'ca', { sensitivity: 'base' });
    });

    // Retornar períodes actius primer, després els finalitzats
    return [...activePeriods, ...finishedPeriods];
  });

  // Agrupar comandes per orderId dins de cada període
  protected readonly ordersByPeriod = computed(() => {
    const basketTree = this.basketTree();
    const ordersMap = new Map<string, Array<{
      orderId: string;
      userName: string;
      userId: string;
      items: Array<{ periodId: string; articleId: string; userId: string }>;
    }>>();

    basketTree.forEach(periodNode => {
      const periodId = periodNode.data?.periodId;
      if (!periodId) return;

      if (!ordersMap.has(periodId)) {
        ordersMap.set(periodId, []);
      }

      const periodOrders = ordersMap.get(periodId)!;
      const orderMap = new Map<string, {
        orderId: string;
        userName: string;
        userId: string;
        items: Array<{ periodId: string; articleId: string; userId: string }>;
      }>();

      if (periodNode.children) {
        periodNode.children.forEach(articleNode => {
          if (articleNode.children) {
            articleNode.children.forEach(userNode => {
              const userData = userNode.data;
              if (userData?.type === 'user' && userData.orderId) {
                const orderId = userData.orderId;
                if (!orderMap.has(orderId)) {
                  orderMap.set(orderId, {
                    orderId,
                    userName: userData.userName || 'Usuari desconegut',
                    userId: userData.userId,
                    items: []
                  });
                }
                const order = orderMap.get(orderId)!;
                order.items.push({
                  periodId: userData.periodId,
                  articleId: userData.articleId,
                  userId: userData.userId
                });
              }
            });
          }
        });
      }

      // Convertir el Map a array
      periodOrders.push(...Array.from(orderMap.values()));
    });

    return ordersMap;
  });

  async ngOnInit() {
    await Promise.all([
      this.loadSales(),
      this.loadPeriods()
    ]);

    // Debounce search inputs
    this.userSearchSubscription = this.userSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      this.onUserSearch();
    });

    // El filtre d'articles ja es fa reactivament amb computed, només cal el debounce visual
    this.articleSearchSubscription = this.articleSearchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      takeUntil(this.destroy$)
    ).subscribe(() => {
      // El computed ja es dispararà automàticament
    });
  }

  ngOnDestroy(): void {
    this.userSearchSubscription?.unsubscribe();
    this.articleSearchSubscription?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  private async loadSales() {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No hi ha cap grup seleccionat'
      });
      return;
    }

    try {
      await this.salesService.loadSalesByGroup(groupId);
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error carregant les comandes'
      });
    }
  }

  private async loadPeriods() {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) return;

    try {
      await this.periodsService.loadPeriods();
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error carregant els períodes'
      });
    }
  }

  protected async onArticlePreparedChange(node: TreeNode, checked: boolean): Promise<void> {
    const articleData = node.data;
    if (articleData?.type === 'article' && articleData.periodId && articleData.articleId) {
      // Marcar tots els usuaris d'aquest article
      if (!node.children || node.children.length === 0) return;

      try {
        // Actualitzar cada item d'aquest article
        const updatePromises = node.children.map(userNode => {
          const userData = userNode.data;
          if (userData?.type === 'user' && userData.orderId && userData.itemId) {
            return this.salesService.updateItemPrepared(userData.orderId, userData.itemId, checked);
          }
          return Promise.resolve(null);
        });

        await Promise.all(updatePromises);

        this.messageService.add({
          severity: 'success',
          summary: 'Èxit',
          detail: `Article ${checked ? 'marcat' : 'desmarcat'} com a preparat`
        });
      } catch (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Error al ${checked ? 'marcar' : 'desmarcar'} l'article`
        });
      }
    }
  }

  protected async onUserPreparedChange(node: TreeNode, checked: boolean): Promise<void> {
    const userData = node.data;
    if (userData?.type === 'user' && userData.orderId && userData.itemId) {
      try {
        await this.salesService.updateItemPrepared(userData.orderId, userData.itemId, checked);
        
        this.messageService.add({
          severity: 'success',
          summary: 'Èxit',
          detail: `Item ${checked ? 'marcat' : 'desmarcat'} com a preparat`
        });
      } catch (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Error al ${checked ? 'marcar' : 'desmarcar'} l'item`
        });
      }
    }
  }

  protected isArticlePrepared(node: TreeNode): boolean {
    const articleData = node.data;
    if (articleData?.type === 'article' && node.children) {
      // Verificar si tots els usuaris de l'article tenen els seus items preparats
      return node.children.length > 0 && node.children.every(userNode => this.isUserPrepared(userNode));
    }
    return false;
  }

  protected isUserPrepared(node: TreeNode): boolean {
    const userData = node.data;
    if (userData?.type === 'user' && userData.orderId) {
      // Buscar l'item a la sale per obtenir el seu estat isPrepared
      const sales = this.salesService.sales();
      const sale = sales.find(s => s.id === userData.orderId);
      if (sale) {
        const item = sale.items.find(i => i.id === userData.itemId);
        return item?.isPrepared || false;
      }
    }
    return false;
  }

  protected async onPeriodOrdersPreparedChange(periodId: string, checked: boolean): Promise<void> {
    const groupId = this.groupService.selectedGroupId();
    if (!groupId) return;

    try {
      await this.salesService.updatePeriodItemsPrepared(periodId, groupId, checked);
      
      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: `Tots els items del període ${checked ? 'marcats' : 'desmarcats'} com a preparats`
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Error al ${checked ? 'marcar' : 'desmarcar'} els items del període`
      });
    }
  }

  protected areAllOrdersPrepared(periodId: string): boolean {
    const sales = this.salesService.sales();
    const periodSales = sales.filter(sale => 
      sale.items.some(item => item.periodId === periodId)
    );

    if (periodSales.length === 0) return false;

    return periodSales.every(sale => {
      const periodItems = sale.items.filter(item => item.periodId === periodId);
      return periodItems.every(item => item.isPrepared);
    });
  }

  protected async deleteOrderItem(node: TreeNode): Promise<void> {
    const userData = node.data;
    if (!userData?.orderId || !userData?.itemId) {
      return;
    }

    const articleName = this.findArticleName(userData.periodId, userData.articleId);
    const userName = userData.userName || 'usuari';

    this.confirmationService.confirm({
      message: `Estàs segur que vols eliminar "${articleName}" de la comanda de ${userName}? Aquesta acció no es pot desfer.`,
      header: 'Confirmar eliminació',
      icon: 'pi pi-exclamation-triangle',
      acceptButtonStyleClass: 'p-button-danger',
      acceptLabel: 'Sí, eliminar',
      rejectLabel: 'Cancel·lar',
      accept: async () => {
        try {
          await this.salesService.deleteOrderItem(userData.orderId, userData.itemId);
          // Recarregar les comandes per actualitzar la vista
          await this.loadSales();
          // Forçar detecció de canvis amb OnPush
          this.cdr.markForCheck();
          this.messageService.add({
            severity: 'success',
            summary: 'Èxit',
            detail: 'Article eliminat de la comanda correctament'
          });
        } catch (error: any) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: getErrorMessage(error, 'Error eliminant article de la comanda')
          });
        }
      }
    });
  }

  private findArticleName(periodId: string, articleId: string): string {
    const basketTree = this.basketTree();
    
    for (const periodNode of basketTree) {
      if (periodNode.data?.periodId === periodId && periodNode.children) {
        for (const articleNode of periodNode.children) {
          if (articleNode.data?.articleId === articleId) {
            return articleNode.data.articleName || `Article ${articleId}`;
          }
        }
      }
    }
    
    return `Article ${articleId}`;
  }
}
