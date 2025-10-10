package tech.nicorp.pm;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling  // Включаем scheduled tasks (CallStatusManager)
public class ProjectMonitorApplication {
    public static void main(String[] args) {
        SpringApplication.run(ProjectMonitorApplication.class, args);
    }
}


