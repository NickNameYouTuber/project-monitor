package tech.nicorp.pm.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import tech.nicorp.pm.realtime.RealtimeSubscription;

import java.io.IOException;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Slf4j
@Component
public class WebSocketSessionManager {
    private final Map<UUID, WebSocketSession> userSessions = new ConcurrentHashMap<>();
    private final Map<UUID, RealtimeSubscription> subscriptions = new ConcurrentHashMap<>();
    private final Map<UUID, WebSocketSession> callNotificationSessions = new ConcurrentHashMap<>();
    private final Map<UUID, WebSocketSession> pipelineLogSessions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;

    public WebSocketSessionManager(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void registerRealtimeSession(UUID userId, WebSocketSession session, UUID organizationId, UUID projectId) {
        userSessions.put(userId, session);
        subscriptions.put(userId, new RealtimeSubscription(userId, organizationId, projectId));
        log.info("Registered WebSocket realtime session for user: {}, organizationId: {}, projectId: {}", 
            userId, organizationId, projectId);
    }

    public void unregisterRealtimeSession(UUID userId) {
        userSessions.remove(userId);
        subscriptions.remove(userId);
        log.info("Unregistered WebSocket realtime session for user: {}", userId);
    }

    public void registerCallNotificationSession(UUID userId, WebSocketSession session) {
        callNotificationSessions.put(userId, session);
        log.info("Registered WebSocket call notification session for user: {}", userId);
    }

    public void unregisterCallNotificationSession(UUID userId) {
        callNotificationSessions.remove(userId);
        log.info("Unregistered WebSocket call notification session for user: {}", userId);
    }

    public void registerPipelineLogSession(UUID jobId, WebSocketSession session) {
        pipelineLogSessions.put(jobId, session);
        log.info("Registered WebSocket pipeline log session for job: {}", jobId);
    }

    public void unregisterPipelineLogSession(UUID jobId) {
        pipelineLogSessions.remove(jobId);
        log.info("Unregistered WebSocket pipeline log session for job: {}", jobId);
    }

    public void sendToOrganization(UUID organizationId, String eventType, Object data) {
        Set<UUID> userIds = subscriptions.values().stream()
            .filter(sub -> sub.matchesOrganization(organizationId))
            .map(RealtimeSubscription::getUserId)
            .collect(Collectors.toSet());
        
        log.info("Sending {} event to {} users in organization {}", eventType, userIds.size(), organizationId);
        
        for (UUID userId : userIds) {
            sendToUser(userId, eventType, data);
        }
    }

    public void sendToProject(UUID projectId, String eventType, Object data) {
        Set<UUID> userIds = subscriptions.values().stream()
            .filter(sub -> sub.matchesProject(projectId))
            .map(RealtimeSubscription::getUserId)
            .collect(Collectors.toSet());
        
        log.debug("Sending {} event to {} users for project {}", eventType, userIds.size(), projectId);
        
        for (UUID userId : userIds) {
            sendToUser(userId, eventType, data);
        }
    }

    public void sendToUser(UUID userId, String eventType, Object data) {
        WebSocketSession session = userSessions.get(userId);
        if (session == null || !session.isOpen()) {
            log.warn("No active WebSocket session found for user {} when trying to send event {}", userId, eventType);
            return;
        }
        
        try {
            Map<String, Object> message = new HashMap<>();
            message.put("type", eventType);
            message.put("data", data);
            
            String json = objectMapper.writeValueAsString(message);
            session.sendMessage(new TextMessage(json));
            log.debug("Sent {} event to user {}", eventType, userId);
        } catch (IOException e) {
            log.error("Error sending {} event to user {}: {}", eventType, userId, e.getMessage(), e);
            unregisterRealtimeSession(userId);
        }
    }

    public void sendCallNotificationToUser(UUID userId, String eventType, Object data) {
        WebSocketSession session = callNotificationSessions.get(userId);
        if (session == null || !session.isOpen()) {
            log.warn("No active WebSocket call notification session found for user {} when trying to send event {}", 
                userId, eventType);
            return;
        }
        
        try {
            Map<String, Object> message = new HashMap<>();
            message.put("type", eventType);
            message.put("data", data);
            
            String json = objectMapper.writeValueAsString(message);
            session.sendMessage(new TextMessage(json));
            log.info("Sent {} call notification to user {}", eventType, userId);
        } catch (IOException e) {
            log.error("Error sending {} call notification to user {}: {}", eventType, userId, e.getMessage(), e);
            unregisterCallNotificationSession(userId);
        }
    }

    public void sendPipelineLogToJob(UUID jobId, String eventType, Object data) {
        WebSocketSession session = pipelineLogSessions.get(jobId);
        if (session == null || !session.isOpen()) {
            log.debug("No active WebSocket pipeline log session found for job {} when trying to send event {}", 
                jobId, eventType);
            return;
        }
        
        try {
            Map<String, Object> message = new HashMap<>();
            message.put("type", eventType);
            message.put("data", data);
            
            String json = objectMapper.writeValueAsString(message);
            session.sendMessage(new TextMessage(json));
            log.debug("Sent {} pipeline log event to job {}", eventType, jobId);
        } catch (IOException e) {
            log.error("Error sending {} pipeline log event to job {}: {}", eventType, jobId, e.getMessage(), e);
            unregisterPipelineLogSession(jobId);
        }
    }
}
