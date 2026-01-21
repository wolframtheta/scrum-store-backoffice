import { PaymentStatus } from './sale.model';

export interface UserPaymentSummary {
  userId: string;
  userName: string;
  subtotal: number;
  transportCost: number;
  total: number;
  ordersCount: number;
  paidAmount: number;
  paymentStatus: PaymentStatus;
  orderIds: string[];
}

export interface PeriodPaymentSummary {
  periodId: string;
  periodName: string;
  users: UserPaymentSummary[];
  totalSubtotal: number;
  totalTransportCost: number;
  grandTotal: number;
}
