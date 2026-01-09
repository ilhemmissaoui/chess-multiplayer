package com.chess.websocket;

import com.chess.dto.GameDTO;
import com.chess.dto.MoveDTO;
import com.chess.model.Game;
import com.chess.model.Move;
import com.chess.service.GameService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
public class GameWebSocketController {

    private static final Logger logger = LoggerFactory.getLogger(GameWebSocketController.class);

    private final SimpMessagingTemplate messagingTemplate;
    private final GameService gameService;

    public GameWebSocketController(SimpMessagingTemplate messagingTemplate, GameService gameService) {
        this.messagingTemplate = messagingTemplate;
        this.gameService = gameService;
    }

    @MessageMapping("/game/{gameId}/move")
    public void handleMove(@DestinationVariable Long gameId, @Payload MoveDTO moveDTO) {
        logger.info("Move received for game {}: {} -> {}", gameId, moveDTO.getFrom(), moveDTO.getTo());

        Game game = gameService.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        // Check if game is still in progress
        if (game.getStatus() != Game.GameStatus.IN_PROGRESS) {
            logger.warn("Attempted move on finished game {}", gameId);
            return;
        }

        // Save the move
        Move move = gameService.makeMove(game, moveDTO);

        // Prepare move DTO with all info
        MoveDTO responseMoveDTO = MoveDTO.builder()
                .gameId(gameId)
                .from(moveDTO.getFrom())
                .to(moveDTO.getTo())
                .piece(moveDTO.getPiece())
                .promotion(moveDTO.getPromotion())
                .fenAfter(moveDTO.getFenAfter())
                .sanNotation(moveDTO.getSanNotation())
                .moveNumber(move.getMoveNumber())
                .playerColor(moveDTO.getPlayerColor())
                .build();

        // Broadcast move to all subscribers of this game
        messagingTemplate.convertAndSend("/topic/game/" + gameId + "/moves", responseMoveDTO);

        logger.info("Move {} broadcast for game {}", move.getMoveNumber(), gameId);
    }

    @MessageMapping("/game/{gameId}/end")
    public void handleGameEnd(@DestinationVariable Long gameId, @Payload Map<String, String> payload) {
        String result = payload.get("result"); // "white", "black", "draw"
        String reason = payload.get("reason"); // "checkmate", "resignation", "stalemate", "agreement"

        logger.info("Game {} ended: {} by {}", gameId, result, reason);

        Game game = gameService.findById(gameId)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        Game.GameStatus status = switch (result) {
            case "white" -> Game.GameStatus.WHITE_WON;
            case "black" -> Game.GameStatus.BLACK_WON;
            case "draw" -> Game.GameStatus.DRAW;
            default -> Game.GameStatus.ABANDONED;
        };

        gameService.updateGameStatus(game, status);
        
        // Reload the game with all eager-loaded relationships
        Game updatedGame = gameService.findByIdWithMovesAndPlayers(gameId);

        // Broadcast game end to all subscribers
        GameDTO gameDTO = gameService.toDTO(updatedGame);
        String destination = "/topic/game/" + gameId + "/status";
        Object message = Map.of("game", gameDTO, "reason", reason);
        logger.info("Broadcasting game end to {}", destination);
        messagingTemplate.convertAndSend(destination, message);
    }

    @MessageMapping("/game/{gameId}/join")
    public void handleJoinGame(@DestinationVariable Long gameId, @Payload Map<String, String> payload) {
        String username = payload.get("username");
        logger.info("Player {} joining game {}", username, gameId);

        // Send current game state to the joining player
        Game game = gameService.findByIdWithMovesAndPlayers(gameId);
        if (game != null) {
            GameDTO gameDTO = gameService.toDTO(game);
            messagingTemplate.convertAndSendToUser(
                    username,
                    "/queue/game-state",
                    gameDTO
            );
        }
    }
}
