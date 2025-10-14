package tech.nicorp.pm.repositories.domain;

public enum RepositoryRole {
    OWNER,      // Владелец репозитория
    MAINTAINER, // Мейнтейнер (может мержить PR)
    DEVELOPER,  // Разработчик (может пушить код)
    REPORTER,   // Репортер (только issues/просмотр)
    VIEWER      // Наблюдатель (только чтение)
}

