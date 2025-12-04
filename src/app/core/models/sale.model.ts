export enum PaymentStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
}

export interface SaleItem {
  id: string;
  articleId: string;
  articleName: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  paidAmount: number;
}

export interface Sale {
  id: string;
  userEmail: string;
  consumerGroupId: string;
  items: SaleItem[];
  totalAmount: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
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
