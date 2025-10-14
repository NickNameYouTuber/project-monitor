package tech.nicorp.pm.repositories.api;

import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import tech.nicorp.pm.repositories.api.dto.RepositoryMemberCreateRequest;
import tech.nicorp.pm.repositories.api.dto.RepositoryMemberResponse;
import tech.nicorp.pm.repositories.api.dto.UserBasicInfo;
import tech.nicorp.pm.repositories.domain.Repository;
import tech.nicorp.pm.repositories.domain.RepositoryMember;
import tech.nicorp.pm.repositories.repo.RepositoryMemberRepository;
import tech.nicorp.pm.repositories.repo.RepositoryRepository;
import tech.nicorp.pm.users.domain.User;
import tech.nicorp.pm.users.repo.UserRepository;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/repositories/{repositoryId}/members")
@Tag(name = "Repository Members", description = "Участники репозитория")
public class RepositoryMembersController {

    private final RepositoryRepository repositories;
    private final RepositoryMemberRepository members;
    private final UserRepository users;

    public RepositoryMembersController(RepositoryRepository repositories, RepositoryMemberRepository members, UserRepository users) {
        this.repositories = repositories;
        this.members = members;
        this.users = users;
    }

    @GetMapping
    @Transactional
    @Operation(summary = "Список участников репозитория")
    public ResponseEntity<List<RepositoryMemberResponse>> list(@PathVariable(value = "repositoryId") UUID repositoryId) {
        Repository repo = repositories.findById(repositoryId).orElse(null);
        if (repo == null) return ResponseEntity.notFound().build();
        return ResponseEntity.ok(members.findAll().stream()
                .filter(m -> m.getRepository().getId().equals(repositoryId))
                .map(this::toResponse).toList());
    }

    @PostMapping
    @Operation(summary = "Добавить участника в репозиторий")
    public ResponseEntity<RepositoryMemberResponse> add(@PathVariable(value = "repositoryId") UUID repositoryId, @RequestBody RepositoryMemberCreateRequest body) {
        Repository repo = repositories.findById(repositoryId).orElse(null);
        if (repo == null) return ResponseEntity.notFound().build();
        User u = users.findById(UUID.fromString(body.getUserId())).orElse(null);
        if (u == null) return ResponseEntity.notFound().build();
        RepositoryMember m = new RepositoryMember();
        m.setRepository(repo);
        m.setUser(u);
        m.setRole(body.getRole() != null ? body.getRole() : "developer");
        RepositoryMember saved = members.save(m);
        return ResponseEntity.created(URI.create("/api/repositories/" + repositoryId + "/members/" + saved.getId())).body(toResponse(saved));
    }

    @DeleteMapping("/{memberId}")
    @Operation(summary = "Удалить участника из репозитория")
    public ResponseEntity<Void> remove(@PathVariable(value = "repositoryId") UUID repositoryId, @PathVariable(value = "memberId") UUID memberId) {
        if (!members.existsById(memberId)) return ResponseEntity.notFound().build();
        members.deleteById(memberId);
        return ResponseEntity.noContent().build();
    }

    private RepositoryMemberResponse toResponse(RepositoryMember m) {
        RepositoryMemberResponse r = new RepositoryMemberResponse();
        r.setId(m.getId());
        if (m.getRepository() != null) r.setRepositoryId(m.getRepository().getId());
        if (m.getUser() != null) {
            r.setUserId(m.getUser().getId());
            
            UserBasicInfo userInfo = new UserBasicInfo();
            userInfo.setId(m.getUser().getId());
            userInfo.setUsername(m.getUser().getUsername());
            userInfo.setDisplayName(m.getUser().getDisplayName());
            r.setUser(userInfo);
        }
        r.setRole(m.getRole());
        r.setCreatedAt(m.getCreatedAt());
        return r;
    }
}


