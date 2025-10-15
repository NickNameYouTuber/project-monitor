package tech.nicorp.pm.security;

import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;
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
        if (!requiresVerification(organizationId)) {
            return true; // Верификация не требуется
        }
        
        String token = extractToken(auth);
        if (token == null) return false;
        
        Optional<String> orgVerified = jwtService.extractOrgVerified(token);
        return orgVerified.isPresent() && orgVerified.get().equals(organizationId.toString());
    }
    
    private String extractToken(Authentication auth) {
        // В Spring Security JWT токен обычно хранится в credentials
        Object credentials = auth.getCredentials();
        if (credentials instanceof String) {
            return (String) credentials;
        }
        return null;
    }
}

