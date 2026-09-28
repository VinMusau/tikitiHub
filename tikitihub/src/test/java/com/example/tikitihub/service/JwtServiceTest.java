package com.example.tikitihub.service;

import com.example.tikitihub.config.JwtProperties;
import io.jsonwebtoken.JwtException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Base64;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtServiceTest {

    private JwtService jwtService;

    @BeforeEach
    void setUp() {
        // 64 random-ish bytes, base64-encoded — deterministic for reproducibility
        byte[] keyBytes = new byte[64];
        for (int i = 0; i < keyBytes.length; i++) keyBytes[i] = (byte) i;

        JwtProperties props = new JwtProperties();
        props.setSecret(Base64.getEncoder().encodeToString(keyBytes));
        props.setExpirationMs(60_000); // 1 minute

        jwtService = new JwtService(props);
    }

    private UserDetails testUser(String email, String... roles) {
        return User.withUsername(email)
                .password("ignored")
                .authorities(
                        List.of(roles).stream()
                                .map(SimpleGrantedAuthority::new)
                                .toList()
                )
                .build();
    }

    @Test
    void generatesTokenWithSubjectAndRoles() {
        UserDetails user = testUser("alice@example.com", "ROLE_CUSTOMER", "ROLE_AGENT");

        String token = jwtService.generateToken(user);

        assertThat(token).isNotBlank();
        assertThat(jwtService.extractUsername(token)).isEqualTo("alice@example.com");

        // Roles claim is present (with ROLE_ prefix stripped by the service)
        @SuppressWarnings("unchecked")
        List<String> roles = jwtService.extractClaim(token, claims -> claims.get("roles", List.class));
        assertThat(roles).containsExactlyInAnyOrder("CUSTOMER", "AGENT");
    }

    @Test
    void validatesTokenForCorrectUser() {
        UserDetails user = testUser("bob@example.com", "ROLE_CUSTOMER");
        String token = jwtService.generateToken(user);

        assertThat(jwtService.isTokenValid(token, "bob@example.com")).isTrue();
    }

    @Test
    void rejectsTokenForDifferentUser() {
        UserDetails user = testUser("bob@example.com", "ROLE_CUSTOMER");
        String token = jwtService.generateToken(user);

        assertThat(jwtService.isTokenValid(token, "eve@example.com")).isFalse();
    }

    @Test
    void rejectsTamperedToken() {
        UserDetails user = testUser("bob@example.com", "ROLE_CUSTOMER");
        String token = jwtService.generateToken(user);

        // Flip a character in the payload section (between the two dots)
        String[] parts = token.split("\\.");
        char[] payload = parts[1].toCharArray();
        payload[0] = payload[0] == 'A' ? 'B' : 'A';
        parts[1] = new String(payload);
        String tampered = String.join(".", parts);

        assertThatThrownBy(() -> jwtService.extractUsername(tampered))
                .isInstanceOf(JwtException.class);
    }

    @Test
    void rejectsExpiredToken() throws InterruptedException {
        // Rebuild service with 1 ms expiration
        byte[] keyBytes = new byte[64];
        JwtProperties props = new JwtProperties();
        props.setSecret(Base64.getEncoder().encodeToString(keyBytes));
        props.setExpirationMs(1L);
        JwtService shortLivedService = new JwtService(props);

        UserDetails user = testUser("carol@example.com", "ROLE_CUSTOMER");
        String token = shortLivedService.generateToken(user);

        Thread.sleep(50); // let it expire

        assertThat(shortLivedService.isTokenValid(token, "carol@example.com")).isFalse();
    }

    @Test
    void rejectsCompletelyMalformedToken() {
        // This is the "Bearer not-a-real-jwt" case that caused 500s before
        assertThatThrownBy(() -> jwtService.extractUsername("not-a-real-jwt"))
                .isInstanceOf(JwtException.class);
    }
}