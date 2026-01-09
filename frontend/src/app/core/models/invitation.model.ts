export interface Invitation {
  id: number;
  senderId: number;
  senderUsername: string;
  receiverId: number;
  receiverUsername: string;
  status: InvitationStatus;
  createdAt: string;
}

export type InvitationStatus = 'PENDING' | 'ACCEPTED' | 'REFUSED' | 'EXPIRED';

export interface InvitationResponse {
  invitationId: number;
  accepted: boolean;
}
