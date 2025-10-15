package tech.nicorp.pm.security;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import tech.nicorp.pm.organizations.domain.Organization;
import tech.nicorp.pm.organizations.repo.OrganizationRepository;
import tech.nicorp.pm.sso.repo.SSOConfigurationRepository;

import java.util.Optional;
import java.util.UUID;

@Component
public class OrganizationVerificationHelper {
    
    private final JwtService jwtService;
    private final OrganizationRepository organizationRepository;
    private final SSOConfigurationRepository ssoConfigRepository;
    
    public OrganizationVerificationHelper(
            JwtService jwtService,
            OrganizationRepository organizationRepository,
            SSOConfigurationRepository ssoConfigRepository) {
        this.jwtService = jwtService;
        this.organizationRepository = organizationRepository;
        this.ssoConfigRepository = ssoConfigRepository;
    }
    
    public boolean requiresVerification(UUID organizationId) {
        Organization org = organizationRepository.findById(organizationId).orElse(null);
        if (org == null) return false;
        
        // Проверка требования пароля
        if (Boolean.TRUE.equals(org.getRequirePassword())) {
            return true;
        }
        
        // Проверка требования SSO
        return ssoConfigRepository.findByOrganizationId(organizationId)
                .map(config -> Boolean.TRUE.equals(config.getEnabled()) && Boolean.TRUE.equals(config.getRequireSSO()))
                .orElse(false);
    }
    
    public boolean isVerified(UUID organizationId, Authentication auth) {
        System.out.println("[OrganizationVerificationHelper] Checking verification for org: " + organizationId);
        
        if (!requiresVerification(organizationId)) {
            System.out.println("[OrganizationVerificationHelper] Verification not required");
            return true; // Верификация не требуется
        }
        
        System.out.println("[OrganizationVerificationHelper] Verification IS required");
        
        String token = extractToken(auth);
        if (token == null) {
            System.out.println("[OrganizationVerificationHelper] No token found");
            return false;
        }
        
        System.out.println("[OrganizationVerificationHelper] Token found (first 30 chars): " + token.substring(0, Math.min(30, token.length())) + "...");
        
        Optional<String> orgVerified = jwtService.extractOrgVerified(token);
        System.out.println("[OrganizationVerificationHelper] org_verified claim: " + orgVerified.orElse("NOT_FOUND"));
        System.out.println("[OrganizationVerificationHelper] Expected org: " + organizationId.toString());
        
        boolean result = orgVerified.isPresent() && orgVerified.get().equals(organizationId.toString());
        System.out.println("[OrganizationVerificationHelper] Verification result: " + result);
        
        return result;
    }
    
    private String extractToken(Authentication auth) {
        // Попробовать извлечь из credentials
        Object credentials = auth.getCredentials();
        if (credentials instanceof String && !((String) credentials).isEmpty()) {
            return (String) credentials;
        }
        
        // Извлечь из HTTP request header
        try {
            ServletRequestAttributes attributes = (ServletRequestAttributes) RequestContextHolder.getRequestAttributes();
            if (attributes != null) {
                HttpServletRequest request = attributes.getRequest();
                String authHeader = request.getHeader("Authorization");
                if (authHeader != null && authHeader.startsWith("Bearer ")) {
                    return authHeader.substring(7);
                }
            }
        } catch (Exception e) {
            // Ignore
        }
        
        return null;
    }
}

