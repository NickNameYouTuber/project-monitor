package tech.nicorp.pm.whiteboards.api;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import tech.nicorp.pm.projects.domain.Project;
import tech.nicorp.pm.projects.repo.ProjectRepository;
import tech.nicorp.pm.whiteboards.domain.Whiteboard;
import tech.nicorp.pm.whiteboards.domain.WhiteboardConnection;
import tech.nicorp.pm.whiteboards.domain.WhiteboardElement;
import tech.nicorp.pm.whiteboards.api.dto.WhiteboardResponse;
import tech.nicorp.pm.whiteboards.api.dto.WhiteboardElementResponse;
import tech.nicorp.pm.whiteboards.api.dto.WhiteboardConnectionResponse;
import tech.nicorp.pm.whiteboards.repo.WhiteboardConnectionRepository;
import tech.nicorp.pm.whiteboards.repo.WhiteboardElementRepository;
import tech.nicorp.pm.whiteboards.repo.WhiteboardRepository;
import tech.nicorp.pm.tasks.repo.TaskRepository;
import tech.nicorp.pm.tasks.domain.Task;
import tech.nicorp.pm.realtime.RealtimeEventService;

import java.net.URI;
import java.util.Map;
import java.util.UUID;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@Tag(name = "Whiteboards", description = "Онлайн-доски проекта")
public class WhiteboardsController {

    private final WhiteboardRepository boards;
    private final WhiteboardElementRepository elements;
    private final WhiteboardConnectionRepository connections;
    private final ProjectRepository projects;
    private final TaskRepository tasks;
    private final RealtimeEventService realtimeEventService;

    public WhiteboardsController(WhiteboardRepository boards, WhiteboardElementRepository elements, WhiteboardConnectionRepository connections, ProjectRepository projects, TaskRepository tasks, RealtimeEventService realtimeEventService) {
        this.boards = boards;
        this.elements = elements;
        this.connections = connections;
        this.projects = projects;
        this.tasks = tasks;
        this.realtimeEventService = realtimeEventService;
    }

    @GetMapping("/whiteboards")
    @Operation(summary = "Получить или создать доску проекта")
    public ResponseEntity<WhiteboardResponse> getOrCreate(@RequestParam(name = "project_id") UUID project_id) {
        Project p = projects.findById(project_id).orElse(null);
        if (p == null) return ResponseEntity.<WhiteboardResponse>notFound().build();
        Whiteboard b = boards.findByProject_Id(project_id).orElseGet(() -> {
            Whiteboard w = new Whiteboard();
            w.setProject(p);
            return boards.save(w);
        });
        WhiteboardResponse resp = new WhiteboardResponse();
        resp.setId(b.getId());
        resp.setProjectId(project_id);
        resp.setElements(elements.findAll().stream()
                .filter(e -> e.getBoard() != null && b.getId().equals(e.getBoard().getId()))
                .map(this::toElement)
                .toList());
        resp.setConnections(connections.findAll().stream()
                .filter(c -> c.getBoard() != null && b.getId().equals(c.getBoard().getId()))
                .map(this::toConnection)
                .toList());
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/whiteboards/{boardId}")
    @Operation(summary = "Получить доску по идентификатору")
    public ResponseEntity<Whiteboard> getBoard(@PathVariable("boardId") UUID boardId) {
        return boards.findById(boardId).map(ResponseEntity::ok).orElse(ResponseEntity.<Whiteboard>notFound().build());
    }

    @PostMapping("/whiteboards/{boardId}/elements")
    @Operation(summary = "Создать элемент на доске")
    @Transactional
    public ResponseEntity<WhiteboardElementResponse> createElement(@PathVariable("boardId") UUID boardId, @RequestBody Map<String, Object> body) {
        Whiteboard b = boards.findById(boardId).orElse(null);
        if (b == null) return ResponseEntity.<WhiteboardElementResponse>notFound().build();
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
        if (body.get("task_id") != null) {
            try {
                UUID taskId = UUID.fromString(body.get("task_id").toString());
                tasks.findById(taskId).ifPresent(el::setTask);
            } catch (IllegalArgumentException ignored) {}
        }
        WhiteboardElement saved = elements.save(el);
        sendWhiteboardUpdate(b);
        return ResponseEntity.created(URI.create("/api/whiteboards/" + boardId + "/elements/" + saved.getId())).body(toElement(saved));
    }

    @PatchMapping("/whiteboard-elements/{elementId}")
    @Operation(summary = "Обновить элемент доски")
    @Transactional
    public ResponseEntity<WhiteboardElementResponse> updateElement(@PathVariable("elementId") UUID elementId, @RequestBody Map<String, Object> body) {
        WhiteboardElement element = elements.findById(elementId).orElse(null);
        if (element == null) {
            return ResponseEntity.<WhiteboardElementResponse>notFound().build();
        }
        
        Whiteboard board = element.getBoard();
        if (board == null) {
            return ResponseEntity.<WhiteboardElementResponse>notFound().build();
        }
        
        if (body.get("type") != null) element.setType((String) body.get("type"));
        if (body.get("x") instanceof Number n) element.setX(n.intValue());
        if (body.get("y") instanceof Number n) element.setY(n.intValue());
        if (body.get("width") instanceof Number n) element.setWidth(n.intValue());
        if (body.get("height") instanceof Number n) element.setHeight(n.intValue());
        if (body.get("rotation") instanceof Number n) element.setRotation(n.intValue());
        if (body.get("z_index") instanceof Number n) element.setZIndex(n.intValue());
        if (body.get("text") != null) element.setText((String) body.get("text"));
        if (body.get("fill") != null) element.setFill((String) body.get("fill"));
        if (body.get("text_color") != null) element.setTextColor((String) body.get("text_color"));
        if (body.get("font_family") != null) element.setFontFamily((String) body.get("font_family"));
        if (body.get("font_size") instanceof Number n) element.setFontSize(n.intValue());
        if (body.get("task_id") != null) {
            try {
                UUID taskId = UUID.fromString(body.get("task_id").toString());
                tasks.findById(taskId).ifPresent(element::setTask);
            } catch (IllegalArgumentException ignored) {}
        }
        WhiteboardElement saved = elements.save(element);
        sendWhiteboardUpdate(board);
        return ResponseEntity.ok(toElement(saved));
    }

    @DeleteMapping("/whiteboard-elements/{elementId}")
    @Operation(summary = "Удалить элемент доски")
    @Transactional
    public ResponseEntity<Void> deleteElement(@PathVariable("elementId") UUID elementId) {
        WhiteboardElement element = elements.findById(elementId).orElse(null);
        if (element == null) {
            return ResponseEntity.<Void>notFound().build();
        }
        
        Whiteboard board = element.getBoard();
        elements.deleteById(elementId);
        if (board != null) {
            sendWhiteboardUpdate(board);
        }
        return ResponseEntity.<Void>noContent().build();
    }

    @PostMapping("/whiteboards/{boardId}/connections")
    @Operation(summary = "Создать связь на доске")
    @Transactional
    public ResponseEntity<WhiteboardConnectionResponse> createConnection(@PathVariable("boardId") UUID boardId, @RequestBody Map<String, Object> body) {
        Whiteboard b = boards.findById(boardId).orElse(null);
        if (b == null) return ResponseEntity.<WhiteboardConnectionResponse>notFound().build();
        WhiteboardConnection c = new WhiteboardConnection();
        c.setBoard(b);
        if (body.get("from_element_id") != null) elements.findById(UUID.fromString((String) body.get("from_element_id"))).ifPresent(c::setFromElement);
        if (body.get("to_element_id") != null) elements.findById(UUID.fromString((String) body.get("to_element_id"))).ifPresent(c::setToElement);
        if (body.get("stroke") != null) c.setStroke((String) body.get("stroke"));
        if (body.get("stroke_width") instanceof Number n) c.setStrokeWidth(n.intValue());
        if (body.get("points") != null) c.setPoints((String) body.get("points"));
        WhiteboardConnection saved = connections.save(c);
        sendWhiteboardUpdate(b);
        return ResponseEntity.created(URI.create("/api/whiteboards/" + boardId + "/connections/" + saved.getId())).body(toConnection(saved));
    }

    private WhiteboardElementResponse toElement(WhiteboardElement el) {
        WhiteboardElementResponse r = new WhiteboardElementResponse();
        r.setId(el.getId());
        if (el.getBoard() != null) r.setBoardId(el.getBoard().getId());
        r.setType(el.getType());
        r.setX(el.getX());
        r.setY(el.getY());
        r.setWidth(el.getWidth());
        r.setHeight(el.getHeight());
        r.setRotation(el.getRotation());
        r.setZIndex(el.getZIndex());
        r.setText(el.getText());
        r.setFill(el.getFill());
        r.setTextColor(el.getTextColor());
        r.setFontFamily(el.getFontFamily());
        r.setFontSize(el.getFontSize());
        if (el.getTask() != null) r.setTaskId(el.getTask().getId());
        return r;
    }

    private WhiteboardConnectionResponse toConnection(WhiteboardConnection c) {
        WhiteboardConnectionResponse r = new WhiteboardConnectionResponse();
        r.setId(c.getId());
        if (c.getBoard() != null) r.setBoardId(c.getBoard().getId());
        if (c.getFromElement() != null) r.setFromElementId(c.getFromElement().getId());
        if (c.getToElement() != null) r.setToElementId(c.getToElement().getId());
        r.setStroke(c.getStroke());
        r.setStrokeWidth(c.getStrokeWidth());
        r.setPoints(c.getPoints());
        return r;
    }

    @PatchMapping("/whiteboard-connections/{connectionId}")
    @Operation(summary = "Обновить связь на доске")
    @Transactional
    public ResponseEntity<WhiteboardConnectionResponse> updateConnection(@PathVariable("connectionId") UUID connectionId, @RequestBody Map<String, Object> body) {
        WhiteboardConnection connection = connections.findById(connectionId).orElse(null);
        if (connection == null) {
            return ResponseEntity.<WhiteboardConnectionResponse>notFound().build();
        }
        
        Whiteboard board = connection.getBoard();
        if (board == null) {
            return ResponseEntity.<WhiteboardConnectionResponse>notFound().build();
        }
        
        if (body.get("from_element_id") != null) elements.findById(UUID.fromString((String) body.get("from_element_id"))).ifPresent(connection::setFromElement);
        if (body.get("to_element_id") != null) elements.findById(UUID.fromString((String) body.get("to_element_id"))).ifPresent(connection::setToElement);
        if (body.get("stroke") != null) connection.setStroke((String) body.get("stroke"));
        if (body.get("stroke_width") instanceof Number n) connection.setStrokeWidth(n.intValue());
        if (body.get("points") != null) connection.setPoints((String) body.get("points"));
        WhiteboardConnection saved = connections.save(connection);
        sendWhiteboardUpdate(board);
        return ResponseEntity.ok(toConnection(saved));
    }

    @DeleteMapping("/whiteboard-connections/{connectionId}")
    @Operation(summary = "Удалить связь на доске")
    @Transactional
    public ResponseEntity<Void> deleteConnection(@PathVariable("connectionId") UUID connectionId) {
        WhiteboardConnection connection = connections.findById(connectionId).orElse(null);
        if (connection == null) {
            return ResponseEntity.<Void>notFound().build();
        }
        
        Whiteboard board = connection.getBoard();
        connections.deleteById(connectionId);
        if (board != null) {
            sendWhiteboardUpdate(board);
        }
        return ResponseEntity.<Void>noContent().build();
    }

    @GetMapping("/whiteboards/sections")
    @Operation(summary = "Получить все секции проекта")
    public ResponseEntity<List<WhiteboardElementResponse>> getProjectSections(@RequestParam(name = "project_id") UUID projectId) {
        Whiteboard b = boards.findByProject_Id(projectId).orElse(null);
        if (b == null) return ResponseEntity.ok(List.of());
        List<WhiteboardElementResponse> sections = elements.findAll().stream()
                .filter(e -> e.getBoard() != null && b.getId().equals(e.getBoard().getId()) && "section".equals(e.getType()))
                .map(this::toElement)
                .collect(Collectors.toList());
        return ResponseEntity.ok(sections);
    }

    @PatchMapping("/whiteboard-elements/{elementId}/link-task")
    @Operation(summary = "Привязать элемент к задаче")
    @Transactional
    public ResponseEntity<WhiteboardElementResponse> linkElementToTask(@PathVariable("elementId") UUID elementId, @RequestBody Map<String, Object> body) {
        WhiteboardElement element = elements.findById(elementId).orElse(null);
        if (element == null) {
            return ResponseEntity.<WhiteboardElementResponse>notFound().build();
        }
        
        Whiteboard board = element.getBoard();
        if (board == null) {
            return ResponseEntity.<WhiteboardElementResponse>notFound().build();
        }
        
        if (body.get("task_id") != null) {
            try {
                UUID taskId = UUID.fromString(body.get("task_id").toString());
                tasks.findById(taskId).ifPresent(element::setTask);
            } catch (IllegalArgumentException ignored) {}
        }
        WhiteboardElement saved = elements.save(element);
        sendWhiteboardUpdate(board);
        return ResponseEntity.ok(toElement(saved));
    }

    @PatchMapping("/whiteboard-elements/{elementId}/unlink-task")
    @Operation(summary = "Отвязать элемент от задачи")
    @Transactional
    public ResponseEntity<WhiteboardElementResponse> unlinkElementFromTask(@PathVariable("elementId") UUID elementId) {
        WhiteboardElement element = elements.findById(elementId).orElse(null);
        if (element == null) {
            return ResponseEntity.<WhiteboardElementResponse>notFound().build();
        }
        
        Whiteboard board = element.getBoard();
        if (board == null) {
            return ResponseEntity.<WhiteboardElementResponse>notFound().build();
        }
        
        element.setTask(null);
        WhiteboardElement saved = elements.save(element);
        sendWhiteboardUpdate(board);
        return ResponseEntity.ok(toElement(saved));
    }

    private void sendWhiteboardUpdate(Whiteboard board) {
        if (board == null) {
            return;
        }
        
        UUID projectId;
        try {
            Project project = board.getProject();
            if (project == null) {
                return;
            }
            projectId = project.getId();
        } catch (Exception e) {
            return;
        }
        
        WhiteboardResponse response = new WhiteboardResponse();
        response.setId(board.getId());
        response.setProjectId(projectId);
        response.setElements(elements.findAll().stream()
                .filter(e -> e.getBoard() != null && board.getId().equals(e.getBoard().getId()))
                .map(this::toElement)
                .toList());
        response.setConnections(connections.findAll().stream()
                .filter(c -> c.getBoard() != null && board.getId().equals(c.getBoard().getId()))
                .map(this::toConnection)
                .toList());
        
        try {
            realtimeEventService.sendWhiteboardUpdated(projectId, response);
        } catch (Exception e) {
        }
    }
}

