import { Injectable, inject, signal, computed } from '@angular/core';
import { ApiService } from './api.service';
import { LocalStorageService } from './local-storage.service';
import { ConsumerGroupWithRole, ConsumerGroup } from '../models/consumer-group.model';

@Injectable({
  providedIn: 'root'
})
export class ConsumerGroupService {
  private readonly api = inject(ApiService);
  private readonly localStorage = inject(LocalStorageService);

  // Signals
  readonly userGroups = signal<ConsumerGroupWithRole[]>([]);
  readonly selectedGroupId = signal<string | null>(this.localStorage.getSelectedGroupId());
  readonly selectedGroup = computed(() => {
    const groupId = this.selectedGroupId();
    return this.userGroups().find(g => g.id === groupId) || null;
  });
  readonly isManager = computed(() => this.selectedGroup()?.role?.isManager || false);
  readonly isPreparer = computed(() => this.selectedGroup()?.role?.isPreparer || false);
  readonly isLoading = signal(false);

  async loadUserGroups(): Promise<void> {
    this.isLoading.set(true);

    try {
      const groups = await this.api.get<ConsumerGroupWithRole[]>('consumer-groups');
      console.log('Grupos cargados:', groups);
      console.log('Roles de cada grupo:', groups.map(g => ({ name: g.name, role: g.role })));

      this.userGroups.set(groups);

      // Auto-select logic:
      // 1. If no group is selected and user has groups
      if (!this.selectedGroupId() && groups.length > 0) {
        // 2. First priority: check if there's a default group (isDefault = true)
        const defaultGroup = groups.find(g => g.role?.isDefault === true);
        console.log('Grupo por defecto encontrado:', defaultGroup?.name, defaultGroup?.role);

        if (defaultGroup) {
          console.log('Auto-seleccionando grupo por defecto:', defaultGroup.name);
          this.setSelectedGroup(defaultGroup.id);
        } else if (groups.length === 1) {
          // 3. If no default but only one group, auto-select it
          console.log('Solo hay 1 grupo, auto-seleccionando:', groups[0].name);
          this.setSelectedGroup(groups[0].id);
        } else {
          // 4. Multiple groups without default - user must choose via modal
          console.warn('Múltiples grupos sin grupo por defecto. El usuario debe seleccionar manualmente.');
        }
      }

      // Validate selected group still exists in user's groups
      if (this.selectedGroupId()) {
        const groupExists = groups.some(g => g.id === this.selectedGroupId());
        if (!groupExists) {
          // If selected group no longer exists, clear selection
          this.selectedGroupId.set(null);
          this.localStorage.removeSelectedGroup();

          // Only auto-select if there's exactly one group left
          if (groups.length === 1) {
            this.setSelectedGroup(groups[0].id);
          }
        }
      }
    } finally {
      this.isLoading.set(false);
    }
  }

  setSelectedGroup(groupId: string): void {
    this.selectedGroupId.set(groupId);
    this.localStorage.setSelectedGroupId(groupId);
  }

  async getGroupById(id: string): Promise<ConsumerGroup> {
    return this.api.get<ConsumerGroup>(`consumer-groups/${id}`);
  }

  async createGroup(data: Partial<ConsumerGroup>): Promise<ConsumerGroup> {
    const group = await this.api.post<ConsumerGroup>('consumer-groups', data);

    await this.loadUserGroups();
    return group;
  }

  async updateGroup(id: string, data: Partial<ConsumerGroup>): Promise<ConsumerGroup> {
    const group = await this.api.patch<ConsumerGroup>(`consumer-groups/${id}`, data);

    await this.loadUserGroups();
    return group;
  }

  async uploadGroupImage(groupId: string, file: File): Promise<ConsumerGroup> {
    const formData = new FormData();
    formData.append('file', file);

    const group = await this.api.postFile<ConsumerGroup>(`consumer-groups/${groupId}/image`, formData);

    await this.loadUserGroups();
    return group;
  }

  async useInvitationToken(token: string, userEmail: string): Promise<void> {
    await this.api.post('consumer-groups/invitations/use', { token, email: userEmail });
    await this.loadUserGroups();
  }
}

