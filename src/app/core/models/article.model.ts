export enum UnitMeasure {
  G = 'g',
  KG = 'kg',
  ML = 'ml',
  CL = 'cl',
  L = 'l',
  UNIT = 'unit',
  MANAT = 'manat',
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
  customizationOptions?: CustomizationOption[];
}

export interface CustomizationOption {
  id: string;
  title: string;
  type: 'boolean' | 'numeric' | 'string' | 'select' | 'multiselect';
  required?: boolean;
  price?: number; // Preu addicional quan s'activa/selecciona aquesta opció
  values?: CustomizationOptionValue[];
}

export interface CustomizationOptionValue {
  id: string;
  label: string;
  price?: number; // Preu addicional per aquest valor específic (per select/multiselect)
}

export interface PriceHistory {
  id: string;
  articleId: string;
  pricePerUnit: number;
  changedAt: Date;
}
