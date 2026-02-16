export enum PaymentStatus {
  UNPAID = 'unpaid',
  PAID = 'paid',
}

import { Article } from './article.model';

export interface SelectedOption {
  optionId: string;
  title: string;
  type: 'boolean' | 'numeric' | 'string' | 'select' | 'multiselect';
  value: boolean | number | string | string[];
  price?: number;
}

export interface SaleItem {
  id: string;
  articleId: string;
  article?: Article;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  paidAmount: number;
  isPrepared: boolean;
  selectedOptions?: SelectedOption[];
  periodId?: string;
  period?: { id: string; name: string; startDate: Date | string; endDate: Date | string; deliveryDate?: Date | string };
}

export interface Sale {
  id: string;
  userId?: string; // Per comandes (orders)
  userEmail?: string; // Per vendes (sales)
  userName?: string;
  consumerGroupId: string;
  items: SaleItem[];
  totalAmount: number;
  paidAmount: number;
  transportCost?: number;
  paymentStatus: PaymentStatus;
  isDelivered: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ItemPayment {
  itemId: string;
  amount: number;
}

export interface RegisterPaymentDto {
  items: ItemPayment[];
}
