package tech.nicorp.pm.ai.api;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.ai.api.dto.*;
import tech.nicorp.pm.ai.domain.Chat;
import tech.nicorp.pm.ai.domain.ChatMessage;
import tech.nicorp.pm.ai.repo.ChatMessageRepository;
import tech.nicorp.pm.ai.repo.ChatRepository;
import tech.nicorp.pm.ai.service.ChatService;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.net.URI;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/chats")
@Tag(name = "Chats", description = "ИИ чат ассистент")
public class ChatController {
    private final ChatRepository chatRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ChatService chatService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Autowired
    public ChatController(ChatRepository chatRepository,
                         ChatMessageRepository chatMessageRepository,
                         ChatService chatService,
                         UserRepository userRepository,
                         ObjectMapper objectMapper) {
        this.chatRepository = chatRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.chatService = chatService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @GetMapping
    @Operation(summary = "Получить список чатов пользователя")
    public ResponseEntity<List<ChatResponse>> listChats(Authentication auth,
                                                       @RequestParam(required = false) UUID organizationId,
                                                       @RequestParam(required = false) UUID projectId) {
        UUID userId = getUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        List<Chat> chats;
        if (projectId != null) {
            chats = chatRepository.findByUser_IdAndProjectIdOrderByUpdatedAtDesc(userId, projectId);
        } else if (organizationId != null) {
            chats = chatRepository.findByUser_IdAndOrganizationIdOrderByUpdatedAtDesc(userId, organizationId);
        } else {
            chats = chatRepository.findByUser_IdOrderByUpdatedAtDesc(userId);
        }

        return ResponseEntity.ok(chats.stream().map(this::toResponse).collect(Collectors.toList()));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Получить чат с сообщениями")
    public ResponseEntity<ChatResponse> getChat(@PathVariable("id") UUID id, Authentication auth) {
        UUID userId = getUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        Chat chat = chatRepository.findById(id).orElse(null);
        if (chat == null || !chat.getUser().getId().equals(userId)) {
            return ResponseEntity.notFound().build();
        }

        return ResponseEntity.ok(toResponseWithMessages(chat));
    }

    @PostMapping
    @Operation(summary = "Создать новый чат")
    public ResponseEntity<ChatResponse> createChat(@RequestBody ChatCreateRequest request, Authentication auth) {
        UUID userId = getUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return ResponseEntity.status(401).build();
        }

        Chat chat = new Chat();
        chat.setUser(user);
        chat.setTitle(request.getTitle() != null ? request.getTitle() : "New Chat");
        chat.setOrganizationId(request.getOrganizationId());
        chat.setProjectId(request.getProjectId());

        Chat saved = chatRepository.save(chat);
        return ResponseEntity.created(URI.create("/api/chats/" + saved.getId())).body(toResponse(saved));
    }

    @PostMapping("/{id}/messages")
    @Operation(summary = "Отправить сообщение в чат")
    @Transactional
    public ResponseEntity<SendMessageResponse> sendMessage(@PathVariable("id") UUID id,
                                                          @RequestBody SendMessageRequest request,
                                                          Authentication auth) {
        UUID userId = getUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        Chat chat = chatRepository.findById(id).orElse(null);
        if (chat == null) {
            return ResponseEntity.notFound().build();
        }
        
        try {
            if (!chat.getUser().getId().equals(userId)) {
                return ResponseEntity.status(403).build();
            }
        } catch (Exception e) {
            System.err.println("Error accessing chat user: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }

        try {
            UUID orgId = chat.getOrganizationId() != null ? chat.getOrganizationId() : null;
            UUID projId = chat.getProjectId() != null ? chat.getProjectId() : null;
            ChatMessage aiMessage = chatService.sendMessage(id, request.getMessage(), userId, orgId, projId);

            SendMessageResponse response = new SendMessageResponse();
            response.setMessage(toMessageResponse(aiMessage));

            List<Map<String, Object>> actions = new ArrayList<>();
            if (aiMessage.getActions() != null && !aiMessage.getActions().isEmpty()) {
                try {
                    actions = objectMapper.readValue(aiMessage.getActions(), new TypeReference<List<Map<String, Object>>>() {});
                } catch (Exception e) {
                    System.err.println("Error parsing actions JSON: " + e.getMessage());
                }
            }
            response.setActions(actions);

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            System.err.println("Error sending message to chat " + id + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        } catch (Exception e) {
            System.err.println("Unexpected error sending message to chat " + id + ": " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(null);
        }
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Удалить чат")
    public ResponseEntity<Void> deleteChat(@PathVariable("id") UUID id, Authentication auth) {
        UUID userId = getUserId(auth);
        if (userId == null) {
            return ResponseEntity.status(401).build();
        }

        Chat chat = chatRepository.findById(id).orElse(null);
        if (chat == null || !chat.getUser().getId().equals(userId)) {
            return ResponseEntity.notFound().build();
        }

        chatRepository.delete(chat);
        return ResponseEntity.noContent().build();
    }

    private ChatResponse toResponse(Chat chat) {
        ChatResponse response = new ChatResponse();
        response.setId(chat.getId());
        response.setTitle(chat.getTitle());
        response.setOrganizationId(chat.getOrganizationId());
        response.setProjectId(chat.getProjectId());
        response.setCreatedAt(chat.getCreatedAt());
        response.setUpdatedAt(chat.getUpdatedAt());
        return response;
    }

    private ChatResponse toResponseWithMessages(Chat chat) {
        ChatResponse response = toResponse(chat);
        List<ChatMessage> messages = chatMessageRepository.findByChat_IdOrderByCreatedAtAsc(chat.getId());
        response.setMessages(messages.stream().map(this::toMessageResponse).collect(Collectors.toList()));
        return response;
    }

    private ChatMessageResponse toMessageResponse(ChatMessage message) {
        ChatMessageResponse response = new ChatMessageResponse();
        response.setId(message.getId());
        response.setRole(message.getRole());
        response.setContent(message.getContent());
        response.setCreatedAt(message.getCreatedAt());

        List<Map<String, Object>> actions = new ArrayList<>();
        if (message.getActions() != null && !message.getActions().isEmpty()) {
            try {
                actions = objectMapper.readValue(message.getActions(), new TypeReference<List<Map<String, Object>>>() {});
            } catch (Exception e) {
            }
        }
        response.setActions(actions);

        return response;
    }

    private UUID getUserId(Authentication auth) {
        if (auth == null || auth.getName() == null) {
            return null;
        }
        try {
            return UUID.fromString(auth.getName());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
