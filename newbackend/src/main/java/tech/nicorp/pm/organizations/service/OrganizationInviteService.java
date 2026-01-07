package tech.nicorp.pm.organizations.service;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.nicorp.pm.organizations.domain.Organization;
import tech.nicorp.pm.organizations.domain.OrganizationInvite;
import tech.nicorp.pm.organizations.domain.OrganizationMember;
import tech.nicorp.pm.organizations.domain.OrganizationRole;
import tech.nicorp.pm.organizations.repo.OrganizationInviteRepository;
import tech.nicorp.pm.organizations.repo.OrganizationRepository;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

@Service
public class OrganizationInviteService {

    private final OrganizationInviteRepository inviteRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final OrganizationMemberService memberService;
    private final tech.nicorp.pm.organizations.repo.OrgRoleRepository roleRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public OrganizationInviteService(
            OrganizationInviteRepository inviteRepository,
            OrganizationRepository organizationRepository,
            UserRepository userRepository,
            OrganizationMemberService memberService,
            tech.nicorp.pm.organizations.repo.OrgRoleRepository roleRepository) {
        this.inviteRepository = inviteRepository;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.memberService = memberService;
        this.roleRepository = roleRepository;
    }

    @Transactional
    public OrganizationInvite createInvite(
            UUID orgId, 
            UUID createdBy, 
            String roleName, 
            Integer maxUses, 
            OffsetDateTime expiresAt) {
        
        Organization org = organizationRepository.findById(orgId)
                .orElseThrow(() -> new IllegalArgumentException("Organization not found: " + orgId));
        
        User creator = userRepository.findById(createdBy)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + createdBy));
        
        tech.nicorp.pm.organizations.domain.OrgRole role = roleRepository.findByOrganizationIdAndName(orgId, roleName)
                .orElseThrow(() -> new IllegalArgumentException("Role not found: " + roleName));

        OrganizationInvite invite = new OrganizationInvite();
        invite.setOrganization(org);
        invite.setToken(generateInviteToken());
        invite.setRole(role);
        invite.setRoleEnum(OrganizationRole.MEMBER); // Legacy fallback
        invite.setMaxUses(maxUses);
        invite.setExpiresAt(expiresAt);
        invite.setCreatedBy(creator);
        
        return inviteRepository.save(invite);
    }

    @Transactional(readOnly = true)
    public OrganizationInvite validateInvite(String token) {
        OrganizationInvite invite = inviteRepository.findByToken(token)
                .orElseThrow(() -> new IllegalArgumentException("Invalid invite token"));

        if (Boolean.TRUE.equals(invite.getRevoked())) {
            throw new IllegalStateException("This invitation has been revoked");
        }

        if (invite.getExpiresAt() != null && invite.getExpiresAt().isBefore(OffsetDateTime.now())) {
            throw new IllegalStateException("This invitation has expired");
        }

        if (invite.getMaxUses() != null && invite.getCurrentUses() >= invite.getMaxUses()) {
            throw new IllegalStateException("This invitation has reached its usage limit");
        }

        return invite;
    }

    @Transactional
    public OrganizationMember acceptInvite(String token, UUID userId) {
        OrganizationInvite invite = validateInvite(token);

        if (memberService.hasAccess(invite.getOrganization().getId(), userId)) {
            throw new IllegalStateException("User is already a member of this organization");
        }

        OrganizationMember member = memberService.addMember(
                invite.getOrganization().getId(),
                userId,
                invite.getRole().getName(),
                invite.getCreatedBy().getId()
        );

        invite.setCurrentUses(invite.getCurrentUses() + 1);
        inviteRepository.save(invite);

        return member;
    }

    @Transactional(readOnly = true)
    public List<OrganizationInvite> getOrganizationInvites(UUID orgId) {
        return inviteRepository.findByOrganizationId(orgId);
    }

    @Transactional
    public void revokeInvite(UUID inviteId, UUID userId) {
        OrganizationInvite invite = inviteRepository.findById(inviteId)
                .orElseThrow(() -> new IllegalArgumentException("Invite not found: " + inviteId));
        
        invite.setRevoked(true);
        invite.setRevokedAt(OffsetDateTime.now());
        userRepository.findById(userId).ifPresent(invite::setRevokedBy);
        
        inviteRepository.save(invite);
    }

    public String generateInviteToken() {
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
    }
}

