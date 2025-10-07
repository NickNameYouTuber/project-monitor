package tech.nicorp.pm.calls.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.calls.api.dto.CallResponse;
import tech.nicorp.pm.calls.domain.Call;
import tech.nicorp.pm.calls.service.CallService;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/calls")
@Tag(name = "Calls", description = "Управление звонками")
public class CallsController {
    private final CallService service;
    public CallsController(CallService service) { this.service = service; }

    @GetMapping
    @Operation(summary = "Список звонков")
    public ResponseEntity<List<CallResponse>> list() {
        return ResponseEntity.ok(service.list().stream().map(this::toResponse).toList());
    }

    @GetMapping("/{id}")
    @Operation(summary = "Получить звонок по id")
    public ResponseEntity<CallResponse> get(@PathVariable("id") UUID id) {
        return service.get(id).map(c -> ResponseEntity.ok(toResponse(c))).orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-room/{roomId}")
    @Operation(summary = "Получить звонок по roomId")
    public ResponseEntity<CallResponse> getByRoom(@PathVariable("roomId") String roomId) {
        return service.getByRoomId(roomId).map(c -> ResponseEntity.ok(toResponse(c))).orElse(ResponseEntity.notFound().build());
    }

    @PostMapping
    @Operation(summary = "Создать звонок")
    public ResponseEntity<CallResponse> create(@RequestBody tech.nicorp.pm.calls.api.dto.CallCreateRequest body) {
        Call c = new Call();
        c.setRoomId(body.getRoomId());
        c.setTitle(body.getTitle());
        c.setDescription(body.getDescription());
        c.setProject(service.resolveProject(body.getProjectId()));
        c.setTask(service.resolveTask(body.getTaskId()));
        c.setStartAt(body.getStartAt());
        c.setEndAt(body.getEndAt());
        Call saved = service.save(c);
        return ResponseEntity.created(URI.create("/api/calls/" + saved.getId())).body(toResponse(saved));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Обновить звонок")
    public ResponseEntity<CallResponse> update(@PathVariable("id") UUID id, @RequestBody tech.nicorp.pm.calls.api.dto.CallUpdateRequest body) {
        return service.get(id).map(c -> {
            if (body.getTitle() != null) c.setTitle(body.getTitle());
            if (body.getDescription() != null) c.setDescription(body.getDescription());
            if (body.getStartAt() != null) c.setStartAt(body.getStartAt());
            if (body.getEndAt() != null) c.setEndAt(body.getEndAt());
            Call saved = service.save(c);
            return ResponseEntity.ok(toResponse(saved));
        }).orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Удалить звонок")
    public ResponseEntity<Void> delete(@PathVariable("id") UUID id) {
        if (service.get(id).isEmpty()) return ResponseEntity.notFound().build();
        service.delete(id);
        return ResponseEntity.noContent().build();
    }

    private CallResponse toResponse(Call c) {
        CallResponse r = new CallResponse();
        r.setId(c.getId());
        r.setRoomId(c.getRoomId());
        r.setTitle(c.getTitle());
        r.setDescription(c.getDescription());
        r.setCreatedAt(c.getCreatedAt());
        r.setStartAt(c.getStartAt());
        r.setEndAt(c.getEndAt());
        if (c.getProject() != null) r.setProjectId(c.getProject().getId());
        if (c.getTask() != null) r.setTaskId(c.getTask().getId());
        if (c.getCreatedBy() != null) r.setCreatedBy(c.getCreatedBy().getId());
        return r;
    }
}


