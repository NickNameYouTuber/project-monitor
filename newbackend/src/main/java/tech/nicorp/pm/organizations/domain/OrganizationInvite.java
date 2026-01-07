package tech.nicorp.pm.organizations.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tech.nicorp.pm.users.domain.User;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "organization_invites")
@Getter
@Setter
@NoArgsConstructor
public class OrganizationInvite {
    
    @Id
    @Column(columnDefinition = "uuid")
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @Column(name = "token", nullable = false, unique = true, length = 64)
    private String token;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id")
    private OrgRole role;

    @Column(name = "max_uses")
    private Integer maxUses;

    @Column(name = "current_uses")
    private Integer currentUses = 0;

    @Column(name = "expires_at")
    private OffsetDateTime expiresAt;

    @Column(name = "email_domains", columnDefinition = "text[]")
    private String[] emailDomains;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "revoked")
    private Boolean revoked = false;

    @Column(name = "revoked_at")
    private OffsetDateTime revokedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "revoked_by")
    private User revokedBy;

    // Legacy Support
    public OrganizationRole getRoleEnum() {
        if (role == null) return OrganizationRole.MEMBER;
        try {
             return OrganizationRole.valueOf(role.getName().toUpperCase());
        } catch (IllegalArgumentException e) {
             return OrganizationRole.MEMBER;
        }
    }

    public void setRoleEnum(OrganizationRole organizationRole) {
        // This is legacy setter, actual setting should be done via setRole(OrgRole)
    }
}

