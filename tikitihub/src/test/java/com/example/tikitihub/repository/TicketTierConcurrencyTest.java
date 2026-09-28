package com.example.tikitihub.repository;

import com.example.tikitihub.model.Ticket;
import com.example.tikitihub.model.TicketTier;
import com.example.tikitihub.model.TicketStatus;
import com.example.tikitihub.model.User;
import com.example.tikitihub.model.UserRole;
import com.example.tikitihub.repository.UserRepository;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;


import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
class TicketTierConcurrencyTest {

    @Autowired private TicketTierRepository tierRepo;
    @Autowired private TicketRepository ticketRepo;
    @Autowired private PlatformTransactionManager txManager;
    @Autowired private UserRepository userRepo;

    @AfterEach
    void cleanup() {
        tierRepo.deleteAll();
        ticketRepo.deleteAll();
        userRepo.deleteAll();
    }

    @Test
    void atomicDecrementPreventsOversellingUnderConcurrentLoad() throws Exception {

        User organizer = new User();
        organizer.setEmail("concurrency-organizer-" + System.nanoTime() + "@example.com");
        organizer.setFullName("Concurrency Organizer");
        organizer.setPassword("$2a$10$dummyHashedPasswordForTestsOnly");
        organizer.setRole(UserRole.ROLE_AGENT);
        organizer.setEnabled(true);
        organizer = userRepo.save(organizer);

        // ---------- Setup: 5 tickets, 20 buyers ----------
        Ticket ticket = new Ticket();
        ticket.setEventName("Concurrency Test Event");
        ticket.setDescription("Test");
        ticket.setVenue("Test Venue");
        ticket.setEventDate(LocalDateTime.now().plusDays(7));
        ticket.setPrice(BigDecimal.valueOf(100));
        ticket.setTotalQuantity(5);
        ticket.setRemainingQuantity(5);
        ticket.setStatus(TicketStatus.UPCOMING);
        ticket.setOrganizer(organizer);
        ticket = ticketRepo.save(ticket);

        TicketTier tier = new TicketTier();
        tier.setTicket(ticket);
        tier.setName("General");
        tier.setPrice(100.0);
        tier.setTotalQuantity(5);
        tier.setRemainingQuantity(5);
        tier = tierRepo.save(tier);

        final Long tierId = tier.getId();

        // ---------- Fire 20 concurrent decrement attempts ----------
        final int concurrency = 20;
        final ExecutorService executor = Executors.newFixedThreadPool(concurrency);
        final CountDownLatch startGate = new CountDownLatch(1);
        final CountDownLatch doneGate = new CountDownLatch(concurrency);

        final AtomicInteger successes = new AtomicInteger(0);
        final AtomicInteger failures = new AtomicInteger(0);
        final AtomicInteger exceptions = new AtomicInteger(0);

        for (int i = 0; i < concurrency; i++) {
            executor.submit(() -> {
                try {
                    startGate.await(); // all threads wait until the gate opens
                    TransactionTemplate tx = new TransactionTemplate(txManager);
                    tx.execute(status -> {
                        int updated = tierRepo.decrementIfAvailable(tierId, 1);
                        if (updated == 1) successes.incrementAndGet();
                        else failures.incrementAndGet();
                        return null;
                    });
                } catch (Exception e) {
                    exceptions.incrementAndGet();
                } finally {
                    doneGate.countDown();
                }
            });
        }

        startGate.countDown(); // fire!
        boolean completed = doneGate.await(30, TimeUnit.SECONDS);
        executor.shutdown();

        assertThat(completed).as("all threads should finish within 30s").isTrue();

        // ---------- Assertions ----------
        assertThat(exceptions.get()).as("no unexpected exceptions").isZero();
        assertThat(successes.get()).as("exactly 5 decrements should succeed").isEqualTo(5);
        assertThat(failures.get()).as("the other 15 should be cleanly rejected").isEqualTo(15);

        // Verify the DB state
        TicketTier refreshed = tierRepo.findById(tierId).orElseThrow();
        assertThat(refreshed.getRemainingQuantity())
                .as("stock must not go negative")
                .isZero();

        // Sanity: the invariant
        assertThat(successes.get() + failures.get())
                .as("every attempt should have been counted")
                .isEqualTo(concurrency);
    }
}