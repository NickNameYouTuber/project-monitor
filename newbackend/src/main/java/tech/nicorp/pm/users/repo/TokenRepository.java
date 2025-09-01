package tech.nicorp.pm.users.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.users.domain.Token;

import java.util.List;
import java.util.UUID;

public interface TokenRepository extends JpaRepository<Token, UUID> {
    List<Token> findByUserId(UUID userId);
}


