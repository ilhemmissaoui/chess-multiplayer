import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-register',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-container">
      <div class="auth-card">
        <h1>♔ Chess Multiplayer</h1>
        <h2>Create Account</h2>

        @if (errorMessage) {
        <div class="error-message">{{ errorMessage }}</div>
        }

        <form [formGroup]="registerForm" (ngSubmit)="onSubmit()">
          <div class="form-group">
            <label for="username">Username</label>
            <input
              type="text"
              id="username"
              formControlName="username"
              placeholder="Choose a username"
            />
            @if (registerForm.get('username')?.invalid && registerForm.get('username')?.touched) {
            <span class="field-error">Username must be 3-50 characters</span>
            }
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              type="password"
              id="password"
              formControlName="password"
              placeholder="Choose a password"
            />
            @if (registerForm.get('password')?.invalid && registerForm.get('password')?.touched) {
            <span class="field-error">Password must be at least 6 characters</span>
            }
          </div>

          <div class="form-group">
            <label for="confirmPassword">Confirm Password</label>
            <input
              type="password"
              id="confirmPassword"
              formControlName="confirmPassword"
              placeholder="Confirm your password"
            />
            @if (registerForm.get('confirmPassword')?.touched &&
            registerForm.errors?.['passwordMismatch']) {
            <span class="field-error">Passwords do not match</span>
            }
          </div>

          <button type="submit" [disabled]="registerForm.invalid || isLoading">
            {{ isLoading ? 'Creating account...' : 'Register' }}
          </button>
        </form>

        <p class="auth-link">Already have an account? <a routerLink="/login">Login here</a></p>
      </div>
    </div>
  `,
  styles: [
    `
      .auth-container {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      }

      .auth-card {
        background: #0f0f23;
        padding: 2.5rem;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0, 0, 0, 0.4);
        width: 100%;
        max-width: 400px;
        border: 1px solid #2a2a4a;
      }

      h1 {
        text-align: center;
        color: #f0d9b5;
        margin-bottom: 0.5rem;
        font-size: 1.8rem;
      }

      h2 {
        text-align: center;
        color: #b8b8b8;
        margin-bottom: 1.5rem;
        font-weight: 400;
      }

      .form-group {
        margin-bottom: 1.25rem;
      }

      label {
        display: block;
        margin-bottom: 0.5rem;
        color: #b8b8b8;
        font-size: 0.9rem;
      }

      input {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 1px solid #2a2a4a;
        border-radius: 6px;
        background: #1a1a2e;
        color: #fff;
        font-size: 1rem;
        transition: border-color 0.2s;

        &:focus {
          outline: none;
          border-color: #f0d9b5;
        }

        &::placeholder {
          color: #666;
        }
      }

      button {
        width: 100%;
        padding: 0.875rem;
        background: #b58863;
        color: #fff;
        border: none;
        border-radius: 6px;
        font-size: 1rem;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;

        &:hover:not(:disabled) {
          background: #d4a574;
        }

        &:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }
      }

      .error-message {
        background: #ff4d4d20;
        border: 1px solid #ff4d4d;
        color: #ff6b6b;
        padding: 0.75rem;
        border-radius: 6px;
        margin-bottom: 1rem;
        text-align: center;
      }

      .field-error {
        color: #ff6b6b;
        font-size: 0.8rem;
        margin-top: 0.25rem;
        display: block;
      }

      .auth-link {
        text-align: center;
        margin-top: 1.5rem;
        color: #888;

        a {
          color: #f0d9b5;
          text-decoration: none;

          &:hover {
            text-decoration: underline;
          }
        }
      }
    `,
  ],
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  registerForm: FormGroup = this.fb.group(
    {
      username: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(50)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: this.passwordMatchValidator }
  );

  isLoading = false;
  errorMessage = '';

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password')?.value;
    const confirmPassword = form.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  onSubmit(): void {
    if (this.registerForm.invalid) return;

    this.isLoading = true;
    this.errorMessage = '';

    const { username, password } = this.registerForm.value;

    this.authService.register({ username, password }).subscribe({
      next: () => {
        this.router.navigate(['/lobby']);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.message || 'Registration failed. Please try again.';
      },
    });
  }
}
