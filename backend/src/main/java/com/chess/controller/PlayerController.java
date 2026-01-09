package com.chess.controller;

import com.chess.dto.PlayerDTO;
import com.chess.service.PlayerService;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/players")
public class PlayerController {

    private final PlayerService playerService;

    public PlayerController(PlayerService playerService) {
        this.playerService = playerService;
    }

    @GetMapping("/online")
    public ResponseEntity<List<PlayerDTO>> getOnlinePlayers(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<PlayerDTO> players = playerService.getOnlinePlayersExcept(userDetails.getUsername());
        return ResponseEntity.ok(players);
    }
}
