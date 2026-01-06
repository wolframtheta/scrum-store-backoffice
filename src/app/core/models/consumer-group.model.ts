export interface ConsumerGroup {
  id: string;
  name: string;
  description?: string;
  city?: string;
  address?: string;
  phone?: string;
  email?: string;
  image?: string;
  openingSchedule?: OpeningSchedule;
  createdAt: Date;
  updatedAt: Date;
}

export interface OpeningSchedule {
  [day: string]: DaySchedule;
}

export interface DaySchedule {
  open?: string;
  close?: string;
  closed?: boolean;
}

export interface UserConsumerGroupRole {
  isClient: boolean;
  isManager: boolean;
  isPreparer: boolean;
  isDefault: boolean;
}

export interface ConsumerGroupWithRole extends ConsumerGroup {
  role: UserConsumerGroupRole;
}


