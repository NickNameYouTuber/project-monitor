package tech.nicorp.pm.whiteboards.api;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import tech.nicorp.pm.projects.domain.Project;
import tech.nicorp.pm.projects.repo.ProjectRepository;
import tech.nicorp.pm.whiteboards.domain.Whiteboard;
import tech.nicorp.pm.whiteboards.domain.WhiteboardConnection;
import tech.nicorp.pm.whiteboards.domain.WhiteboardElement;
import tech.nicorp.pm.whiteboards.repo.WhiteboardConnectionRepository;
import tech.nicorp.pm.whiteboards.repo.WhiteboardElementRepository;
import tech.nicorp.pm.whiteboards.repo.WhiteboardRepository;

import java.net.URI;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api")
@Tag(name = "Whiteboards", description = "Онлайн-доски проекта")
public class WhiteboardsController {

    private final WhiteboardRepository boards;
    private final WhiteboardElementRepository elements;
    private final WhiteboardConnectionRepository connections;
    private final ProjectRepository projects;

    public WhiteboardsController(WhiteboardRepository boards, WhiteboardElementRepository elements, WhiteboardConnectionRepository connections, ProjectRepository projects) {
        this.boards = boards;
        this.elements = elements;
        this.connections = connections;
        this.projects = projects;
    }

    @GetMapping("/whiteboards")
    @Operation(summary = "Получить или создать доску проекта")
    public ResponseEntity<Whiteboard> getOrCreate(@RequestParam UUID project_id) {
        Project p = projects.findById(project_id).orElse(null);
        if (p == null) return ResponseEntity.notFound().build();
        Whiteboard b = boards.findByProject_Id(project_id).orElseGet(() -> {
            Whiteboard w = new Whiteboard();
            w.setProject(p);
            return boards.save(w);
        });
        return ResponseEntity.ok(b);
    }

    @GetMapping("/whiteboards/{boardId}")
    @Operation(summary = "Получить доску по идентификатору")
    public ResponseEntity<Whiteboard> getBoard(@PathVariable UUID boardId) {
        return boards.findById(boardId).map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/whiteboards/{boardId}/elements")
    @Operation(summary = "Создать элемент на доске")
    public ResponseEntity<WhiteboardElement> createElement(@PathVariable UUID boardId, @RequestBody Map<String, Object> body) {
        Whiteboard b = boards.findById(boardId).orElse(null);
        if (b == null) return ResponseEntity.notFound().build();
        WhiteboardElement el = new WhiteboardElement();
        el.setBoard(b);
        if (body.get("type") != null) el.setType((String) body.get("type"));
        if (body.get("x") instanceof Number n) el.setX(n.intValue());
        if (body.get("y") instanceof Number n) el.setY(n.intValue());
        if (body.get("width") instanceof Number n) el.setWidth(n.intValue());
        if (body.get("height") instanceof Number n) el.setHeight(n.intValue());
        if (body.get("rotation") instanceof Number n) el.setRotation(n.intValue());
        if (body.get("z_index") instanceof Number n) el.setZIndex(n.intValue());
        if (body.get("text") != null) el.setText((String) body.get("text"));
        if (body.get("fill") != null) el.setFill((String) body.get("fill"));
        if (body.get("text_color") != null) el.setTextColor((String) body.get("text_color"));
        if (body.get("font_family") != null) el.setFontFamily((String) body.get("font_family"));
        if (body.get("font_size") instanceof Number n) el.setFontSize(n.intValue());
        WhiteboardElement saved = elements.save(el);
        return ResponseEntity.created(URI.create("/api/whiteboards/" + boardId + "/elements/" + saved.getId())).body(saved);
    }

    @PatchMapping("/whiteboard-elements/{elementId}")
    @Operation(summary = "Обновить элемент доски")
    public ResponseEntity<WhiteboardElement> updateElement(@PathVariable UUID elementId, @RequestBody Map<String, Object> body) {
        return elements.findById(elementId).map(el -> {
            if (body.get("type") != null) el.setType((String) body.get("type"));
            if (body.get("x") instanceof Number n) el.setX(n.intValue());
            if (body.get("y") instanceof Number n) el.setY(n.intValue());
            if (body.get("width") instanceof Number n) el.setWidth(n.intValue());
            if (body.get("height") instanceof Number n) el.setHeight(n.intValue());
            if (body.get("rotation") instanceof Number n) el.setRotation(n.intValue());
            if (body.get("z_index") instanceof Number n) el.setZIndex(n.intValue());
            if (body.get("text") != null) el.setText((String) body.get("text"));
            if (body.get("fill") != null) el.setFill((String) body.get("fill"));
            if (body.get("text_color") != null) el.setTextColor((String) body.get("text_color"));
            if (body.get("font_family") != null) el.setFontFamily((String) body.get("font_family"));
            if (body.get("font_size") instanceof Number n) el.setFontSize(n.intValue());
            return ResponseEntity.ok(elements.save(el));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/whiteboard-elements/{elementId}")
    @Operation(summary = "Удалить элемент доски")
    public ResponseEntity<Void> deleteElement(@PathVariable UUID elementId) {
        if (!elements.existsById(elementId)) return ResponseEntity.notFound().build();
        elements.deleteById(elementId);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/whiteboards/{boardId}/connections")
    @Operation(summary = "Создать связь на доске")
    public ResponseEntity<WhiteboardConnection> createConnection(@PathVariable UUID boardId, @RequestBody Map<String, Object> body) {
        Whiteboard b = boards.findById(boardId).orElse(null);
        if (b == null) return ResponseEntity.notFound().build();
        WhiteboardConnection c = new WhiteboardConnection();
        c.setBoard(b);
        if (body.get("from_element_id") != null) elements.findById(UUID.fromString((String) body.get("from_element_id"))).ifPresent(c::setFromElement);
        if (body.get("to_element_id") != null) elements.findById(UUID.fromString((String) body.get("to_element_id"))).ifPresent(c::setToElement);
        if (body.get("stroke") != null) c.setStroke((String) body.get("stroke"));
        if (body.get("stroke_width") instanceof Number n) c.setStrokeWidth(n.intValue());
        if (body.get("points") != null) c.setPoints((String) body.get("points"));
        WhiteboardConnection saved = connections.save(c);
        return ResponseEntity.created(URI.create("/api/whiteboards/" + boardId + "/connections/" + saved.getId())).body(saved);
    }

    @PatchMapping("/whiteboard-connections/{connectionId}")
    @Operation(summary = "Обновить связь на доске")
    public ResponseEntity<WhiteboardConnection> updateConnection(@PathVariable UUID connectionId, @RequestBody Map<String, Object> body) {
        return connections.findById(connectionId).map(c -> {
            if (body.get("from_element_id") != null) elements.findById(UUID.fromString((String) body.get("from_element_id"))).ifPresent(c::setFromElement);
            if (body.get("to_element_id") != null) elements.findById(UUID.fromString((String) body.get("to_element_id"))).ifPresent(c::setToElement);
            if (body.get("stroke") != null) c.setStroke((String) body.get("stroke"));
            if (body.get("stroke_width") instanceof Number n) c.setStrokeWidth(n.intValue());
            if (body.get("points") != null) c.setPoints((String) body.get("points"));
            return ResponseEntity.ok(connections.save(c));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/whiteboard-connections/{connectionId}")
    @Operation(summary = "Удалить связь на доске")
    public ResponseEntity<Void> deleteConnection(@PathVariable UUID connectionId) {
        if (!connections.existsById(connectionId)) return ResponseEntity.notFound().build();
        connections.deleteById(connectionId);
        return ResponseEntity.noContent().build();
    }
}


