package tech.nicorp.pm.users.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.users.domain.User;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);
}


