package com.example.tikitihub.controller.auth;

import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.example.tikitihub.model.User;
import com.example.tikitihub.model.UserRole;
import com.example.tikitihub.repository.UserRepository;
import com.example.tikitihub.service.JwtService;
@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final AuthenticationManager authenticationManager;

    public AuthController(UserRepository userRepository, 
                          PasswordEncoder passwordEncoder, 
                          JwtService jwtService, 
                          AuthenticationManager authenticationManager) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
        this.authenticationManager = authenticationManager;
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

        User user = new User();
        user.setEmail(email);
        user.setFullName(fullName);
        user.setPassword(passwordEncoder.encode(password));
        
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

        return new ResponseEntity<>(Map.of("message", "User registered successfully!"), HttpStatus.CREATED);
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody LoginRequest request) {
        UserDetails userDetails = null;
        try {
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    request.getEmail(), 
                    request.getPassword()
                )
            );
            userDetails = (UserDetails) authentication.getPrincipal();
        } catch (Exception e) {
            e.printStackTrace();
            throw e;
        }

        String token = jwtService.generateToken(userDetails);

        User user = userRepository.findByEmail(request.getEmail())
            .orElseThrow(() -> new RuntimeException("User record mapping trace failed"));

        Map<String, Object> responseBody = new HashMap<>();
        responseBody.put("token", token);
        
        Map<String, Object> userProfile = new HashMap<>();
        userProfile.put("email", user.getEmail());
        userProfile.put("role", user.getRole().name());

        responseBody.put("user", userProfile);

        return ResponseEntity.ok(responseBody);
    }
}