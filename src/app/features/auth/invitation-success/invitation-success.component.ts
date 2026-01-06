import { Component, inject, signal, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { AuthService } from '../../../core/services/auth.service';
import { ConsumerGroupService } from '../../../core/services/consumer-group.service';
import { InvitationService } from '../../users/services/invitation.service';

@Component({
  selector: 'app-invitation-success',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    ButtonModule,
    MessageModule,
    ProgressSpinnerModule,
    InputTextModule,
    PasswordModule,
    InputGroupModule,
    InputGroupAddonModule
  ],
  templateUrl: './invitation-success.component.html',
  styleUrl: './invitation-success.component.scss'
})
export class InvitationSuccessComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly groupService = inject(ConsumerGroupService);
  private readonly invitationService = inject(InvitationService);
  private readonly translate = inject(TranslateService);

  protected readonly isLoading = signal<boolean>(false);
  protected readonly isValidatingToken = signal<boolean>(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly groupName = signal<string | null>(null);
  protected readonly isManager = signal<boolean>(false);
  protected readonly invitationToken = signal<string | null>(null);
  protected readonly tokenValid = signal<boolean>(false);
  protected readonly showLoginForm = signal<boolean>(false);
  protected readonly isProcessing = signal<boolean>(false);

  protected readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  async ngOnInit(): Promise<void> {
    this.route.queryParams.subscribe(async params => {
      const token = params['token'];
      const email = params['email'];

      if (email) {
        this.loginForm.patchValue({ email });
      }

      if (token) {
        this.invitationToken.set(token);
        await this.validateToken(token);
      } else {
        this.errorMessage.set('Falta el token d\'invitació.');
        this.isValidatingToken.set(false);
      }
    });
  }

  private async validateToken(token: string): Promise<void> {
    try {
      const validation = await this.invitationService.validateInvitation(token);
      this.tokenValid.set(validation.valid);
      if (validation.groupName) {
        this.groupName.set(validation.groupName);
      }
      if (validation.valid) {
        this.showLoginForm.set(true);
      } else {
        this.errorMessage.set('El token d\'invitació no és vàlid o ha caducat.');
      }
    } catch (error: any) {
      this.tokenValid.set(false);
      this.errorMessage.set(error?.error?.message || 'Error al validar el token d\'invitació.');
    } finally {
      this.isValidatingToken.set(false);
    }
  }

  protected async onSubmit(): Promise<void> {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }

    const token = this.invitationToken();
    if (!token || !this.tokenValid()) {
      this.errorMessage.set('Token d\'invitació invàlid.');
      return;
    }

    this.isProcessing.set(true);
    this.errorMessage.set(null);

    try {
      const formValue = this.loginForm.value;

      // 1. Fer login
      await this.authService.login(formValue);

      // 2. Carregar grups
      await this.groupService.loadUserGroups();

      // 3. Usar el token d'invitació per unir-se al grup
      await this.groupService.useInvitationToken(token, formValue.email);

      // 4. Recarregar grups després d'unir-se
      await this.groupService.loadUserGroups();

      // 5. Comprovar si és gestor
      const hasManagerRole = this.groupService.userGroups().some(group => group.role?.isManager === true);
      this.isManager.set(hasManagerRole);

      // 6. Esperar una mica per mostrar el missatge
      await new Promise(resolve => setTimeout(resolve, 1500));

      // 7. Redirigir segons el rol
      if (this.authService.isSuperAdmin()) {
        await this.router.navigate(['/home']);
      } else if (hasManagerRole) {
        // Si és gestor, redirigir al backoffice
        await this.router.navigate(['/home']);
      } else {
        // Si no és gestor, mostrar missatge (no redirigir automàticament)
        this.showLoginForm.set(false);
        this.isProcessing.set(false);
      }
    } catch (error: any) {
      console.error('Error processing invitation:', error);
      this.errorMessage.set(
        error?.error?.message || 
        'Error al processar la invitació. Si us plau, intenta-ho de nou.'
      );
      this.isProcessing.set(false);
    }
  }

  private async processInvitation(): Promise<void> {
    // Aquest mètode ja no es fa servir, però el mantenim per compatibilitat
  }

  protected async goToLogin(): Promise<void> {
    await this.router.navigate(['/login']);
  }

  protected async goToHome(): Promise<void> {
    await this.router.navigate(['/home']);
  }
}

