package tech.nicorp.pm.organizations.service;

import org.springframework.security.crypto.bcrypt.BCrypt;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.nicorp.pm.organizations.domain.Organization;
import tech.nicorp.pm.organizations.domain.OrganizationMember;
import tech.nicorp.pm.organizations.domain.OrganizationRole;
import tech.nicorp.pm.organizations.repo.OrganizationMemberRepository;
import tech.nicorp.pm.organizations.repo.OrganizationRepository;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class OrganizationMemberService {

    private final OrganizationMemberRepository memberRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;

    public OrganizationMemberService(
            OrganizationMemberRepository memberRepository,
            OrganizationRepository organizationRepository,
            UserRepository userRepository) {
        this.memberRepository = memberRepository;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
    }

    @Transactional
    public OrganizationMember addMember(UUID orgId, UUID userId, OrganizationRole role, UUID invitedBy) {
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found: " + orgId));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        // Проверить существующее членство
        var existingMember = memberRepository.findByOrganizationIdAndUserId(orgId, userId);
        if (existingMember.isPresent()) {
            System.out.println("[OrganizationMemberService] User is already a member, returning existing");
            return existingMember.get();
        }

        OrganizationMember member = new OrganizationMember();
        member.setOrganization(org);
        member.setUser(user);
        member.setRoleEnum(role);
        
        if (invitedBy != null) {
            userRepository.findById(invitedBy).ifPresent(member::setInvitedBy);
        }
        
        System.out.println("[OrganizationMemberService] Saving new member: user=" + userId + ", org=" + orgId + ", role=" + role);
        OrganizationMember saved = memberRepository.save(member);
        System.out.println("[OrganizationMemberService] Member saved with id: " + saved.getId());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<OrganizationMember> getMembers(UUID orgId) {
        return memberRepository.findByOrganizationId(orgId);
    }

    @Transactional(readOnly = true)
    public Optional<OrganizationMember> getMember(UUID orgId, UUID userId) {
        return memberRepository.findByOrganizationIdAndUserId(orgId, userId);
    }

    @Transactional(readOnly = true)
    public List<Organization> getUserOrganizations(UUID userId) {
        return memberRepository.findByUserId(userId).stream()
                .map(OrganizationMember::getOrganization)
                .distinct()
                .toList();
    }

    @Transactional
    public void removeMember(UUID memberId) {
        OrganizationMember member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found: " + memberId));
        
        if (member.getRoleEnum() == OrganizationRole.OWNER) {
            long ownerCount = memberRepository.findByOrganizationId(member.getOrganization().getId())
                    .stream()
                    .filter(m -> m.getRoleEnum() == OrganizationRole.OWNER)
                    .count();
            
            if (ownerCount <= 1) {
                throw new IllegalStateException("Cannot remove the last owner of the organization");
            }
        }
        
        memberRepository.deleteById(memberId);
    }

    @Transactional
    public OrganizationMember updateRole(UUID memberId, OrganizationRole newRole) {
        OrganizationMember member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found: " + memberId));
        
        if (member.getRoleEnum() == OrganizationRole.OWNER && newRole != OrganizationRole.OWNER) {
            long ownerCount = memberRepository.findByOrganizationId(member.getOrganization().getId())
                    .stream()
                    .filter(m -> m.getRoleEnum() == OrganizationRole.OWNER)
                    .count();
            
            if (ownerCount <= 1) {
                throw new IllegalStateException("Cannot change role of the last owner");
            }
        }
        
        member.setRoleEnum(newRole);
        return memberRepository.save(member);
    }

    @Transactional(readOnly = true)
    public boolean hasAccess(UUID orgId, UUID userId) {
        return memberRepository.existsByOrganizationIdAndUserId(orgId, userId);
    }

    @Transactional(readOnly = true)
    public Optional<OrganizationRole> getUserRole(UUID orgId, UUID userId) {
        return memberRepository.findByOrganizationIdAndUserId(orgId, userId)
                .map(OrganizationMember::getRoleEnum);
    }

    @Transactional
    public void setCorporateEmail(UUID memberId, String email) {
        OrganizationMember member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found: " + memberId));
        member.setCorporateEmail(email);
        member.setCorporateEmailVerified(false);
        memberRepository.save(member);
    }

    @Transactional
    public void setOrgPassword(UUID memberId, String password) {
        OrganizationMember member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found: " + memberId));
        member.setOrgPasswordHash(BCrypt.hashpw(password, BCrypt.gensalt()));
        memberRepository.save(member);
    }

    @Transactional(readOnly = true)
    public boolean verifyOrgPassword(UUID memberId, String password) {
        OrganizationMember member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found: " + memberId));
        
        if (member.getOrgPasswordHash() == null) {
            return true;
        }
        
        return BCrypt.checkpw(password, member.getOrgPasswordHash());
    }

    public boolean canManageMembers(OrganizationRole role) {
        return role == OrganizationRole.OWNER || role == OrganizationRole.ADMIN;
    }

    public boolean canCreateProjects(OrganizationRole role) {
        return role == OrganizationRole.OWNER 
                || role == OrganizationRole.ADMIN 
                || role == OrganizationRole.MEMBER;
    }

    public boolean canManageSettings(OrganizationRole role) {
        return role == OrganizationRole.OWNER || role == OrganizationRole.ADMIN;
    }

    public boolean canDeleteOrganization(OrganizationRole role) {
        return role == OrganizationRole.OWNER;
    }

    public boolean canCreateInvites(OrganizationRole role) {
        return role == OrganizationRole.OWNER 
                || role == OrganizationRole.ADMIN 
                || role == OrganizationRole.MEMBER;
    }
}

