export enum PaymentStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
}

import { Article } from './article.model';

export interface SaleItem {
  id: string;
  articleId: string;
  article?: Article;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  paidAmount: number;
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
