package tech.nicorp.pm.auth.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.security.JwtService;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.util.Map;
import tech.nicorp.pm.auth.api.dto.LoginRequest;
import tech.nicorp.pm.auth.api.dto.RegisterRequest;
import tech.nicorp.pm.auth.api.dto.TelegramAuthRequest;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication", description = "Регистрация и аутентификация пользователей")
public class AuthController {

    private final UserRepository users;
    private final JwtService jwt;

    public AuthController(UserRepository users, JwtService jwt) {
        this.users = users;
        this.jwt = jwt;
    }

    @PostMapping("/register")
    @Operation(summary = "Регистрация нового пользователя", description = "Создаёт нового пользователя и возвращает JWT токен")
    public ResponseEntity<Map<String, Object>> register(@RequestBody RegisterRequest body) {
        String username = body.getUsername();
        String password = body.getPassword();
        String displayName = body.getDisplay_name() != null ? body.getDisplay_name() : username;
        User u = new User();
        u.setUsername(username);
        u.setPasswordHash(BCrypt.hashpw(password, BCrypt.gensalt()));
        u.setDisplayName(displayName);
        users.save(u);
        String token = jwt.createToken(u.getId().toString(), Map.of("username", u.getUsername()));
        return ResponseEntity.ok(Map.of("token", token));
    }

    @PostMapping("/login")
    @Operation(summary = "Вход в систему", description = "Аутентификация пользователя. Тестовый пользователь: test/test123")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest body) {
        String username = body.getUsername();
        String password = body.getPassword();
        User u = users.findByUsername(username).orElse(null);
        if (u == null || !BCrypt.checkpw(password, u.getPasswordHash())) {
            return ResponseEntity.status(401).body(Map.of("error", "invalid_credentials"));
        }
        String token = jwt.createToken(u.getId().toString(), Map.of("username", u.getUsername()));
        return ResponseEntity.ok(Map.of("token", token));
    }

    @PostMapping("/telegram")
    @Operation(summary = "Вход через Telegram Login Widget")
    public ResponseEntity<Map<String, Object>> telegram(@RequestBody TelegramAuthRequest body) {
        String username = body.getUsername() != null ? body.getUsername() : ("tg_" + body.getTelegram_id());
        User u = users.findByUsername(username).orElse(null);
        if (u == null) {
            u = new User();
            u.setUsername(username);
            u.setDisplayName(((body.getFirst_name() != null ? body.getFirst_name() : "") + (body.getLast_name() != null ? (" " + body.getLast_name()) : "")).trim());
            users.save(u);
        }
        String token = jwt.createToken(u.getId().toString(), Map.of("username", u.getUsername()));
        return ResponseEntity.ok(Map.of(
                "access_token", token,
                "token_type", "bearer",
                "user", Map.of(
                        "id", u.getId(),
                        "username", u.getUsername(),
                        "first_name", body.getFirst_name(),
                        "last_name", body.getLast_name(),
                        "avatar_url", body.getPhoto_url()
                )
        ));
    }
}


