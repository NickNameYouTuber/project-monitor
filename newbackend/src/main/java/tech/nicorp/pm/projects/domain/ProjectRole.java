package tech.nicorp.pm.projects.domain;

public enum ProjectRole {
    OWNER,      // Владелец (создатель проекта)
    ADMIN,      // Администратор (может управлять настройками)
    DEVELOPER,  // Разработчик (может создавать и редактировать задачи)
    VIEWER      // Наблюдатель (только просмотр)
}

