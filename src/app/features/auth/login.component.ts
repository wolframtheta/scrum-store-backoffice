import { Component, inject, signal, computed, ChangeDetectionStrategy, viewChild, OnInit } from '@angular/core';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../core/services/auth.service';
import { ConsumerGroupService } from '../../core/services/consumer-group.service';
import { InvitationService } from '../users/services/invitation.service';
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
    RouterModule,
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
export class LoginComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly authService = inject(AuthService);
  private readonly groupService = inject(ConsumerGroupService);
  private readonly invitationService = inject(InvitationService);
  private readonly translate = inject(TranslateService);

  protected readonly groupSelectorModal = viewChild.required(GroupSelectorModalComponent);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly invitationToken = signal<string | null>(null);
  protected readonly groupName = signal<string | null>(null);
  protected readonly tokenValid = signal<boolean>(false);
  
  protected readonly invitationMessage = computed(() => {
    const name = this.groupName();
    if (!name) return '';
    return `Has estat convidat a unir-te al grup ${name}. Després del login, t'afegirem automàticament.`;
  });

  protected readonly loginForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]]
  });

  async ngOnInit(): Promise<void> {
    // Obtenir token i email de la URL si existeixen
    this.route.queryParams.subscribe(async params => {
      const token = params['token'];
      const email = params['email'];
      
      if (email) {
        this.loginForm.patchValue({ email });
      }
      
      if (token) {
        this.invitationToken.set(token);
        await this.validateToken(token);
      }
    });
  }

  private async validateToken(token: string): Promise<void> {
    try {
      const validation = await this.invitationService.validateInvitation(token);
      this.tokenValid.set(validation.valid);
      this.groupName.set(validation.groupName || null);
    } catch (error: any) {
      this.tokenValid.set(false);
      this.errorMessage.set(error?.error?.message || 'Token d\'invitació invàlid');
    }
  }

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

      // 2. Cargar grupos del usuario (siempre, incluso para super_admin)
      await this.groupService.loadUserGroups();

      // 3. Si té token d'invitació, usar-lo per unir-se al grup
      const token = this.invitationToken();
      let invitationUsed = false;
      if (token && this.tokenValid()) {
        try {
          const userEmail = this.loginForm.value.email;
          await this.groupService.useInvitationToken(token, userEmail);
          // Recarregar grups després d'afegir-se
          await this.groupService.loadUserGroups();
          invitationUsed = true;
        } catch (error: any) {
          console.error('Error using invitation token:', error);
          // No bloquejar el login si falla la invitació, però mostrar missatge
          this.errorMessage.set(
            error?.error?.message || 
            'Error al unir-se al grup. Pots intentar-ho més tard.'
          );
        }
      }

      // 3. Comprobar si es SuperAdmin
      const isSuperAdmin = this.authService.isSuperAdmin();

      // 4. Si es SuperAdmin, ir directo a /home sin modal
      if (isSuperAdmin) {
        await this.router.navigate(['/home']);
        return;
      }

      // 5. Para usuarios normales: comprobar si es manager o preparador de al menos un grupo
      const hasManagerRole = this.groupService.userGroups().some(group => group.role?.isManager === true);
      const hasPreparerRole = this.groupService.userGroups().some(group => group.role?.isPreparer === true);

      // Si ha usat una invitació, redirigir a la pàgina de confirmació
      if (invitationUsed) {
        await this.router.navigate(['/invitation-success'], {
          queryParams: {
            token: token || '',
            groupName: this.groupName() || ''
          }
        });
        return;
      }

      if (!hasManagerRole && !hasPreparerRole) {
        // El usuario no es SuperAdmin, Admin, manager ni preparador, no puede acceder al backoffice
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
