import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: '/lobby',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login.component').then((m) => m.LoginComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register.component').then((m) => m.RegisterComponent),
    canActivate: [guestGuard],
  },
  {
    path: 'lobby',
    loadComponent: () => import('./features/lobby/lobby.component').then((m) => m.LobbyComponent),
    canActivate: [authGuard],
  },
  {
    path: 'game/:id',
    loadComponent: () => import('./features/game/game.component').then((m) => m.GameComponent),
    canActivate: [authGuard],
  },
  {
    path: '**',
    redirectTo: '/lobby',
  },
];
