export interface CategoryNode {
  id?: string;
  name: string;
  type: 'category' | 'product' | 'variety';
  parentId?: string;
  children?: CategoryNode[];
  isEditing?: boolean;
  isNew?: boolean;
}

export interface CategoryTreeItem {
  category: string;
  product?: string;
  variety?: string;
  consumerGroupId: string;
}

