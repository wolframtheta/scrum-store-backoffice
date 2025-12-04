export interface Supplier {
  id: string;
  name: string;
  taxId?: string;
  email?: string;
  phone?: string;
  city?: string;
  address?: string;
  postalCode?: string;
  bankAccount?: string;
  notes?: string;
  consumerGroupId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

