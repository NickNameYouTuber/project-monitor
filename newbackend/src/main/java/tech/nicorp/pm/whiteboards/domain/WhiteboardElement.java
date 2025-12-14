package tech.nicorp.pm.whiteboards.domain;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import tech.nicorp.pm.tasks.domain.Task;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Table(name = "whiteboard_elements")
@Getter
@Setter
@NoArgsConstructor
public class WhiteboardElement {
    @Id
    @Column(columnDefinition = "uuid")
    private UUID id = UUID.randomUUID();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "whiteboard_id", nullable = false)
    private Whiteboard board;

    @Column(name = "type", nullable = false)
    private String type = "sticky";

    @Column(name = "x", nullable = false)
    private int x = 0;

    @Column(name = "y", nullable = false)
    private int y = 0;

    @Column(name = "width", nullable = false)
    private int width = 160;

    @Column(name = "height", nullable = false)
    private int height = 120;

    @Column(name = "rotation", nullable = false)
    private int rotation = 0;

    @Column(name = "z_index", nullable = false)
    private int zIndex = 0;

    @Column(name = "text")
    private String text;

    @Column(name = "fill")
    private String fill;

    @Column(name = "text_color")
    private String textColor;

    @Column(name = "font_family")
    private String fontFamily;

    @Column(name = "font_size", nullable = false)
    private int fontSize = 14;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private Task task;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt = OffsetDateTime.now();

    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt = OffsetDateTime.now();
}


