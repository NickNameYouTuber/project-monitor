package tech.nicorp.pm.sso.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.organizations.domain.OrganizationRole;
import tech.nicorp.pm.organizations.service.OrganizationMemberService;
import tech.nicorp.pm.sso.api.dto.SSOConfigurationRequest;
import tech.nicorp.pm.sso.api.dto.SSOConfigurationResponse;
import tech.nicorp.pm.sso.api.dto.SSOLoginResponse;
import tech.nicorp.pm.sso.domain.SSOConfiguration;
import tech.nicorp.pm.sso.domain.SSOProviderType;
import tech.nicorp.pm.sso.service.SSOService;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/sso")
@Tag(name = "SSO", description = "Single Sign-On интеграция")
public class SSOController {
    
    private final SSOService ssoService;
    private final OrganizationMemberService memberService;
    
    public SSOController(SSOService ssoService, OrganizationMemberService memberService) {
        this.ssoService = ssoService;
        this.memberService = memberService;
    }
    
    @GetMapping("/organizations/{orgId}/config")
    @Operation(summary = "Получить конфигурацию SSO организации")
    public ResponseEntity<SSOConfigurationResponse> getConfig(
            @PathVariable UUID orgId,
            Authentication auth) {
        
        UUID userId = extractUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        OrganizationRole role = memberService.getUserRole(orgId, userId).orElse(null);
        if (role != OrganizationRole.OWNER) {
            return ResponseEntity.status(403).build();
        }
        
        return ssoService.getConfiguration(orgId)
                .map(this::toResponse)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
    
    @PostMapping("/organizations/{orgId}/config")
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
        } catch (Exception e) {
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
    @Operation(summary = "Обработать SSO callback")
    public ResponseEntity<Map<String, Object>> handleCallback(
            @RequestParam String code,
            @RequestParam String state) {
        
        try {
            Map<String, Object> result = ssoService.handleCallback(code, state);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
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
        config.setProviderType(SSOProviderType.valueOf(request.getProviderType()));
        config.setEnabled(request.getEnabled());
        config.setClientId(request.getClientId());
        config.setClientSecretEncrypted(request.getClientSecret());
        config.setAuthorizationEndpoint(request.getAuthorizationEndpoint());
        config.setTokenEndpoint(request.getTokenEndpoint());
        config.setUserinfoEndpoint(request.getUserinfoEndpoint());
        config.setIssuer(request.getIssuer());
        config.setJwksUri(request.getJwksUri());
        config.setEmailClaim(request.getEmailClaim());
        config.setNameClaim(request.getNameClaim());
        config.setSubClaim(request.getSubClaim());
        config.setScopes(request.getScopes());
        config.setRequireSSO(request.getRequireSSO());
        return config;
    }
}

