package tech.nicorp.pm.calls.service;

import io.livekit.server.AccessToken;
import io.livekit.server.RoomJoin;
import io.livekit.server.RoomName;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tech.nicorp.pm.calls.domain.Call;
import tech.nicorp.pm.calls.repo.CallRepository;
import tech.nicorp.pm.projects.domain.Project;
import tech.nicorp.pm.projects.repo.ProjectRepository;
import tech.nicorp.pm.tasks.domain.Task;
import tech.nicorp.pm.tasks.repo.TaskRepository;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class CallService {

    private final CallRepository callRepository;
    private final UserRepository userRepository;
    private final ProjectRepository projectRepository;
    private final TaskRepository taskRepository;

    @Value("${livekit.api.key}")
    private String apiKey;

    @Value("${livekit.api.secret}")
    private String apiSecret;

    public String createToken(User user, String roomName) {
        AccessToken token = new AccessToken(apiKey, apiSecret);
        token.setName(user.getDisplayName());
        token.setIdentity(user.getUsername());
        
        token.addGrants(new RoomJoin(true), new RoomName(roomName));
        
        return token.toJwt();
    }

    public List<Call> getCallsForUser(UUID userId) {
        return callRepository.findByParticipantUserId(userId);
    }

    public Optional<Call> get(UUID id) {
        return callRepository.findById(id);
    }

    public Optional<Call> getByRoomId(String roomId) {
        return callRepository.findByRoomId(roomId);
    }

    public List<Call> getByRange(OffsetDateTime start, OffsetDateTime end) {
        return callRepository.findByScheduledTimeBetween(start, end);
    }

    public List<Call> getByRecurrenceGroupId(UUID groupId) {
        return callRepository.findByRecurrenceGroupId(groupId);
    }

    public User resolveUser(UUID userId) {
        if (userId == null) return null;
        return userRepository.findById(userId).orElse(null);
    }

    public Project resolveProject(UUID projectId) {
        if (projectId == null) return null;
        return projectRepository.findById(projectId).orElse(null);
    }

    public Task resolveTask(UUID taskId) {
        if (taskId == null) return null;
        return taskRepository.findById(taskId).orElse(null);
    }

    @Transactional
    public Call save(Call call) {
        return callRepository.save(call);
    }

    @Transactional
    public void delete(UUID id) {
        callRepository.deleteById(id);
    }
}
