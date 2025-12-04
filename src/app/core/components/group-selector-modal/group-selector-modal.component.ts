import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ConsumerGroupService } from '../../services/consumer-group.service';
import { ConsumerGroupWithRole } from '../../models/consumer-group.model';

@Component({
  selector: 'app-group-selector-modal',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TranslateModule,
    DialogModule,
    ButtonModule,
  ],
  templateUrl: './group-selector-modal.component.html',
  styleUrl: './group-selector-modal.component.scss'
})
export class GroupSelectorModalComponent {
  private readonly groupService = inject(ConsumerGroupService);
  private readonly router = inject(Router);

  readonly visible = signal(false);
  readonly groups = this.groupService.userGroups;
  readonly selectedGroupId = this.groupService.selectedGroupId;

  show(): void {
    this.visible.set(true);
  }

  hide(): void {
    this.visible.set(false);
  }

  onVisibleChange(value: boolean): void {
    this.visible.set(value);
  }

  selectGroup(group: ConsumerGroupWithRole): void {
    this.groupService.setSelectedGroup(group.id);
    this.hide();
    this.router.navigate(['/home']);
  }

  continueToHome(): void {
    this.hide();
    this.router.navigate(['/home']);
  }

  isGroupSelected(groupId: string): boolean {
    return this.selectedGroupId() === groupId;
  }
}

