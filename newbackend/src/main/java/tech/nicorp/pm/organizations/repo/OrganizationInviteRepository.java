package tech.nicorp.pm.organizations.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tech.nicorp.pm.organizations.domain.OrganizationInvite;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationInviteRepository extends JpaRepository<OrganizationInvite, UUID> {
    
    Optional<OrganizationInvite> findByToken(String token);
    
    List<OrganizationInvite> findByOrganizationId(UUID organizationId);
    
    List<OrganizationInvite> findByOrganizationIdAndRevokedFalse(UUID organizationId);
    
    List<OrganizationInvite> findByExpiresAtBeforeAndRevokedFalse(OffsetDateTime now);
}

