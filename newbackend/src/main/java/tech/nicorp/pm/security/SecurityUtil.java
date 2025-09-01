package tech.nicorp.pm.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Optional;
import java.util.UUID;

public final class SecurityUtil {
    private SecurityUtil() {}

    public static Optional<UUID> getCurrentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || auth.getName() == null) return Optional.empty();
        try {
            return Optional.of(UUID.fromString(auth.getName()));
        } catch (Exception e) {
            return Optional.empty();
        }
    }
}


