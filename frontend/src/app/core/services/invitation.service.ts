import { Injectable, signal } from '@angular/core';
import { Invitation, InvitationResponse } from '../models/invitation.model';
import { WebSocketService } from './websocket.service';
import { AuthService } from './auth.service';

@Injectable({
  providedIn: 'root',
})
export class InvitationService {
  readonly pendingInvitations = signal<Invitation[]>([]);
  readonly sentInvitation = signal<Invitation | null>(null);
  readonly invitationRefused = signal<Invitation | null>(null);

  constructor(private wsService: WebSocketService, private authService: AuthService) {}

  sendInvitation(receiverUsername: string): void {
    const user = this.authService.currentUser();
    if (!user) return;

    this.wsService.send('/app/invite', {
      senderUsername: user.username,
      receiverUsername,
    });
  }

  respondToInvitation(invitationId: number, accepted: boolean): void {
    const response: InvitationResponse = {
      invitationId,
      accepted,
    };
    this.wsService.send('/app/invite/respond', response);

    // Remove from pending invitations
    this.pendingInvitations.update((invitations) =>
      invitations.filter((inv) => inv.id !== invitationId)
    );
  }

  subscribeToInvitations(): void {
    const username = this.authService.currentUser()?.username;
    if (!username) return;

    // Incoming invitations - user-specific topic
    this.wsService.subscribe(`/topic/user/${username}/invitations`, (invitation: Invitation) => {
      console.log('Received invitation:', invitation);
      this.pendingInvitations.update((invitations) => [...invitations, invitation]);
    });

    // Invitation sent confirmation
    this.wsService.subscribe(
      `/topic/user/${username}/invitation-sent`,
      (invitation: Invitation) => {
        console.log('Invitation sent:', invitation);
        this.sentInvitation.set(invitation);
      }
    );

    // Invitation refused notification
    this.wsService.subscribe(
      `/topic/user/${username}/invitation-refused`,
      (invitation: Invitation) => {
        console.log('Invitation refused:', invitation);
        this.invitationRefused.set(invitation);
        this.sentInvitation.set(null);
      }
    );
  }

  unsubscribeFromInvitations(): void {
    const username = this.authService.currentUser()?.username;
    if (!username) return;

    this.wsService.unsubscribe(`/topic/user/${username}/invitations`);
    this.wsService.unsubscribe(`/topic/user/${username}/invitation-sent`);
    this.wsService.unsubscribe(`/topic/user/${username}/invitation-refused`);
  }

  clearInvitationRefused(): void {
    this.invitationRefused.set(null);
  }

  clearSentInvitation(): void {
    this.sentInvitation.set(null);
  }
}
