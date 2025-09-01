package tech.nicorp.pm.whiteboards.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "whiteboard_connections")
@Getter
@Setter
@NoArgsConstructor
public class WhiteboardConnection {
    @Id
    @Column(columnDefinition = "uuid")
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "whiteboard_id", nullable = false)
    private Whiteboard board;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_element_id", nullable = false)
    private WhiteboardElement fromElement;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_element_id", nullable = false)
    private WhiteboardElement toElement;

    @Column(name = "stroke", nullable = false)
    private String stroke = "#2b2d42";

    @Column(name = "stroke_width", nullable = false)
    private int strokeWidth = 2;

    @Column(name = "points")
    private String points;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();
}


