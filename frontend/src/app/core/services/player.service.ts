import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Player } from '../models/player.model';
import { WebSocketService } from './websocket.service';

@Injectable({
  providedIn: 'root',
})
export class PlayerService {
  private readonly API_URL = 'http://localhost:8080/api/players';

  readonly onlinePlayers = signal<Player[]>([]);

  constructor(private http: HttpClient, private wsService: WebSocketService) {}

  getOnlinePlayers(): Observable<Player[]> {
    return this.http.get<Player[]>(`${this.API_URL}/online`);
  }

  subscribeToPlayerUpdates(): void {
    this.wsService.subscribe('/topic/players', (players: Player[]) => {
      this.onlinePlayers.set(players);
    });
  }

  unsubscribeFromPlayerUpdates(): void {
    this.wsService.unsubscribe('/topic/players');
  }
}
