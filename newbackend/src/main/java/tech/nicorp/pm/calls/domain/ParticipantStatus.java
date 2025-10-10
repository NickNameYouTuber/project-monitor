package tech.nicorp.pm.calls.domain;

public enum ParticipantStatus {
    INVITED,      // Приглашен, но еще не присоединился
    JOINED,       // Присоединился к звонку
    LEFT,         // Покинул звонок
    DECLINED      // Отклонил приглашение
}

