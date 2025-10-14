package tech.nicorp.pm.sso.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tech.nicorp.pm.sso.domain.SSOUserLink;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SSOUserLinkRepository extends JpaRepository<SSOUserLink, UUID> {
    
    Optional<SSOUserLink> findByOrganizationIdAndSsoProviderId(UUID organizationId, String ssoProviderId);
    
    Optional<SSOUserLink> findByUserIdAndOrganizationId(UUID userId, UUID organizationId);
    
    boolean existsByUserIdAndOrganizationId(UUID userId, UUID organizationId);
}

