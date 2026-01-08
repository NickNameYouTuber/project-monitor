package tech.nicorp.pm.ai.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;
import tech.nicorp.pm.ai.domain.Chat;
import tech.nicorp.pm.ai.domain.ChatMessage;
import tech.nicorp.pm.ai.repo.ChatMessageRepository;
import tech.nicorp.pm.ai.repo.ChatRepository;
import tech.nicorp.pm.organizations.domain.Organization;
import tech.nicorp.pm.organizations.repo.OrganizationRepository;
import tech.nicorp.pm.projects.domain.Project;
import tech.nicorp.pm.projects.domain.TaskColumn;
import tech.nicorp.pm.projects.repo.ProjectRepository;
import tech.nicorp.pm.projects.repo.TaskColumnRepository;
import tech.nicorp.pm.tasks.domain.Task;
import tech.nicorp.pm.tasks.repo.TaskRepository;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;
import tech.nicorp.pm.whiteboards.domain.Whiteboard;
import tech.nicorp.pm.whiteboards.domain.WhiteboardElement;
import tech.nicorp.pm.whiteboards.repo.WhiteboardRepository;
import tech.nicorp.pm.whiteboards.repo.WhiteboardElementRepository;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class ChatService {
    private final ChatRepository chatRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final GPTunnelService gptunnelService;
    private final AIActionExecutor actionExecutor;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;
    private final TaskColumnRepository taskColumnRepository;
    private final WhiteboardRepository whiteboardRepository;
    private final WhiteboardElementRepository whiteboardElementRepository;
    private final OrganizationRepository organizationRepository;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    @Autowired
    public ChatService(ChatRepository chatRepository,
                      ChatMessageRepository chatMessageRepository,
                      GPTunnelService gptunnelService,
                      AIActionExecutor actionExecutor,
                      ProjectRepository projectRepository,
                      TaskRepository taskRepository,
                      TaskColumnRepository taskColumnRepository,
                      WhiteboardRepository whiteboardRepository,
                      WhiteboardElementRepository whiteboardElementRepository,
                      OrganizationRepository organizationRepository,
                      UserRepository userRepository,
                      ObjectMapper objectMapper) {
        this.chatRepository = chatRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.gptunnelService = gptunnelService;
        this.actionExecutor = actionExecutor;
        this.projectRepository = projectRepository;
        this.taskRepository = taskRepository;
        this.taskColumnRepository = taskColumnRepository;
        this.whiteboardRepository = whiteboardRepository;
        this.whiteboardElementRepository = whiteboardElementRepository;
        this.organizationRepository = organizationRepository;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    @Transactional
    public ChatMessage sendMessage(UUID chatId, String userMessage, UUID userId, UUID organizationId, UUID projectId) {
        log.info("Sending message to chat {} from user {}", chatId, userId);
        
        Chat chat = chatRepository.findById(chatId).orElse(null);
        if (chat == null) {
            log.error("Chat not found: {}", chatId);
            throw new RuntimeException("Chat not found");
        }
        
        if (!chat.getUser().getId().equals(userId)) {
            log.error("Access denied: user {} trying to access chat {} owned by {}", userId, chatId, chat.getUser().getId());
            throw new RuntimeException("Access denied");
        }

        try {
            ChatMessage userMsg = new ChatMessage();
            userMsg.setChat(chat);
            userMsg.setRole("user");
            userMsg.setContent(userMessage);
            chatMessageRepository.save(userMsg);
            log.debug("User message saved: {}", userMsg.getId());

            String context = buildContext(userId, organizationId, projectId);
            List<Map<String, String>> messagesForAI = buildMessagesForAI(chat, context, userMessage);
            log.debug("Built {} messages for AI", messagesForAI.size());

            String aiResponseText = gptunnelService.chatCompletion(messagesForAI);
            log.debug("Received AI response, length: {}", aiResponseText != null ? aiResponseText.length() : 0);

            ChatMessage aiMessage = new ChatMessage();
            aiMessage.setChat(chat);
            aiMessage.setRole("assistant");
            
            String messageText = aiResponseText;
            List<Map<String, Object>> widgetsFromAI = new ArrayList<>();
            
            // Try to extract JSON from the response (AI might prefix it with text)
            String jsonToParse = aiResponseText;
            int jsonStart = aiResponseText.indexOf("{");
            int jsonEnd = aiResponseText.lastIndexOf("}");
            if (jsonStart != -1 && jsonEnd != -1 && jsonEnd > jsonStart) {
                jsonToParse = aiResponseText.substring(jsonStart, jsonEnd + 1);
            }
            
            try {
                Map<String, Object> responseMap = objectMapper.readValue(jsonToParse, new TypeReference<Map<String, Object>>() {});
                if (responseMap.containsKey("message") && responseMap.get("message") instanceof String) {
                    messageText = (String) responseMap.get("message");
                }
                // Parse widgets for clarification
                if (responseMap.containsKey("widgets") && responseMap.get("widgets") instanceof List) {
                    widgetsFromAI = (List<Map<String, Object>>) responseMap.get("widgets");
                    log.debug("Parsed {} widgets from AI response", widgetsFromAI.size());
                }
            } catch (Exception e) {
                log.warn("Failed to parse AI response as JSON, using raw text: {}", e.getMessage());
            }
            aiMessage.setContent(messageText);

            // Save widgets if present
            if (!widgetsFromAI.isEmpty()) {
                try {
                    String widgetsJsonStr = objectMapper.writeValueAsString(widgetsFromAI);
                    aiMessage.setWidgets(widgetsJsonStr);
                } catch (Exception e) {
                    log.error("Error serializing widgets to JSON: {}", e.getMessage(), e);
                }
            }

            List<AIAction> actions = actionExecutor.parseActions(aiResponseText);
            log.debug("Parsed {} actions from AI response", actions.size());
            
            List<AIAction> executedActions = new ArrayList<>();
            List<Map<String, Object>> actionsJson = new ArrayList<>();

            for (AIAction action : actions) {
                try {
                    AIAction executed = actionExecutor.executeAction(action, userId, organizationId, projectId);
                    executedActions.add(executed);
                    
                    Map<String, Object> actionJson = new HashMap<>();
                    actionJson.put("type", executed.getType());
                    actionJson.put("params", executed.getParams());
                    actionJson.put("result", executed.getResult());
                    if (executed.getNotification() != null) {
                        Map<String, String> notification = new HashMap<>();
                        notification.put("message", executed.getNotification().getMessage());
                        notification.put("link", executed.getNotification().getLink());
                        notification.put("linkText", executed.getNotification().getLinkText());
                        actionJson.put("notification", notification);
                    }
                    actionsJson.add(actionJson);
                } catch (Exception e) {
                    log.error("Error executing action {}: {}", action.getType(), e.getMessage(), e);
                }
            }

            try {
                String actionsJsonStr = objectMapper.writeValueAsString(actionsJson);
                aiMessage.setActions(actionsJsonStr);
            } catch (Exception e) {
                log.error("Error serializing actions to JSON: {}", e.getMessage(), e);
            }

            chatMessageRepository.save(aiMessage);
            log.debug("AI message saved: {}", aiMessage.getId());

            // Generate chat title after first user message
            List<ChatMessage> allMessages = chatMessageRepository.findByChat_IdOrderByCreatedAtAsc(chatId);
            long userMessageCount = allMessages.stream().filter(m -> "user".equals(m.getRole())).count();
            if (userMessageCount == 1 && (chat.getTitle() == null || chat.getTitle().equals("New Chat") || chat.getTitle().equals("Новый чат"))) {
                try {
                    String generatedTitle = generateChatTitle(userMessage);
                    if (generatedTitle != null && !generatedTitle.isEmpty()) {
                        chat.setTitle(generatedTitle);
                        log.debug("Generated chat title: {}", generatedTitle);
                    }
                } catch (Exception e) {
                    log.warn("Failed to generate chat title: {}", e.getMessage());
                }
            }

            chat.setUpdatedAt(OffsetDateTime.now());
            chatRepository.save(chat);

            return aiMessage;
        } catch (Exception e) {
            log.error("Error in sendMessage for chat {}: {}", chatId, e.getMessage(), e);
            throw e;
        }
    }

    private String generateChatTitle(String userMessage) {
        List<Map<String, String>> messages = new ArrayList<>();
        
        Map<String, String> systemMsg = new HashMap<>();
        systemMsg.put("role", "system");
        systemMsg.put("content", "You are a helpful assistant. Generate a very short title (2-5 words, max 30 characters) for a chat based on the user's first message. Respond ONLY with the title, nothing else. Use the same language as the user's message.");
        messages.add(systemMsg);
        
        Map<String, String> userMsg = new HashMap<>();
        userMsg.put("role", "user");
        userMsg.put("content", "Generate a short title for this chat. User's first message: \"" + userMessage + "\"");
        messages.add(userMsg);
        
        String response = gptunnelService.chatCompletion(messages);
        if (response != null) {
            // Clean up the response - remove quotes, trim
            response = response.trim().replaceAll("^\"|\"$", "").replaceAll("^'|'$", "");
            // Limit length
            if (response.length() > 40) {
                response = response.substring(0, 37) + "...";
            }
        }
        return response;
    }

    private String buildContext(UUID userId, UUID organizationId, UUID projectId) {
        StringBuilder context = new StringBuilder();

        context.append("You are an AI assistant helping with project management.\n\n");

        User user = userRepository.findById(userId).orElse(null);
        String userName = user != null ? (user.getDisplayName() != null ? user.getDisplayName() : user.getUsername()) : "Unknown";
        context.append("Current User: ").append(userName).append(" (ID: ").append(userId).append(")\n");

        if (organizationId != null) {
            Organization org = organizationRepository.findById(organizationId).orElse(null);
            if (org != null) {
                context.append("Current Organization: ").append(org.getName());
                if (org.getSlug() != null) {
                    context.append(" (slug: /").append(org.getSlug()).append(")");
                }
                context.append(" (ID: ").append(organizationId).append(")\n\n");

                context.append("Available Project Statuses (columns):\n");
                context.append("- backlog (default)\n");
                context.append("- in-progress\n");
                context.append("- review\n");
                context.append("- completed\n");
                context.append("When creating a project, use status parameter to specify which column it should be placed in.\n\n");

                List<Project> projects = projectRepository.findByOrganization_Id(organizationId);
                if (!projects.isEmpty()) {
                    context.append("Available Projects in this organization:\n");
                    for (Project p : projects) {
                        context.append("- ").append(p.getName());
                        if (p.getDescription() != null && !p.getDescription().isEmpty()) {
                            context.append(" (").append(p.getDescription()).append(")");
                        }
                        context.append(" (ID: ").append(p.getId()).append(", status: ").append(p.getStatus()).append(")\n");
                    }
                    context.append("\n");
                } else {
                    context.append("No projects in this organization yet.\n\n");
                }

                context.append("IMPORTANT: ALL projects must be created in organization ID: ").append(organizationId).append("\n\n");
            }
        } else {
            context.append("WARNING: No organization ID provided. You cannot create projects without an organization.\n\n");
        }

        if (projectId != null) {
            Project project = projectRepository.findById(projectId).orElse(null);
            if (project != null) {
                context.append("Current Project: ").append(project.getName());
                if (project.getDescription() != null && !project.getDescription().isEmpty()) {
                    context.append(" (").append(project.getDescription()).append(")");
                }
                context.append(" (ID: ").append(projectId).append(")\n\n");

                List<TaskColumn> columns = taskColumnRepository.findByProject_IdOrderByOrderIndexAsc(projectId);
                if (!columns.isEmpty()) {
                    context.append("Task Columns in current project:\n");
                    for (TaskColumn col : columns) {
                        context.append("- ").append(col.getName()).append(" (ID: ").append(col.getId()).append(")\n");
                    }
                    context.append("\n");
                } else {
                    context.append("No task columns in this project yet.\n\n");
                }

                List<Task> tasks = taskRepository.findByProject_IdOrderByOrderIndexAsc(projectId);
                if (!tasks.isEmpty()) {
                    context.append("Tasks in current project:\n");
                    for (Task task : tasks) {
                        String columnName = task.getColumn() != null ? task.getColumn().getName() : "Unknown Column";
                        context.append("- ").append(task.getTitle());
                        if (task.getDescription() != null && !task.getDescription().isEmpty()) {
                            context.append(" (").append(task.getDescription()).append(")");
                        }
                        context.append(" in column '").append(columnName).append("'\n");
                    }
                    context.append("\n");
                } else {
                    context.append("No tasks in this project yet.\n\n");
                }

                Whiteboard whiteboard = whiteboardRepository.findByProject_Id(projectId).orElse(null);
                if (whiteboard != null) {
                    List<WhiteboardElement> sections = whiteboardElementRepository.findAll().stream()
                        .filter(e -> e.getBoard() != null && e.getBoard().getId().equals(whiteboard.getId()) && "section".equals(e.getType()))
                        .collect(Collectors.toList());
                    if (!sections.isEmpty()) {
                        context.append("Whiteboard sections:\n");
                        for (WhiteboardElement section : sections) {
                            context.append("- ").append(section.getText() != null ? section.getText() : "Untitled Section").append("\n");
                        }
                        context.append("\n");
                    }
                }
            }
        }

        return context.toString();
    }

    private List<Map<String, String>> buildMessagesForAI(Chat chat, String context, String userMessage) {
        List<Map<String, String>> messages = new ArrayList<>();

        Map<String, String> systemMsg = new HashMap<>();
        systemMsg.put("role", "system");
        systemMsg.put("content", context + "\n\nYou can perform the following actions:\n\n" +
            "1. CREATE_TASK: Create a new task in the current project.\n" +
            "   Params: {\n" +
            "     title: string (required) - Task title\n" +
            "     description?: string - Task description\n" +
            "     column_name?: string - Column name (e.g., \"TEST\", \"Backlog\") OR\n" +
            "     column_id?: string - Column UUID (use if you know the exact ID)\n" +
            "   }\n" +
            "   Example: {\"type\": \"CREATE_TASK\", \"params\": {\"title\": \"Test task\", \"column_name\": \"TEST\"}}\n" +
            "   Note: Use column_name when user specifies column by name. If neither column_name nor column_id is provided, the first column will be used.\n\n" +
            "2. CREATE_PROJECT: Create a new project in the current organization.\n" +
            "   Params: {\n" +
            "     name: string (required) - Project name\n" +
            "     description?: string - Project description\n" +
            "     status?: string - Project status/column (e.g., \"backlog\", \"in-progress\", \"review\", \"completed\"). Default: \"backlog\"\n" +
            "   }\n" +
            "   Example: {\"type\": \"CREATE_PROJECT\", \"params\": {\"name\": \"Test Project\", \"status\": \"backlog\"}}\n\n" +
            "3. CREATE_COLUMN: Create a new task column (status) in the current project.\n" +
            "   Params: {\n" +
            "     name: string (required) - Column name (e.g., \"Backlog\", \"In Progress\", \"Done\")\n" +
            "   }\n" +
            "   Example: {\"type\": \"CREATE_COLUMN\", \"params\": {\"name\": \"Backlog\"}}\n\n" +
            "4. CREATE_WHITEBOARD_SECTION: Create a section on the whiteboard.\n" +
            "   Params: {\n" +
            "     label: string (required) - Section label\n" +
            "     x?: number - X position (default: 100)\n" +
            "     y?: number - Y position (default: 100)\n" +
            "     width?: number - Width (default: 300)\n" +
            "     height?: number - Height (default: 200)\n" +
            "   }\n\n" +
            "5. LINK_TASK_TO_SECTION: Link a task to a whiteboard section.\n" +
            "   Params: {\n" +
            "     task_id: string (required) - Task UUID\n" +
            "     element_id: string (required) - Section element UUID\n" +
            "   }\n\n" +
            "WIDGETS FOR CLARIFICATION:\n" +
            "When you need more information from the user to complete an action, use widgets instead of plain text questions.\n\n" +
            "Widget format:\n" +
            "{\n" +
            "  \"message\": \"Brief explanation of what you need\",\n" +
            "  \"widgets\": [\n" +
            "    {\n" +
            "      \"type\": \"clarification\",\n" +
            "      \"data\": {\n" +
            "        \"question\": \"The question to ask\",\n" +
            "        \"field\": \"name_of_field\",\n" +
            "        \"allowCustomInput\": true/false,\n" +
            "        \"customInputPlaceholder\": \"Placeholder for custom input (if allowCustomInput=true)\",\n" +
            "        \"options\": [\n" +
            "          {\"value\": \"option1\", \"label\": \"Display Label 1\", \"description\": \"Optional description\"},\n" +
            "          {\"value\": \"option2\", \"label\": \"Display Label 2\"}\n" +
            "        ]\n" +
            "      }\n" +
            "    }\n" +
            "  ]\n" +
            "}\n\n" +
            "EXAMPLES OF USING WIDGETS:\n\n" +
            "Example 1: User says \"Create a project\" without specifying name:\n" +
            "{\n" +
            "  \"message\": \"Отлично! Давайте создадим проект. Как вы хотите его назвать?\",\n" +
            "  \"widgets\": [\n" +
            "    {\n" +
            "      \"type\": \"clarification\",\n" +
            "      \"data\": {\n" +
            "        \"question\": \"Введите название проекта\",\n" +
            "        \"field\": \"project_name\",\n" +
            "        \"allowCustomInput\": true,\n" +
            "        \"customInputPlaceholder\": \"Название проекта...\",\n" +
            "        \"options\": []\n" +
            "      }\n" +
            "    }\n" +
            "  ]\n" +
            "}\n\n" +
            "Example 2: User says \"Create a task\" without specifying column:\n" +
            "{\n" +
            "  \"message\": \"Создаю задачу. В какую колонку её добавить?\",\n" +
            "  \"widgets\": [\n" +
            "    {\n" +
            "      \"type\": \"clarification\",\n" +
            "      \"data\": {\n" +
            "        \"question\": \"Выберите колонку для задачи\",\n" +
            "        \"field\": \"column\",\n" +
            "        \"allowCustomInput\": false,\n" +
            "        \"options\": [\n" +
            "          {\"value\": \"backlog\", \"label\": \"Backlog\", \"description\": \"Задачи в очереди\"},\n" +
            "          {\"value\": \"in-progress\", \"label\": \"In Progress\", \"description\": \"В работе\"},\n" +
            "          {\"value\": \"done\", \"label\": \"Done\", \"description\": \"Завершённые\"}\n" +
            "        ]\n" +
            "      }\n" +
            "    }\n" +
            "  ]\n" +
            "}\n\n" +
            "Example 3: User says \"Create project My App\" - all info provided, execute action:\n" +
            "{\n" +
            "  \"message\": \"Создаю проект 'My App'...\",\n" +
            "  \"actions\": [{\"type\": \"CREATE_PROJECT\", \"params\": {\"name\": \"My App\", \"status\": \"backlog\"}}]\n" +
            "}\n\n" +
            "CRITICAL RULES (MUST FOLLOW):\n" +
            "1. ALWAYS respond in valid JSON format - no text before or after the JSON\n" +
            "2. When user provides ALL required info - use \"actions\" array to execute\n" +
            "3. When you need ANY info from user - ALWAYS use \"widgets\" array with clarification type\n" +
            "4. NEVER list options as plain text! ALWAYS use widgets with options array!\n" +
            "5. NEVER ask questions in plain text! ALWAYS use widgets!\n" +
            "6. For name/title inputs: use allowCustomInput=true with empty options array\n" +
            "7. For status/column selection: use allowCustomInput=false with predefined options\n" +
            "8. Respond in the same language as the user\n" +
            "9. Available project statuses: backlog, in-progress, review, completed\n" +
            "10. If user gives you a value (like project name 'Проект2'), use it and ask for the next required field using widgets\n\n" +
            "WRONG (never do this):\n" +
            "{\"message\": \"Choose status:\\n- Backlog\\n- In Progress\"}\n\n" +
            "CORRECT:\n" +
            "{\"message\": \"Выберите статус\", \"widgets\": [{\"type\": \"clarification\", \"data\": {\"question\": \"Статус проекта\", \"field\": \"status\", \"allowCustomInput\": false, \"options\": [{\"value\": \"backlog\", \"label\": \"Backlog\"}]}}]}\n");
        messages.add(systemMsg);

        List<ChatMessage> chatMessages = chatMessageRepository.findByChat_IdOrderByCreatedAtAsc(chat.getId());
        for (ChatMessage msg : chatMessages) {
            Map<String, String> msgMap = new HashMap<>();
            msgMap.put("role", msg.getRole());
            msgMap.put("content", msg.getContent());
            messages.add(msgMap);
        }

        Map<String, String> newUserMsg = new HashMap<>();
        newUserMsg.put("role", "user");
        newUserMsg.put("content", userMessage);
        messages.add(newUserMsg);

        return messages;
    }
}
