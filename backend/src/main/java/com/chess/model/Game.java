package com.chess.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "games")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Game {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "white_player_id")
    private User whitePlayer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "black_player_id")
    private User blackPlayer;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private GameStatus status = GameStatus.IN_PROGRESS;

    @Column(name = "current_turn", length = 5)
    @Builder.Default
    private String currentTurn = "white";

    @Column(name = "current_fen")
    private String currentFen;

    @OneToMany(mappedBy = "game", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("moveNumber ASC")
    @Builder.Default
    private List<Move> moves = new ArrayList<>();

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
        if (currentFen == null) {
            currentFen = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        }
    }

    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public enum GameStatus {
        IN_PROGRESS,
        WHITE_WON,
        BLACK_WON,
        DRAW,
        ABANDONED
    }
}
