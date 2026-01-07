package tech.nicorp.pm.organizations.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tech.nicorp.pm.users.domain.User;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "organization_members")
@Getter
@Setter
@NoArgsConstructor
public class OrganizationMember {
    
    @Id
    @Column(columnDefinition = "uuid")
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id", nullable = false)
    private Organization organization;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "role_id") // nullable=true for migration, but logic should enforce it
    private OrgRole role;

    // Legacy field support check could be done via migration script, 
    // here we just use the new relation.

    @Column(name = "corporate_email", length = 255)
    private String corporateEmail;

    @Column(name = "corporate_email_verified")
    private Boolean corporateEmailVerified = false;

    @Column(name = "org_password_hash", columnDefinition = "text")
    private String orgPasswordHash;

    @Column(name = "joined_at", nullable = false)
    private OffsetDateTime joinedAt = OffsetDateTime.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invited_by")
    private User invitedBy;

    @Column(name = "last_active_at")
    private OffsetDateTime lastActiveAt;

    public OrganizationRole getRoleEnum() {
        if (role == null) return OrganizationRole.GUEST;
        try {
            // Try to map custom role name to enum, or fallback
            return OrganizationRole.valueOf(role.getName().toUpperCase());
        } catch (IllegalArgumentException e) {
            return OrganizationRole.MEMBER; // Fallback for custom roles
        }
    }

    public void setRoleEnum(OrganizationRole organizationRole) {
        // This is now purely for legacy or creation compatibility, 
        // real assignment should happen via setRole(OrgRole)
    }
}

