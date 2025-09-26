package tech.nicorp.pm.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;
    private final BasicPatAuthFilter basicPatAuthFilter;

    public SecurityConfig(JwtAuthFilter jwtAuthFilter, BasicPatAuthFilter basicPatAuthFilter) {
        this.jwtAuthFilter = jwtAuthFilter;
        this.basicPatAuthFilter = basicPatAuthFilter;
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(sm -> sm.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/**", "/actuator/**").permitAll()
                        .requestMatchers("/swagger-ui/**", "/swagger-ui.html", "/api-docs/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/ws/**").permitAll()
                        .requestMatchers("/api/git/**").authenticated()
                        .requestMatchers("/api/projects/**", "/api/dashboards/**", "/api/repositories/**",
                                "/api/tasks/**", "/api/task-repository/**", "/api/comments/**",
                                "/api/whiteboards/**", "/api/whiteboard-**").authenticated()
                        .anyRequest().authenticated()
                )
                .addFilterBefore(basicPatAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class);
        return http.build();
    }
}


