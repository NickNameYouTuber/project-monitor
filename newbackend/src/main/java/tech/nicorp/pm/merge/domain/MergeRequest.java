package tech.nicorp.pm.merge.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tech.nicorp.pm.repositories.domain.Repository;
import tech.nicorp.pm.users.domain.User;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "merge_requests")
@Getter
@Setter
@NoArgsConstructor
public class MergeRequest {
    @Id
    @Column(columnDefinition = "uuid")
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "repository_id", nullable = false)
    private Repository repository;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private User author;

    @Column(name = "source_branch", nullable = false)
    private String sourceBranch;

    @Column(name = "target_branch", nullable = false)
    private String targetBranch;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private MergeRequestStatus status = MergeRequestStatus.OPEN;

    @Column(name = "title", nullable = false)
    private String title;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "merged_at")
    private OffsetDateTime mergedAt;
}


