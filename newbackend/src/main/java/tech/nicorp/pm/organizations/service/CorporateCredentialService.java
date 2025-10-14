package tech.nicorp.pm.organizations.service;

import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.nicorp.pm.organizations.domain.CorporateCredential;
import tech.nicorp.pm.organizations.domain.Organization;
import tech.nicorp.pm.organizations.repo.CorporateCredentialRepository;
import tech.nicorp.pm.organizations.repo.OrganizationRepository;
import tech.nicorp.pm.security.EncryptionService;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CorporateCredentialService {

    private final CorporateCredentialRepository credentialRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final EncryptionService encryptionService;

    public CorporateCredentialService(
            CorporateCredentialRepository credentialRepository,
            OrganizationRepository organizationRepository,
            UserRepository userRepository,
            EncryptionService encryptionService) {
        this.credentialRepository = credentialRepository;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.encryptionService = encryptionService;
    }

    @Transactional
    public CorporateCredential linkCorporateAccount(
            UUID userId, 
            UUID orgId, 
            String email, 
            String username, 
            String password) {
        
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found"));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        
        if (credentialRepository.existsByUserIdAndOrganizationId(userId, orgId)) {
            throw new IllegalStateException("Corporate account already linked for this organization");
        }
        
        String encryptedPassword = encryptionService.encryptPassword(password, orgId);
        
        CorporateCredential credential = new CorporateCredential();
        credential.setUser(user);
        credential.setOrganization(org);
        credential.setCorporateEmail(email);
        credential.setCorporateUsername(username);
        credential.setEncryptedPassword(encryptedPassword);
        credential.setIsVerified(true);
        credential.setLastVerifiedAt(OffsetDateTime.now());
        
        return credentialRepository.save(credential);
    }

    @Transactional(readOnly = true)
    public boolean verifyCorporateCredentials(UUID userId, UUID orgId, String password) {
        Optional<CorporateCredential> credentialOpt = 
                credentialRepository.findByUserIdAndOrganizationId(userId, orgId);
        
        if (credentialOpt.isEmpty()) {
            return false;
        }
        
        try {
            String decryptedPassword = encryptionService.decryptPassword(
                    credentialOpt.get().getEncryptedPassword(), 
                    orgId);
            return password.equals(decryptedPassword);
        } catch (Exception e) {
            return false;
        }
    }

    @Transactional
    public void updateCorporatePassword(UUID userId, UUID orgId, String newPassword) {
        CorporateCredential credential = credentialRepository
                .findByUserIdAndOrganizationId(userId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Corporate account not found"));
        
        String encryptedPassword = encryptionService.encryptPassword(newPassword, orgId);
        credential.setEncryptedPassword(encryptedPassword);
        credential.setLastVerifiedAt(OffsetDateTime.now());
        
        credentialRepository.save(credential);
    }

    @Transactional
    public void removeCorporateAccount(UUID userId, UUID orgId) {
        CorporateCredential credential = credentialRepository
                .findByUserIdAndOrganizationId(userId, orgId)
                .orElseThrow(() -> new IllegalArgumentException("Corporate account not found"));
        
        credentialRepository.delete(credential);
    }

    @Transactional(readOnly = true)
    public Optional<CorporateCredential> getCorporateCredential(UUID userId, UUID orgId) {
        return credentialRepository.findByUserIdAndOrganizationId(userId, orgId);
    }

    @Transactional(readOnly = true)
    public boolean hasCorporateAccount(UUID userId, UUID orgId) {
        return credentialRepository.existsByUserIdAndOrganizationId(userId, orgId);
    }

    @Transactional(readOnly = true)
    public List<CorporateCredential> getUserCorporateAccounts(UUID userId) {
        return credentialRepository.findByUserId(userId);
    }

    @Transactional(readOnly = true)
    public List<CorporateCredential> getOrganizationCorporateAccounts(UUID orgId) {
        return credentialRepository.findByOrganizationId(orgId);
    }
}

