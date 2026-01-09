import { Component, OnInit, OnDestroy, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { PlayerService } from '../../core/services/player.service';
import { InvitationService } from '../../core/services/invitation.service';
import { GameService } from '../../core/services/game.service';
import { Player } from '../../core/models/player.model';
import { Game } from '../../core/models/game.model';

@Component({
  selector: 'app-lobby',
  imports: [CommonModule],
  template: `
    <div class="lobby-container">
      <header class="lobby-header">
        <h1>♔ Chess Lobby</h1>
        <div class="user-info">
          <span class="username">{{ authService.currentUser()?.username }}</span>
          <button class="logout-btn" (click)="logout()">Logout</button>
        </div>
      </header>

      <div class="lobby-content">
        <!-- Connection Status -->
        <div class="connection-status" [class.connected]="wsService.connected()">
          <span class="status-dot"></span>
          {{ wsService.connected() ? 'Connected' : 'Connecting...' }}
        </div>

        <!-- Active Games Section -->
        @if (activeGames.length > 0) {
        <section class="active-games">
          <h2>Your Active Games</h2>
          <div class="games-list">
            @for (game of activeGames; track game.id) {
            <div class="game-card" (click)="resumeGame(game)">
              <div class="game-players">
                <span>{{ game.whitePlayer.username }} (White)</span>
                <span class="vs">vs</span>
                <span>{{ game.blackPlayer.username }} (Black)</span>
              </div>
              <div class="game-turn">Turn: {{ game.currentTurn }}</div>
              <button class="resume-btn">Resume</button>
            </div>
            }
          </div>
        </section>
        }

        <!-- Players List -->
        <section class="players-section">
          <h2>Online Players</h2>
          @if (playerService.onlinePlayers().length === 0) {
          <p class="no-players">No other players online</p>
          } @else {
          <div class="players-list">
            @for (player of playerService.onlinePlayers(); track player.id) { @if (player.username
            !== authService.currentUser()?.username) {
            <div class="player-card">
              <div class="player-info">
                <span class="online-dot"></span>
                <span class="player-name">{{ player.username }}</span>
              </div>
              <button
                class="invite-btn"
                (click)="invitePlayer(player)"
                [disabled]="invitationService.sentInvitation() !== null"
              >
                {{
                  invitationService.sentInvitation()?.receiverUsername === player.username
                    ? 'Invited...'
                    : 'Invite'
                }}
              </button>
            </div>
            } }
          </div>
          }
        </section>

        <!-- Pending Invitations -->
        @if (invitationService.pendingInvitations().length > 0) {
        <section class="invitations-section">
          <h2>Game Invitations</h2>
          <div class="invitations-list">
            @for (invitation of invitationService.pendingInvitations(); track invitation.id) {
            <div class="invitation-card">
              <p>{{ invitation.senderUsername }} wants to play chess with you!</p>
              <div class="invitation-actions">
                <button class="accept-btn" (click)="acceptInvitation(invitation.id)">Accept</button>
                <button class="decline-btn" (click)="declineInvitation(invitation.id)">
                  Decline
                </button>
              </div>
            </div>
            }
          </div>
        </section>
        }

        <!-- Invitation Refused Notification -->
        @if (invitationService.invitationRefused()) {
        <div class="notification refused">
          {{ invitationService.invitationRefused()?.receiverUsername }} declined your invitation.
          <button class="close-btn" (click)="invitationService.clearInvitationRefused()">×</button>
        </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .lobby-container {
        min-height: 100vh;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        color: #fff;
      }

      .lobby-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1rem 2rem;
        background: #0f0f23;
        border-bottom: 1px solid #2a2a4a;

        h1 {
          color: #f0d9b5;
          margin: 0;
        }

        .user-info {
          display: flex;
          align-items: center;
          gap: 1rem;

          .username {
            color: #b8b8b8;
          }

          .logout-btn {
            padding: 0.5rem 1rem;
            background: transparent;
            border: 1px solid #b58863;
            color: #b58863;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s;

            &:hover {
              background: #b58863;
              color: #fff;
            }
          }
        }
      }

      .lobby-content {
        max-width: 800px;
        margin: 0 auto;
        padding: 2rem;
      }

      .connection-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 1rem;
        background: #2a2a4a;
        border-radius: 20px;
        font-size: 0.85rem;
        width: fit-content;
        margin-bottom: 2rem;

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #ff6b6b;
        }

        &.connected .status-dot {
          background: #4caf50;
        }
      }

      section {
        margin-bottom: 2rem;

        h2 {
          color: #f0d9b5;
          font-size: 1.25rem;
          margin-bottom: 1rem;
          border-bottom: 1px solid #2a2a4a;
          padding-bottom: 0.5rem;
        }
      }

      .players-list,
      .games-list,
      .invitations-list {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .player-card,
      .game-card,
      .invitation-card {
        background: #0f0f23;
        border: 1px solid #2a2a4a;
        border-radius: 8px;
        padding: 1rem;
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .player-info {
        display: flex;
        align-items: center;
        gap: 0.75rem;

        .online-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #4caf50;
        }

        .player-name {
          font-weight: 500;
        }
      }

      .invite-btn {
        padding: 0.5rem 1.25rem;
        background: #b58863;
        color: #fff;
        border: none;
        border-radius: 4px;
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

      .game-card {
        flex-direction: column;
        gap: 0.75rem;
        cursor: pointer;
        transition: border-color 0.2s;

        &:hover {
          border-color: #b58863;
        }

        .game-players {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.95rem;

          .vs {
            color: #666;
            font-size: 0.8rem;
          }
        }

        .game-turn {
          color: #888;
          font-size: 0.85rem;
        }

        .resume-btn {
          padding: 0.5rem 1.5rem;
          background: #4caf50;
          color: #fff;
          border: none;
          border-radius: 4px;
          cursor: pointer;

          &:hover {
            background: #5cb85c;
          }
        }
      }

      .invitation-card {
        flex-direction: column;
        gap: 1rem;
        background: #1a2a3a;
        border-color: #f0d9b5;

        p {
          margin: 0;
          text-align: center;
        }

        .invitation-actions {
          display: flex;
          gap: 1rem;

          button {
            padding: 0.5rem 1.5rem;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-weight: 500;

            &.accept-btn {
              background: #4caf50;
              color: #fff;

              &:hover {
                background: #5cb85c;
              }
            }

            &.decline-btn {
              background: transparent;
              border: 1px solid #ff6b6b;
              color: #ff6b6b;

              &:hover {
                background: #ff6b6b;
                color: #fff;
              }
            }
          }
        }
      }

      .no-players {
        color: #666;
        text-align: center;
        padding: 2rem;
      }

      .notification {
        position: fixed;
        bottom: 2rem;
        right: 2rem;
        padding: 1rem 2rem;
        background: #0f0f23;
        border: 1px solid #2a2a4a;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 1rem;
        animation: slideIn 0.3s ease-out;

        &.refused {
          border-color: #ff6b6b;
        }

        .close-btn {
          background: none;
          border: none;
          color: #888;
          font-size: 1.25rem;
          cursor: pointer;

          &:hover {
            color: #fff;
          }
        }
      }

      @keyframes slideIn {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
    `,
  ],
})
export class LobbyComponent implements OnInit, OnDestroy {
  authService = inject(AuthService);
  wsService = inject(WebSocketService);
  playerService = inject(PlayerService);
  invitationService = inject(InvitationService);
  gameService = inject(GameService);
  private router = inject(Router);

  activeGames: Game[] = [];

  constructor() {
    // Effect to handle game creation
    effect(() => {
      const game = this.gameService.gameCreated();
      if (game) {
        // Clear the signal to prevent re-navigation when returning to lobby
        this.gameService.clearGameCreated();
        this.router.navigate(['/game', game.id]);
      }
    });
  }

  ngOnInit(): void {
    // Connect to WebSocket
    this.wsService.connect();

    // Wait for connection then subscribe to updates
    const checkConnection = setInterval(() => {
      if (this.wsService.connected()) {
        clearInterval(checkConnection);
        this.setupSubscriptions();
        this.loadActiveGames();
      }
    }, 100);
  }

  private setupSubscriptions(): void {
    this.playerService.subscribeToPlayerUpdates();
    this.invitationService.subscribeToInvitations();
    this.gameService.subscribeToGameCreation();

    // Announce presence AFTER subscriptions are set up
    this.wsService.announcePresence();
  }

  private loadActiveGames(): void {
    this.gameService.getActiveGames().subscribe({
      next: (games) => {
        this.activeGames = games;
      },
      error: (err) => console.error('Failed to load active games:', err),
    });
  }

  invitePlayer(player: Player): void {
    this.invitationService.sendInvitation(player.username);
  }

  acceptInvitation(invitationId: number): void {
    this.invitationService.respondToInvitation(invitationId, true);
  }

  declineInvitation(invitationId: number): void {
    this.invitationService.respondToInvitation(invitationId, false);
  }

  resumeGame(game: Game): void {
    this.gameService.setCurrentGame(game);
    this.router.navigate(['/game', game.id]);
  }

  logout(): void {
    this.wsService.disconnect();
    this.authService.logout();
  }

  ngOnDestroy(): void {
    this.playerService.unsubscribeFromPlayerUpdates();
    this.invitationService.unsubscribeFromInvitations();
  }
}
