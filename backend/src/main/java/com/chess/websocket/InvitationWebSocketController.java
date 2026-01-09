package com.chess.websocket;

import com.chess.dto.GameDTO;
import com.chess.dto.InvitationDTO;
import com.chess.dto.InvitationResponseDTO;
import com.chess.model.Game;
import com.chess.model.Invitation;
import com.chess.model.User;
import com.chess.service.GameService;
import com.chess.service.InvitationService;
import com.chess.service.PlayerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class InvitationWebSocketController {

    private static final Logger logger = LoggerFactory.getLogger(InvitationWebSocketController.class);

    private final SimpMessagingTemplate messagingTemplate;
    private final InvitationService invitationService;
    private final PlayerService playerService;
    private final GameService gameService;

    public InvitationWebSocketController(SimpMessagingTemplate messagingTemplate,
                                         InvitationService invitationService,
                                         PlayerService playerService,
                                         GameService gameService) {
        this.messagingTemplate = messagingTemplate;
        this.invitationService = invitationService;
        this.playerService = playerService;
        this.gameService = gameService;
    }

    @MessageMapping("/invite")
    public void handleInvite(@Payload Map<String, String> payload) {
        String senderUsername = payload.get("senderUsername");
        String receiverUsername = payload.get("receiverUsername");

        logger.info("Invitation from {} to {}", senderUsername, receiverUsername);

        User sender = playerService.findByUsername(senderUsername)
                .orElseThrow(() -> new RuntimeException("Sender not found"));
        User receiver = playerService.findByUsername(receiverUsername)
                .orElseThrow(() -> new RuntimeException("Receiver not found"));

        // Check if receiver is online
        if (!playerService.isPlayerOnline(receiverUsername)) {
            // Send error back to sender
            String errorDest = "/topic/user/" + senderUsername + "/errors";
            Object errorMsg = Map.of("message", "Player is not online");
            messagingTemplate.convertAndSend(errorDest, errorMsg);
            return;
        }

        Invitation invitation = invitationService.createInvitation(sender, receiver);
        InvitationDTO invitationDTO = invitationService.toDTO(invitation);

        // Send invitation to receiver via user-specific topic
        messagingTemplate.convertAndSend(
                "/topic/user/" + receiverUsername + "/invitations",
                invitationDTO
        );

        // Confirm to sender
        messagingTemplate.convertAndSend(
                "/topic/user/" + senderUsername + "/invitation-sent",
                invitationDTO
        );

        logger.info("Invitation {} sent from {} to {}", invitation.getId(), senderUsername, receiverUsername);
    }

    @MessageMapping("/invite/respond")
    public void handleInviteResponse(@Payload InvitationResponseDTO response) {
        logger.info("Invitation response: id={}, accepted={}", response.getInvitationId(), response.isAccepted());

        Invitation invitation = invitationService.findById(response.getInvitationId())
                .orElseThrow(() -> new RuntimeException("Invitation not found"));

        String senderUsername = invitation.getSender().getUsername();
        String receiverUsername = invitation.getReceiver().getUsername();

        if (response.isAccepted()) {
            // Accept invitation
            invitationService.acceptInvitation(invitation);

            // Create game - receiver (who accepted) plays as white (first move)
            // Or we can randomize this
            Game game = gameService.createGame(invitation.getReceiver(), invitation.getSender());
            GameDTO gameDTO = gameService.toDTO(game);

            // Notify both players about the new game via user-specific topics
            messagingTemplate.convertAndSend(
                    "/topic/user/" + senderUsername + "/game-created",
                    gameDTO
            );
            messagingTemplate.convertAndSend(
                    "/topic/user/" + receiverUsername + "/game-created",
                    gameDTO
            );

            logger.info("Game {} created between {} (white) and {} (black)",
                    game.getId(), receiverUsername, senderUsername);
        } else {
            // Refuse invitation
            invitationService.refuseInvitation(invitation);

            // Notify sender that invitation was refused
            messagingTemplate.convertAndSend(
                    "/topic/user/" + senderUsername + "/invitation-refused",
                    invitationService.toDTO(invitation)
            );

            logger.info("Invitation {} refused", invitation.getId());
        }
    }
}
