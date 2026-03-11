package tech.nicorp.pm.calls.service;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import tech.nicorp.pm.calls.domain.Call;
import tech.nicorp.pm.calls.domain.CallStatus;
import tech.nicorp.pm.calls.repo.CallRepository;
import tech.nicorp.pm.support.TestDataFactory;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class CallStatusManagerTest {

    @Mock
    private CallRepository callRepository;

    @Mock
    private CallNotificationService notificationService;

    @InjectMocks
    private CallStatusManager callStatusManager;

    @Test
    void isTransitionAllowedSupportsOnlyValidFlow() {
        assertThat(callStatusManager.isTransitionAllowed(CallStatus.SCHEDULED, CallStatus.ACTIVE)).isTrue();
        assertThat(callStatusManager.isTransitionAllowed(CallStatus.SCHEDULED, CallStatus.CANCELLED)).isTrue();
        assertThat(callStatusManager.isTransitionAllowed(CallStatus.ACTIVE, CallStatus.COMPLETED)).isTrue();
        assertThat(callStatusManager.isTransitionAllowed(CallStatus.ACTIVE, CallStatus.CANCELLED)).isTrue();

        assertThat(callStatusManager.isTransitionAllowed(CallStatus.SCHEDULED, CallStatus.COMPLETED)).isFalse();
        assertThat(callStatusManager.isTransitionAllowed(CallStatus.COMPLETED, CallStatus.ACTIVE)).isFalse();
        assertThat(callStatusManager.isTransitionAllowed(CallStatus.CANCELLED, CallStatus.ACTIVE)).isFalse();
    }

    @Test
    void updateStatusPersistsValidTransition() {
        Call call = TestDataFactory.call(UUID.randomUUID(), "Architecture review", CallStatus.SCHEDULED);

        callStatusManager.updateStatus(call, CallStatus.ACTIVE);

        assertThat(call.getStatus()).isEqualTo(CallStatus.ACTIVE);
        verify(callRepository).save(call);
    }

    @Test
    void updateStatusRejectsInvalidTransition() {
        Call call = TestDataFactory.call(UUID.randomUUID(), "Weekly sync", CallStatus.COMPLETED);

        assertThatThrownBy(() -> callStatusManager.updateStatus(call, CallStatus.ACTIVE))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Недопустимый переход статуса");

        verifyNoInteractions(callRepository);
    }
}
