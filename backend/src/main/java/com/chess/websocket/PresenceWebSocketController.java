package com.chess.websocket;

import com.chess.dto.PlayerDTO;
import com.chess.service.PlayerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.event.EventListener;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Controller;
import org.springframework.web.socket.messaging.SessionConnectedEvent;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import java.util.List;
import java.util.Map;

@Controller
public class PresenceWebSocketController {

    private static final Logger logger = LoggerFactory.getLogger(PresenceWebSocketController.class);

    private final SimpMessagingTemplate messagingTemplate;
    private final PlayerService playerService;

    public PresenceWebSocketController(SimpMessagingTemplate messagingTemplate, PlayerService playerService) {
        this.messagingTemplate = messagingTemplate;
        this.playerService = playerService;
    }

    @MessageMapping("/presence/connect")
    public void handleConnect(@Payload Map<String, String> payload, SimpMessageHeaderAccessor headerAccessor) {
        String username = payload.get("username");
        String sessionId = headerAccessor.getSessionId();

        if (username != null && sessionId != null) {
            // Store username in session attributes for disconnect handling
            headerAccessor.getSessionAttributes().put("username", username);
            
            playerService.playerConnected(username, sessionId);
            logger.info("Player connected: {} (session: {})", username, sessionId);
            
            broadcastOnlinePlayers();
        }
    }

    @MessageMapping("/presence/disconnect")
    public void handleDisconnect(@Payload Map<String, String> payload) {
        String username = payload.get("username");
        if (username != null) {
            playerService.playerDisconnected(username);
            logger.info("Player disconnected: {}", username);
            broadcastOnlinePlayers();
        }
    }

    @EventListener
    public void handleWebSocketConnectListener(SessionConnectedEvent event) {
        logger.info("New WebSocket connection established");
    }

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {
        StompHeaderAccessor headerAccessor = StompHeaderAccessor.wrap(event.getMessage());
        String sessionId = headerAccessor.getSessionId();
        
        // Try to get username from session attributes
        Map<String, Object> sessionAttrs = headerAccessor.getSessionAttributes();
        if (sessionAttrs != null) {
            String username = (String) sessionAttrs.get("username");
            if (username != null) {
                playerService.playerDisconnected(username);
                logger.info("Player disconnected on session close: {}", username);
                broadcastOnlinePlayers();
                return;
            }
        }
        
        // Fallback: remove by session ID
        playerService.playerDisconnectedBySession(sessionId);
        logger.info("Session disconnected: {}", sessionId);
        broadcastOnlinePlayers();
    }

    private void broadcastOnlinePlayers() {
        List<PlayerDTO> onlinePlayers = playerService.getOnlinePlayers();
        messagingTemplate.convertAndSend("/topic/players", onlinePlayers);
    }
}
