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

    private final tech.nicorp.pm.auth.service.NiidService niidService;

    public AuthController(UserRepository users, JwtService jwt, tech.nicorp.pm.auth.service.NiidService niidService) {
        this.users = users;
        this.jwt = jwt;
        this.niidService = niidService;
    }

    // ... existing endpoints ...

    @PostMapping("/niid")
    @Operation(summary = "NIID Callback Handler", description = "Exchanges NIID code for App Token")
    public ResponseEntity<Map<String, Object>> niidLogin(@RequestBody Map<String, String> body) {
        String code = body.get("code");
        // Redirect URI must match what frontend sent to NIID
        // It's usually configured in frontend, but backend needs to send the same one for verification
        // For now, we can hardcode or accept it from body if we want flexibility, but strict OAuth requires exact match.
        // Let's assume frontend sends or we know it.
        String redirectUri = "http://localhost:5173/sso/niid/callback"; // TODO: Move to config
        
        tech.nicorp.pm.auth.service.NiidService.NiidUserInfo userInfo = niidService.exchangeCode(code, redirectUri);
        
        // Find or Create User
        // We match by EMAIL
        User u = users.findByUsername(userInfo.email).orElse(null);
        
        if (u == null) {
            u = new User();
            u.setUsername(userInfo.email);
            u.setDisplayName(userInfo.name);
            // No password for NIID users
            users.save(u);
        } else {
            // Update info if needed
            if (userInfo.name != null && !userInfo.name.isEmpty()) {
                u.setDisplayName(userInfo.name);
                users.save(u);
            }
        }
        
        String token = jwt.createToken(u.getId().toString(), Map.of(
            "username", u.getUsername(),
            "niid_sub", userInfo.id
        ));
        
        return ResponseEntity.ok(Map.of("token", token));
    }

    @PostMapping("/register")
    @Operation(summary = "Регистрация нового пользователя", description = "DEPRECATED: Use NIID SSO")
    public ResponseEntity<Map<String, Object>> register(@RequestBody RegisterRequest body) {
        return ResponseEntity.status(403).body(Map.of("error", "Local registration is disabled. Use NIID SSO."));
    }

    @PostMapping("/login")
    @Operation(summary = "Вход в систему", description = "DEPRECATED: Use NIID SSO")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequest body) {
        return ResponseEntity.status(403).body(Map.of("error", "Local login is disabled. Use NIID SSO."));
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


