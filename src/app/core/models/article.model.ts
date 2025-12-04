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
  name: string;
  category?: string;
  product?: string;
  variety?: string;
  description?: string;
  image?: string;
  unitMeasure: UnitMeasure;
  pricePerUnit: number;
  city?: string;
  producerId?: string;
  producerName?: string;
  supplierName?: string;
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
