import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { MenuModule } from 'primeng/menu';
import { MenuItem, MessageService, ConfirmationService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';

import { ConsumerGroupService } from '../../../../core/services/consumer-group.service';
import { ConsumerGroupWithRole } from '../../../../core/models/consumer-group.model';
import { GeneralSettingsComponent } from '../../components/general-settings/general-settings.component';
import { CategoriesSettingsComponent } from '../../components/categories-settings/categories-settings.component';

@Component({
  selector: 'app-group-settings',
  standalone: true,
  imports: [
    CommonModule,
    TranslateModule,
    MenuModule,
    ToastModule,
    GeneralSettingsComponent,
    CategoriesSettingsComponent
  ],
  providers: [MessageService, ConfirmationService],
  templateUrl: './group-settings.component.html',
  styleUrl: './group-settings.component.scss'
})
export class GroupSettingsComponent implements OnInit {
  private readonly groupService = inject(ConsumerGroupService);

  protected readonly selectedSection = signal<string>('general');
  protected readonly menuItems = signal<MenuItem[]>([]);
  protected readonly currentGroup = computed<ConsumerGroupWithRole | null>(() => {
    return this.groupService.selectedGroup();
  });
  protected readonly currentGroupId = computed<string>(() => {
    return this.currentGroup()?.id || '';
  });

  async ngOnInit(): Promise<void> {
    // Carregar la informació dels grups de l'usuari
    // Això també carregarà el grup seleccionat del localStorage
    await this.groupService.loadUserGroups();

    this.menuItems.set([
      {
        label: 'settings.menu.general',
        icon: 'pi pi-cog',
        command: () => this.selectedSection.set('general')
      },
      {
        label: 'settings.menu.categories',
        icon: 'pi pi-sitemap',
        command: () => this.selectedSection.set('categories')
      }
    ]);
  }
}

