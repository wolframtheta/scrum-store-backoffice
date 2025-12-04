export interface Producer {
  id: string;
  name: string;
  supplierId?: string;
  supplierName?: string;
  email?: string;
  phone?: string;
  city?: string;
  address?: string;
  notes?: string;
  consumerGroupId: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

