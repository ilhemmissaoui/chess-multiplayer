package com.chess.service;

import com.chess.dto.InvitationDTO;
import com.chess.model.Invitation;
import com.chess.model.User;
import com.chess.repository.InvitationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class InvitationService {

    private final InvitationRepository invitationRepository;

    public InvitationService(InvitationRepository invitationRepository) {
        this.invitationRepository = invitationRepository;
    }

    @Transactional
    public Invitation createInvitation(User sender, User receiver) {
        Invitation invitation = Invitation.builder()
                .sender(sender)
                .receiver(receiver)
                .status(Invitation.InvitationStatus.PENDING)
                .build();

        return invitationRepository.save(invitation);
    }

    @Transactional(readOnly = true)
    public Optional<Invitation> findById(Long id) {
        return invitationRepository.findByIdWithUsers(id);
    }

    public List<Invitation> getPendingInvitationsForUser(User user) {
        return invitationRepository.findByReceiverAndStatus(user, Invitation.InvitationStatus.PENDING);
    }

    @Transactional
    public Invitation acceptInvitation(Invitation invitation) {
        invitation.setStatus(Invitation.InvitationStatus.ACCEPTED);
        return invitationRepository.save(invitation);
    }

    @Transactional
    public Invitation refuseInvitation(Invitation invitation) {
        invitation.setStatus(Invitation.InvitationStatus.REFUSED);
        return invitationRepository.save(invitation);
    }

    public InvitationDTO toDTO(Invitation invitation) {
        return InvitationDTO.builder()
                .id(invitation.getId())
                .senderId(invitation.getSender().getId())
                .senderUsername(invitation.getSender().getUsername())
                .receiverId(invitation.getReceiver().getId())
                .receiverUsername(invitation.getReceiver().getUsername())
                .status(invitation.getStatus().name())
                .createdAt(invitation.getCreatedAt())
                .build();
    }
}
