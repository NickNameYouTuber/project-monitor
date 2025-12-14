package tech.nicorp.pm.whiteboards.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.ai.service.GPTunnelService;

import java.util.*;

@RestController
@RequestMapping("/api/whiteboards/ai")
@Tag(name = "Whiteboard AI", description = "ИИ функции для whiteboard")
public class WhiteboardAIController {
    
    private final GPTunnelService gptunnelService;
    
    @Autowired
    public WhiteboardAIController(GPTunnelService gptunnelService) {
        this.gptunnelService = gptunnelService;
    }
    
    @PostMapping("/brainstorm")
    @Operation(summary = "Генерация идей для мозгового штурма")
    public ResponseEntity<Map<String, Object>> generateBrainstorm(@RequestBody Map<String, String> request) {
        try {
            String topic = request.get("topic");
            if (topic == null || topic.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Topic is required"));
            }
            
            String prompt = String.format(
                "Brainstorm 5 to 8 short, creative, and distinct ideas or concepts related to: \"%s\". " +
                "Also provide a short, logical title for this group of ideas (e.g., \"Marketing Ideas\", \"Project Risks\"). " +
                "Keep ideas concise (under 10 words each). " +
                "Return ONLY valid JSON in this format: {\"title\": \"...\", \"ideas\": [\"...\", \"...\"]}",
                topic
            );
            
            List<Map<String, String>> messages = new ArrayList<>();
            Map<String, String> systemMsg = new HashMap<>();
            systemMsg.put("role", "system");
            systemMsg.put("content", "You are a creative brainstorming assistant. Always respond with valid JSON only, no additional text.");
            messages.add(systemMsg);
            
            Map<String, String> userMsg = new HashMap<>();
            userMsg.put("role", "user");
            userMsg.put("content", prompt);
            messages.add(userMsg);
            
            String response = gptunnelService.chatCompletion(messages);
            
            try {
                Map<String, Object> result = parseJsonResponse(response);
                return ResponseEntity.ok(result);
            } catch (Exception e) {
                Map<String, Object> fallback = new HashMap<>();
                fallback.put("title", "Brainstorm Ideas");
                fallback.put("ideas", Arrays.asList(response.split("\n")).stream()
                    .filter(s -> !s.trim().isEmpty())
                    .limit(8)
                    .toList());
                return ResponseEntity.ok(fallback);
            }
        } catch (Exception e) {
            System.err.println("Error generating brainstorm: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to generate brainstorm ideas"));
        }
    }
    
    @PostMapping("/diagram")
    @Operation(summary = "Генерация диаграммы")
    public ResponseEntity<Map<String, Object>> generateDiagram(@RequestBody Map<String, String> request) {
        try {
            String topic = request.get("topic");
            if (topic == null || topic.isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "Topic is required"));
            }
            
            String prompt = String.format(
                "Create a detailed flowchart diagram about \"%s\".\n\n" +
                "RULES:\n" +
                "1. Provide a \"title\" for this diagram section (e.g., \"Login Process Flow\").\n" +
                "2. USE ONLY TWO SHAPE TYPES: \"STICKY\" and \"ARROW\".\n" +
                "3. NODES (STICKY):\n" +
                "   - Must have a unique \"id\" (e.g., \"n1\", \"n2\").\n" +
                "   - MUST have a \"text\" field with descriptive content.\n" +
                "   - Provide \"x\" and \"y\" coordinates.\n" +
                "   - Layout: Top-to-Bottom or Left-to-Right flow.\n" +
                "   - Spacing: Keep items at least 250 units apart.\n" +
                "4. EDGES (ARROW):\n" +
                "   - Must have \"type\": \"ARROW\".\n" +
                "   - Must have \"connectFrom\" (id of start node) and \"connectTo\" (id of end node).\n" +
                "   - Do NOT provide x/y for arrows.\n\n" +
                "Return ONLY valid JSON in this format: {\"title\": \"...\", \"elements\": [{\"type\": \"STICKY\", \"id\": \"...\", \"text\": \"...\", \"x\": 0, \"y\": 0}, ...]}",
                topic
            );
            
            List<Map<String, String>> messages = new ArrayList<>();
            Map<String, String> systemMsg = new HashMap<>();
            systemMsg.put("role", "system");
            systemMsg.put("content", "You are a diagram generation assistant. Always respond with valid JSON only, no additional text. Use the exact format specified.");
            messages.add(systemMsg);
            
            Map<String, String> userMsg = new HashMap<>();
            userMsg.put("role", "user");
            userMsg.put("content", prompt);
            messages.add(userMsg);
            
            String response = gptunnelService.chatCompletion(messages);
            
            try {
                Map<String, Object> result = parseJsonResponse(response);
                return ResponseEntity.ok(result);
            } catch (Exception e) {
                return ResponseEntity.status(500).body(Map.of("error", "Failed to parse diagram response: " + e.getMessage()));
            }
        } catch (Exception e) {
            System.err.println("Error generating diagram: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", "Failed to generate diagram"));
        }
    }
    
    private Map<String, Object> parseJsonResponse(String response) throws Exception {
        response = response.trim();
        if (response.startsWith("```json")) {
            response = response.substring(7);
        }
        if (response.startsWith("```")) {
            response = response.substring(3);
        }
        if (response.endsWith("```")) {
            response = response.substring(0, response.length() - 3);
        }
        response = response.trim();
        
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
        return mapper.readValue(response, new com.fasterxml.jackson.core.type.TypeReference<Map<String, Object>>() {});
    }
}
