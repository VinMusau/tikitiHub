package com.example.tikitihub.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.tikitihub.model.TicketTier;

@Repository
public interface TicketTierRepository extends JpaRepository<TicketTier, Long> {
    List<TicketTier> findByTicketId(Long ticketId);    
}
