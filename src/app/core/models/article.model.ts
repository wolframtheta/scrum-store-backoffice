export enum UnitMeasure {
  G = 'g',
  KG = 'kg',
  ML = 'ml',
  CL = 'cl',
  L = 'l',
  UNIT = 'unit',
}

export interface Article {
  id: string;
  category: string;
  product: string;
  variety?: string;
  description?: string;
  image?: string;
  unitMeasure: UnitMeasure;
  pricePerUnit: number;
  currentPeriodPrice?: number; // Preu del període actual
  city?: string;
  producerId?: string;
  producerName?: string;
  supplierName?: string;
  isEco?: boolean;
  taxRate?: number;
  consumerGroupId: string;
  inShowcase: boolean;
  isSeasonal: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface PriceHistory {
  id: string;
  articleId: string;
  pricePerUnit: number;
  changedAt: Date;
}
