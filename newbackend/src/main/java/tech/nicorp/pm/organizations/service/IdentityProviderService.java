package tech.nicorp.pm.organizations.service;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;
import tech.nicorp.pm.organizations.domain.CorporateCredential;
import tech.nicorp.pm.organizations.domain.IdentityProviderConfig;
import tech.nicorp.pm.organizations.domain.Organization;
import tech.nicorp.pm.organizations.repo.IdentityProviderConfigRepository;
import tech.nicorp.pm.organizations.repo.OrganizationRepository;
import tech.nicorp.pm.security.EncryptionService;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class IdentityProviderService {

    private final IdentityProviderConfigRepository configRepository;
    private final OrganizationRepository organizationRepository;
    private final CorporateCredentialService credentialService;
    private final EncryptionService encryptionService;
    private final RestTemplate restTemplate;

    public IdentityProviderService(
            IdentityProviderConfigRepository configRepository,
            OrganizationRepository organizationRepository,
            CorporateCredentialService credentialService,
            EncryptionService encryptionService) {
        this.configRepository = configRepository;
        this.organizationRepository = organizationRepository;
        this.credentialService = credentialService;
        this.encryptionService = encryptionService;
        this.restTemplate = new RestTemplate();
    }

    @Transactional
    public IdentityProviderConfig enableIdentityProvider(UUID orgId, String providerName) {
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found"));
        
        Optional<IdentityProviderConfig> existingConfig = configRepository.findByOrganizationId(orgId);
        
        if (existingConfig.isPresent()) {
            IdentityProviderConfig config = existingConfig.get();
            config.setEnabled(true);
            if (providerName != null) {
                config.setProviderName(providerName);
            }
            return configRepository.save(config);
        }
        
        IdentityProviderConfig config = new IdentityProviderConfig();
        config.setOrganization(org);
        config.setEnabled(true);
        config.setProviderName(providerName != null ? providerName : org.getName() + " Identity Provider");
        
        return configRepository.save(config);
    }

    @Transactional
    public Map<String, String> generateApiCredentials(UUID orgId) {
        IdentityProviderConfig config = configRepository.findByOrganizationId(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Identity provider not configured"));
        
        String apiKey = encryptionService.generateApiKey();
        String apiSecret = encryptionService.generateApiSecret();
        
        config.setApiKey(apiKey);
        config.setApiSecret(apiSecret);
        configRepository.save(config);
        
        Map<String, String> credentials = new HashMap<>();
        credentials.put("api_key", apiKey);
        credentials.put("api_secret", apiSecret);
        
        return credentials;
    }

    @Transactional
    public String rotateApiSecret(UUID orgId) {
        IdentityProviderConfig config = configRepository.findByOrganizationId(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Identity provider not configured"));
        
        String newSecret = encryptionService.generateApiSecret();
        config.setApiSecret(newSecret);
        configRepository.save(config);
        
        return newSecret;
    }

    @Transactional(readOnly = true)
    public boolean verifyApiKey(String apiKey, String apiSecret) {
        Optional<IdentityProviderConfig> configOpt = configRepository.findByApiKey(apiKey);
        
        if (configOpt.isEmpty()) {
            return false;
        }
        
        IdentityProviderConfig config = configOpt.get();
        return config.getEnabled() && apiSecret.equals(config.getApiSecret());
    }

    @Transactional(readOnly = true)
    public Optional<Map<String, Object>> authenticateUser(UUID orgId, String email, String password) {
        Optional<CorporateCredential> credentialOpt = credentialService.getCorporateCredential(null, orgId);
        
        List<CorporateCredential> credentials = credentialService.getOrganizationCorporateAccounts(orgId);
        
        for (CorporateCredential credential : credentials) {
            if (credential.getCorporateEmail().equalsIgnoreCase(email)) {
                boolean valid = credentialService.verifyCorporateCredentials(
                        credential.getUser().getId(), 
                        orgId, 
                        password);
                
                if (valid) {
                    Map<String, Object> userInfo = new HashMap<>();
                    userInfo.put("user_id", credential.getUser().getId().toString());
                    userInfo.put("email", credential.getCorporateEmail());
                    userInfo.put("username", credential.getCorporateUsername());
                    userInfo.put("verified", credential.getIsVerified());
                    return Optional.of(userInfo);
                }
            }
        }
        
        return Optional.empty();
    }

    @Transactional
    public void notifyPasswordChange(UUID orgId, String email) {
        IdentityProviderConfig config = configRepository.findByOrganizationId(orgId)
                .orElse(null);
        
        if (config == null || config.getWebhookUrl() == null || config.getWebhookUrl().isEmpty()) {
            return;
        }
        
        try {
            Map<String, Object> payload = new HashMap<>();
            payload.put("event", "password_changed");
            payload.put("organization_id", orgId.toString());
            payload.put("email", email);
            payload.put("timestamp", System.currentTimeMillis());
            
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            
            HttpEntity<Map<String, Object>> request = new HttpEntity<>(payload, headers);
            restTemplate.postForEntity(config.getWebhookUrl(), request, String.class);
        } catch (Exception e) {
            // Log error but don't fail the operation
            System.err.println("Failed to send webhook notification: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public Optional<IdentityProviderConfig> getConfig(UUID orgId) {
        return configRepository.findByOrganizationId(orgId);
    }

    @Transactional
    public IdentityProviderConfig updateConfig(UUID orgId, IdentityProviderConfig updates) {
        IdentityProviderConfig config = configRepository.findByOrganizationId(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Identity provider not configured"));
        
        if (updates.getProviderName() != null) {
            config.setProviderName(updates.getProviderName());
        }
        if (updates.getWebhookUrl() != null) {
            config.setWebhookUrl(updates.getWebhookUrl());
        }
        if (updates.getAllowedDomains() != null) {
            config.setAllowedDomains(updates.getAllowedDomains());
        }
        if (updates.getRequireEmailVerification() != null) {
            config.setRequireEmailVerification(updates.getRequireEmailVerification());
        }
        
        return configRepository.save(config);
    }

    @Transactional(readOnly = true)
    public List<IdentityProviderConfig> getAllEnabledProviders() {
        return configRepository.findByEnabledTrue();
    }

    @Transactional(readOnly = true)
    public Optional<IdentityProviderConfig> getConfigByApiKey(String apiKey) {
        return configRepository.findByApiKey(apiKey);
    }
}

