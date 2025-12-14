package tech.nicorp.pm.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.net.URI;
import java.security.Key;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Component
public class CallNotificationWebSocketHandler extends TextWebSocketHandler {
    private final WebSocketSessionManager sessionManager;
    private final ObjectMapper objectMapper;
    private final Key jwtKey;

    public CallNotificationWebSocketHandler(
            WebSocketSessionManager sessionManager,
            ObjectMapper objectMapper,
            @Value("${security.jwt.secret}") String jwtSecret) {
        this.sessionManager = sessionManager;
        this.objectMapper = objectMapper;
        this.jwtKey = Keys.hmacShaKeyFor(
            io.jsonwebtoken.io.Decoders.BASE64.decode(
                java.util.Base64.getEncoder().encodeToString(jwtSecret.getBytes())
            )
        );
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        log.info("Call notification WebSocket connection attempt, URI: {}", session.getUri());
        UUID userId = extractUserIdFromSession(session);
        if (userId == null) {
            log.warn("Call notification WebSocket connection rejected: invalid or missing token, URI: {}", session.getUri());
            session.close(CloseStatus.BAD_DATA.withReason("Invalid or missing authentication token"));
            return;
        }

        sessionManager.registerCallNotificationSession(userId, session);

        Map<String, Object> connectedMessage = new HashMap<>();
        connectedMessage.put("type", "connected");
        connectedMessage.put("data", Map.of("message", "Connected to call notifications"));
        
        try {
            String json = objectMapper.writeValueAsString(connectedMessage);
            session.sendMessage(new TextMessage(json));
        } catch (IOException e) {
            log.error("Error sending connected message", e);
        }

        log.info("Call notification WebSocket connection established for user: {}", userId);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        UUID userId = extractUserIdFromSession(session);
        if (userId != null) {
            sessionManager.unregisterCallNotificationSession(userId);
        }
        log.info("Call notification WebSocket connection closed for user: {}, status: {}", userId, status);
    }

    @Override
    public void handleTransportError(WebSocketSession session, Throwable exception) throws Exception {
        UUID userId = extractUserIdFromSession(session);
        if (userId != null) {
            sessionManager.unregisterCallNotificationSession(userId);
        }
        log.error("Call notification WebSocket transport error for user: {}", userId, exception);
    }

    private UUID extractUserIdFromSession(WebSocketSession session) {
        try {
            URI uri = session.getUri();
            if (uri == null) {
                log.warn("WebSocket session URI is null");
                return null;
            }
            
            String query = uri.getQuery();
            if (query == null) {
                log.warn("WebSocket session URI has no query string, URI: {}", uri);
                return null;
            }
            
            log.debug("WebSocket query string: {}", query);
            
            String token = null;
            String[] params = query.split("&");
            for (String param : params) {
                if (param.startsWith("token=")) {
                    token = param.substring(6);
                    try {
                        token = java.net.URLDecoder.decode(token, "UTF-8");
                    } catch (Exception e) {
                        log.debug("Token is not URL-encoded or decode failed: {}", e.getMessage());
                    }
                    break;
                }
            }
            
            if (token == null || token.isEmpty()) {
                log.warn("Token not found in query string: {}", query);
                return null;
            }
            
            log.debug("Extracted token, length: {}", token.length());
            
            Claims claims = Jwts.parserBuilder()
                .setSigningKey(jwtKey)
                .build()
                .parseClaimsJws(token)
                .getBody();
            
            String subject = claims.getSubject();
            UUID userId = UUID.fromString(subject);
            log.debug("Extracted userId from token: {}", userId);
            return userId;
        } catch (Exception e) {
            log.error("Failed to extract userId from WebSocket session: {}", e.getMessage(), e);
            return null;
        }
    }
}
