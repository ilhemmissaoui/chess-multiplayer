package com.chess.repository;

import com.chess.model.Invitation;
import com.chess.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface InvitationRepository extends JpaRepository<Invitation, Long> {

    List<Invitation> findByReceiverAndStatus(User receiver, Invitation.InvitationStatus status);

    List<Invitation> findBySenderAndStatus(User sender, Invitation.InvitationStatus status);

    @Query("SELECT i FROM Invitation i WHERE i.sender = :user OR i.receiver = :user ORDER BY i.createdAt DESC")
    List<Invitation> findAllByUser(@Param("user") User user);

    @Query("SELECT i FROM Invitation i JOIN FETCH i.sender JOIN FETCH i.receiver WHERE i.id = :id")
    Optional<Invitation> findByIdWithUsers(@Param("id") Long id);
}
