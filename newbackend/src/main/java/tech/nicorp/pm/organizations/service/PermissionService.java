package tech.nicorp.pm.organizations.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import tech.nicorp.pm.organizations.domain.OrgPermission;
import tech.nicorp.pm.organizations.domain.OrgRole;
import tech.nicorp.pm.organizations.repo.OrgRoleRepository;

import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PermissionService {

    public List<OrgPermission> getAllPermissions() {
        return Arrays.asList(OrgPermission.values());
    }

    public Map<String, List<OrgPermission>> getGroupedPermissions() {
        return Arrays.stream(OrgPermission.values())
                .collect(Collectors.groupingBy(p -> p.name().startsWith("VIEW_") ? "UI Views" : "Actions"));
    }
}
