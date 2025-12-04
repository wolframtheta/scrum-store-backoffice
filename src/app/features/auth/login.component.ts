import { Component, inject, signal, ChangeDetectionStrategy, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { ConsumerGroupService } from '../../core/services/consumer-group.service';
import { GroupSelectorModalComponent } from '../../core/components/group-selector-modal/group-selector-modal.component';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    TranslateModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule,
    InputGroupModule,
    InputGroupAddonModule,
    GroupSelectorModalComponent,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  protected readonly authService = inject(AuthService);
  private readonly groupService = inject(ConsumerGroupService);
  private readonly translate = inject(TranslateService);

  protected readonly groupSelectorModal = viewChild.required(GroupSelectorModalComponent);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }

  protected async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      return;
    }

    this.errorMessage.set(null);

    try {
      // 1. Login
      await this.authService.login(this.loginForm.value);

      // 2. Comprobar si es SuperAdmin
      const isSuperAdmin = this.authService.isSuperAdmin();

      // 3. Si es SuperAdmin, ir directo a /home sin modal ni grupos
      if (isSuperAdmin) {
        await this.router.navigate(['/home']);
        return;
      }

      // 4. Para usuarios normales: cargar grupos del usuario
      await this.groupService.loadUserGroups();

      // 5. Comprovar si és manager d'almenys un grup
      const hasManagerRole = this.groupService.userGroups().some(group => group.role?.isManager === true);

      if (!hasManagerRole) {
        // L'usuari no és SuperAdmin ni manager, no pot accedir al backoffice
        await this.authService.logout();
        this.errorMessage.set(this.translate.instant('auth.accessDenied'));
        return;
      }

      // 6. Si ya tiene un grupo seleccionado (autoseleccionado), ir a home
      // Si no, mostrar modal de selección
      if (this.groupService.selectedGroupId()) {
        await this.router.navigate(['/home']);
      } else {
        // Mostrar modal de selección de grupo
        this.groupSelectorModal().show();
      }
    } catch (error) {
      console.error('Login error:', error);
      this.errorMessage.set('Credenciales incorrectas');
    }
  }
}
