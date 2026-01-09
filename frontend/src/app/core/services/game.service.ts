import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable } from 'rxjs';
import { Game, Move } from '../models/game.model';
import { WebSocketService } from './websocket.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class GameService {
  private readonly API_URL = 'http://localhost:8080/api/games';

  readonly currentGame = signal<Game | null>(null);
  readonly gameCreated = signal<Game | null>(null);

  constructor(
    private http: HttpClient,
    private wsService: WebSocketService,
    private authService: AuthService,
    private router: Router
  ) {}

  getGame(id: number): Observable<Game> {
    return this.http.get<Game>(`${this.API_URL}/${id}`);
  }

  getActiveGames(): Observable<Game[]> {
    return this.http.get<Game[]>(`${this.API_URL}/active`);
  }

  getGameHistory(): Observable<Game[]> {
    return this.http.get<Game[]>(`${this.API_URL}/history`);
  }

  resignGame(id: number): Observable<Game> {
    return this.http.post<Game>(`${this.API_URL}/${id}/resign`, {});
  }

  // WebSocket methods
  subscribeToGameCreation(): void {
    const username = this.authService.currentUser()?.username;
    if (!username) return;

    this.wsService.subscribe(`/topic/user/${username}/game-created`, (game: Game) => {
      console.log('Game created:', game);
      this.gameCreated.set(game);
      this.currentGame.set(game);
      // Navigate to game
      this.router.navigate(['/game', game.id]);
    });
  }

  subscribeToGame(gameId: number): void {
    // Subscribe to moves
    this.wsService.subscribe(`/topic/game/${gameId}/moves`, (move: Move) => {
      const game = this.currentGame();
      if (game) {
        this.currentGame.update((g) => {
          if (!g) return g;
          return {
            ...g,
            currentFen: move.fenAfter,
            currentTurn: g.currentTurn === 'white' ? 'black' : 'white',
            moves: [...g.moves, move],
          };
        });
      }
    });

    // Subscribe to game status changes
    this.wsService.subscribe(
      `/topic/game/${gameId}/status`,
      (data: { game: Game; reason: string }) => {
        console.log('Game status update received:', data);
        this.currentGame.set(data.game);
      }
    );

    // Join the game room
    const user = this.authService.currentUser();
    if (user) {
      this.wsService.send(`/app/game/${gameId}/join`, { username: user.username });
    }

    // Subscribe to game state (for reconnection)
    this.wsService.subscribeToUser('/queue/game-state', (game: Game) => {
      this.currentGame.set(game);
    });
  }

  unsubscribeFromGame(gameId: number): void {
    this.wsService.unsubscribe(`/topic/game/${gameId}/moves`);
    this.wsService.unsubscribe(`/topic/game/${gameId}/status`);
    this.wsService.unsubscribe('/user/queue/game-state');
  }

  sendMove(gameId: number, move: Move): void {
    this.wsService.send(`/app/game/${gameId}/move`, move);
  }

  endGame(gameId: number, result: 'white' | 'black' | 'draw', reason: string): void {
    this.wsService.send(`/app/game/${gameId}/end`, { result, reason });
  }

  clearGameCreated(): void {
    this.gameCreated.set(null);
  }

  setCurrentGame(game: Game): void {
    this.currentGame.set(game);
  }

  getPlayerColor(game: Game): 'white' | 'black' | null {
    const user = this.authService.currentUser();
    if (!user) return null;

    if (game.whitePlayer.id === user.id) return 'white';
    if (game.blackPlayer.id === user.id) return 'black';
    return null;
  }

  isMyTurn(game: Game): boolean {
    const color = this.getPlayerColor(game);
    return color === game.currentTurn;
  }
}
