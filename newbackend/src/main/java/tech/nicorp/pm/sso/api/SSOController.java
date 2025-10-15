package tech.nicorp.pm.sso.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.transaction.annotation.Transactional;
import tech.nicorp.pm.organizations.domain.OrganizationRole;
import tech.nicorp.pm.organizations.service.OrganizationMemberService;
import tech.nicorp.pm.security.JwtService;
import tech.nicorp.pm.sso.api.dto.SSOConfigurationRequest;
import tech.nicorp.pm.sso.api.dto.SSOConfigurationResponse;
import tech.nicorp.pm.sso.api.dto.SSOLoginResponse;
import tech.nicorp.pm.sso.domain.SSOConfiguration;
import tech.nicorp.pm.sso.domain.SSOProviderType;
import tech.nicorp.pm.sso.service.SSOService;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/sso")
@CrossOrigin(origins = "*", allowedHeaders = "*")
@Tag(name = "SSO", description = "Single Sign-On интеграция")
public class SSOController {
    
    private final SSOService ssoService;
    private final OrganizationMemberService memberService;
    private final JwtService jwtService;
    private final UserRepository userRepository;
    
    public SSOController(SSOService ssoService, OrganizationMemberService memberService, 
                        JwtService jwtService, UserRepository userRepository) {
        this.ssoService = ssoService;
        this.memberService = memberService;
        this.jwtService = jwtService;
        this.userRepository = userRepository;
    }
    
    @GetMapping("/organizations/{orgId}/config")
    @Transactional(readOnly = true)
    @Operation(summary = "Получить конфигурацию SSO организации")
    public ResponseEntity<SSOConfigurationResponse> getConfig(
            @PathVariable UUID orgId,
            Authentication auth) {
        
        System.out.println("[SSOController] GET /organizations/" + orgId + "/config");
        
        UUID userId = extractUserId(auth);
        if (userId == null) {
            System.out.println("[SSOController] No userId extracted, returning 401");
            return ResponseEntity.status(401).build();
        }
        
        System.out.println("[SSOController] UserId: " + userId);
        
        OrganizationRole role = memberService.getUserRole(orgId, userId).orElse(null);
        System.out.println("[SSOController] User role: " + role);
        
        if (role != OrganizationRole.OWNER) {
            System.out.println("[SSOController] User is not OWNER, returning 403");
            return ResponseEntity.status(403).build();
        }
        
        var config = ssoService.getConfiguration(orgId);
        System.out.println("[SSOController] Config found: " + config.isPresent());
        
        return config
                .map(this::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping("/organizations/{orgId}/config")
    @Transactional
    @Operation(summary = "Сохранить конфигурацию SSO")
    public ResponseEntity<SSOConfigurationResponse> saveConfig(
            @PathVariable UUID orgId,
            @RequestBody SSOConfigurationRequest request,
            Authentication auth) {
        
        UUID userId = extractUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        OrganizationRole role = memberService.getUserRole(orgId, userId).orElse(null);
        if (role != OrganizationRole.OWNER) {
            return ResponseEntity.status(403).build();
        }
        
        try {
            SSOConfiguration config = fromRequest(request);
            SSOConfiguration saved = ssoService.saveConfiguration(orgId, config);
            return ResponseEntity.ok(toResponse(saved));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/organizations/{orgId}/login")
    @Operation(summary = "Инициировать SSO логин")
    public ResponseEntity<SSOLoginResponse> initiateLogin(@PathVariable UUID orgId) {
        try {
            String authUrl = ssoService.generateAuthorizationUrl(orgId);
            
            SSOLoginResponse response = new SSOLoginResponse();
            response.setAuthorizationUrl(authUrl);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }
    
    @GetMapping("/callback")
    @Transactional
    @Operation(summary = "Обработать SSO callback")
    public ResponseEntity<Map<String, Object>> handleCallback(
            @RequestParam String code,
            @RequestParam String state) {
        
        try {
            System.out.println("[SSOController] Processing callback with code and state");
            Map<String, Object> result = ssoService.handleCallback(code, state);
            UUID userId = UUID.fromString((String) result.get("user_id"));
            UUID orgId = UUID.fromString((String) result.get("organization_id"));
            
            System.out.println("[SSOController] SSO callback result - userId: " + userId + ", orgId: " + orgId);
            
            User user = userRepository.findById(userId).orElseThrow();
            
            // Создать токен с org_verified
            String token = jwtService.createTokenWithOrgVerification(
                userId.toString(),
                orgId,
                Map.of("username", user.getUsername())
            );
            
            System.out.println("[SSOController] Created token with org_verified for orgId: " + orgId);
            System.out.println("[SSOController] Token (first 30 chars): " + token.substring(0, Math.min(30, token.length())) + "...");
            
            // Вернуть JSON с токеном и orgId для frontend
            return ResponseEntity.ok(Map.of(
                "token", token,
                "user_id", userId.toString(),
                "organization_id", orgId.toString()
            ));
                    
        } catch (Exception e) {
            return ResponseEntity.status(400).body(Map.of(
                "error", "sso_failed",
                "message", e.getMessage() != null ? e.getMessage() : "SSO authentication failed"
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
    
    private SSOConfigurationResponse toResponse(SSOConfiguration config) {
        SSOConfigurationResponse response = new SSOConfigurationResponse();
        response.setId(config.getId());
        response.setOrganizationId(config.getOrganization().getId());
        response.setProviderType(config.getProviderType().name());
        response.setEnabled(config.getEnabled());
        response.setClientId(config.getClientId());
        response.setAuthorizationEndpoint(config.getAuthorizationEndpoint());
        response.setTokenEndpoint(config.getTokenEndpoint());
        response.setUserinfoEndpoint(config.getUserinfoEndpoint());
        response.setIssuer(config.getIssuer());
        response.setJwksUri(config.getJwksUri());
        response.setEmailClaim(config.getEmailClaim());
        response.setNameClaim(config.getNameClaim());
        response.setSubClaim(config.getSubClaim());
        response.setScopes(config.getScopes());
        response.setRequireSSO(config.getRequireSSO());
        return response;
    }
    
    private SSOConfiguration fromRequest(SSOConfigurationRequest request) {
        SSOConfiguration config = new SSOConfiguration();
        config.setProviderType(request.getProviderType() != null 
                ? SSOProviderType.valueOf(request.getProviderType()) 
                : SSOProviderType.OIDC);
        config.setEnabled(request.getEnabled() != null ? request.getEnabled() : false);
        config.setClientId(request.getClientId());
        config.setClientSecretEncrypted(request.getClientSecret());
        config.setAuthorizationEndpoint(request.getAuthorizationEndpoint());
        config.setTokenEndpoint(request.getTokenEndpoint());
        config.setUserinfoEndpoint(request.getUserinfoEndpoint());
        config.setIssuer(request.getIssuer());
        config.setJwksUri(request.getJwksUri());
        config.setEmailClaim(request.getEmailClaim() != null ? request.getEmailClaim() : "email");
        config.setNameClaim(request.getNameClaim() != null ? request.getNameClaim() : "name");
        config.setSubClaim(request.getSubClaim() != null ? request.getSubClaim() : "sub");
        config.setScopes(request.getScopes() != null ? request.getScopes() : "openid,profile,email");
        config.setRequireSSO(request.getRequireSSO() != null ? request.getRequireSSO() : false);
        return config;
    }
}

