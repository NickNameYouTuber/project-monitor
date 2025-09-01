package tech.nicorp.pm.dashboards.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.dashboards.domain.DashboardMember;

import java.util.UUID;

public interface DashboardMemberRepository extends JpaRepository<DashboardMember, UUID> {
}



