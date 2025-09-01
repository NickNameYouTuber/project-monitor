package tech.nicorp.pm.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import tech.nicorp.pm.users.domain.Token;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.TokenRepository;
import tech.nicorp.pm.users.repo.UserRepository;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.Collections;
import java.util.Optional;

@Component
public class BasicPatAuthFilter extends OncePerRequestFilter {

    private final UserRepository users;
    private final TokenRepository tokens;

    public BasicPatAuthFilter(UserRepository users, TokenRepository tokens) {
        this.users = users;
        this.tokens = tokens;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain) throws ServletException, IOException {
        String authHeader = request.getHeader("Authorization");
        if (authHeader != null && authHeader.startsWith("Basic ")) {
            String base64 = authHeader.substring(6);
            String decoded = new String(Base64.getDecoder().decode(base64), StandardCharsets.UTF_8);
            int idx = decoded.indexOf(':');
            if (idx > 0) {
                String username = decoded.substring(0, idx);
                String pat = decoded.substring(idx + 1);
                Optional<User> userOpt = users.findByUsername(username);
                if (userOpt.isPresent()) {
                    User u = userOpt.get();
                    boolean match = tokens.findByUserId(u.getId()).stream().map(Token::getTokenHash).anyMatch(hash -> BCrypt.checkpw(pat, hash));
                    if (match) {
                        UsernamePasswordAuthenticationToken authentication = new UsernamePasswordAuthenticationToken(u.getId().toString(), null, Collections.emptyList());
                        authentication.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                        SecurityContextHolder.getContext().setAuthentication(authentication);
                    }
                }
            }
        }
        filterChain.doFilter(request, response);
    }
}


