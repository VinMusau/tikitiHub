package com.example.tikitihub.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.example.tikitihub.model.TicketTier;

@Repository
public interface TicketTierRepository extends JpaRepository<TicketTier, Long> {

    List<TicketTier> findByTicketId(Long ticketId);

    @Modifying(flushAutomatically = true)
    @Query("UPDATE TicketTier t SET t.remainingQuantity = t.remainingQuantity - :qty " +
           "WHERE t.id = :id AND t.remainingQuantity IS NOT NULL AND t.remainingQuantity >= :qty")
    int decrementIfAvailable(@Param("id") Long id, @Param("qty") int qty);
}