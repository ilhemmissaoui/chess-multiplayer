import {
  Component,
  OnInit,
  OnDestroy,
  inject,
  ViewChild,
  effect,
  ElementRef,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { NgxChessgroundComponent } from 'ngx-chessground';
import { Chessground } from 'chessground';
import { Chess } from 'chess.js';
import { Api } from 'chessground/api';
import { Color, Key } from 'chessground/types';
import { AuthService } from '../../core/services/auth.service';
import { GameService } from '../../core/services/game.service';
import { WebSocketService } from '../../core/services/websocket.service';
import { Game, Move } from '../../core/models/game.model';

interface CapturedPieces {
  white: string[];
  black: string[];
}

interface ReplayState {
  isActive: boolean;
  isPlaying: boolean;
  currentMoveIndex: number; // -1 means starting position, 0+ is after that move
}

@Component({
  selector: 'app-game',
  imports: [CommonModule, NgxChessgroundComponent],
  template: `
    <div class="game-container">
      <header class="game-header">
        <button class="back-btn" (click)="goBack()">← Back to Lobby</button>
        <h1>♔ Chess Game</h1>
        <div class="connection-status" [class.connected]="wsService.connected()">
          <span class="status-dot"></span>
          {{ wsService.connected() ? 'Connected' : 'Reconnecting...' }}
        </div>
      </header>

      @if (game) {
      <div class="game-content">
        <!-- Opponent Info -->
        <div class="player-info opponent" [class.active]="!isMyTurn()">
          <div class="player-details">
            <span class="player-name">{{ getOpponentName() }}</span>
            <span class="player-color">({{ playerColor === 'white' ? 'Black' : 'White' }})</span>
          </div>
          <div class="captured-pieces">
            @for (piece of capturedPieces[playerColor === 'white' ? 'black' : 'white']; track
            $index) {
            <span class="captured-piece">{{ piece }}</span>
            }
          </div>
        </div>

        <!-- Chess Board -->
        <div class="board-wrapper">
          <div class="board-container" #boardContainer>
            <ngx-chessground [runFunction]="runFunction"></ngx-chessground>
          </div>

          <!-- Check/Checkmate Indicator -->
          @if (isInCheck() && game.status === 'IN_PROGRESS') {
          <div class="check-indicator">CHECK!</div>
          }
        </div>

        <!-- Player Info -->
        <div class="player-info self" [class.active]="isMyTurn()">
          <div class="player-details">
            <span class="player-name">{{ authService.currentUser()?.username }}</span>
            <span class="player-color">({{ playerColor | titlecase }})</span>
            @if (isMyTurn() && game.status === 'IN_PROGRESS') {
            <span class="turn-indicator pulse">Your turn!</span>
            }
          </div>
          <div class="captured-pieces">
            @for (piece of capturedPieces[playerColor]; track $index) {
            <span class="captured-piece">{{ piece }}</span>
            }
          </div>
        </div>

        <!-- Game Status -->
        <div class="game-status" [class.game-over]="game.status !== 'IN_PROGRESS'">
          @if (game.status === 'IN_PROGRESS') {
          <p>{{ game.currentTurn | titlecase }}'s turn</p>
          } @else {
          <div class="game-result">
            <h2>Game Over</h2>
            @switch (game.status) { @case ('WHITE_WON') {
            <p class="result">{{ playerColor === 'white' ? '🎉 You Win!' : 'You Lost' }}</p>
            <p class="sub">White wins by {{ getGameEndReason() }}</p>
            } @case ('BLACK_WON') {
            <p class="result">{{ playerColor === 'black' ? '🎉 You Win!' : 'You Lost' }}</p>
            <p class="sub">Black wins by {{ getGameEndReason() }}</p>
            } @case ('DRAW') {
            <p class="result">Draw</p>
            <p class="sub">{{ getGameEndReason() }}</p>
            } @case ('ABANDONED') {
            <p class="result">Game Abandoned</p>
            } }
          </div>
          }
        </div>

        <!-- Game Controls -->
        <div class="game-controls">
          @if (game.status === 'IN_PROGRESS') {
          <button class="resign-btn" (click)="resign()">🏳️ Resign</button>
          } @else {
          <button class="new-game-btn" (click)="goBack()">🎮 New Game</button>
          }
        </div>

        <!-- Move History -->
        <div class="move-history">
          <h3>Move History</h3>
          <div class="moves-list" #movesList>
            @if (game.moves.length === 0) {
            <p class="no-moves">No moves yet</p>
            } @for (move of game.moves; track move.moveNumber; let i = $index) { @if (i % 2 === 0) {
            <div
              class="move-pair"
              [class.latest]="!replay.isActive && i >= game.moves.length - 2"
              [class.current]="
                replay.isActive &&
                (i === replay.currentMoveIndex || i + 1 === replay.currentMoveIndex)
              "
              (click)="goToMove(i)"
            >
              <span class="move-number">{{ Math.floor(i / 2) + 1 }}.</span>
              <span
                class="move white-move"
                [class.active-move]="replay.isActive && i === replay.currentMoveIndex"
                (click)="goToMove(i); $event.stopPropagation()"
                >{{ move.sanNotation || move.from + move.to }}</span
              >
              @if (game.moves[i + 1]) {
              <span
                class="move black-move"
                [class.active-move]="replay.isActive && i + 1 === replay.currentMoveIndex"
                (click)="goToMove(i + 1); $event.stopPropagation()"
                >{{
                  game.moves[i + 1].sanNotation || game.moves[i + 1].from + game.moves[i + 1].to
                }}</span
              >
              }
            </div>
            } }
          </div>

          <!-- Replay Controls -->
          @if (game.moves.length > 0) {
          <div class="replay-controls">
            <div class="replay-buttons">
              <button class="replay-btn" (click)="goToStart()" title="Go to start">⏮</button>
              <button
                class="replay-btn"
                (click)="previousMove()"
                title="Previous move"
                [disabled]="replay.currentMoveIndex < 0"
              >
                ◀
              </button>
              <button
                class="replay-btn play-btn"
                (click)="toggleAutoPlay()"
                [title]="replay.isPlaying ? 'Pause' : 'Play'"
              >
                {{ replay.isPlaying ? '⏸' : '▶' }}
              </button>
              <button
                class="replay-btn"
                (click)="nextMove()"
                title="Next move"
                [disabled]="!replay.isActive || replay.currentMoveIndex >= game.moves.length - 1"
              >
                ▶
              </button>
              <button class="replay-btn" (click)="goToEnd()" title="Go to current position">
                ⏭
              </button>
            </div>
            <input
              type="range"
              class="replay-slider"
              [min]="-1"
              [max]="game.moves.length - 1"
              [value]="replay.isActive ? replay.currentMoveIndex : game.moves.length - 1"
              (input)="onSliderChange($event)"
            />
            <div class="replay-info">
              @if (replay.isActive) {
              <span class="replay-badge">REPLAY MODE</span>
              <span>Move {{ replay.currentMoveIndex + 1 }} of {{ game.moves.length }}</span>
              } @else {
              <span>{{ game.moves.length }} moves</span>
              }
            </div>
          </div>
          }
        </div>
      </div>
      } @else {
      <div class="loading">
        <div class="spinner"></div>
        <p>Loading game...</p>
      </div>
      }
    </div>
  `,
  styles: [
    `
      .game-container {
        min-height: 100vh;
        background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
        color: #fff;
      }

      .game-header {
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

        .back-btn {
          padding: 0.5rem 1rem;
          background: transparent;
          border: 1px solid #666;
          color: #b8b8b8;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;

          &:hover {
            border-color: #fff;
            color: #fff;
          }
        }
      }

      .connection-status {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;

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

      .game-content {
        max-width: 650px;
        margin: 0 auto;
        padding: 2rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1rem;
      }

      .player-info {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0.75rem 1.5rem;
        background: #0f0f23;
        border: 2px solid #2a2a4a;
        border-radius: 8px;
        width: 100%;
        max-width: 500px;
        transition: all 0.3s;

        &.active {
          border-color: #4caf50;
          box-shadow: 0 0 10px rgba(76, 175, 80, 0.3);
        }

        .player-details {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .player-name {
          font-weight: 600;
          color: #f0d9b5;
        }

        .player-color {
          color: #888;
          font-size: 0.9rem;
        }

        .turn-indicator {
          background: #4caf50;
          color: #fff;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.8rem;
          margin-left: 0.5rem;
        }

        .turn-indicator.pulse {
          animation: pulse 1.5s infinite;
        }

        .captured-pieces {
          display: flex;
          gap: 2px;
          font-size: 1.1rem;
        }
      }

      @keyframes pulse {
        0%,
        100% {
          opacity: 1;
        }
        50% {
          opacity: 0.6;
        }
      }

      .board-wrapper {
        position: relative;
      }

      .board-container {
        border: 4px solid #2a2a4a;
        border-radius: 4px;
        overflow: hidden;
        width: 500px;
        height: 500px;
      }

      /* Chessground sizing */
      .board-container ::ng-deep #chessground-examples,
      .board-container ::ng-deep .cg-wrap {
        width: 500px;
        height: 500px;
      }

      .board-container ::ng-deep cg-container {
        display: block;
        width: 100%;
        height: 100%;
      }

      .check-indicator {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(255, 0, 0, 0.9);
        color: white;
        padding: 0.5rem 1.5rem;
        border-radius: 4px;
        font-weight: bold;
        font-size: 1.2rem;
        animation: checkPulse 0.5s ease-in-out;
        pointer-events: none;
      }

      @keyframes checkPulse {
        0% {
          transform: translate(-50%, -50%) scale(0.5);
          opacity: 0;
        }
        50% {
          transform: translate(-50%, -50%) scale(1.2);
        }
        100% {
          transform: translate(-50%, -50%) scale(1);
          opacity: 1;
        }
      }

      .game-status {
        text-align: center;
        font-size: 1.1rem;
        padding: 0.5rem 1rem;
        border-radius: 8px;

        p {
          margin: 0;
        }

        &.game-over {
          background: #0f0f23;
          padding: 1.5rem 2rem;
          border: 2px solid #f0d9b5;

          .game-result h2 {
            margin: 0 0 0.5rem 0;
            color: #f0d9b5;
          }

          .result {
            font-size: 1.5rem;
            font-weight: bold;
            margin: 0.5rem 0;
          }

          .sub {
            color: #888;
            font-size: 0.9rem;
          }
        }
      }

      .game-controls {
        display: flex;
        gap: 1rem;

        button {
          padding: 0.75rem 1.5rem;
          border-radius: 6px;
          cursor: pointer;
          font-size: 1rem;
          transition: all 0.2s;
          border: none;
        }

        .resign-btn {
          background: transparent;
          border: 1px solid #ff6b6b;
          color: #ff6b6b;

          &:hover {
            background: #ff6b6b;
            color: #fff;
          }
        }

        .new-game-btn {
          background: #4caf50;
          color: #fff;

          &:hover {
            background: #45a049;
          }
        }
      }

      .move-history {
        width: 100%;
        max-width: 500px;
        background: #0f0f23;
        border: 1px solid #2a2a4a;
        border-radius: 8px;
        padding: 1rem;

        h3 {
          margin: 0 0 0.75rem 0;
          color: #f0d9b5;
          font-size: 1rem;
          border-bottom: 1px solid #2a2a4a;
          padding-bottom: 0.5rem;
        }

        .no-moves {
          color: #666;
          text-align: center;
          font-style: italic;
        }

        .moves-list {
          max-height: 200px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .move-pair {
          display: flex;
          gap: 0.75rem;
          font-family: 'Courier New', monospace;
          font-size: 0.95rem;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          transition: background 0.2s;
          cursor: pointer;

          &:hover {
            background: rgba(255, 255, 255, 0.1);
          }

          &.latest {
            background: rgba(76, 175, 80, 0.1);
          }

          &.current {
            background: rgba(240, 217, 181, 0.15);
          }

          .move-number {
            color: #666;
            min-width: 2.5rem;
          }

          .move {
            min-width: 4rem;
            cursor: pointer;
            padding: 0.1rem 0.25rem;
            border-radius: 3px;

            &:hover {
              background: rgba(255, 255, 255, 0.1);
            }

            &.active-move {
              background: #f0d9b5;
              color: #1a1a2e;
              font-weight: bold;
            }
          }

          .white-move {
            color: #f0d9b5;
          }
          .black-move {
            color: #b8b8b8;
          }
        }

        .replay-controls {
          margin-top: 1rem;
          padding-top: 1rem;
          border-top: 1px solid #2a2a4a;

          .replay-buttons {
            display: flex;
            justify-content: center;
            gap: 0.5rem;
            margin-bottom: 0.75rem;
          }

          .replay-btn {
            width: 40px;
            height: 40px;
            border: 1px solid #2a2a4a;
            background: #16213e;
            color: #f0d9b5;
            border-radius: 6px;
            cursor: pointer;
            font-size: 1rem;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;

            &:hover:not(:disabled) {
              background: #1a1a2e;
              border-color: #f0d9b5;
            }

            &:disabled {
              opacity: 0.4;
              cursor: not-allowed;
            }

            &.play-btn {
              width: 50px;
              background: #4caf50;
              border-color: #4caf50;
              color: white;

              &:hover {
                background: #45a049;
              }
            }
          }

          .replay-slider {
            width: 100%;
            height: 6px;
            -webkit-appearance: none;
            appearance: none;
            background: #2a2a4a;
            border-radius: 3px;
            outline: none;
            margin-bottom: 0.75rem;

            &::-webkit-slider-thumb {
              -webkit-appearance: none;
              appearance: none;
              width: 18px;
              height: 18px;
              background: #f0d9b5;
              border-radius: 50%;
              cursor: pointer;
              transition: transform 0.1s;

              &:hover {
                transform: scale(1.2);
              }
            }

            &::-moz-range-thumb {
              width: 18px;
              height: 18px;
              background: #f0d9b5;
              border-radius: 50%;
              cursor: pointer;
              border: none;
            }
          }

          .replay-info {
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 0.75rem;
            font-size: 0.85rem;
            color: #888;

            .replay-badge {
              background: #ff6b6b;
              color: white;
              padding: 0.2rem 0.5rem;
              border-radius: 4px;
              font-size: 0.75rem;
              font-weight: bold;
            }
          }
        }
      }

      .loading {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        min-height: 50vh;
        gap: 1rem;

        .spinner {
          width: 50px;
          height: 50px;
          border: 3px solid #2a2a4a;
          border-top-color: #f0d9b5;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        p {
          color: #888;
          font-size: 1.25rem;
        }
      }

      @keyframes spin {
        to {
          transform: rotate(360deg);
        }
      }
    `,
  ],
})
export class GameComponent implements OnInit, OnDestroy {
  @ViewChild('boardContainer') boardContainer!: ElementRef<HTMLElement>;
  @ViewChild('movesList') movesList!: ElementRef<HTMLElement>;

  authService = inject(AuthService);
  gameService = inject(GameService);
  wsService = inject(WebSocketService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  game: Game | null = null;
  playerColor: 'white' | 'black' = 'white';
  boardSize = 500;
  gameEndReason = '';

  // Captured pieces tracking
  capturedPieces: CapturedPieces = { white: [], black: [] };

  // Replay state
  replay: ReplayState = {
    isActive: false,
    isPlaying: false,
    currentMoveIndex: -1,
  };
  private replayInterval: ReturnType<typeof setInterval> | null = null;

  // Expose Math for template
  Math = Math;

  private chess = new Chess();
  private cgApi: Api | null = null;
  private gameId: number = 0;

  // Piece symbols for display
  private readonly pieceSymbols: { [key: string]: { white: string; black: string } } = {
    p: { white: '♙', black: '♟' },
    n: { white: '♘', black: '♞' },
    b: { white: '♗', black: '♝' },
    r: { white: '♖', black: '♜' },
    q: { white: '♕', black: '♛' },
    k: { white: '♔', black: '♚' },
  };

  // Run function for ngx-chessground - creates and configures the board
  runFunction = (el: HTMLElement): Api => {
    const api = Chessground(el, {
      fen: this.game?.currentFen || 'start',
      orientation: this.playerColor,
      turnColor: (this.game?.currentTurn || 'white') as Color,
      movable: {
        free: false,
        color: this.playerColor,
        dests: this.getLegalMoves(),
        showDests: true,
        events: {
          after: (orig: Key, dest: Key) => {
            this.onMove(orig, dest);
          },
        },
      },
      premovable: {
        enabled: true,
      },
      draggable: {
        showGhost: true,
      },
      animation: {
        enabled: true,
        duration: 200,
      },
      highlight: {
        lastMove: true,
        check: true,
      },
    });
    this.cgApi = api;
    return api;
  };

  constructor() {
    // Watch for game updates
    effect(() => {
      const currentGame = this.gameService.currentGame();
      if (currentGame && currentGame.id === this.gameId) {
        this.game = currentGame;
        this.updateBoard();
      }
    });
  }

  ngOnInit(): void {
    this.gameId = Number(this.route.snapshot.paramMap.get('id'));

    // Connect WebSocket if not connected
    if (!this.wsService.connected()) {
      this.wsService.connect();
    }

    // Load game data
    this.loadGame();
  }

  private loadGame(): void {
    this.gameService.getGame(this.gameId).subscribe({
      next: (game) => {
        this.game = game;
        this.gameService.setCurrentGame(game);
        this.playerColor = this.gameService.getPlayerColor(game) || 'white';

        // Load chess state from FEN
        this.chess.load(game.currentFen);

        // Subscribe to game updates only when WebSocket is connected
        this.subscribeWhenConnected();

        // Update board
        this.updateBoard();
      },
      error: (err) => {
        console.error('Failed to load game:', err);
        this.router.navigate(['/lobby']);
      },
    });
  }

  private subscribeWhenConnected(): void {
    if (this.wsService.connected()) {
      this.gameService.subscribeToGame(this.gameId);
    } else {
      // Wait for connection using effect
      const checkConnection = setInterval(() => {
        if (this.wsService.connected()) {
          clearInterval(checkConnection);
          this.gameService.subscribeToGame(this.gameId);
        }
      }, 100);

      // Give up after 5 seconds
      setTimeout(() => clearInterval(checkConnection), 5000);
    }
  }

  private onMove(from: Key, to: Key): void {
    if (!this.game || this.game.status !== 'IN_PROGRESS') return;
    if (!this.isMyTurn()) return;

    // Check for promotion
    const piece = this.chess.get(from as any);
    let promotion: string | undefined;

    if (piece?.type === 'p') {
      const toRank = to.charAt(1);
      if ((piece.color === 'w' && toRank === '8') || (piece.color === 'b' && toRank === '1')) {
        promotion = 'q'; // Auto-promote to queen for simplicity
      }
    }

    // Make the move in chess.js
    const moveResult = this.chess.move({
      from: from as any,
      to: to as any,
      promotion: promotion as any,
    });

    if (!moveResult) {
      // Invalid move, reset board
      this.updateBoard();
      return;
    }

    // Send move to server
    const move: Move = {
      gameId: this.gameId,
      from,
      to,
      piece: piece?.type || 'p',
      promotion,
      fenAfter: this.chess.fen(),
      sanNotation: moveResult.san,
      moveNumber: this.game.moves.length + 1,
      playerColor: this.playerColor,
    };

    this.gameService.sendMove(this.gameId, move);

    // Update local game state
    this.game = {
      ...this.game,
      currentFen: this.chess.fen(),
      currentTurn: this.game.currentTurn === 'white' ? 'black' : 'white',
      moves: [...this.game.moves, move],
    };

    // Check for game end
    this.checkGameEnd();

    // Update board
    this.updateBoard();
  }

  private updateBoard(): void {
    if (!this.cgApi || !this.game) return;

    // If in replay mode, don't update with live position
    if (this.replay.isActive) {
      return;
    }

    // Load current position
    this.chess.load(this.game.currentFen);

    // Calculate legal moves
    const dests = this.getLegalMoves();

    // Update board configuration
    this.cgApi.set({
      fen: this.game.currentFen,
      orientation: this.playerColor,
      turnColor: this.game.currentTurn as Color,
      check: this.chess.inCheck(),
      movable: {
        free: false,
        color: this.playerColor,
        dests: this.isMyTurn() && this.game.status === 'IN_PROGRESS' ? dests : new Map(),
        showDests: true,
      },
      lastMove: this.getLastMove(),
    });

    // Update captured pieces display
    this.updateCapturedPieces();

    // Scroll to latest move
    this.scrollToLatestMove();
  }

  private getLegalMoves(): Map<Key, Key[]> {
    const dests = new Map<Key, Key[]>();
    const moves = this.chess.moves({ verbose: true });

    for (const move of moves) {
      const from = move.from as Key;
      const to = move.to as Key;

      if (!dests.has(from)) {
        dests.set(from, []);
      }
      dests.get(from)!.push(to);
    }

    return dests;
  }

  private getLastMove(): [Key, Key] | undefined {
    if (!this.game || this.game.moves.length === 0) return undefined;

    const lastMove = this.game.moves[this.game.moves.length - 1];
    return [lastMove.from as Key, lastMove.to as Key];
  }

  private checkGameEnd(): void {
    if (!this.game) return;

    if (this.chess.isCheckmate()) {
      const winner = this.chess.turn() === 'w' ? 'black' : 'white';
      this.gameService.endGame(this.gameId, winner, 'checkmate');
    } else if (this.chess.isDraw()) {
      let reason = 'draw';
      if (this.chess.isStalemate()) reason = 'stalemate';
      else if (this.chess.isThreefoldRepetition()) reason = 'repetition';
      else if (this.chess.isInsufficientMaterial()) reason = 'insufficient material';

      this.gameService.endGame(this.gameId, 'draw', reason);
    }
  }

  isMyTurn(): boolean {
    return this.game ? this.gameService.isMyTurn(this.game) : false;
  }

  getOpponentName(): string {
    if (!this.game) return '';
    return this.playerColor === 'white'
      ? this.game.blackPlayer.username
      : this.game.whitePlayer.username;
  }

  resign(): void {
    if (!this.game || this.game.status !== 'IN_PROGRESS') return;

    if (confirm('Are you sure you want to resign?')) {
      const winner = this.playerColor === 'white' ? 'black' : 'white';
      this.gameEndReason = 'resignation';
      this.gameService.endGame(this.gameId, winner, 'resignation');
    }
  }

  isInCheck(): boolean {
    return this.chess.inCheck();
  }

  getGameEndReason(): string {
    return this.gameEndReason || 'unknown';
  }

  private updateCapturedPieces(): void {
    if (!this.game) return;

    // Reset
    this.capturedPieces = { white: [], black: [] };

    // Starting material
    const startingMaterial = {
      p: 8,
      n: 2,
      b: 2,
      r: 2,
      q: 1,
      k: 1,
    };

    // Count current material on board
    const currentMaterial = {
      white: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
      black: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    };

    const board = this.chess.board();
    for (const row of board) {
      for (const square of row) {
        if (square) {
          const color = square.color === 'w' ? 'white' : 'black';
          currentMaterial[color][square.type as keyof typeof startingMaterial]++;
        }
      }
    }

    // Calculate captured pieces
    for (const pieceType of ['q', 'r', 'b', 'n', 'p'] as const) {
      const whiteMissing = startingMaterial[pieceType] - currentMaterial.white[pieceType];
      const blackMissing = startingMaterial[pieceType] - currentMaterial.black[pieceType];

      // White pieces captured by black
      for (let i = 0; i < whiteMissing; i++) {
        this.capturedPieces.black.push(this.pieceSymbols[pieceType].white);
      }

      // Black pieces captured by white
      for (let i = 0; i < blackMissing; i++) {
        this.capturedPieces.white.push(this.pieceSymbols[pieceType].black);
      }
    }
  }

  private scrollToLatestMove(): void {
    if (this.movesList?.nativeElement) {
      setTimeout(() => {
        this.movesList.nativeElement.scrollTop = this.movesList.nativeElement.scrollHeight;
      }, 100);
    }
  }

  // ==================== Replay Methods ====================

  goToMove(moveIndex: number): void {
    if (!this.game || this.game.moves.length === 0) return;

    // Clamp index to valid range
    moveIndex = Math.max(-1, Math.min(moveIndex, this.game.moves.length - 1));

    // Enter replay mode
    this.replay.isActive = true;
    this.replay.currentMoveIndex = moveIndex;

    // Reconstruct position at this move
    this.showPositionAtMove(moveIndex);
  }

  goToStart(): void {
    this.goToMove(-1);
  }

  goToEnd(): void {
    if (!this.game) return;

    // Stop auto-play if running
    this.stopAutoPlay();

    // Exit replay mode
    this.replay.isActive = false;
    this.replay.currentMoveIndex = this.game.moves.length - 1;

    // Show current position
    this.updateBoard();
  }

  previousMove(): void {
    if (this.replay.currentMoveIndex > -1) {
      this.goToMove(this.replay.currentMoveIndex - 1);
    }
  }

  nextMove(): void {
    if (!this.game) return;

    if (this.replay.currentMoveIndex < this.game.moves.length - 1) {
      this.goToMove(this.replay.currentMoveIndex + 1);
    } else {
      // Reached end - exit replay mode
      this.goToEnd();
    }
  }

  toggleAutoPlay(): void {
    if (this.replay.isPlaying) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  private startAutoPlay(): void {
    if (!this.game || this.game.moves.length === 0) return;

    // Start from beginning if at end
    if (!this.replay.isActive || this.replay.currentMoveIndex >= this.game.moves.length - 1) {
      this.goToStart();
    }

    this.replay.isPlaying = true;

    // Play moves at 1 second intervals
    this.replayInterval = setInterval(() => {
      if (!this.game) {
        this.stopAutoPlay();
        return;
      }

      if (this.replay.currentMoveIndex >= this.game.moves.length - 1) {
        // Reached end
        this.stopAutoPlay();
        return;
      }

      this.nextMove();
    }, 1000);
  }

  private stopAutoPlay(): void {
    this.replay.isPlaying = false;
    if (this.replayInterval) {
      clearInterval(this.replayInterval);
      this.replayInterval = null;
    }
  }

  onSliderChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    const moveIndex = parseInt(target.value, 10);
    this.goToMove(moveIndex);
  }

  private showPositionAtMove(moveIndex: number): void {
    if (!this.game || !this.cgApi) return;

    // Create a new chess instance and replay moves up to this point
    const replayChess = new Chess();

    for (let i = 0; i <= moveIndex && i < this.game.moves.length; i++) {
      const move = this.game.moves[i];
      replayChess.move({
        from: move.from as any,
        to: move.to as any,
        promotion: move.promotion as any,
      });
    }

    // Get the FEN and last move for highlight
    const fen = replayChess.fen();
    const lastMove =
      moveIndex >= 0 && moveIndex < this.game.moves.length
        ? ([this.game.moves[moveIndex].from as Key, this.game.moves[moveIndex].to as Key] as [
            Key,
            Key
          ])
        : undefined;

    // Update the chessground board (disable moves in replay mode)
    this.cgApi.set({
      fen: fen,
      orientation: this.playerColor,
      turnColor: (moveIndex % 2 === 0 ? 'black' : 'white') as Color,
      check: replayChess.inCheck(),
      movable: {
        free: false,
        dests: new Map(), // Disable moves in replay mode
      },
      lastMove: lastMove,
    });

    // Update captured pieces for this position
    this.updateCapturedPiecesFromChess(replayChess);
  }

  private updateCapturedPiecesFromChess(chessInstance: Chess): void {
    // Reset
    this.capturedPieces = { white: [], black: [] };

    // Starting material
    const startingMaterial = {
      p: 8,
      n: 2,
      b: 2,
      r: 2,
      q: 1,
      k: 1,
    };

    // Count current material on board
    const currentMaterial = {
      white: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
      black: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    };

    const board = chessInstance.board();
    for (const row of board) {
      for (const square of row) {
        if (square) {
          const color = square.color === 'w' ? 'white' : 'black';
          currentMaterial[color][square.type as keyof typeof startingMaterial]++;
        }
      }
    }

    // Calculate captured pieces
    for (const pieceType of ['q', 'r', 'b', 'n', 'p'] as const) {
      const whiteMissing = startingMaterial[pieceType] - currentMaterial.white[pieceType];
      const blackMissing = startingMaterial[pieceType] - currentMaterial.black[pieceType];

      // White pieces captured by black
      for (let i = 0; i < whiteMissing; i++) {
        this.capturedPieces.black.push(this.pieceSymbols[pieceType].white);
      }

      // Black pieces captured by white
      for (let i = 0; i < blackMissing; i++) {
        this.capturedPieces.white.push(this.pieceSymbols[pieceType].black);
      }
    }
  }

  // ==================== End Replay Methods ====================

  goBack(): void {
    this.router.navigate(['/lobby']);
  }

  ngOnDestroy(): void {
    this.stopAutoPlay();
    if (this.gameId) {
      this.gameService.unsubscribeFromGame(this.gameId);
    }
  }
}
