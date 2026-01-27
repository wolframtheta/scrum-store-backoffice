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

  // Estat dels checkboxes (clau: periodId-articleId o periodId-articleId-userId)
  protected readonly preparedItems = signal<Set<string>>(new Set());
  
  // Estat de les comandes preparades (orderId)
  protected readonly preparedOrders = signal<Set<string>>(new Set());

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

  /**
   * Elimina los acentos y diacríticos de un string
   */
  private removeAccents(str: string): string {
    return str
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  protected onUserSearch(): void {
    const searchText = this.filterUserText().trim();
    
    if (!searchText) {
      this.filterUserId.set(null);
      return;
    }
    
    // Buscar l'usuari que coincideixi amb el text (sense accents)
    const normalizedSearch = this.removeAccents(searchText);
    const matchingUser = this.uniqueUsers().find(user => {
      const normalizedUserName = this.removeAccents(user.userName);
      const normalizedUserId = this.removeAccents(user.userId);
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
    
    // Filtrar per estat d'entrega
    const deliveredFilter = this.filterDelivered();
    if (deliveredFilter === 'delivered') {
      filteredSales = filteredSales.filter(sale => sale.isDelivered);
    } else if (deliveredFilter === 'undelivered') {
      filteredSales = filteredSales.filter(sale => !sale.isDelivered);
    }
    // 'all' no filtra res
    
    // Filtrar per usuari
    const userIdFilter = this.filterUserId();
    const userTextFilter = this.filterUserText().trim();
    
    if (userIdFilter) {
      filteredSales = filteredSales.filter(sale => 
        (sale.userId || sale.userEmail) === userIdFilter
      );
    } else if (userTextFilter) {
      // Filtrar per text del nom d'usuari o email (sense accents)
      const normalizedSearch = this.removeAccents(userTextFilter);
      filteredSales = filteredSales.filter(sale => {
        const userName = this.removeAccents(sale.userName || sale.userEmail || '');
        const userEmail = this.removeAccents(sale.userEmail || '');
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

    // Agrupar comandes per període basant-nos en la data de creació
    filteredSales.forEach(sale => {
      const orderDate = new Date(sale.createdAt);
      
      // Trobar el període que correspon a aquesta comanda
      let assignedPeriod: Period | null = null;
      for (const period of periods) {
        const startDate = new Date(period.startDate);
        const endDate = new Date(period.endDate);
        if (orderDate >= startDate && orderDate <= endDate) {
          assignedPeriod = period;
          break;
        }
      }

      // Si no trobem període, assignar a "Sense període"
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

      // Agrupar items per article
      sale.items.forEach(item => {
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
            isPrepared: this.isArticlePreparedByKey(`${periodId}-${articleId}`),
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

        const existingUser = basketItem.users.find(u => u.userId === userIdentifier);
        if (existingUser) {
          // Si l'usuari ja existeix (mateix userId), sumar la quantitat
          existingUser.quantity += quantity;
          // Actualitzar l'orderId a l'última comanda
          existingUser.orderId = sale.id;
          // Mantenir el primer itemId (no actualitzar-lo)
        } else {
          // Si l'usuari no existeix (nou client), afegir-lo a l'array
          basketItem.users.push({
            userId: userIdentifier,
            userName: sale.userName || userIdentifier,
            quantity: quantity,
            orderId: sale.id,
            itemId: item.id
          });
        }
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
          const normalizedSearch = this.removeAccents(articleTextFilter);
          const normalizedArticleName = this.removeAccents(basketItem.articleName);
          if (!normalizedArticleName.includes(normalizedSearch)) {
            return;
          }
        }
        
        const userNodes: TreeNode[] = basketItem.users.map(user => {
          const userKey = `${periodId}-${articleId}-${user.userId}`;
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

      // Ordenar articles per nom
      articleNodes.sort((a, b) => a.label!.localeCompare(b.label!));

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

    // Ordenar períodes per nom
    activePeriods.sort((a, b) => a.label!.localeCompare(b.label!));
    finishedPeriods.sort((a, b) => a.label!.localeCompare(b.label!));

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

  protected onArticlePreparedChange(node: TreeNode, checked: boolean): void {
    // Si la comanda està preparada, no permetre canvis
    if (this.isOrderPreparedForNode(node)) {
      return;
    }

    const articleData = node.data;
    if (articleData?.type === 'article' && articleData.periodId && articleData.articleId) {
      const articleKey = `${articleData.periodId}-${articleData.articleId}`;
      const prepared = new Set(this.preparedItems());
      
      if (checked) {
        // Seleccionar l'article i tots els seus usuaris
        prepared.add(articleKey);
        // Seleccionar tots els usuaris d'aquest article (els tenim als children del node)
        if (node.children) {
          node.children.forEach(userNode => {
            const userData = userNode.data;
            if (userData?.type === 'user' && userData.userId) {
              const userKey = `${articleData.periodId}-${articleData.articleId}-${userData.userId}`;
              prepared.add(userKey);
            }
          });
        }
      } else {
        // Deseleccionar l'article i tots els seus usuaris
        prepared.delete(articleKey);
        // Eliminar tots els usuaris d'aquest article
        if (node.children) {
          node.children.forEach(userNode => {
            const userData = userNode.data;
            if (userData?.type === 'user' && userData.userId) {
              const userKey = `${articleData.periodId}-${articleData.articleId}-${userData.userId}`;
              prepared.delete(userKey);
            }
          });
        }
      }
      
      // Actualitzar l'estat (sense marcar comandes com a entregades)
      this.preparedItems.set(prepared);
    }
  }

  protected onUserPreparedChange(node: TreeNode, checked: boolean): void {
    const userData = node.data;
    // Si la comanda està preparada, no permetre canvis
    if (userData?.orderId && this.preparedOrders().has(userData.orderId)) {
      return;
    }

    if (userData?.type === 'user' && userData.periodId && userData.articleId && userData.userId) {
      const userKey = `${userData.periodId}-${userData.articleId}-${userData.userId}`;
      const articleKey = `${userData.periodId}-${userData.articleId}`;
      const prepared = new Set(this.preparedItems());
      
      if (checked) {
        prepared.add(userKey);
      } else {
        prepared.delete(userKey);
        // Si es deselecciona un usuari, deseleccionar també l'article
        prepared.delete(articleKey);
      }
      
      // Verificar si tots els usuaris estan seleccionats per seleccionar l'article
      // Buscar l'article pare al tree actual
      const articleNode = this.findArticleNode(userData.periodId, userData.articleId);
      if (articleNode && articleNode.children) {
        const allUsersPrepared = this.areAllUsersPreparedFromChildren(articleNode.children, prepared);
        if (allUsersPrepared) {
          prepared.add(articleKey);
        }
      }
      
      this.preparedItems.set(prepared);
    }
  }

  private findArticleNode(periodId: string, articleId: string): TreeNode | null {
    const basketTree = this.basketTree();
    
    for (const periodNode of basketTree) {
      if (periodNode.data?.periodId === periodId && periodNode.children) {
        for (const articleNode of periodNode.children) {
          if (articleNode.data?.articleId === articleId) {
            return articleNode;
          }
        }
      }
    }
    
    return null;
  }

  private areAllUsersPreparedFromChildren(children: TreeNode[], prepared: Set<string>): boolean {
    if (children.length === 0) return false;
    
    for (const child of children) {
      const childData = child.data;
      if (childData?.type === 'user' && childData.periodId && childData.articleId && childData.userId) {
        const userKey = `${childData.periodId}-${childData.articleId}-${childData.userId}`;
        if (!prepared.has(userKey)) {
          return false;
        }
      }
    }
    
    return true;
  }

  protected isArticlePrepared(node: TreeNode): boolean {
    const articleData = node.data;
    if (articleData?.type === 'article' && articleData.periodId && articleData.articleId) {
      // Verificar si tots els usuaris de l'article estan preparats
      return this.areAllUsersPrepared(articleData.periodId, articleData.articleId);
    }
    return false;
  }

  protected isUserPrepared(node: TreeNode): boolean {
    const userData = node.data;
    if (userData?.type === 'user' && userData.periodId && userData.articleId && userData.userId) {
      const userKey = `${userData.periodId}-${userData.articleId}-${userData.userId}`;
      return this.preparedItems().has(userKey);
    }
    return false;
  }

  private isArticlePreparedByKey(key: string): boolean {
    return this.preparedItems().has(key);
  }

  private areAllUsersPrepared(periodId: string, articleId: string): boolean {
    const prepared = this.preparedItems();
    const basketTree = this.basketTree();
    
    // Trobar l'article al tree
    for (const periodNode of basketTree) {
      if (periodNode.data?.periodId === periodId && periodNode.children) {
        for (const articleNode of periodNode.children) {
          if (articleNode.data?.articleId === articleId && articleNode.children) {
            // Verificar si tots els usuaris estan preparats
            if (articleNode.children.length === 0) return false;
            
            for (const userNode of articleNode.children) {
              const userData = userNode.data;
              if (userData?.type === 'user' && userData.userId) {
                const userKey = `${periodId}-${articleId}-${userData.userId}`;
                if (!prepared.has(userKey)) {
                  return false;
                }
              }
            }
            return true;
          }
        }
      }
    }
    
    return false;
  }

  protected isOrderPrepared(orderId: string): boolean {
    return this.preparedOrders().has(orderId);
  }

  protected async markOrderAsPrepared(orderId: string): Promise<void> {
    // Trobar tots els items d'aquesta comanda
    const basketTree = this.basketTree();
    const prepared = new Set(this.preparedItems());
    const orderItems: Array<{ periodId: string; articleId: string; userId: string }> = [];

    for (const periodNode of basketTree) {
      if (periodNode.children) {
        for (const articleNode of periodNode.children) {
          if (articleNode.children) {
            for (const userNode of articleNode.children) {
              const userData = userNode.data;
              if (userData?.type === 'user' && userData.orderId === orderId) {
                orderItems.push({
                  periodId: userData.periodId,
                  articleId: userData.articleId,
                  userId: userData.userId
                });
              }
            }
          }
        }
      }
    }

    // Marcar tots els items d'aquesta comanda com a preparats
    orderItems.forEach(item => {
      const userKey = `${item.periodId}-${item.articleId}-${item.userId}`;
      const articleKey = `${item.periodId}-${item.articleId}`;
      prepared.add(userKey);
      prepared.add(articleKey);
    });

    // Actualitzar l'estat
    this.preparedItems.set(prepared);
    const preparedOrders = new Set(this.preparedOrders());
    preparedOrders.add(orderId);
    this.preparedOrders.set(preparedOrders);

    // Marcar la comanda com a preparada al backend (usant isDelivered com a "preparada")
    try {
      await this.salesService.updateDeliveryStatus(orderId, true);
      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: 'Comanda marcada com a preparada'
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al marcar la comanda com a preparada'
      });
    }
  }

  protected isOrderPreparedForNode(node: TreeNode): boolean {
    const userData = node.data;
    if (userData?.orderId) {
      return this.preparedOrders().has(userData.orderId);
    }
    // Si és un article, verificar si algun dels seus usuaris pertany a una comanda preparada
    if (node.children) {
      for (const child of node.children) {
        const childData = child.data;
        if (childData?.orderId && this.preparedOrders().has(childData.orderId)) {
          return true;
        }
      }
    }
    return false;
  }

  protected hasUnpreparedOrders(periodId: string): boolean {
    const orders = this.ordersByPeriod().get(periodId);
    if (!orders) return false;
    return orders.some(order => !this.preparedOrders().has(order.orderId));
  }

  protected areAllOrdersPrepared(periodId: string): boolean {
    const orders = this.ordersByPeriod().get(periodId);
    if (!orders || orders.length === 0) return false;
    return orders.every(order => this.preparedOrders().has(order.orderId));
  }

  protected async onPeriodOrdersPreparedChange(periodId: string, checked: boolean): Promise<void> {
    if (checked) {
      await this.markAllOrdersAsPrepared(periodId);
    } else {
      // Desmarcar totes les comandes del període
      const orders = this.ordersByPeriod().get(periodId);
      if (!orders) return;

      const preparedOrders = new Set(this.preparedOrders());
      const orderIdsToUpdate: string[] = [];

      for (const order of orders) {
        if (this.preparedOrders().has(order.orderId)) {
          orderIdsToUpdate.push(order.orderId);
          preparedOrders.delete(order.orderId);
        }
      }

      this.preparedOrders.set(preparedOrders);

      // Actualitzar el backend
      try {
        await Promise.all(
          orderIdsToUpdate.map(orderId => 
            this.salesService.updateDeliveryStatus(orderId, false)
          )
        );
        this.messageService.add({
          severity: 'success',
          summary: 'Èxit',
          detail: `${orderIdsToUpdate.length} comanda${orderIdsToUpdate.length > 1 ? 's' : ''} desmarcada${orderIdsToUpdate.length > 1 ? 's' : ''}`
        });
      } catch (error) {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Error al desmarcar les comandes'
        });
      }
    }
  }

  protected async markAllOrdersAsPrepared(periodId: string): Promise<void> {
    const orders = this.ordersByPeriod().get(periodId);
    if (!orders) return;

    const basketTree = this.basketTree();
    const prepared = new Set(this.preparedItems());
    const preparedOrders = new Set(this.preparedOrders());
    const orderIdsToUpdate: string[] = [];

    // Trobar tots els items de totes les comandes d'aquest període
    for (const order of orders) {
      if (this.preparedOrders().has(order.orderId)) continue; // Ja està preparada

      orderIdsToUpdate.push(order.orderId);
      preparedOrders.add(order.orderId);

      // Trobar tots els items d'aquesta comanda al tree
      for (const periodNode of basketTree) {
        if (periodNode.data?.periodId !== periodId) continue;

        if (periodNode.children) {
          for (const articleNode of periodNode.children) {
            if (articleNode.children) {
              for (const userNode of articleNode.children) {
                const userData = userNode.data;
                if (userData?.type === 'user' && userData.orderId === order.orderId) {
                  const userKey = `${userData.periodId}-${userData.articleId}-${userData.userId}`;
                  const articleKey = `${userData.periodId}-${userData.articleId}`;
                  prepared.add(userKey);
                  prepared.add(articleKey);
                }
              }
            }
          }
        }
      }
    }

    // Actualitzar l'estat
    this.preparedItems.set(prepared);
    this.preparedOrders.set(preparedOrders);

    // Marcar totes les comandes com a preparades al backend
    try {
      await Promise.all(
        orderIdsToUpdate.map(orderId => 
          this.salesService.updateDeliveryStatus(orderId, true)
        )
      );
      this.messageService.add({
        severity: 'success',
        summary: 'Èxit',
        detail: `${orderIdsToUpdate.length} comanda${orderIdsToUpdate.length > 1 ? 's' : ''} marcada${orderIdsToUpdate.length > 1 ? 's' : ''} com a preparada${orderIdsToUpdate.length > 1 ? 's' : ''}`
      });
    } catch (error) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'Error al marcar les comandes com a preparades'
      });
    }
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
            detail: error?.error?.message || 'Error eliminant article de la comanda'
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
