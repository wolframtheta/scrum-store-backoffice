export interface GroupMember {
  userEmail: string;
  name?: string;
  surname?: string;
  isClient: boolean;
  isManager: boolean;
  isPreparer: boolean;
  joinedAt: Date;
}

export interface AddMemberDto {
  userEmail: string;
  isClient?: boolean;
  isManager?: boolean;
  isPreparer?: boolean;
}

export interface UpdateMemberRoleDto {
  isClient?: boolean;
  isManager?: boolean;
  isPreparer?: boolean;
}

