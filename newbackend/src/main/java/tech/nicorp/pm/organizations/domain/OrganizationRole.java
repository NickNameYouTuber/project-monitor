package tech.nicorp.pm.organizations.domain;

public enum OrganizationRole {
    OWNER,      // Владелец организации
    ADMIN,      // Администратор (управление настройками и членами)
    MEMBER,     // Участник (может создавать проекты)
    GUEST       // Гость (только просмотр назначенных проектов)
}

