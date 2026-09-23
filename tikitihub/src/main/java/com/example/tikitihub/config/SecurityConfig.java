package com.example.tikitihub.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.AuthenticationProvider;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.example.tikitihub.security.JwtAuthenticationFilter;
import com.example.tikitihub.service.CustomUserDetailsService;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthenticationFilter jwtAuthFilter;
    private final CustomUserDetailsService userDetailsService;

    @Value("${app.cors.allowed-origins}")
    private List<String> allowedOrigins;

    public SecurityConfig(JwtAuthenticationFilter jwtAuthFilter, CustomUserDetailsService userDetailsService) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.userDetailsService = userDetailsService;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(csrf -> csrf.disable())
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session ->
                    session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(auth -> auth

                    // ---------- Fully public ----------
                    .requestMatchers("/error").permitAll()
                    .requestMatchers("/api/auth/**").permitAll()
                    .requestMatchers("/api/events/**").permitAll()
                    .requestMatchers("/api/payments/mpesa-callback").permitAll()

                    // ---------- Public read-only ticket catalog ----------
                    // Exact path only — no wildcards
                    .requestMatchers(HttpMethod.GET, "/api/tickets").permitAll()
                    // Numeric ID only — blocks /my-listings and /my-events
                    .requestMatchers(HttpMethod.GET, "/api/tickets/{id:[0-9]+}").permitAll()
                    .requestMatchers(HttpMethod.GET, "/api/tickets/{id:[0-9]+}/tiers").permitAll()

                    // ---------- Organizer-only ticket endpoints ----------
                    .requestMatchers(HttpMethod.GET, "/api/tickets/my-listings")
                            .hasAnyAuthority("ROLE_AGENT", "ROLE_ADMIN")
                    .requestMatchers(HttpMethod.GET, "/api/tickets/my-events")
                            .hasAnyAuthority("ROLE_AGENT", "ROLE_ADMIN")
                    .requestMatchers(HttpMethod.POST, "/api/tickets/**")
                            .hasAnyAuthority("ROLE_AGENT", "ROLE_ADMIN")
                    .requestMatchers(HttpMethod.PUT, "/api/tickets/**")
                            .hasAnyAuthority("ROLE_AGENT", "ROLE_ADMIN")
                    .requestMatchers(HttpMethod.DELETE, "/api/tickets/**")
                            .hasAnyAuthority("ROLE_AGENT", "ROLE_ADMIN")

                    // ---------- Bookings — authenticated user only ----------
                    .requestMatchers(HttpMethod.GET, "/api/bookings/**").authenticated()
                    .requestMatchers(HttpMethod.POST, "/api/bookings/redeem")
                            .hasAnyAuthority("ROLE_AGENT", "ROLE_ADMIN")
                    .requestMatchers(HttpMethod.POST, "/api/bookings/**").authenticated()

                    // ---------- Payments — authenticated user only ----------
                    .requestMatchers(HttpMethod.POST, "/api/payments/stk-push").authenticated()

                    // ---------- Anything else requires authentication ----------
                    .anyRequest().authenticated()
            )
            .exceptionHandling(ex -> ex
                    .authenticationEntryPoint((req, res, authEx) -> {
                        res.setStatus(401);
                        res.setContentType("application/json");
                        res.getWriter().write("{\"error\":\"Unauthorized — missing or invalid token\"}");
                    })
                    .accessDeniedHandler((req, res, accessEx) -> {
                        res.setStatus(403);
                        res.setContentType("application/json");
                        res.getWriter().write("{\"error\":\"Forbidden — insufficient permissions\"}");
                    })
            )
            .authenticationProvider(authenticationProvider())
            .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOriginPatterns(allowedOrigins);
        configuration.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"));
        configuration.setAllowedHeaders(List.of("*"));
        configuration.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public AuthenticationProvider authenticationProvider() {
        DaoAuthenticationProvider authProvider = new DaoAuthenticationProvider(userDetailsService);
        authProvider.setPasswordEncoder(passwordEncoder());
        return authProvider;
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}