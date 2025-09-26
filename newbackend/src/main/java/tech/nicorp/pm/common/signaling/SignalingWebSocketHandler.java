package tech.nicorp.pm.common.signaling;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class SignalingWebSocketHandler extends TextWebSocketHandler {
    private final ObjectMapper objectMapper = new ObjectMapper();

    private static class Room {
        final Map<String, WebSocketSession> peers = new ConcurrentHashMap<>();
    }

    private final Map<String, Room> rooms = new ConcurrentHashMap<>();
    private final Map<String, String> sessionToRoom = new ConcurrentHashMap<>();
    private final Map<String, String> sessionToPeer = new ConcurrentHashMap<>();

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) throws Exception {
        leave(session);
    }

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) throws IOException {
        JsonNode node = objectMapper.readTree(message.getPayload());
        String type = node.path("type").asText("");
        switch (type) {
            case "join" -> handleJoin(session, node);
            case "leave" -> leave(session);
            case "offer", "answer", "candidate" -> relay(session, node);
            default -> {}
        }
    }

    private void handleJoin(WebSocketSession session, JsonNode node) throws IOException {
        String roomId = node.path("roomId").asText("global-room");
        String peerId = node.path("peerId").asText(session.getId());

        Room room = rooms.computeIfAbsent(roomId, k -> new Room());
        room.peers.put(peerId, session);
        sessionToRoom.put(session.getId(), roomId);
        sessionToPeer.put(session.getId(), peerId);

        // notify existing peers about new peer
        broadcast(roomId, objectMapper.createObjectNode()
                .put("type", "peer-joined")
                .put("peerId", peerId), Set.of(peerId));

        // send back current peers list
        var listMsg = objectMapper.createObjectNode();
        listMsg.put("type", "peers");
        var arr = listMsg.putArray("peers");
        for (String id : room.peers.keySet()) {
            if (!id.equals(peerId)) arr.add(id);
        }
        session.sendMessage(new TextMessage(listMsg.toString()));
    }

    private void leave(WebSocketSession session) throws IOException {
        String roomId = sessionToRoom.remove(session.getId());
        String peerId = sessionToPeer.remove(session.getId());
        if (roomId == null || peerId == null) return;
        Room room = rooms.get(roomId);
        if (room != null) {
            room.peers.remove(peerId);
            broadcast(roomId, objectMapper.createObjectNode()
                    .put("type", "peer-left")
                    .put("peerId", peerId), Set.of());
            if (room.peers.isEmpty()) rooms.remove(roomId);
        }
    }

    private void relay(WebSocketSession session, JsonNode node) throws IOException {
        String to = node.path("to").asText();
        String roomId = sessionToRoom.get(session.getId());
        String from = sessionToPeer.get(session.getId());
        if (roomId == null || from == null) return;
        Room room = rooms.get(roomId);
        if (room == null) return;
        WebSocketSession target = room.peers.get(to);
        if (target == null) return;
        var msg = objectMapper.createObjectNode();
        msg.put("type", node.path("type").asText());
        msg.put("from", from);
        msg.set("data", node.path("data"));
        target.sendMessage(new TextMessage(msg.toString()));
    }

    private void broadcast(String roomId, JsonNode msg, Set<String> excludePeerIds) throws IOException {
        Room room = rooms.get(roomId);
        if (room == null) return;
        TextMessage tm = new TextMessage(msg.toString());
        for (Map.Entry<String, WebSocketSession> e : room.peers.entrySet()) {
            if (excludePeerIds.contains(e.getKey())) continue;
            if (e.getValue().isOpen()) e.getValue().sendMessage(tm);
        }
    }
}


