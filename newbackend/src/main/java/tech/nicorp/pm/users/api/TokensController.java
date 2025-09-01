package tech.nicorp.pm.users.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.security.SecurityUtil;
import tech.nicorp.pm.users.domain.Token;
import tech.nicorp.pm.users.service.TokenService;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/tokens")
public class TokensController {

    private final TokenService tokens;

    public TokensController(TokenService tokens) {
        this.tokens = tokens;
    }

    @GetMapping
    public ResponseEntity<List<Token>> list() {
        UUID userId = SecurityUtil.getCurrentUserId().orElseThrow();
        return ResponseEntity.ok(tokens.list(userId));
    }

    @PostMapping
    public ResponseEntity<Map<String, String>> create(@RequestBody Map<String, String> body) {
        UUID userId = SecurityUtil.getCurrentUserId().orElseThrow();
        String name = body.getOrDefault("name", "token");
        String plaintext = tokens.create(userId, name);
        return ResponseEntity.ok(Map.of("token", plaintext));
    }

    @DeleteMapping("/{tokenId}")
    public ResponseEntity<Void> revoke(@PathVariable UUID tokenId) {
        UUID userId = SecurityUtil.getCurrentUserId().orElseThrow();
        tokens.revoke(userId, tokenId);
        return ResponseEntity.noContent().build();
    }
}


