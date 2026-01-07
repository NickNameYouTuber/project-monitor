package tech.nicorp.pm.organizations.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import tech.nicorp.pm.organizations.domain.OrgRole;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrgRoleRepository extends JpaRepository<OrgRole, UUID> {
    
    List<OrgRole> findAllByOrganizationId(UUID organizationId);
    
    Optional<OrgRole> findByOrganizationIdAndName(UUID organizationId, String name);

    @Query("SELECT r FROM OrgRole r WHERE r.organization.id = :orgId AND r.isSystemDefault = true AND r.name = :name")
    Optional<OrgRole> findDefaultRole(@Param("orgId") UUID orgId, @Param("name") String name);
}
