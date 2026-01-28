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
  selectedOptions?: SelectedOption[];
}

export interface SelectedOption {
  optionId: string;
  title: string;
  type: 'boolean' | 'numeric' | 'string' | 'select' | 'multiselect';
  value: boolean | number | string | string[];
  price?: number; // Preu addicional d'aquesta opció seleccionada
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





