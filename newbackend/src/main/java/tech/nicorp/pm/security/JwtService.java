package tech.nicorp.pm.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.security.Key;
import java.time.Instant;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Component
public class JwtService {
    private final Key key;
    private final String issuer;
    private final long expirationSeconds;
    private final UserRepository userRepository;

    public JwtService(@Value("${security.jwt.secret}") String secret,
                      @Value("${security.jwt.issuer}") String issuer,
                      @Value("${security.jwt.expirationSeconds}") long expirationSeconds,
                      UserRepository userRepository) {
        this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(java.util.Base64.getEncoder().encodeToString(secret.getBytes())));
        this.issuer = issuer;
        this.expirationSeconds = expirationSeconds;
        this.userRepository = userRepository;
    }

    public String createToken(String subject, Map<String, Object> claims) {
        Map<String, Object> enrichedClaims = new HashMap<>(claims);
        
        if (!enrichedClaims.containsKey("email")) {
            try {
                User user = userRepository.findById(UUID.fromString(subject)).orElse(null);
                if (user != null) {
                    enrichedClaims.put("email", user.getUsername());
                }
            } catch (Exception e) {
                System.err.println("[JwtService] Failed to add email to claims: " + e.getMessage());
            }
        }
        
        Instant now = Instant.now();
        return Jwts.builder()
                .setSubject(subject)
                .setIssuer(issuer)
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(now.plusSeconds(expirationSeconds)))
                .addClaims(enrichedClaims)
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public String createTokenWithOrgVerification(String subject, UUID organizationId, Map<String, Object> additionalClaims) {
        Map<String, Object> claims = new HashMap<>(additionalClaims);
        claims.put("org_verified", organizationId.toString());
        return createToken(subject, claims);
    }

    public Optional<String> extractOrgVerified(String token) {
        try {
            Claims claims = Jwts.parserBuilder()
                .setSigningKey(key)
                .build()
                .parseClaimsJws(token)
                .getBody();
            return Optional.ofNullable(claims.get("org_verified", String.class));
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}


