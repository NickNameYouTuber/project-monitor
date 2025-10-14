package tech.nicorp.pm.organizations.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.organizations.domain.CorporateCredential;
import tech.nicorp.pm.organizations.service.CorporateCredentialService;
import tech.nicorp.pm.organizations.service.IdentityProviderService;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/organizations/{orgId}/corporate-auth")
@Tag(name = "Corporate Authentication", description = "Управление корпоративными учетными данными")
public class CorporateAuthController {

    private final CorporateCredentialService credentialService;
    private final IdentityProviderService identityProviderService;

    public CorporateAuthController(
            CorporateCredentialService credentialService,
            IdentityProviderService identityProviderService) {
        this.credentialService = credentialService;
        this.identityProviderService = identityProviderService;
    }

    @PostMapping("/link")
    @Operation(summary = "Привязать корпоративный аккаунт")
    public ResponseEntity<Map<String, Object>> linkAccount(
            @PathVariable UUID orgId,
            @RequestBody Map<String, String> request,
            Authentication auth) {
        
        UUID userId = extractUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        try {
            String email = request.get("email");
            String username = request.get("username");
            String password = request.get("password");
            
            if (email == null || password == null) {
                return ResponseEntity.badRequest().build();
            }
            
            CorporateCredential credential = credentialService.linkCorporateAccount(
                    userId, orgId, email, username, password);
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "credential_id", credential.getId().toString(),
                    "message", "Corporate account linked successfully"
            ));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(409).body(Map.of(
                    "success", false,
                    "message", e.getMessage()
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Failed to link corporate account"
            ));
        }
    }

    @PostMapping("/verify")
    @Operation(summary = "Проверить корпоративные учетные данные")
    public ResponseEntity<Map<String, Object>> verifyCredentials(
            @PathVariable UUID orgId,
            @RequestBody Map<String, String> request,
            Authentication auth) {
        
        UUID userId = extractUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        String password = request.get("password");
        if (password == null) {
            return ResponseEntity.badRequest().build();
        }
        
        boolean valid = credentialService.verifyCorporateCredentials(userId, orgId, password);
        
        return ResponseEntity.ok(Map.of(
                "valid", valid,
                "message", valid ? "Credentials verified" : "Invalid credentials"
        ));
    }

    @PutMapping("/password")
    @Operation(summary = "Изменить корпоративный пароль")
    public ResponseEntity<Map<String, Object>> updatePassword(
            @PathVariable UUID orgId,
            @RequestBody Map<String, String> request,
            Authentication auth) {
        
        UUID userId = extractUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        try {
            String currentPassword = request.get("current_password");
            String newPassword = request.get("new_password");
            
            if (currentPassword == null || newPassword == null) {
                return ResponseEntity.badRequest().build();
            }
            
            boolean valid = credentialService.verifyCorporateCredentials(userId, orgId, currentPassword);
            if (!valid) {
                return ResponseEntity.status(403).body(Map.of(
                        "success", false,
                        "message", "Current password is incorrect"
                ));
            }
            
            credentialService.updateCorporatePassword(userId, orgId, newPassword);
            
            CorporateCredential credential = credentialService.getCorporateCredential(userId, orgId).orElse(null);
            if (credential != null) {
                identityProviderService.notifyPasswordChange(orgId, credential.getCorporateEmail());
            }
            
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Password updated successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Failed to update password"
            ));
        }
    }

    @DeleteMapping
    @Operation(summary = "Отвязать корпоративный аккаунт")
    public ResponseEntity<Map<String, Object>> unlinkAccount(
            @PathVariable UUID orgId,
            Authentication auth) {
        
        UUID userId = extractUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        try {
            credentialService.removeCorporateAccount(userId, orgId);
            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "message", "Corporate account unlinked successfully"
            ));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of(
                    "success", false,
                    "message", "Failed to unlink corporate account"
            ));
        }
    }

    @GetMapping("/status")
    @Operation(summary = "Получить статус привязки корпоративного аккаунта")
    public ResponseEntity<Map<String, Object>> getStatus(
            @PathVariable UUID orgId,
            Authentication auth) {
        
        UUID userId = extractUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        boolean hasAccount = credentialService.hasCorporateAccount(userId, orgId);
        
        if (hasAccount) {
            CorporateCredential credential = credentialService.getCorporateCredential(userId, orgId).orElse(null);
            if (credential != null) {
                return ResponseEntity.ok(Map.of(
                        "linked", true,
                        "email", credential.getCorporateEmail(),
                        "username", credential.getCorporateUsername() != null ? credential.getCorporateUsername() : "",
                        "verified", credential.getIsVerified(),
                        "last_verified_at", credential.getLastVerifiedAt() != null ? credential.getLastVerifiedAt().toString() : ""
                ));
            }
        }
        
        return ResponseEntity.ok(Map.of("linked", false));
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

