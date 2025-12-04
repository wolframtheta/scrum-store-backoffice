import { Component, input, output, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CardModule } from 'primeng/card';

export interface ModuleCardConfig {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
  route?: string;
  disabled?: boolean;
}

@Component({
  selector: 'app-module-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, CardModule],
  templateUrl: './module-card.component.html',
  styleUrl: './module-card.component.scss'
})
export class ModuleCardComponent {
  config = input.required<ModuleCardConfig>();
  cardClick = output<string>();

  protected handleClick(): void {
    const route = this.config().route;
    if (!this.config().disabled && route) {
      this.cardClick.emit(route);
    }
  }
}

