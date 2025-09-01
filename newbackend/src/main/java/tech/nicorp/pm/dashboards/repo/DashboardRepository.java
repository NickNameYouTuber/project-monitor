package tech.nicorp.pm.dashboards.repo;

import org.springframework.data.jpa.repository.JpaRepository;
import tech.nicorp.pm.dashboards.domain.Dashboard;

import java.util.UUID;

public interface DashboardRepository extends JpaRepository<Dashboard, UUID> {
}



