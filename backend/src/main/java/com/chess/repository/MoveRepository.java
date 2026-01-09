package com.chess.repository;

import com.chess.model.Game;
import com.chess.model.Move;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MoveRepository extends JpaRepository<Move, Long> {

    List<Move> findByGameOrderByMoveNumberAsc(Game game);

    int countByGame(Game game);
}
