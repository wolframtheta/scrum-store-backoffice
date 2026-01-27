export enum PeriodRecurrence {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BIWEEKLY = 'biweekly',
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  YEARLY = 'yearly',
  CUSTOM = 'custom',
}

export interface PeriodArticle {
  id: string;
  articleId: string;
  article?: {
    id: string;
    product: string;
    variety?: string;
    unitMeasure: string;
  };
  pricePerUnit: number;
}

export interface Period {
  id: string;
  name: string;
  supplierId: string;
  supplier?: {
    id: string;
    name: string;
  };
  startDate: Date | string;
  endDate: Date | string;
  deliveryDate: Date | string;
  recurrence: PeriodRecurrence;
  transportCost?: number;
  transportTaxRate?: number;
  periodArticles?: PeriodArticle[];
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface CreatePeriodArticleDto {
  articleId: string;
  pricePerUnit: number;
}

export interface CreatePeriodDto {
  name: string;
  supplierId: string;
  startDate: string;
  endDate: string;
  deliveryDate: string;
  recurrence?: PeriodRecurrence;
  transportCost?: number;
  transportTaxRate?: number;
  articles?: CreatePeriodArticleDto[];
}

