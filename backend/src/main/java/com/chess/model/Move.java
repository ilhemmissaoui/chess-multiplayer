package com.chess.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "moves")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Move {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "game_id", nullable = false)
    private Game game;

    @Column(name = "move_number", nullable = false)
    private Integer moveNumber;

    @Column(name = "from_square", nullable = false, length = 2)
    private String fromSquare;

    @Column(name = "to_square", nullable = false, length = 2)
    private String toSquare;

    @Column(nullable = false, length = 10)
    private String piece;

    @Column(length = 1)
    private String promotion;

    @Column(name = "fen_after", length = 100)
    private String fenAfter;

    @Column(name = "san_notation", length = 10)
    private String sanNotation;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
