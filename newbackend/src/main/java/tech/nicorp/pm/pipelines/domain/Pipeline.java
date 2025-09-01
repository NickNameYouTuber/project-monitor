package tech.nicorp.pm.pipelines.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "pipelines")
@Getter
@Setter
@NoArgsConstructor
public class Pipeline {
    @Id
    @Column(columnDefinition = "uuid")
    private UUID id = UUID.randomUUID();

    @Column(name = "repository_id", columnDefinition = "uuid", nullable = false)
    private UUID repositoryId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PipelineStatus status = PipelineStatus.QUEUED;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private PipelineSource source = PipelineSource.PUSH;

    @Column(name = "ref", nullable = false)
    private String ref;

    @Column(name = "commit_sha", nullable = false)
    private String commitSha;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "started_at")
    private OffsetDateTime startedAt;

    @Column(name = "finished_at")
    private OffsetDateTime finishedAt;

    @OneToMany(mappedBy = "pipeline", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<PipelineJob> jobs = new ArrayList<>();
}


