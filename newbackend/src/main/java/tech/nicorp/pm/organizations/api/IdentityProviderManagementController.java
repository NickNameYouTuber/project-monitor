package tech.nicorp.pm.organizations.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.organizations.domain.IdentityProviderConfig;
import tech.nicorp.pm.organizations.domain.OrganizationRole;
import tech.nicorp.pm.organizations.service.IdentityProviderService;
import tech.nicorp.pm.organizations.service.OrganizationMemberService;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/organizations/{orgId}/identity-provider")
@Tag(name = "Identity Provider Management", description = "Управление настройками Identity Provider")
public class IdentityProviderManagementController {

    private final IdentityProviderService identityProviderService;
    private final OrganizationMemberService memberService;

    public IdentityProviderManagementController(
            IdentityProviderService identityProviderService,
            OrganizationMemberService memberService) {
        this.identityProviderService = identityProviderService;
        this.memberService = memberService;
    }

    @PostMapping("/enable")
    @Operation(summary = "Включить Identity Provider")
    public ResponseEntity<Map<String, Object>> enable(
            @PathVariable UUID orgId,
            @RequestBody(required = false) Map<String, String> request,
            Authentication auth) {
        
        UUID userId = extractUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        OrganizationRole role = memberService.getUserRole(orgId, userId).orElse(null);
        if (role == null || role != OrganizationRole.OWNER) {
            return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "message", "Only organization owners can enable Identity Provider"
            ));
        }
        
        try {
            String providerName = request != null ? request.get("provider_name") : null;
            IdentityProviderConfig config = identityProviderService.enableIdentityProvider(orgId, providerName);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("provider_name", config.getProviderName());
            response.put("enabled", config.getEnabled());
            response.put("message", "Identity Provider enabled successfully");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Failed to enable Identity Provider"
            ));
        }
    }

    @PostMapping("/generate-keys")
    @Operation(summary = "Сгенерировать API ключи")
    public ResponseEntity<Map<String, Object>> generateKeys(
            @PathVariable UUID orgId,
            Authentication auth) {
        
        UUID userId = extractUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        OrganizationRole role = memberService.getUserRole(orgId, userId).orElse(null);
        if (role == null || role != OrganizationRole.OWNER) {
            return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "message", "Only organization owners can generate API keys"
            ));
        }
        
        try {
            Map<String, String> credentials = identityProviderService.generateApiCredentials(orgId);
            
            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("api_key", credentials.get("api_key"));
            response.put("api_secret", credentials.get("api_secret"));
            response.put("message", "API credentials generated successfully. Please save the secret, it won't be shown again.");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Failed to generate API keys"
            ));
        }
    }

    @PostMapping("/rotate-secret")
    @Operation(summary = "Обновить API secret")
    public ResponseEntity<Map<String, Object>> rotateSecret(
            @PathVariable UUID orgId,
            Authentication auth) {
        
        UUID userId = extractUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        OrganizationRole role = memberService.getUserRole(orgId, userId).orElse(null);
        if (role == null || role != OrganizationRole.OWNER) {
            return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "message", "Only organization owners can rotate API secret"
            ));
        }
        
        try {
            String newSecret = identityProviderService.rotateApiSecret(orgId);
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "api_secret", newSecret,
                    "message", "API secret rotated successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Failed to rotate API secret"
            ));
        }
    }

    @GetMapping("/config")
    @Operation(summary = "Получить конфигурацию Identity Provider")
    public ResponseEntity<Map<String, Object>> getConfig(
            @PathVariable UUID orgId,
            Authentication auth) {
        
        UUID userId = extractUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        OrganizationRole role = memberService.getUserRole(orgId, userId).orElse(null);
        if (role == null || (role != OrganizationRole.OWNER && role != OrganizationRole.ADMIN)) {
            return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "message", "Access denied"
            ));
        }
        
        Optional<IdentityProviderConfig> configOpt = identityProviderService.getConfig(orgId);
        
        if (configOpt.isEmpty()) {
            return ResponseEntity.ok(Map.of(
                    "enabled", false,
                    "message", "Identity Provider not configured"
            ));
        }
        
        IdentityProviderConfig config = configOpt.get();
        Map<String, Object> response = new HashMap<>();
        response.put("enabled", config.getEnabled());
        response.put("provider_name", config.getProviderName());
        response.put("webhook_url", config.getWebhookUrl());
        response.put("allowed_domains", config.getAllowedDomains());
        response.put("require_email_verification", config.getRequireEmailVerification());
        response.put("has_api_key", config.getApiKey() != null);
        
        return ResponseEntity.ok(response);
    }

    @PutMapping("/config")
    @Operation(summary = "Обновить конфигурацию Identity Provider")
    public ResponseEntity<Map<String, Object>> updateConfig(
            @PathVariable UUID orgId,
            @RequestBody Map<String, Object> updates,
            Authentication auth) {
        
        UUID userId = extractUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        OrganizationRole role = memberService.getUserRole(orgId, userId).orElse(null);
        if (role == null || role != OrganizationRole.OWNER) {
            return ResponseEntity.status(403).body(Map.of(
                    "success", false,
                    "message", "Only organization owners can update configuration"
            ));
        }
        
        try {
            IdentityProviderConfig configUpdates = new IdentityProviderConfig();
            if (updates.containsKey("provider_name")) {
                configUpdates.setProviderName((String) updates.get("provider_name"));
            }
            if (updates.containsKey("webhook_url")) {
                configUpdates.setWebhookUrl((String) updates.get("webhook_url"));
            }
            if (updates.containsKey("allowed_domains")) {
                configUpdates.setAllowedDomains((String) updates.get("allowed_domains"));
            }
            if (updates.containsKey("require_email_verification")) {
                configUpdates.setRequireEmailVerification((Boolean) updates.get("require_email_verification"));
            }
            
            identityProviderService.updateConfig(orgId, configUpdates);
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Configuration updated successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Failed to update configuration"
            ));
        }
    }

    private UUID extractUserId(Authentication auth) {
        if (auth == null || auth.getName() == null) return null;
        try {
            return UUID.fromString(auth.getName());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}

