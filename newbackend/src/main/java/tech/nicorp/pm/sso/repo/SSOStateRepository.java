package tech.nicorp.pm.sso.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import tech.nicorp.pm.sso.domain.SSOState;

import java.time.OffsetDateTime;

@Repository
public interface SSOStateRepository extends JpaRepository<SSOState, String> {
    
    @Modifying
    @Query("DELETE FROM SSOState s WHERE s.expiresAt < :now")
    void deleteExpiredStates(OffsetDateTime now);
}

