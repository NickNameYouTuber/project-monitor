import { NavigateFunction } from 'react-router-dom';
import { toast } from 'sonner';

export interface ClientAction {
    type: 'navigate' | 'show_toast' | 'refresh_data';
    params: Record<string, any>;
}

export function executeClientAction(action: ClientAction, navigate: NavigateFunction, context?: any) {
    console.log('Executing client action:', action);

    switch (action.type) {
        case 'navigate':
            if (action.params.url) {
                navigate(action.params.url);
            }
            break;
        case 'show_toast':
            if (action.params.type === 'error') {
                toast.error(action.params.message);
            } else {
                toast.success(action.params.message);
            }
            break;
        case 'refresh_data':
            // Optional: trigger global refresh if enabled
            if (context?.refresh) {
                context.refresh();
            }
            window.location.reload(); // Fallback for now
            break;
        default:
            console.warn('Unknown client action type:', action.type);
    }
}
