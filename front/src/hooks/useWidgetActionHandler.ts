import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { executeClientAction } from '../lib/client-actions';

interface ActionHandlerDeps {
  sendMessage: (text: string, isWidgetResponse?: boolean) => Promise<any>;
  updateWidgetState: (messageId: string, widgetId: string, widgetType: string, selectedValue: string) => Promise<void>;
}

/**
 * Shared onAction handler for AI chat widgets.
 * Used by both AIConversationView and AIAssistantSheet.
 */
export function useWidgetActionHandler({ sendMessage, updateWidgetState }: ActionHandlerDeps) {
  const navigate = useNavigate();

  const handleAction = useCallback(
    async (messageId: string, actionType: string, payload: Record<string, any>) => {
      if (actionType === 'clarification_response') {
        const messageText = payload.value ? String(payload.value) : '';
        if (messageText.trim()) {
          const selectedVal = String(payload.optionId || payload.value || '');
          if (payload.widgetType) {
            await updateWidgetState(messageId, payload.widgetId || '', payload.widgetType, selectedVal);
          }
          await sendMessage(messageText, true);
        }
      } else if (actionType === 'action_confirmation') {
        const selectedVal = payload.confirmed ? 'true' : 'false';
        if (payload.widgetType) {
          await updateWidgetState(messageId, payload.widgetId || '', payload.widgetType, selectedVal);
        }
        if (payload.confirmed && payload.clientAction) {
          executeClientAction(payload.clientAction, navigate);
        }
        await sendMessage(payload.confirmed ? 'Confirmed' : 'Cancelled', true);
      }
    },
    [sendMessage, updateWidgetState, navigate],
  );

  return handleAction;
}
