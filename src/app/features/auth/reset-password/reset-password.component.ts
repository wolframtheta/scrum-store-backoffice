import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute, RouterModule } from '@angular/router';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { getErrorMessage } from '../../../core/models/http-error.model';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { MessageModule } from 'primeng/message';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { ApiService } from '../../../core/services/api.service';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password');
  const confirmPassword = control.get('confirmPassword');
  
  if (!password || !confirmPassword) {
    return null;
  }
  
  return password.value === confirmPassword.value ? null : { passwordMismatch: true };
}

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    TranslateModule,
    InputTextModule,
    PasswordModule,
    ButtonModule,
    MessageModule,
    InputGroupModule,
    InputGroupAddonModule
  ],
  templateUrl: './reset-password.component.html',
  styleUrl: './reset-password.component.scss'
})
export class ResetPasswordComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ApiService);
  private readonly translate = inject(TranslateService);

  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly isLoading = signal(false);
  private returnUrl: string = '/login';

  protected readonly resetForm: FormGroup = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator });

  ngOnInit(): void {
    this.route.queryParams.subscribe(params => {
      if (params['returnUrl']) {
        this.returnUrl = params['returnUrl'];
      }
    });
  }

  get email() {
    return this.resetForm.get('email');
  }

  get password() {
    return this.resetForm.get('password');
  }

  get confirmPassword() {
    return this.resetForm.get('confirmPassword');
  }

  protected async onSubmit(): Promise<void> {
    if (this.resetForm.invalid) {
      this.resetForm.markAllAsTouched();
      return;
    }

    // Verificar que las contraseñas coincidan
    if (this.resetForm.errors?.['passwordMismatch']) {
      this.errorMessage.set(await this.translate.get('resetPassword.passwordsNotMatch').toPromise());
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const formValue = this.resetForm.value;
      await this.api.post('auth/reset-password', {
        email: formValue.email,
        password: formValue.password,
        confirmPassword: formValue.confirmPassword
      });

      this.successMessage.set(await this.translate.get('resetPassword.success').toPromise());

      // Esperar un momento antes de redirigir
      setTimeout(() => {
        // Si el returnUrl es una ruta relativa, usar router
        if (this.returnUrl.startsWith('/')) {
          this.router.navigate([this.returnUrl]);
        } else if (this.returnUrl.startsWith('http')) {
          // Si es una URL completa, redirigir con window.location
          window.location.href = this.returnUrl;
        } else {
          // Por defecto, redirigir al login
          this.router.navigate(['/login']);
        }
      }, 2000);
    } catch (error: any) {
      const fallback = await this.translate.get('resetPassword.error').toPromise();
      const errorMsg = getErrorMessage(error, fallback);
      this.errorMessage.set(errorMsg);
    } finally {
      this.isLoading.set(false);
    }
  }
}

