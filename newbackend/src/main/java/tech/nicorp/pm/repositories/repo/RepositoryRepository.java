package tech.nicorp.pm.repositories.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import tech.nicorp.pm.repositories.domain.Repository;

import java.util.List;
import java.util.UUID;

public interface RepositoryRepository extends JpaRepository<Repository, UUID> {
    @Query("SELECT DISTINCT r FROM Repository r " +
           "LEFT JOIN RepositoryMember m ON m.repository.id = r.id " +
           "WHERE m.user.id = :userId " +
           "ORDER BY r.createdAt DESC")
    List<Repository> findByMemberUserId(@Param("userId") UUID userId);
}


