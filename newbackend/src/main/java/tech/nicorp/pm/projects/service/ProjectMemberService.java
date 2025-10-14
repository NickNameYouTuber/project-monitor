package tech.nicorp.pm.projects.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.nicorp.pm.projects.domain.Project;
import tech.nicorp.pm.projects.domain.ProjectMember;
import tech.nicorp.pm.projects.domain.ProjectRole;
import tech.nicorp.pm.projects.repo.ProjectMemberRepository;
import tech.nicorp.pm.projects.repo.ProjectRepository;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class ProjectMemberService {

    private final ProjectMemberRepository memberRepository;
    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;

    public ProjectMemberService(
            ProjectMemberRepository memberRepository,
            ProjectRepository projectRepository,
            UserRepository userRepository) {
        this.memberRepository = memberRepository;
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public ProjectMember addMember(UUID projectId, UUID userId, ProjectRole role) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new IllegalArgumentException("Project not found: " + projectId));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        if (memberRepository.existsByProjectIdAndUserId(projectId, userId)) {
            throw new IllegalStateException("User is already a member of this project");
        }

        ProjectMember member = new ProjectMember();
        member.setProject(project);
        member.setUser(user);
        member.setRoleEnum(role);
        
        return memberRepository.save(member);
    }

    @Transactional(readOnly = true)
    public List<ProjectMember> getMembers(UUID projectId) {
        return memberRepository.findByProjectId(projectId);
    }

    @Transactional(readOnly = true)
    public Optional<ProjectMember> getMember(UUID projectId, UUID userId) {
        return memberRepository.findByProjectIdAndUserId(projectId, userId);
    }

    @Transactional
    public void removeMember(UUID memberId) {
        ProjectMember member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found: " + memberId));
        
        if (member.getRoleEnum() == ProjectRole.OWNER) {
            long ownerCount = memberRepository.findByProjectId(member.getProject().getId())
                    .stream()
                    .filter(m -> m.getRoleEnum() == ProjectRole.OWNER)
                    .count();
            
            if (ownerCount <= 1) {
                throw new IllegalStateException("Cannot remove the last owner of the project");
            }
        }
        
        memberRepository.deleteById(memberId);
    }

    @Transactional
    public ProjectMember updateRole(UUID memberId, ProjectRole newRole) {
        ProjectMember member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found: " + memberId));
        
        if (member.getRoleEnum() == ProjectRole.OWNER && newRole != ProjectRole.OWNER) {
            long ownerCount = memberRepository.findByProjectId(member.getProject().getId())
                    .stream()
                    .filter(m -> m.getRoleEnum() == ProjectRole.OWNER)
                    .count();
            
            if (ownerCount <= 1) {
                throw new IllegalStateException("Cannot change role of the last owner");
            }
        }
        
        member.setRoleEnum(newRole);
        return memberRepository.save(member);
    }

    @Transactional(readOnly = true)
    public boolean hasAccess(UUID projectId, UUID userId) {
        return memberRepository.existsByProjectIdAndUserId(projectId, userId);
    }

    @Transactional(readOnly = true)
    public Optional<ProjectRole> getUserRole(UUID projectId, UUID userId) {
        return memberRepository.findByProjectIdAndUserId(projectId, userId)
                .map(ProjectMember::getRoleEnum);
    }

    @Transactional(readOnly = true)
    public boolean hasRole(UUID projectId, UUID userId, ProjectRole requiredRole) {
        Optional<ProjectRole> userRole = getUserRole(projectId, userId);
        if (userRole.isEmpty()) {
            return false;
        }
        
        return hasPermission(userRole.get(), requiredRole);
    }

    public boolean canEditProject(ProjectRole role) {
        return role == ProjectRole.OWNER || role == ProjectRole.ADMIN;
    }

    public boolean canDeleteProject(ProjectRole role) {
        return role == ProjectRole.OWNER;
    }

    public boolean canManageMembers(ProjectRole role) {
        return role == ProjectRole.OWNER || role == ProjectRole.ADMIN;
    }

    public boolean canCreateTasks(ProjectRole role) {
        return role == ProjectRole.OWNER || role == ProjectRole.ADMIN || role == ProjectRole.DEVELOPER;
    }

    public boolean canEditTasks(ProjectRole role) {
        return role == ProjectRole.OWNER || role == ProjectRole.ADMIN || role == ProjectRole.DEVELOPER;
    }

    public boolean canDeleteTasks(ProjectRole role) {
        return role == ProjectRole.OWNER || role == ProjectRole.ADMIN || role == ProjectRole.DEVELOPER;
    }

    public boolean canComment(ProjectRole role) {
        return true;
    }

    private boolean hasPermission(ProjectRole userRole, ProjectRole requiredRole) {
        int userLevel = getRoleLevel(userRole);
        int requiredLevel = getRoleLevel(requiredRole);
        return userLevel <= requiredLevel;
    }

    private int getRoleLevel(ProjectRole role) {
        return switch (role) {
            case OWNER -> 0;
            case ADMIN -> 1;
            case DEVELOPER -> 2;
            case VIEWER -> 3;
        };
    }
}

