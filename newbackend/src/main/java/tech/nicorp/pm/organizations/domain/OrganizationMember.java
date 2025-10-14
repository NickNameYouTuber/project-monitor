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

    @Column(name = "role", nullable = false, length = 32)
    private String role;

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
        try {
            return OrganizationRole.valueOf(role);
        } catch (IllegalArgumentException e) {
            return OrganizationRole.GUEST;
        }
    }

    public void setRoleEnum(OrganizationRole organizationRole) {
        this.role = organizationRole.name();
    }
}

