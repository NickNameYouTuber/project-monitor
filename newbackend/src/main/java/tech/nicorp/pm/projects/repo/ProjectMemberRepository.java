package tech.nicorp.pm.projects.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import tech.nicorp.pm.projects.domain.ProjectMember;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ProjectMemberRepository extends JpaRepository<ProjectMember, UUID> {
    
    List<ProjectMember> findByProjectId(UUID projectId);
    
    List<ProjectMember> findByUserId(UUID userId);
    
    Optional<ProjectMember> findByProjectIdAndUserId(UUID projectId, UUID userId);
    
    boolean existsByProjectIdAndUserId(UUID projectId, UUID userId);
    
    void deleteByProjectIdAndUserId(UUID projectId, UUID userId);
    
    long countByProjectId(UUID projectId);
}

