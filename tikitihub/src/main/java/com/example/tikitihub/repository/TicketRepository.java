package com.example.tikitihub.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.tikitihub.model.Ticket;
import com.example.tikitihub.model.User;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {

    List<Ticket> findByOrganizer(User organizer);

    List<Ticket> findByEventDateAfterOrderByEventDateAsc(LocalDateTime dateTime);

    @Modifying(flushAutomatically = true)
    @Query("UPDATE Ticket t SET t.remainingQuantity = t.remainingQuantity - :qty " +
           "WHERE t.id = :id AND t.remainingQuantity IS NOT NULL AND t.remainingQuantity >= :qty")
    int decrementIfAvailable(@Param("id") Long id, @Param("qty") int qty);
}