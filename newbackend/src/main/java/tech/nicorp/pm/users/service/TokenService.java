package tech.nicorp.pm.users.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.nicorp.pm.users.domain.Token;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.TokenRepository;
import tech.nicorp.pm.users.repo.UserRepository;

import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TokenService {
    private final TokenRepository tokens;
    private final UserRepository users;
    private final SecureRandom random = new SecureRandom();

    public List<Token> list(UUID userId) {
        return tokens.findByUserId(userId);
    }

    @Transactional
    public String create(UUID userId, String name) {
        User user = users.findById(userId).orElseThrow();
        byte[] raw = new byte[24];
        random.nextBytes(raw);
        String token = HexFormat.of().formatHex(raw);
        Token t = new Token();
        t.setUser(user);
        t.setName(name);
        t.setTokenHash(BCrypt.hashpw(token, BCrypt.gensalt()));
        tokens.save(t);
        return token; // return plaintext once
    }

    @Transactional
    public void revoke(UUID userId, UUID tokenId) {
        tokens.findById(tokenId).ifPresent(t -> {
            if (t.getUser().getId().equals(userId)) tokens.delete(t);
        });
    }
}


