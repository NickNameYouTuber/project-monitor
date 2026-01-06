package tech.nicorp.pm.calls.api;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import tech.nicorp.pm.calls.service.CallService;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/calls")
@Tag(name = "Calls", description = "Video conference management")
@RequiredArgsConstructor
public class CallController {

    private final CallService callService;
    private final UserRepository userRepository;

    @PostMapping("/token")
    @Operation(summary = "Generate LiveKit Token")
    public ResponseEntity<Map<String, String>> getToken(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody Map<String, String> body
    ) {
        String roomName = body.get("roomName");
        if (roomName == null || roomName.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("error", "roomName is required"));
        }

        User user = userRepository.findByUsername(userDetails.getUsername())
                .orElseThrow(() -> new RuntimeException("User not found"));

        String token = callService.createToken(user, roomName);

        return ResponseEntity.ok(Map.of("token", token));
    }

    @PostMapping("/create")
    @Operation(summary = "Create a new call room")
    public ResponseEntity<Map<String, String>> createRoom(
            @AuthenticationPrincipal UserDetails userDetails
    ) {
        // In LiveKit, rooms are created on demand, but we can generate a unique ID here
        String roomId = UUID.randomUUID().toString();
        // Return full URL or just ID? Frontend expects URL in the Python version?
        // Python version returned: {"room_url": "...", "creator": "..."}
        // Let's return just the ID for now, frontend knows the route.
        // Or match UI logic.
        return ResponseEntity.ok(Map.of("roomId", roomId));
    }

    @GetMapping("/{callId}/access")
    @Operation(summary = "Check access to call")
    public ResponseEntity<Map<String, Object>> checkAccess(@PathVariable String callId) {
        // Allow all for now
        return ResponseEntity.ok(Map.of("hasAccess", true, "role", "PARTICIPANT"));
    }
}
