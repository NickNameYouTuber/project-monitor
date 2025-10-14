package tech.nicorp.pm.organizations.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.organizations.domain.IdentityProviderConfig;
import tech.nicorp.pm.organizations.service.IdentityProviderService;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/identity-provider")
@Tag(name = "Identity Provider", description = "API для внешней интеграции с провайдером идентификации")
public class IdentityProviderController {

    private final IdentityProviderService identityProviderService;

    public IdentityProviderController(IdentityProviderService identityProviderService) {
        this.identityProviderService = identityProviderService;
    }

    @PostMapping("/authenticate")
    @Operation(summary = "Аутентификация пользователя через провайдер")
    public ResponseEntity<Map<String, Object>> authenticate(
            @RequestHeader("X-API-Key") String apiKey,
            @RequestHeader("X-API-Secret") String apiSecret,
            @RequestBody Map<String, String> request) {
        
        if (!identityProviderService.verifyApiKey(apiKey, apiSecret)) {
            return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "message", "Invalid API credentials"
            ));
        }
        
        Optional<IdentityProviderConfig> configOpt = identityProviderService.getConfigByApiKey(apiKey);
        if (configOpt.isEmpty()) {
            return ResponseEntity.status(404).body(Map.of(
                    "success", false,
                    "message", "Provider not found"
            ));
        }
        
        UUID orgId = configOpt.get().getOrganization().getId();
        String email = request.get("email");
        String password = request.get("password");
        
        if (email == null || password == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Email and password are required"
            ));
        }
        
        Optional<Map<String, Object>> userInfo = identityProviderService.authenticateUser(
                orgId, email, password);
        
        if (userInfo.isPresent()) {
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "user", userInfo.get()
            ));
        } else {
            return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "message", "Authentication failed"
            ));
        }
    }

    @GetMapping("/user-info")
    @Operation(summary = "Получить информацию о пользователе")
    public ResponseEntity<Map<String, Object>> getUserInfo(
            @RequestHeader("X-API-Key") String apiKey,
            @RequestHeader("X-API-Secret") String apiSecret,
            @RequestParam String email) {
        
        if (!identityProviderService.verifyApiKey(apiKey, apiSecret)) {
            return ResponseEntity.status(401).body(Map.of(
                    "success", false,
                    "message", "Invalid API credentials"
            ));
        }
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "User info endpoint - to be implemented"
        ));
    }

    @PostMapping("/webhook")
    @Operation(summary = "Webhook для получения уведомлений")
    public ResponseEntity<Map<String, Object>> webhook(
            @RequestBody Map<String, Object> payload) {
        
        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Webhook received"
        ));
    }
}

