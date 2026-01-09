package com.chess.controller;

import com.chess.dto.GameDTO;
import com.chess.model.Game;
import com.chess.model.User;
import com.chess.service.GameService;
import com.chess.service.PlayerService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/games")
public class GameController {

    private final GameService gameService;
    private final PlayerService playerService;

    public GameController(GameService gameService, PlayerService playerService) {
        this.gameService = gameService;
        this.playerService = playerService;
    }

    @GetMapping("/{id}")
    public ResponseEntity<GameDTO> getGame(@PathVariable Long id) {
        return gameService.findById(id)
                .map(game -> ResponseEntity.ok(gameService.toDTO(game)))
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/active")
    public ResponseEntity<List<GameDTO>> getActiveGames(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = playerService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<GameDTO> games = gameService.findActiveGamesByPlayer(user).stream()
                .map(gameService::toDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(games);
    }

    @GetMapping("/history")
    public ResponseEntity<List<GameDTO>> getGameHistory(
            @AuthenticationPrincipal UserDetails userDetails) {
        User user = playerService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        List<GameDTO> games = gameService.findAllGamesByPlayer(user).stream()
                .map(gameService::toDTO)
                .collect(Collectors.toList());

        return ResponseEntity.ok(games);
    }

    @PostMapping("/{id}/resign")
    public ResponseEntity<GameDTO> resignGame(
            @PathVariable Long id,
            @AuthenticationPrincipal UserDetails userDetails) {
        Game game = gameService.findById(id)
                .orElseThrow(() -> new RuntimeException("Game not found"));

        User user = playerService.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        // Determine winner based on who resigned
        Game.GameStatus status;
        if (game.getWhitePlayer().getId().equals(user.getId())) {
            status = Game.GameStatus.BLACK_WON;
        } else if (game.getBlackPlayer().getId().equals(user.getId())) {
            status = Game.GameStatus.WHITE_WON;
        } else {
            return ResponseEntity.badRequest().build();
        }

        gameService.updateGameStatus(game, status);
        return ResponseEntity.ok(gameService.toDTO(game));
    }
}
