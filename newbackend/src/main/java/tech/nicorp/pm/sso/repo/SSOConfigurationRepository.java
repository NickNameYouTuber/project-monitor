package tech.nicorp.pm.sso.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tech.nicorp.pm.sso.domain.SSOConfiguration;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SSOConfigurationRepository extends JpaRepository<SSOConfiguration, UUID> {
    
    Optional<SSOConfiguration> findByOrganizationId(UUID organizationId);
    
    boolean existsByOrganizationId(UUID organizationId);
}

