package tech.nicorp.pm.sso.service;

import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;
import tech.nicorp.pm.organizations.domain.Organization;
import tech.nicorp.pm.organizations.repo.OrganizationRepository;
import tech.nicorp.pm.sso.domain.SSOConfiguration;
import tech.nicorp.pm.sso.domain.SSOProviderType;
import tech.nicorp.pm.sso.domain.SSOState;
import tech.nicorp.pm.sso.domain.SSOUserLink;
import tech.nicorp.pm.sso.repo.SSOConfigurationRepository;
import tech.nicorp.pm.sso.repo.SSOStateRepository;
import tech.nicorp.pm.sso.repo.SSOUserLinkRepository;
import tech.nicorp.pm.sso.util.CryptoUtils;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
public class SSOService {
    
    private final SSOConfigurationRepository configRepository;
    private final SSOStateRepository stateRepository;
    private final SSOUserLinkRepository userLinkRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final RestTemplate restTemplate;
    
    private static final String REDIRECT_URI_BASE = System.getenv("SSO_REDIRECT_URI");
    
    public SSOService(
            SSOConfigurationRepository configRepository,
            SSOStateRepository stateRepository,
            SSOUserLinkRepository userLinkRepository,
            OrganizationRepository organizationRepository,
            UserRepository userRepository) {
        this.configRepository = configRepository;
        this.stateRepository = stateRepository;
        this.userLinkRepository = userLinkRepository;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.restTemplate = new RestTemplate();
    }
    
    @Transactional
    public SSOConfiguration saveConfiguration(UUID orgId, SSOConfiguration config) {
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found"));
        
        Optional<SSOConfiguration> existing = configRepository.findByOrganizationId(orgId);
        
        if (existing.isPresent()) {
            SSOConfiguration existingConfig = existing.get();
            existingConfig.setProviderType(config.getProviderType());
            existingConfig.setEnabled(config.getEnabled());
            existingConfig.setClientId(config.getClientId());
            
            if (config.getClientSecretEncrypted() != null && !config.getClientSecretEncrypted().isEmpty()) {
                try {
                    existingConfig.setClientSecretEncrypted(CryptoUtils.encrypt(config.getClientSecretEncrypted()));
                } catch (Exception e) {
                    existingConfig.setClientSecretEncrypted(config.getClientSecretEncrypted());
                }
            }
            
            existingConfig.setAuthorizationEndpoint(config.getAuthorizationEndpoint());
            existingConfig.setTokenEndpoint(config.getTokenEndpoint());
            existingConfig.setUserinfoEndpoint(config.getUserinfoEndpoint());
            existingConfig.setIssuer(config.getIssuer());
            existingConfig.setJwksUri(config.getJwksUri());
            existingConfig.setEmailClaim(config.getEmailClaim());
            existingConfig.setNameClaim(config.getNameClaim());
            existingConfig.setSubClaim(config.getSubClaim());
            existingConfig.setScopes(config.getScopes());
            existingConfig.setRequireSSO(config.getRequireSSO());
            
            return configRepository.save(existingConfig);
        } else {
            config.setOrganization(org);
            
            if (config.getClientSecretEncrypted() != null && !config.getClientSecretEncrypted().isEmpty()) {
                try {
                    String encrypted = CryptoUtils.encrypt(config.getClientSecretEncrypted());
                    config.setClientSecretEncrypted(encrypted);
                } catch (Exception e) {
                    config.setClientSecretEncrypted(config.getClientSecretEncrypted());
                }
            }
            
            return configRepository.save(config);
        }
    }
    
    @Transactional(readOnly = true)
    public Optional<SSOConfiguration> getConfiguration(UUID orgId) {
        return configRepository.findByOrganizationId(orgId);
    }
    
    @Transactional
    public String generateAuthorizationUrl(UUID orgId) {
        SSOConfiguration config = configRepository.findByOrganizationId(orgId)
                .orElseThrow(() -> new IllegalArgumentException("SSO not configured for organization"));
        
        if (!Boolean.TRUE.equals(config.getEnabled())) {
            throw new IllegalStateException("SSO is not enabled for this organization");
        }
        
        String state = CryptoUtils.generateState();
        String codeVerifier = CryptoUtils.generateCodeVerifier();
        
        SSOState ssoState = new SSOState();
        ssoState.setState(state);
        ssoState.setOrganization(config.getOrganization());
        ssoState.setCodeVerifier(codeVerifier);
        ssoState.setRedirectUri(REDIRECT_URI_BASE + "/sso/callback");
        ssoState.setExpiresAt(OffsetDateTime.now().plusMinutes(10));
        stateRepository.save(ssoState);
        
        return UriComponentsBuilder.fromHttpUrl(config.getAuthorizationEndpoint())
                .queryParam("client_id", config.getClientId())
                .queryParam("response_type", "code")
                .queryParam("scope", config.getScopes())
                .queryParam("redirect_uri", ssoState.getRedirectUri())
                .queryParam("state", state)
                .toUriString();
    }
    
    @Transactional
    public Map<String, Object> handleCallback(String code, String state) throws Exception {
        SSOState ssoState = stateRepository.findById(state)
                .orElseThrow(() -> new IllegalArgumentException("Invalid state"));
        
        if (ssoState.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new IllegalStateException("State expired");
        }
        
        SSOConfiguration config = configRepository.findByOrganizationId(ssoState.getOrganization().getId())
                .orElseThrow(() -> new IllegalStateException("SSO configuration not found"));
        
        String accessToken = exchangeCodeForToken(config, code, ssoState.getRedirectUri());
        Map<String, Object> userInfo = getUserInfo(config, accessToken);
        
        User user = linkOrCreateUser(config, userInfo);
        
        stateRepository.delete(ssoState);
        
        return Map.of(
            "user_id", user.getId().toString(),
            "organization_id", config.getOrganization().getId().toString()
        );
    }
    
    private String exchangeCodeForToken(SSOConfiguration config, String code, String redirectUri) throws Exception {
        String clientSecret = CryptoUtils.decrypt(config.getClientSecretEncrypted());
        
        MultiValueMap<String, String> body = new LinkedMultiValueMap<>();
        body.add("grant_type", "authorization_code");
        body.add("code", code);
        body.add("redirect_uri", redirectUri);
        body.add("client_id", config.getClientId());
        body.add("client_secret", clientSecret);
        
        HttpHeaders headers = new HttpHeaders();
        headers.add("Content-Type", "application/x-www-form-urlencoded");
        
        HttpEntity<MultiValueMap<String, String>> request = new HttpEntity<>(body, headers);
        
        ResponseEntity<Map> response = restTemplate.exchange(
                config.getTokenEndpoint(),
                HttpMethod.POST,
                request,
                Map.class
        );
        
        Map<String, Object> responseBody = response.getBody();
        if (responseBody == null || !responseBody.containsKey("access_token")) {
            throw new IllegalStateException("No access token in response");
        }
        
        return (String) responseBody.get("access_token");
    }
    
    private Map<String, Object> getUserInfo(SSOConfiguration config, String accessToken) {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        
        HttpEntity<Void> request = new HttpEntity<>(headers);
        
        ResponseEntity<Map> response = restTemplate.exchange(
                config.getUserinfoEndpoint(),
                HttpMethod.GET,
                request,
                Map.class
        );
        
        return response.getBody();
    }
    
    @Transactional
    private User linkOrCreateUser(SSOConfiguration config, Map<String, Object> userInfo) {
        String ssoProviderId = (String) userInfo.get(config.getSubClaim());
        String email = (String) userInfo.get(config.getEmailClaim());
        String name = (String) userInfo.get(config.getNameClaim());
        
        Optional<SSOUserLink> existingLink = userLinkRepository
                .findByOrganizationIdAndSsoProviderId(config.getOrganization().getId(), ssoProviderId);
        
        if (existingLink.isPresent()) {
            SSOUserLink link = existingLink.get();
            link.setLastLoginAt(OffsetDateTime.now());
            userLinkRepository.save(link);
            return link.getUser();
        }
        
        Optional<User> existingUser = userRepository.findByUsername(email);
        User user;
        
        if (existingUser.isPresent()) {
            user = existingUser.get();
        } else {
            user = new User();
            user.setUsername(email);
            user.setDisplayName(name != null ? name : email);
            user = userRepository.save(user);
        }
        
        SSOUserLink newLink = new SSOUserLink();
        newLink.setUser(user);
        newLink.setOrganization(config.getOrganization());
        newLink.setSsoProviderId(ssoProviderId);
        newLink.setSsoEmail(email);
        newLink.setLastLoginAt(OffsetDateTime.now());
        userLinkRepository.save(newLink);
        
        return user;
    }
    
    @Transactional
    public void cleanupExpiredStates() {
        stateRepository.deleteExpiredStates(OffsetDateTime.now());
    }
}

