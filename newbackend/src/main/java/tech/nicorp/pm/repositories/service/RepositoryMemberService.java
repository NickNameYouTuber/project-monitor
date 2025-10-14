package tech.nicorp.pm.repositories.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.nicorp.pm.repositories.domain.RepositoryRole;
import tech.nicorp.pm.repositories.domain.RepositoryMember;
import tech.nicorp.pm.repositories.repo.RepositoryMemberRepository;

import java.util.Optional;
import java.util.UUID;

@Service
public class RepositoryMemberService {

    private final RepositoryMemberRepository memberRepository;

    public RepositoryMemberService(RepositoryMemberRepository memberRepository) {
        this.memberRepository = memberRepository;
    }

    @Transactional(readOnly = true)
    public boolean hasAccess(UUID repositoryId, UUID userId) {
        return memberRepository.findAll().stream()
                .anyMatch(m -> m.getRepository().getId().equals(repositoryId) 
                        && m.getUser().getId().equals(userId));
    }

    @Transactional(readOnly = true)
    public Optional<RepositoryRole> getUserRole(UUID repositoryId, UUID userId) {
        return memberRepository.findAll().stream()
                .filter(m -> m.getRepository().getId().equals(repositoryId) 
                        && m.getUser().getId().equals(userId))
                .map(RepositoryMember::getRoleEnum)
                .findFirst();
    }

    public boolean canPush(RepositoryRole role) {
        return role == RepositoryRole.OWNER 
                || role == RepositoryRole.MAINTAINER 
                || role == RepositoryRole.DEVELOPER;
    }

    public boolean canMerge(RepositoryRole role) {
        return role == RepositoryRole.OWNER 
                || role == RepositoryRole.MAINTAINER;
    }

    public boolean canCreateBranch(RepositoryRole role) {
        return role == RepositoryRole.OWNER 
                || role == RepositoryRole.MAINTAINER 
                || role == RepositoryRole.DEVELOPER;
    }

    public boolean canDeleteBranch(RepositoryRole role) {
        return role == RepositoryRole.OWNER 
                || role == RepositoryRole.MAINTAINER;
    }

    public boolean canEditFiles(RepositoryRole role) {
        return role == RepositoryRole.OWNER 
                || role == RepositoryRole.MAINTAINER 
                || role == RepositoryRole.DEVELOPER;
    }

    public boolean canManageSettings(RepositoryRole role) {
        return role == RepositoryRole.OWNER;
    }

    public boolean canManageMembers(RepositoryRole role) {
        return role == RepositoryRole.OWNER 
                || role == RepositoryRole.MAINTAINER;
    }

    public boolean canDeleteRepository(RepositoryRole role) {
        return role == RepositoryRole.OWNER;
    }

    public boolean canCreateIssue(RepositoryRole role) {
        return role != RepositoryRole.VIEWER;
    }

    public boolean canView(RepositoryRole role) {
        return true;
    }
}

