package tech.nicorp.pm.users.api;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@Tag(name = "Users", description = "Пользователи и профиль")
public class UsersController {

    private final UserRepository users;

    public UsersController(UserRepository users) {
        this.users = users;
    }

    @GetMapping("/me")
    @Operation(summary = "Профиль текущего пользователя")
    public ResponseEntity<User> me(Authentication auth) {
        if (auth == null || auth.getName() == null) return ResponseEntity.status(401).build();
        try { return users.findById(UUID.fromString(auth.getName())).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build()); }
        catch (IllegalArgumentException e) { return ResponseEntity.status(401).build(); }
    }

    @PutMapping("/me")
    @Operation(summary = "Обновить профиль текущего пользователя")
    public ResponseEntity<User> updateMe(Authentication auth, @RequestBody Map<String, Object> body) {
        if (auth == null || auth.getName() == null) return ResponseEntity.status(401).build();
        try {
            return users.findById(UUID.fromString(auth.getName())).map(u -> {
                if (body.containsKey("username")) u.setUsername((String) body.get("username"));
                if (body.containsKey("display_name")) u.setDisplayName((String) body.get("display_name"));
                return ResponseEntity.ok(users.save(u));
            }).orElse(ResponseEntity.notFound().build());
        } catch (IllegalArgumentException e) { return ResponseEntity.status(401).build(); }
    }

    @GetMapping
    @Operation(summary = "Список пользователей - ОТКЛЮЧЕНО для приватности")
    public ResponseEntity<?> list(@RequestParam(name = "limit", required = false, defaultValue = "100") int limit) {
        // SECURITY: Public user listing is disabled. 
        // Use /api/organizations/{orgId}/members to get users within an organization context.
        return ResponseEntity.status(403).body(java.util.Map.of(
            "error", "Listing all users is not allowed for privacy reasons",
            "hint", "Use /api/organizations/{orgId}/members to get organization members"
        ));
    }
}


