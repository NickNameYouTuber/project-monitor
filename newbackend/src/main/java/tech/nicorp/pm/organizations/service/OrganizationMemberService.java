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
    private final OrgRoleRepository roleRepository;

    public OrganizationMemberService(
            OrganizationMemberRepository memberRepository,
            OrganizationRepository organizationRepository,
            UserRepository userRepository,
            OrgRoleRepository roleRepository) {
        this.memberRepository = memberRepository;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.roleRepository = roleRepository;
    }

    @Transactional
    public OrganizationMember addMember(UUID orgId, UUID userId, String roleName, UUID invitedBy) {
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found: " + orgId));
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        // Check availability
        var existingMember = memberRepository.findByOrganizationIdAndUserId(orgId, userId);
        if (existingMember.isPresent()) {
            return existingMember.get();
        }

        // Get Role
        OrgRole orgRole = roleRepository.findByOrganizationIdAndName(orgId, roleName)
                .orElseThrow(() -> new IllegalArgumentException("Role not found: " + roleName));

        OrganizationMember member = new OrganizationMember();
        member.setOrganization(org);
        member.setUser(user);
        member.setRole(orgRole);
        member.setRoleEnum(OrganizationRole.MEMBER); // Legacy fallback, though not really used anymore
        
        if (invitedBy != null) {
            userRepository.findById(invitedBy).ifPresent(member::setInvitedBy);
        }
        
        return memberRepository.save(member);
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
        
        // Prevent removing the last owner
        // Assuming "Owner" role check by name or permission? Let's check permissions or name "Owner"
        if ("Owner".equalsIgnoreCase(member.getRole().getName())) {
            long ownerCount = memberRepository.findByOrganizationId(member.getOrganization().getId())
                    .stream()
                    .filter(m -> "Owner".equalsIgnoreCase(m.getRole().getName()))
                    .count();
            
            if (ownerCount <= 1) {
                throw new IllegalStateException("Cannot remove the last owner of the organization");
            }
        }
        
        memberRepository.deleteById(memberId);
    }

    @Transactional
    public OrganizationMember updateRole(UUID memberId, UUID roleId) {
        OrganizationMember member = memberRepository.findById(memberId)
                .orElseThrow(() -> new IllegalArgumentException("Member not found: " + memberId));
        
        OrgRole newRole = roleRepository.findById(roleId)
                .orElseThrow(() -> new IllegalArgumentException("Role not found: " + roleId));

        // Check if downgrading the last owner
        if ("Owner".equalsIgnoreCase(member.getRole().getName()) && !"Owner".equalsIgnoreCase(newRole.getName())) {
             long ownerCount = memberRepository.findByOrganizationId(member.getOrganization().getId())
                    .stream()
                    .filter(m -> "Owner".equalsIgnoreCase(m.getRole().getName()))
                    .count();
            
            if (ownerCount <= 1) {
                throw new IllegalStateException("Cannot change role of the last owner");
            }
        }
        
        member.setRole(newRole);
        return memberRepository.save(member);
    }

    @Transactional(readOnly = true)
    public boolean hasAccess(UUID orgId, UUID userId) {
        return memberRepository.existsByOrganizationIdAndUserId(orgId, userId);
    }

    // Legacy method maybe for backward compat API only
    @Transactional(readOnly = true)
    public Optional<OrganizationRole> getUserRole(UUID orgId, UUID userId) {
        return memberRepository.findByOrganizationIdAndUserId(orgId, userId)
                .map(OrganizationMember::getRoleEnum);
    }
    
    // New method for getting OrgRole
    @Transactional(readOnly = true)
    public Optional<OrgRole> getUserOrgRole(UUID orgId, UUID userId) {
        return memberRepository.findByOrganizationIdAndUserId(orgId, userId)
                .map(OrganizationMember::getRole);
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

    public boolean canManageMembers(OrgRole role) {
        return role.getPermissions().contains(tech.nicorp.pm.organizations.domain.OrgPermission.MANAGE_MEMBERS);
    }

    public boolean canCreateProjects(OrgRole role) {
        return role.getPermissions().contains(tech.nicorp.pm.organizations.domain.OrgPermission.CREATE_PROJECT);
    }

    public boolean canManageSettings(OrgRole role) {
         return role.getPermissions().contains(tech.nicorp.pm.organizations.domain.OrgPermission.MANAGE_ORG_DETAILS);
    }

    public boolean canDeleteOrganization(OrgRole role) {
        // Technically this might be restricted to Owner only, but MANAGE_ORG_DETAILS covers settings.
        // Let's create a DELETE_ORG permission if needed, but for now reuse or check "Owner" name if we want strictness.
        // Assuming Owner always has MANAGE_ORG_DETAILS.
        return role.getName().equalsIgnoreCase("Owner");
    }

    public boolean canCreateInvites(OrgRole role) {
        return role.getPermissions().contains(tech.nicorp.pm.organizations.domain.OrgPermission.MANAGE_MEMBERS);
    }
}

