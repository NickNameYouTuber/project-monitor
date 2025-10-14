package tech.nicorp.pm.organizations.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tech.nicorp.pm.organizations.domain.IdentityProviderConfig;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface IdentityProviderConfigRepository extends JpaRepository<IdentityProviderConfig, UUID> {
    Optional<IdentityProviderConfig> findByOrganizationId(UUID organizationId);
    Optional<IdentityProviderConfig> findByApiKey(String apiKey);
    List<IdentityProviderConfig> findByEnabledTrue();
}

