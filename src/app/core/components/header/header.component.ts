import { Component, inject, ChangeDetectionStrategy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { MenuItem } from 'primeng/api';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-header',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    TranslateModule,
    ButtonModule,
    MenuModule,
    TooltipModule,
  ],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
})
export class HeaderComponent {
  protected readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly translate = inject(TranslateService);

  protected readonly userMenuVisible = signal<boolean>(false);

  protected readonly userMenuItems = computed<MenuItem[]>(() => [
    {
      label: this.translate.instant('header.profile'),
      icon: 'pi pi-user',
      command: () => this.goToProfile()
    },
    {
      separator: true
    },
    {
      label: this.translate.instant('header.logout'),
      icon: 'pi pi-sign-out',
      command: () => this.logout()
    }
  ]);

  protected goHome(): void {
    this.router.navigate(['/home']);
  }

  protected goToProfile(): void {
    this.router.navigate(['/profile']);
  }

  protected async logout(): Promise<void> {
    await this.authService.logout();
  }

  protected toggleUserMenu(): void {
    this.userMenuVisible.set(!this.userMenuVisible());
  }
}

