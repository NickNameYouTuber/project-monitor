package tech.nicorp.pm.calls.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import tech.nicorp.pm.calls.api.dto.CallCreateRequest;
import tech.nicorp.pm.calls.domain.Call;
import tech.nicorp.pm.calls.domain.CallStatus;
import tech.nicorp.pm.calls.domain.RecurrenceType;
import tech.nicorp.pm.users.domain.User;

import java.time.*;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class RecurringCallService {
    private final CallService callService;
    private final CallParticipantService participantService;
    private final ObjectMapper objectMapper = new ObjectMapper();
    
    public List<Call> createRecurringCalls(CallCreateRequest request, User creator, List<UUID> participantIds) {
        if (!Boolean.TRUE.equals(request.getIsRecurring())) {
            return Collections.emptyList();
        }
        
        UUID groupId = UUID.randomUUID();
        List<Call> calls = new ArrayList<>();
        
        LocalDate startDate = LocalDate.now();
        if (request.getScheduledTime() != null) {
            startDate = request.getScheduledTime().toLocalDate();
        }
        
        LocalDate endDate = request.getRecurrenceEndDate() != null 
            ? request.getRecurrenceEndDate().toLocalDate() 
            : startDate.plusMonths(3);
        
        LocalTime time = request.getScheduledTime() != null 
            ? request.getScheduledTime().toLocalTime() 
            : LocalTime.of(9, 0);
        
        ZoneOffset offset = request.getScheduledTime() != null 
            ? request.getScheduledTime().getOffset() 
            : ZoneOffset.UTC;
        
        LocalDate currentDate = startDate;
        int maxIterations = 365;
        int iterations = 0;
        
        while (!currentDate.isAfter(endDate) && iterations < maxIterations) {
            if (shouldCreateCallOnDate(currentDate, request)) {
                Call call = createSingleRecurringCall(request, currentDate, time, offset, groupId, creator);
                calls.add(call);
                
                if (participantIds != null && !participantIds.isEmpty()) {
                    participantService.addParticipantsToCall(call, participantIds, creator);
                }
            }
            
            currentDate = getNextDate(currentDate, request.getRecurrenceType());
            iterations++;
        }
        
        log.info("Создано {} повторяющихся звонков с groupId: {}", calls.size(), groupId);
        return calls;
    }
    
    private boolean shouldCreateCallOnDate(LocalDate date, CallCreateRequest request) {
        if ("WEEKLY".equals(request.getRecurrenceType())) {
            int dayOfWeek = date.getDayOfWeek().getValue();
            return request.getRecurrenceDays() != null && 
                   request.getRecurrenceDays().contains(dayOfWeek);
        }
        return true;
    }
    
    private LocalDate getNextDate(LocalDate current, String type) {
        return switch (type) {
            case "DAILY" -> current.plusDays(1);
            case "WEEKLY" -> current.plusWeeks(1);
            case "MONTHLY" -> current.plusMonths(1);
            default -> current.plusDays(1);
        };
    }
    
    private Call createSingleRecurringCall(CallCreateRequest request, LocalDate date, 
                                           LocalTime time, ZoneOffset offset, UUID groupId, User creator) {
        Call call = new Call();
        call.setRoomId(UUID.randomUUID().toString());
        call.setTitle(request.getTitle());
        call.setDescription(request.getDescription());
        call.setScheduledTime(OffsetDateTime.of(date, time, offset));
        call.setDurationMinutes(request.getDurationMinutes() != null ? request.getDurationMinutes() : 30);
        call.setEndAt(call.getScheduledTime().plusMinutes(call.getDurationMinutes()));
        call.setStatus(CallStatus.SCHEDULED);
        call.setCreatedBy(creator);
        call.setIsRecurring(true);
        call.setRecurrenceGroupId(groupId);
        call.setRecurrenceType(RecurrenceType.valueOf(request.getRecurrenceType()));
        
        try {
            if (request.getRecurrenceDays() != null) {
                call.setRecurrenceDays(objectMapper.writeValueAsString(request.getRecurrenceDays()));
            }
        } catch (Exception e) {
            log.error("Ошибка сериализации recurrenceDays", e);
        }
        
        call.setRecurrenceEndDate(request.getRecurrenceEndDate());
        
        return callService.save(call);
    }
}

