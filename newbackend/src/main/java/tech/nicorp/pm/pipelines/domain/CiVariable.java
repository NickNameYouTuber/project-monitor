package tech.nicorp.pm.pipelines.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "ci_variables")
@Getter
@Setter
@NoArgsConstructor
public class CiVariable {
    @Id
    @Column(columnDefinition = "uuid")
    private UUID id = UUID.randomUUID();

    @Column(name = "repository_id", columnDefinition = "uuid", nullable = false)
    private UUID repositoryId;

    @Column(name = "key", nullable = false)
    private String key;

    @Column(name = "value", nullable = false)
    private String value;

    @Column(name = "masked", nullable = false)
    private boolean masked = false;

    @Column(name = "protected_branch", nullable = false)
    private boolean protectedBranch = false;

    @Column(name = "scope_pattern")
    private String scopePattern; // glob for branches/tags

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();
}


