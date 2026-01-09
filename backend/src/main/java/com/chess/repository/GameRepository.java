package com.chess.repository;

import com.chess.model.Game;
import com.chess.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GameRepository extends JpaRepository<Game, Long> {

    @Query("SELECT g FROM Game g WHERE (g.whitePlayer = :player OR g.blackPlayer = :player) AND g.status = 'IN_PROGRESS'")
    List<Game> findActiveGamesByPlayer(@Param("player") User player);

    @Query("SELECT g FROM Game g WHERE g.whitePlayer = :player OR g.blackPlayer = :player ORDER BY g.updatedAt DESC")
    List<Game> findAllGamesByPlayer(@Param("player") User player);

    @Query("SELECT g FROM Game g LEFT JOIN FETCH g.moves WHERE g.id = :id")
    Game findByIdWithMoves(@Param("id") Long id);

    @Query("SELECT g FROM Game g " +
           "LEFT JOIN FETCH g.moves " +
           "LEFT JOIN FETCH g.whitePlayer " +
           "LEFT JOIN FETCH g.blackPlayer " +
           "WHERE g.id = :id")
    Game findByIdWithMovesAndPlayers(@Param("id") Long id);
}
