package tech.nicorp.pm.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
public class PipelineLogsWebSocketHandler extends TextWebSocketHandler {
    private final WebSocketSessionManager sessionManager;
    private final ObjectMapper objectMapper;

    public PipelineLogsWebSocketHandler(
            WebSocketSessionManager sessionManager,
            ObjectMapper objectMapper) {
        this.sessionManager = sessionManager;
        this.objectMapper = objectMapper;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        UUID jobId = extractJobIdFromSession(session);
        if (jobId == null) {
            log.warn("Pipeline logs WebSocket connection rejected: invalid or missing jobId");
            session.close(CloseStatus.BAD_DATA.withReason("Invalid or missing jobId"));
            return;
        }

        sessionManager.registerPipelineLogSession(jobId, session);

        Map<String, Object> connectedMessage = new HashMap<>();
        connectedMessage.put("type", "connected");
        connectedMessage.put("data", Map.of("message", "Connected to pipeline logs"));
        
        try {
            String json = objectMapper.writeValueAsString(connectedMessage);
            session.sendMessage(new TextMessage(json));
        } catch (IOException e) {
            log.error("Error sending connected message", e);
        }

        log.info("Pipeline logs WebSocket connection established for job: {}", jobId);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        UUID jobId = extractJobIdFromSession(session);
        if (jobId != null) {
            sessionManager.unregisterPipelineLogSession(jobId);
        }
        log.info("Pipeline logs WebSocket connection closed for job: {}, status: {}", jobId, status);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        UUID jobId = extractJobIdFromSession(session);
        if (jobId != null) {
            sessionManager.unregisterPipelineLogSession(jobId);
        }
        log.error("Pipeline logs WebSocket transport error for job: {}", jobId, exception);
    }

    private UUID extractJobIdFromSession(WebSocketSession session) {
        try {
            URI uri = session.getUri();
            if (uri == null) {
                return null;
            }
            
            String path = uri.getPath();
            if (path == null) {
                return null;
            }
            
            String[] parts = path.split("/");
            for (int i = 0; i < parts.length - 1; i++) {
                if ("pipeline-logs".equals(parts[i]) && i + 1 < parts.length) {
                    return UUID.fromString(parts[i + 1]);
                }
            }
        } catch (Exception e) {
            log.debug("Failed to extract jobId from WebSocket session: {}", e.getMessage());
        }
        return null;
    }
}
