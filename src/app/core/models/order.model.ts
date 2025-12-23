export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
}

export interface OrderItem {
  articleId: string;
  quantity: number;
  pricePerUnit: number;
  totalPrice: number;
  article?: any;
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





