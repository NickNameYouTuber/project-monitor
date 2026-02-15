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
import tech.nicorp.pm.organizations.domain.OrganizationRole;
import tech.nicorp.pm.organizations.repo.OrganizationRepository;
import tech.nicorp.pm.organizations.service.OrganizationMemberService;
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
    private final OrganizationMemberService memberService;
    private final RestTemplate restTemplate;
    
    private static final String REDIRECT_URI_BASE = System.getenv("SSO_REDIRECT_URI") != null 
            ? System.getenv("SSO_REDIRECT_URI") 
            : "https://nit.nicorp.tech";
    
    public SSOService(
            SSOConfigurationRepository configRepository,
            SSOStateRepository stateRepository,
            SSOUserLinkRepository userLinkRepository,
            OrganizationRepository organizationRepository,
            UserRepository userRepository,
            OrganizationMemberService memberService) {
        this.configRepository = configRepository;
        this.stateRepository = stateRepository;
        this.userLinkRepository = userLinkRepository;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.memberService = memberService;
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
    public String generateAuthorizationUrl(UUID orgId, UUID userId) {
        SSOConfiguration config = configRepository.findByOrganizationId(orgId)
                .orElseThrow(() -> new IllegalArgumentException("SSO not configured for organization"));
        
        if (!Boolean.TRUE.equals(config.getEnabled())) {
            throw new IllegalStateException("SSO is not enabled for this organization");
        }
        
        String state = CryptoUtils.generateState();
        String codeVerifier = CryptoUtils.generateCodeVerifier();
        
        System.out.println("[SSOService] Initiating SSO login for user: " + userId + ", org: " + orgId);
        
        SSOState ssoState = new SSOState();
        ssoState.setState(state);
        ssoState.setOrganization(config.getOrganization());
        ssoState.setCodeVerifier(codeVerifier);
        ssoState.setRedirectUri(REDIRECT_URI_BASE + "/sso/callback");
        ssoState.setUserId(userId);
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
        
        UUID globalUserId = ssoState.getUserId();
        if (globalUserId == null) {
            System.err.println("[SSOService] SSO state has no userId - please re-initiate SSO login");
            throw new IllegalStateException("SSO requires authenticated user. Please re-initiate SSO login.");
        }
        
        System.out.println("[SSOService] Processing callback for global user: " + globalUserId);
        
        SSOConfiguration config = configRepository.findByOrganizationId(ssoState.getOrganization().getId())
                .orElseThrow(() -> new IllegalStateException("SSO configuration not found"));
        
        String accessToken = exchangeCodeForToken(config, code, ssoState.getRedirectUri());
        Map<String, Object> userInfo = getUserInfo(config, accessToken);
        
        String ssoEmail = (String) userInfo.get(config.getEmailClaim());
        
        User user = linkOrCreateUser(config, userInfo, globalUserId);
        
        stateRepository.delete(ssoState);
        
        return Map.of(
            "user_id", user.getId().toString(),
            "organization_id", config.getOrganization().getId().toString(),
            "sso_email", ssoEmail != null ? ssoEmail : ""
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
    private User linkOrCreateUser(SSOConfiguration config, Map<String, Object> userInfo, UUID globalUserId) {
        String ssoProviderId = (String) userInfo.get(config.getSubClaim());
        String ssoEmail = (String) userInfo.get(config.getEmailClaim());
        UUID orgId = config.getOrganization().getId();
        
        System.out.println("[SSOService] Linking SSO to global user: " + globalUserId);
        System.out.println("[SSOService] SSO providerId=" + ssoProviderId + ", email=" + ssoEmail);
        
        // 1. Проверить существующую связь SSO providerId -> User
        Optional<SSOUserLink> existingLink = userLinkRepository
                .findByOrganizationIdAndSsoProviderId(orgId, ssoProviderId);
        
        if (existingLink.isPresent()) {
            System.out.println("[SSOService] Found existing SSO link for provider " + ssoProviderId);
            SSOUserLink link = existingLink.get();
            link.setLastLoginAt(OffsetDateTime.now());
            link.setSsoEmail(ssoEmail);
            userLinkRepository.save(link);
            
            User user = link.getUser();
            System.out.println("[SSOService] Using existing user from link: " + user.getId() + " (" + user.getUsername() + ")");
            
            // Убедиться что пользователь в organization_members
            ensureOrganizationMember(user, orgId, config);
            
            return user;
        }
        
        // 2. Check if this user already has a link for this org (different SSO identity)
        Optional<SSOUserLink> existingUserLink = userLinkRepository
                .findByUserIdAndOrganizationId(globalUserId, orgId);
        
        if (existingUserLink.isPresent()) {
            System.out.println("[SSOService] User already has SSO link for this org, updating to new identity");
            SSOUserLink link = existingUserLink.get();
            link.setSsoProviderId(ssoProviderId);
            link.setSsoEmail(ssoEmail);
            link.setLastLoginAt(OffsetDateTime.now());
            userLinkRepository.save(link);
            ensureOrganizationMember(link.getUser(), orgId, config);
            return link.getUser();
        }

        // 3. Создать новую связь для ГЛОБАЛЬНОГО пользователя
        User globalUser = userRepository.findById(globalUserId)
                .orElseThrow(() -> new IllegalArgumentException("Global user not found: " + globalUserId));
        
        System.out.println("[SSOService] Creating SSO link for global user: " + globalUser.getId() + " (" + globalUser.getUsername() + ")");
        
        SSOUserLink newLink = new SSOUserLink();
        newLink.setUser(globalUser);
        newLink.setOrganization(config.getOrganization());
        newLink.setSsoProviderId(ssoProviderId);
        newLink.setSsoEmail(ssoEmail);
        newLink.setLastLoginAt(OffsetDateTime.now());
        userLinkRepository.save(newLink);
        
        System.out.println("[SSOService] Created SSO link: providerId=" + ssoProviderId + " -> user=" + globalUser.getId());
        
        // 3. Добавить глобального пользователя в organization_members
        ensureOrganizationMember(globalUser, orgId, config);
        
        return globalUser;
    }
    
    private void ensureOrganizationMember(User user, UUID orgId, SSOConfiguration config) {
        System.out.println("[SSOService] Ensuring user " + user.getId() + " is member of org " + orgId);
        
        try {
            if (!memberService.hasAccess(orgId, user.getId())) {
                OrganizationRole defaultRole = config.getOrganization().getDefaultProjectRole() != null 
                    ? OrganizationRole.valueOf(config.getOrganization().getDefaultProjectRole())
                    : OrganizationRole.MEMBER;
                // Convert enum name to Title Case to match OrgRole names in DB (e.g. MEMBER -> Member)
                String roleName = defaultRole.name().substring(0, 1).toUpperCase() 
                    + defaultRole.name().substring(1).toLowerCase();
                System.out.println("[SSOService] Adding user to organization with role: " + roleName);
                memberService.addMember(orgId, user.getId(), roleName, null);
                System.out.println("[SSOService] User successfully added to organization");
            } else {
                System.out.println("[SSOService] User already has access to organization");
            }
        } catch (Exception e) {
            System.err.println("[SSOService] ERROR ensuring organization membership: " + e.getMessage());
            e.printStackTrace();
        }
    }
    
    @Transactional(readOnly = true)
    public Optional<SSOUserLink> getUserLink(UUID organizationId, UUID userId) {
        return userLinkRepository.findByUserIdAndOrganizationId(userId, organizationId);
    }
    
    @Transactional
    public void cleanupExpiredStates() {
        stateRepository.deleteExpiredStates(OffsetDateTime.now());
    }
}

