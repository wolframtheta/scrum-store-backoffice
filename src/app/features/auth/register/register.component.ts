import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { MessageModule } from 'primeng/message';
import { ProgressSpinnerModule } from 'primeng/progressspinner';

import { AuthService } from '../../../core/services/auth.service';
import { getErrorMessage } from '../../../core/models/http-error.model';
import { InvitationService } from '../../users/services/invitation.service';
import { ConsumerGroupService } from '../../../core/services/consumer-group.service';

@Component({
  selector: 'app-register',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    TranslateModule,
    ButtonModule,
    InputTextModule,
    PasswordModule,
    MessageModule,
    ProgressSpinnerModule
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss'
})
export class RegisterComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly authService = inject(AuthService);
  private readonly invitationService = inject(InvitationService);
  private readonly groupService = inject(ConsumerGroupService);
  private readonly translate = inject(TranslateService);

  protected readonly form: FormGroup;
  protected readonly invitationToken = signal<string | null>(null);
  protected readonly groupName = signal<string | null>(null);
  protected readonly isValidatingToken = signal<boolean>(false);
  protected readonly tokenValid = signal<boolean>(false);
  protected readonly isRegistering = signal<boolean>(false);
  protected readonly errorMessage = signal<string | null>(null);

  constructor() {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      name: ['', Validators.required],
      surname: ['', Validators.required]
    }, {
      validators: this.passwordMatchValidator
    });
  }

  async ngOnInit(): Promise<void> {
    // Obtenir token de la URL si existeix
    this.route.queryParams.subscribe(async params => {
      const token = params['token'];
      if (token) {
        this.invitationToken.set(token);
        await this.validateToken(token);
      }
    });
  }

  private async validateToken(token: string): Promise<void> {
    this.isValidatingToken.set(true);
    this.errorMessage.set(null);

    try {
      const validation = await this.invitationService.validateInvitation(token);
      this.tokenValid.set(validation.valid);
      this.groupName.set(validation.groupName || null);
    } catch (error: any) {
      this.tokenValid.set(false);
      this.errorMessage.set(getErrorMessage(error, this.translate.instant('register.errors.invalidToken')));
    } finally {
      this.isValidatingToken.set(false);
    }
  }

  protected async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isRegistering.set(true);
    this.errorMessage.set(null);

    try {
      const formValue = this.form.value;

      // Registrar usuari
      try {
        const authResponse = await this.authService.register({
          email: formValue.email,
          password: formValue.password,
          name: formValue.name,
          surname: formValue.surname
        });
      } catch (error: any) {
        // Si l'usuari ja existeix, redirigir a invitation-success amb el token
        if (error?.error?.statusCode === 409 || error?.error?.message?.includes('already exists')) {
          const token = this.invitationToken();
          if (token) {
            await this.router.navigate(['/invitation-success'], {
              queryParams: { token, email: formValue.email }
            });
            return;
          }
        }
        throw error;
      }

      // Si té token d'invitació, usar-lo per unir-se al grup
      const token = this.invitationToken();
      if (token && this.tokenValid()) {
        try {
          // Esperar una mica per assegurar que l'usuari està guardat a la BD
          await new Promise(resolve => setTimeout(resolve, 500));
          await this.groupService.useInvitationToken(token, formValue.email);
        } catch (error: any) {
          console.error('Error using invitation token:', error);
          // Mostrar error però no bloquejar el registre
          this.errorMessage.set(
            getErrorMessage(error, this.translate.instant('register.errors.invitationFailed') || 'Error al unir-se al grup. Pots intentar-ho més tard.')
          );
        }
      }

      // Redirigir al login o home
      await this.router.navigate(['/login'], {
        queryParams: { registered: 'true' }
      });
    } catch (error: any) {
      this.errorMessage.set(
        getErrorMessage(error, this.translate.instant('register.errors.generic'))
      );
    } finally {
      this.isRegistering.set(false);
    }
  }

  protected isFieldInvalid(fieldName: string): boolean {
    const field = this.form.get(fieldName);
    return !!(field && field.invalid && (field.dirty || field.touched));
  }

  protected getFieldError(fieldName: string): string {
    const field = this.form.get(fieldName);
    if (field?.hasError('required')) {
      return 'common.errors.required';
    }
    if (field?.hasError('email')) {
      return 'common.errors.invalidEmail';
    }
    if (field?.hasError('minlength')) {
      return 'register.errors.passwordMinLength';
    }
    if (field?.hasError('passwordMismatch')) {
      return 'register.errors.passwordMismatch';
    }
    return '';
  }

  private passwordMatchValidator(group: FormGroup): { passwordMismatch: boolean } | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  protected goToLogin(): void {
    this.router.navigate(['/login']);
  }

  protected goToInvitationSuccess(): void {
    const token = this.invitationToken();
    if (token) {
      this.router.navigate(['/invitation-success'], {
        queryParams: { token }
      });
    } else {
      this.router.navigate(['/login']);
    }
  }
}

