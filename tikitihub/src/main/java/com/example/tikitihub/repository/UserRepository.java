package com.example.tikitihub.repository;

import com.example.tikitihub.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    // This allows us to quickly look up users by email later during login
    Optional<User> findByEmail(String email);
}