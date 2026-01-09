import { Injectable, signal, OnDestroy } from '@angular/core';
import { Client, IMessage, StompSubscription } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { AuthService } from './auth.service';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService implements OnDestroy {
  private client: Client | null = null;
  private subscriptions: Map<string, StompSubscription> = new Map();

  readonly connected = signal(false);
  readonly connectionError = signal<string | null>(null);

  // Subjects for different message types
  readonly messages$ = new Subject<{ destination: string; body: any }>();

  constructor(private authService: AuthService) {}

  connect(): void {
    if (this.client?.active) {
      return;
    }

    const token = this.authService.getToken();

    this.client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      connectHeaders: token ? { Authorization: `Bearer ${token}` } : {},
      debug: (str) => {
        console.log('[WebSocket]', str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = () => {
      console.log('WebSocket connected');
      this.connected.set(true);
      this.connectionError.set(null);
    };

    this.client.onStompError = (frame) => {
      console.error('WebSocket STOMP error:', frame);
      this.connectionError.set(frame.headers['message'] || 'Connection error');
    };

    this.client.onDisconnect = () => {
      console.log('WebSocket disconnected');
      this.connected.set(false);
    };

    this.client.onWebSocketClose = () => {
      console.log('WebSocket closed');
      this.connected.set(false);
    };

    this.client.activate();
  }

  disconnect(): void {
    const user = this.authService.currentUser();
    if (user && this.client?.active) {
      this.send('/app/presence/disconnect', { username: user.username });
    }

    this.subscriptions.forEach((sub) => sub.unsubscribe());
    this.subscriptions.clear();

    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    this.connected.set(false);
  }

  subscribe(destination: string, callback: (message: any) => void): void {
    if (!this.client?.active) {
      console.warn('Cannot subscribe: WebSocket not connected, destination:', destination);
      return;
    }

    // Unsubscribe if already subscribed
    if (this.subscriptions.has(destination)) {
      console.log('Resubscribing to:', destination);
      this.subscriptions.get(destination)?.unsubscribe();
    }

    console.log('Subscribing to:', destination);
    const subscription = this.client.subscribe(destination, (message: IMessage) => {
      console.log('Message received on', destination, message.body.substring(0, 100));
      try {
        const body = JSON.parse(message.body);
        callback(body);
        this.messages$.next({ destination, body });
      } catch (e) {
        callback(message.body);
      }
    });

    this.subscriptions.set(destination, subscription);
  }

  subscribeToUser(destination: string, callback: (message: any) => void): void {
    // User-specific subscriptions use /user prefix
    this.subscribe(`/user${destination}`, callback);
  }

  unsubscribe(destination: string): void {
    const subscription = this.subscriptions.get(destination);
    if (subscription) {
      subscription.unsubscribe();
      this.subscriptions.delete(destination);
    }
  }

  send(destination: string, body: any): void {
    if (!this.client?.active) {
      console.warn('Cannot send: WebSocket not connected');
      return;
    }

    this.client.publish({
      destination,
      body: JSON.stringify(body),
    });
  }

  announcePresence(): void {
    const user = this.authService.currentUser();
    if (user && this.client?.active) {
      this.send('/app/presence/connect', { username: user.username });
    }
  }

  ngOnDestroy(): void {
    this.disconnect();
    this.messages$.complete();
  }
}
