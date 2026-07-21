package com.example.tikitihub.controller.auth;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.example.tikitihub.model.User;
import com.example.tikitihub.model.UserRole;
import com.example.tikitihub.repository.UserRepository;
import com.example.tikitihub.service.EmailService;
import com.example.tikitihub.service.JwtService;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;
    private final EmailService emailService;

    private static final Pattern PASSWORD_PATTERN = Pattern.compile("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$");

    public AuthController(UserRepository userRepository, 
                          PasswordEncoder passwordEncoder, 
                          JwtService jwtService, 
                          AuthenticationManager authenticationManager,
                          EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
        this.emailService = emailService;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> request) {
        String email = request.get("email");
        String password = request.get("password");
        String fullName = request.get("fullName");
        String roleStr = request.get("role");

        if (userRepository.findByEmail(email).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email is already registered!"));
        }

        if (password == null || !PASSWORD_PATTERN.matcher(password).matches()) {
            return ResponseEntity.badRequest().body(Map.of(
                "error", "Password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter, one digit, and one special character."
            ));
        }

        User user = new User();
        user.setEmail(email);
        user.setFullName(fullName);
        user.setPassword(passwordEncoder.encode(password));
        user.setEnabled(false);

        String generatedToken = UUID.randomUUID().toString();
        user.setVerificationToken(generatedToken);
        
        try {
            String parsedRole = (roleStr != null) ? roleStr.toUpperCase() : "CUSTOMER";
            if (!parsedRole.startsWith("ROLE_")) {
                parsedRole = "ROLE_" + parsedRole;
            }
            
            user.setRole(com.example.tikitihub.model.UserRole.valueOf(parsedRole));
        } catch (IllegalArgumentException e) {
            user.setRole(UserRole.ROLE_CUSTOMER); 
        }

        userRepository.save(user);

        try {
            emailService.sendVerificationEmail(email, generatedToken, fullName);
        } catch (Exception e) {
            System.err.println("Verification email failed to send: " + e.getMessage());
        }

        return new ResponseEntity<>(Map.of("message", "User registered successfully!"), HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new RuntimeException("User record mapping trace failed"));

        if (!user.isEnabled()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                .body(Map.of("error", "Account unverified! Please complete email confirmation."));
        }

        Authentication authentication = authenticationManager.authenticate(
            new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );
        UserDetails userDetails = (UserDetails) authentication.getPrincipal();

        String token = jwtService.generateToken(userDetails);

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("token", token);
        
        Map<String, Object> userProfile = new HashMap<>();
        userProfile.put("email", user.getEmail());
        userProfile.put("role", user.getRole().name());
        responseBody.put("user", userProfile);

        return ResponseEntity.ok(responseBody);
    }

    @GetMapping("/verify")
    @Transactional
    public ResponseEntity<?> verifyEmail(@RequestParam("token") String token) {
        if (token == null || token.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Invalid token link."));
        }

        Optional<User> userOptional = userRepository.findByVerificationToken(token.trim());

        if (userOptional.isEmpty()) {
            return ResponseEntity.ok(Map.of("message", "Account is already activated! You can log in."));
        }

        User user = userOptional.get();
        user.setEnabled(true);
        user.setVerificationToken(null);

        userRepository.saveAndFlush(user);

        return ResponseEntity.ok(Map.of("message", "Account successfully activated!"));
    }
}