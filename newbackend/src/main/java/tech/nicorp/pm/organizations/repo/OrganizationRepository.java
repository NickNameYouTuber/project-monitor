package tech.nicorp.pm.organizations.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tech.nicorp.pm.organizations.domain.Organization;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface OrganizationRepository extends JpaRepository<Organization, UUID> {
    
    Optional<Organization> findBySlug(String slug);
    
    boolean existsBySlug(String slug);
}

