package com.chess.service;

import com.chess.dto.GameDTO;
import com.chess.dto.MoveDTO;
import com.chess.dto.PlayerDTO;
import com.chess.model.Game;
import com.chess.model.Move;
import com.chess.model.User;
import com.chess.repository.GameRepository;
import com.chess.repository.MoveRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class GameService {

    private final GameRepository gameRepository;
    private final MoveRepository moveRepository;

    public GameService(GameRepository gameRepository, MoveRepository moveRepository) {
        this.gameRepository = gameRepository;
        this.moveRepository = moveRepository;
    }

    @Transactional
    public Game createGame(User whitePlayer, User blackPlayer) {
        Game game = Game.builder()
                .whitePlayer(whitePlayer)
                .blackPlayer(blackPlayer)
                .status(Game.GameStatus.IN_PROGRESS)
                .currentTurn("white")
                .currentFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1")
                .build();

        return gameRepository.save(game);
    }

    public Optional<Game> findById(Long id) {
        return gameRepository.findById(id);
    }

    public Game findByIdWithMoves(Long id) {
        return gameRepository.findByIdWithMoves(id);
    }

    public Game findByIdWithMovesAndPlayers(Long id) {
        return gameRepository.findByIdWithMovesAndPlayers(id);
    }

    public List<Game> findActiveGamesByPlayer(User player) {
        return gameRepository.findActiveGamesByPlayer(player);
    }

    public List<Game> findAllGamesByPlayer(User player) {
        return gameRepository.findAllGamesByPlayer(player);
    }

    @Transactional
    public Move makeMove(Game game, MoveDTO moveDTO) {
        int moveNumber = moveRepository.countByGame(game) + 1;

        Move move = Move.builder()
                .game(game)
                .moveNumber(moveNumber)
                .fromSquare(moveDTO.getFrom())
                .toSquare(moveDTO.getTo())
                .piece(moveDTO.getPiece())
                .promotion(moveDTO.getPromotion())
                .fenAfter(moveDTO.getFenAfter())
                .sanNotation(moveDTO.getSanNotation())
                .build();

        move = moveRepository.save(move);

        // Update game state
        game.setCurrentFen(moveDTO.getFenAfter());
        game.setCurrentTurn(game.getCurrentTurn().equals("white") ? "black" : "white");
        gameRepository.save(game);

        return move;
    }

    @Transactional
    public void updateGameStatus(Game game, Game.GameStatus status) {
        game.setStatus(status);
        gameRepository.save(game);
    }

    public List<MoveDTO> getMoveHistory(Game game) {
        return moveRepository.findByGameOrderByMoveNumberAsc(game).stream()
                .map(move -> MoveDTO.builder()
                        .gameId(game.getId())
                        .from(move.getFromSquare())
                        .to(move.getToSquare())
                        .piece(move.getPiece())
                        .promotion(move.getPromotion())
                        .fenAfter(move.getFenAfter())
                        .sanNotation(move.getSanNotation())
                        .moveNumber(move.getMoveNumber())
                        .build())
                .collect(Collectors.toList());
    }

    public GameDTO toDTO(Game game) {
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
                .moves(getMoveHistory(game))
                .build();
    }
}
