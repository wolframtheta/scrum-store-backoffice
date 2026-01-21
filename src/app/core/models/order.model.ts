export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface OrderItem {
  id?: string;
  articleId: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  paidAmount?: number;
  article?: any;
  periodId?: string;
  period?: {
    id: string;
    name: string;
    supplierId: string;
    startDate: Date | string;
    endDate: Date | string;
    deliveryDate: Date | string;
  };
}

export interface Order {
  id: string;
  userId: string;
  userName?: string;
  userEmail?: string;
  consumerGroupId: string;
  items: OrderItem[];
  totalPrice: number;
  status: OrderStatus;
  createdAt: Date;
  updatedAt?: Date;
}





