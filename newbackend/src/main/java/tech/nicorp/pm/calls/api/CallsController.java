package tech.nicorp.pm.calls.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.calls.api.dto.*;
import tech.nicorp.pm.calls.domain.Call;
import tech.nicorp.pm.calls.domain.CallParticipant;
import tech.nicorp.pm.calls.domain.CallStatus;
import tech.nicorp.pm.calls.domain.ParticipantRole;
import tech.nicorp.pm.calls.service.CallParticipantService;
import tech.nicorp.pm.calls.service.CallService;
import tech.nicorp.pm.calls.service.CallStatusManager;
import tech.nicorp.pm.calls.service.RecurringCallService;
import tech.nicorp.pm.users.domain.User;

import java.net.URI;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/calls")
@Tag(name = "Calls", description = "Управление звонками")
public class CallsController {
    private final CallService service;
    private final CallParticipantService participantService;
    private final CallStatusManager statusManager;
    private final RecurringCallService recurringService;
    
    public CallsController(
        CallService service, 
        CallParticipantService participantService,
        CallStatusManager statusManager,
        RecurringCallService recurringService
    ) {
        this.service = service;
        this.participantService = participantService;
        this.statusManager = statusManager;
        this.recurringService = recurringService;
    }

    @GetMapping
    @Operation(summary = "Список звонков текущего пользователя")
    public ResponseEntity<List<CallResponse>> list(@AuthenticationPrincipal Object principal) {
        UUID userId = extractUserId(principal);
        System.out.println("🔍 DEBUG: principal = " + principal);
        System.out.println("🔍 DEBUG: userId = " + userId);
        
        if (userId == null) {
            System.out.println("⚠️ DEBUG: userId is null, returning empty list");
            return ResponseEntity.ok(List.of());
        }
        
        List<Call> userCalls = service.getCallsForUser(userId);
        System.out.println("🔍 DEBUG: Found " + userCalls.size() + " calls for user " + userId);
        return ResponseEntity.ok(userCalls.stream().map(this::toResponse).toList());
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

    @GetMapping("/range")
    @Operation(summary = "Получить звонки за период")
    public ResponseEntity<List<CallResponse>> getRange(
            @RequestParam("start") OffsetDateTime start,
            @RequestParam("end") OffsetDateTime end) {
        return ResponseEntity.ok(service.getByRange(start, end).stream().map(this::toResponse).toList());
    }
    
    @GetMapping("/recurrence-group/{groupId}")
    @Operation(summary = "Получить все встречи из группы повторяющихся")
    public ResponseEntity<List<CallResponse>> getRecurrenceGroup(@PathVariable UUID groupId) {
        List<Call> calls = service.getByRecurrenceGroupId(groupId);
        return ResponseEntity.ok(calls.stream().map(this::toResponse).toList());
    }

    @PostMapping
    @Operation(summary = "Создать звонок или серию повторяющихся звонков")
    public ResponseEntity<?> create(
            @RequestBody tech.nicorp.pm.calls.api.dto.CallCreateRequest body,
            @AuthenticationPrincipal Object principal) {
        
        UUID userId = extractUserId(principal);
        User currentUser = userId != null ? service.resolveUser(userId) : null;
        
        if (Boolean.TRUE.equals(body.getIsRecurring())) {
            List<Call> calls = recurringService.createRecurringCalls(body, currentUser, body.getParticipantIds());
            return ResponseEntity.ok(calls.stream().map(this::toResponse).toList());
        } else {
            Call saved = createSingleCall(body, currentUser);
            return ResponseEntity.created(URI.create("/api/calls/" + saved.getId())).body(toResponse(saved));
        }
    }
    
    private Call createSingleCall(tech.nicorp.pm.calls.api.dto.CallCreateRequest body, User currentUser) {
        Call c = new Call();
        c.setRoomId(body.getRoomId());
        c.setTitle(body.getTitle());
        c.setDescription(body.getDescription());
        c.setProject(service.resolveProject(body.getProjectId()));
        c.setTask(service.resolveTask(body.getTaskId()));
        c.setStartAt(body.getStartAt());
        c.setEndAt(body.getEndAt());
        c.setScheduledTime(body.getScheduledTime());
        c.setDurationMinutes(body.getDurationMinutes() != null ? body.getDurationMinutes() : 30);
        if (body.getStatus() != null) {
            c.setStatus(tech.nicorp.pm.calls.domain.CallStatus.valueOf(body.getStatus()));
        }
        
        Call saved = service.save(c);
        
        if (currentUser != null && body.getParticipantIds() != null) {
            participantService.addParticipantsToCall(saved, body.getParticipantIds(), currentUser);
        }
        
        return saved;
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

    // ============== УПРАВЛЕНИЕ УЧАСТНИКАМИ ==============

    @PostMapping("/{callId}/participants")
    @Operation(summary = "Добавить участника к звонку")
    public ResponseEntity<Void> addParticipant(
            @PathVariable("callId") UUID callId,
            @RequestBody AddParticipantRequest request) {
        ParticipantRole role = request.getRole() != null 
            ? ParticipantRole.valueOf(request.getRole()) 
            : ParticipantRole.PARTICIPANT;
        
        participantService.addParticipant(callId, request.getUserId(), role);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{callId}/participants/{userId}")
    @Operation(summary = "Удалить участника из звонка")
    public ResponseEntity<Void> removeParticipant(
            @PathVariable("callId") UUID callId,
            @PathVariable("userId") UUID userId) {
        participantService.removeParticipant(callId, userId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{callId}/participants")
    @Operation(summary = "Получить список участников звонка")
    public ResponseEntity<List<CallParticipantResponse>> getParticipants(
            @PathVariable("callId") UUID callId) {
        List<CallParticipant> participants = participantService.getParticipants(callId);
        return ResponseEntity.ok(participants.stream().map(this::toParticipantResponse).toList());
    }

    @GetMapping("/{callId}/check-access")
    @Operation(summary = "Проверить доступ текущего пользователя к звонку")
    public ResponseEntity<CheckAccessResponse> checkAccess(
            @PathVariable("callId") UUID callId,
            @AuthenticationPrincipal Object principal) {
        
        UUID userId = extractUserId(principal);
        if (userId == null) {
            return ResponseEntity.ok(new CheckAccessResponse(false, null));
        }
        
        boolean hasAccess = participantService.hasAccess(callId, userId);
        String role = participantService.getUserRole(callId, userId)
            .map(Enum::name)
            .orElse(null);
        
        return ResponseEntity.ok(new CheckAccessResponse(hasAccess, role));
    }

    @PatchMapping("/{callId}/status")
    @Operation(summary = "Обновить статус звонка (только для организатора)")
    public ResponseEntity<CallResponse> updateStatus(
            @PathVariable("callId") UUID callId,
            @RequestBody UpdateStatusRequest request,
            @AuthenticationPrincipal Object principal) {
        
        UUID userId = extractUserId(principal);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }
        
        // Проверяем что пользователь - организатор
        ParticipantRole role = participantService.getUserRole(callId, userId)
            .orElse(null);
        
        if (role != ParticipantRole.ORGANIZER) {
            return ResponseEntity.status(403).build();
        }
        
        return service.get(callId).map(call -> {
            CallStatus newStatus = CallStatus.valueOf(request.getStatus());
            statusManager.updateStatus(call, newStatus);
            return ResponseEntity.ok(toResponse(call));
        }).orElse(ResponseEntity.notFound().build());
    }

    // ============== HELPER METHODS ==============

    private CallResponse toResponse(Call c) {
        CallResponse r = new CallResponse();
        r.setId(c.getId());
        r.setRoomId(c.getRoomId());
        r.setTitle(c.getTitle());
        r.setDescription(c.getDescription());
        r.setCreatedAt(c.getCreatedAt());
        r.setStartAt(c.getStartAt());
        r.setEndAt(c.getEndAt());
        r.setScheduledTime(c.getScheduledTime());
        r.setDurationMinutes(c.getDurationMinutes());
        r.setStatus(c.getStatus() != null ? c.getStatus().name() : null);
        if (c.getProject() != null) r.setProjectId(c.getProject().getId());
        if (c.getTask() != null) r.setTaskId(c.getTask().getId());
        if (c.getCreatedBy() != null) r.setCreatedBy(c.getCreatedBy().getId());
        
        r.setRecurrenceGroupId(c.getRecurrenceGroupId());
        r.setIsRecurring(c.getIsRecurring());
        r.setRecurrenceType(c.getRecurrenceType() != null ? c.getRecurrenceType().name() : null);
        r.setRecurrenceDays(c.getRecurrenceDays());
        r.setRecurrenceEndDate(c.getRecurrenceEndDate());
        
        if (c.getParticipants() != null && !c.getParticipants().isEmpty()) {
            r.setParticipants(c.getParticipants().stream()
                .map(this::toParticipantResponse)
                .toList());
        }
        
        return r;
    }

    private CallParticipantResponse toParticipantResponse(CallParticipant p) {
        User user = p.getUser();
        CallParticipantResponse.UserSummary userSummary = new CallParticipantResponse.UserSummary(
            user.getId(),
            user.getUsername(),
            user.getDisplayName(),
            null // avatar - TODO: добавить если есть в User entity
        );
        
        return new CallParticipantResponse(
            p.getId(),
            userSummary,
            p.getRole().name(),
            p.getStatus().name(),
            p.getInvitedAt(),
            p.getJoinedAt(),
            p.getLeftAt()
        );
    }
    
    private UUID extractUserId(Object principal) {
        if (principal == null) {
            return null;
        }
        
        if (principal instanceof User) {
            return ((User) principal).getId();
        }
        
        if (principal instanceof String) {
            try {
                return UUID.fromString((String) principal);
            } catch (IllegalArgumentException e) {
                return null;
            }
        }
        
        return null;
    }
}


