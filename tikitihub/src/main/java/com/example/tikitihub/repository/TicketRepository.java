package com.example.tikitihub.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.example.tikitihub.model.Ticket;
import com.example.tikitihub.model.User;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {
    List<Ticket> findByOrganizer(User organizer);
    List<Ticket> findByEventDateAfterOrderByEventDateAsc(LocalDateTime dateTime);
}