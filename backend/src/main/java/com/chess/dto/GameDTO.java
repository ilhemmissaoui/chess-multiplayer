package com.chess.dto;

import com.chess.model.Game;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GameDTO {

    private Long id;
    private PlayerDTO whitePlayer;
    private PlayerDTO blackPlayer;
    private String status;
    private String currentTurn;
    private String currentFen;
    private List<MoveDTO> moves;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    public static GameDTO fromEntity(Game game) {
        return GameDTO.builder()
                .id(game.getId())
                .whitePlayer(PlayerDTO.builder()
                        .id(game.getWhitePlayer().getId())
                        .username(game.getWhitePlayer().getUsername())
                        .build())
                .blackPlayer(PlayerDTO.builder()
                        .id(game.getBlackPlayer().getId())
                        .username(game.getBlackPlayer().getUsername())
                        .build())
                .status(game.getStatus().name())
                .currentTurn(game.getCurrentTurn())
                .currentFen(game.getCurrentFen())
                .createdAt(game.getCreatedAt())
                .updatedAt(game.getUpdatedAt())
                .build();
    }
}
