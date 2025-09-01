package tech.nicorp.pm.repositories.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.repositories.domain.RepositoryMember;

import java.util.UUID;

public interface RepositoryMemberRepository extends JpaRepository<RepositoryMember, UUID> {
}


