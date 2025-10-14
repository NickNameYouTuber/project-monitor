package tech.nicorp.pm.organizations.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tech.nicorp.pm.organizations.domain.OrganizationMember;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationMemberRepository extends JpaRepository<OrganizationMember, UUID> {
    
    List<OrganizationMember> findByOrganizationId(UUID organizationId);
    
    List<OrganizationMember> findByUserId(UUID userId);
    
    Optional<OrganizationMember> findByOrganizationIdAndUserId(UUID organizationId, UUID userId);
    
    boolean existsByOrganizationIdAndUserId(UUID organizationId, UUID userId);
    
    void deleteByOrganizationIdAndUserId(UUID organizationId, UUID userId);
    
    long countByOrganizationId(UUID organizationId);
}

