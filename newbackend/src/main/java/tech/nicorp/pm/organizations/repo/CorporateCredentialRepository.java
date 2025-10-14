package tech.nicorp.pm.organizations.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tech.nicorp.pm.organizations.domain.CorporateCredential;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface CorporateCredentialRepository extends JpaRepository<CorporateCredential, UUID> {
    Optional<CorporateCredential> findByUserIdAndOrganizationId(UUID userId, UUID organizationId);
    List<CorporateCredential> findByUserId(UUID userId);
    List<CorporateCredential> findByOrganizationId(UUID organizationId);
    Optional<CorporateCredential> findByCorporateEmailAndOrganizationId(String email, UUID organizationId);
    boolean existsByUserIdAndOrganizationId(UUID userId, UUID organizationId);
}

