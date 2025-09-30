package tech.nicorp.pm.calls.service;

import org.springframework.stereotype.Service;
import tech.nicorp.pm.calls.domain.Call;
import tech.nicorp.pm.calls.repo.CallRepository;
import tech.nicorp.pm.projects.domain.Project;
import tech.nicorp.pm.projects.repo.ProjectRepository;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class CallService {
    private final CallRepository calls;
    private final ProjectRepository projects;
    private final UserRepository users;

    public CallService(CallRepository calls, ProjectRepository projects, UserRepository users) {
        this.calls = calls;
        this.projects = projects;
        this.users = users;
    }

    public List<Call> list() { return calls.findAll(); }
    public Optional<Call> get(UUID id) { return calls.findById(id); }
    public Optional<Call> getByRoomId(String roomId) { return calls.findByRoomId(roomId); }
    public Call save(Call c) { return calls.save(c); }
    public void delete(UUID id) { calls.deleteById(id); }

    public Project resolveProject(UUID id) { return id == null ? null : projects.findById(id).orElse(null); }
    public User resolveUser(UUID id) { return id == null ? null : users.findById(id).orElse(null); }
}


