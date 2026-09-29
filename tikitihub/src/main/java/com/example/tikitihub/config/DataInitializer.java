package com.example.tikitihub.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.example.tikitihub.model.User;
import com.example.tikitihub.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);
    private final UserRepository userRepository;

    public DataInitializer(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) throws Exception {
        List<String> testEmails = Arrays.asList("testdev@tikitihub.com", "agentoscar@tikitihub.com");

        for (String email : testEmails) {
            userRepository.findByEmail(email).ifPresent(user -> {
                if (!user.isEnabled()) {
                    user.setEnabled(true);
                    user.setVerificationToken(null); 
                    userRepository.save(user);
                    log.info(" [Dev Setup] Force-verified test account: {}", email);
                }
            });
        }
    }
}