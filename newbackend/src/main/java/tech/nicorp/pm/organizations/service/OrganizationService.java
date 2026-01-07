package tech.nicorp.pm.organizations.service;

import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.nicorp.pm.organizations.domain.Organization;
import tech.nicorp.pm.organizations.repo.OrganizationRepository;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.util.List;
import java.util.UUID;

@Service
public class OrganizationService {

    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final RoleService roleService;

    public OrganizationService(OrganizationRepository organizationRepository, 
                               UserRepository userRepository,
                               RoleService roleService) {
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.roleService = roleService;
    }

    @Transactional
    public Organization createOrganization(String name, String slug, UUID ownerId) {
        if (organizationRepository.existsBySlug(slug)) {
            throw new IllegalArgumentException("Organization with this slug already exists");
        }

        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + ownerId));

        Organization org = new Organization();
        org.setName(name);
        org.setSlug(slug);
        org.setOwner(owner);
        
        org = organizationRepository.save(org);
        
        // Create default roles (Owner, Admin, Member, Guest)
        roleService.createDefaultRoles(org);
        
        return org;
    }

    @Transactional(readOnly = true)
    public Organization getOrganization(UUID id) {
        return organizationRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found: " + id));
    }

    @Transactional(readOnly = true)
    public List<Organization> getAllOrganizations() {
        return organizationRepository.findAll();
    }

    @Transactional
    public Organization updateOrganization(UUID id, Organization updates) {
        Organization org = getOrganization(id);
        
        if (updates.getName() != null) {
            org.setName(updates.getName());
        }
        if (updates.getDescription() != null) {
            org.setDescription(updates.getDescription());
        }
        if (updates.getLogoUrl() != null) {
            org.setLogoUrl(updates.getLogoUrl());
        }
        if (updates.getWebsite() != null) {
            org.setWebsite(updates.getWebsite());
        }
        if (updates.getCorporateDomain() != null) {
            org.setCorporateDomain(updates.getCorporateDomain());
        }
        if (updates.getRequireCorporateEmail() != null) {
            org.setRequireCorporateEmail(updates.getRequireCorporateEmail());
        }
        if (updates.getDefaultProjectRole() != null) {
            org.setDefaultProjectRole(updates.getDefaultProjectRole());
        }
        
        org.setUpdatedAt(java.time.OffsetDateTime.now());
        
        return organizationRepository.save(org);
    }

    @Transactional
    public void deleteOrganization(UUID id) {
        if (!organizationRepository.existsById(id)) {
            throw new IllegalArgumentException("Organization not found: " + id);
        }
        organizationRepository.deleteById(id);
    }

    @Transactional
    public void setOrganizationPassword(UUID orgId, String password) {
        Organization org = getOrganization(orgId);
        org.setPasswordHash(BCrypt.hashpw(password, BCrypt.gensalt()));
        org.setRequirePassword(true);
        organizationRepository.save(org);
    }

    @Transactional(readOnly = true)
    public boolean verifyOrganizationPassword(UUID orgId, String password) {
        Organization org = getOrganization(orgId);
        
        if (!Boolean.TRUE.equals(org.getRequirePassword()) || org.getPasswordHash() == null) {
            return true;
        }
        
        return BCrypt.checkpw(password, org.getPasswordHash());
    }

    public String generateSlug(String name) {
        String baseSlug = name.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-+|-+$", "");
        
        String slug = baseSlug;
        int counter = 1;
        
        while (organizationRepository.existsBySlug(slug)) {
            slug = baseSlug + "-" + counter;
            counter++;
        }
        
        return slug;
    }

    public boolean isSlugAvailable(String slug) {
        return !organizationRepository.existsBySlug(slug);
    }
}

