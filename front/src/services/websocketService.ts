export type RealtimeEventType =
  | 'project-created'
  | 'project-updated'
  | 'project-deleted'
  | 'task-created'
  | 'task-updated'
  | 'task-deleted'
  | 'column-created'
  | 'column-updated'
  | 'column-deleted'
  | 'whiteboard-updated';

export interface RealtimeEventHandler {
  onProjectCreated?: (data: any) => void;
  onProjectUpdated?: (data: any) => void;
  onProjectDeleted?: (data: any) => void;
  onTaskCreated?: (data: any) => void;
  onTaskUpdated?: (data: any) => void;
  onTaskDeleted?: (data: any) => void;
  onColumnCreated?: (data: any) => void;
  onColumnUpdated?: (data: any) => void;
  onColumnDeleted?: (data: any) => void;
  onWhiteboardUpdated?: (data: any) => void;
}



class WebSocketService {
  private realtimeSocket: WebSocket | null = null;
  private callNotificationSocket: WebSocket | null = null;
  private pipelineLogSocket: WebSocket | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectDelay = 3000;
  private isRealtimeConnecting = false;
  private isCallNotificationConnecting = false;
  private isPipelineLogConnecting = false;
  private realtimeHandlers: RealtimeEventHandler | null = null;
  private currentOrganizationId: string | undefined = undefined;
  private currentProjectId: string | undefined = undefined;
  private callNotificationHandlers: {
    onCallStarting?: (data: any) => void;
    onCallReminder?: (data: any) => void;
  } | null = null;
  private pipelineLogHandlers: {
    onLog?: (data: any) => void;
    onStatus?: (data: any) => void;
  } | null = null;

  connectRealtime(
    organizationId?: string,
    projectId?: string,
    handlers: RealtimeEventHandler = {}
  ) {
    this.realtimeHandlers = handlers;
    this.currentOrganizationId = organizationId;
    this.currentProjectId = projectId;

    if (this.isRealtimeConnecting) {
      console.log('Realtime WebSocket already connecting, updating handlers...');
      return;
    }

    this.disconnectRealtime();

    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('No token for realtime WebSocket connection');
      return;
    }

    this.isRealtimeConnecting = true;

    const params = new URLSearchParams();
    params.append('token', token);
    if (organizationId) params.append('organizationId', organizationId);
    if (projectId) params.append('projectId', projectId);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/realtime?${params.toString()}`;

    console.log('📡 Подключение к Realtime WebSocket:', url);

    try {
      this.realtimeSocket = new WebSocket(url);

      this.realtimeSocket.onopen = () => {
        console.log('✅ Realtime WebSocket подключено');
        this.isRealtimeConnecting = false;

        if (organizationId || projectId) {
          const subscribeMessage = {
            type: 'subscribe',
            organizationId: organizationId || null,
            projectId: projectId || null,
          };
          this.realtimeSocket?.send(JSON.stringify(subscribeMessage));
        }
      };

      this.realtimeSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const { type, data } = message;

          console.log('🎯 Realtime WebSocket: event received', type, data);

          const currentHandlers = this.realtimeHandlers || handlers;

          switch (type) {
            case 'connected':
              console.log('✅ Realtime WebSocket connected:', data);
              break;
            case 'project-created':
              if (currentHandlers.onProjectCreated) {
                currentHandlers.onProjectCreated(data);
                console.log('✅ onProjectCreated handler executed');
              }
              break;
            case 'project-updated':
              if (currentHandlers.onProjectUpdated) {
                currentHandlers.onProjectUpdated(data);
                console.log('✅ onProjectUpdated handler executed');
              }
              break;
            case 'project-deleted':
              if (currentHandlers.onProjectDeleted) {
                currentHandlers.onProjectDeleted(data);
                console.log('✅ onProjectDeleted handler executed');
              }
              break;
            case 'task-created':
              if (currentHandlers.onTaskCreated) {
                currentHandlers.onTaskCreated(data);
                console.log('✅ onTaskCreated handler executed');
              }
              break;
            case 'task-updated':
              if (currentHandlers.onTaskUpdated) {
                currentHandlers.onTaskUpdated(data);
                console.log('✅ onTaskUpdated handler executed');
              }
              break;
            case 'task-deleted':
              if (currentHandlers.onTaskDeleted) {
                currentHandlers.onTaskDeleted(data);
                console.log('✅ onTaskDeleted handler executed');
              }
              break;
            case 'column-created':
              if (currentHandlers.onColumnCreated) {
                currentHandlers.onColumnCreated(data);
                console.log('✅ onColumnCreated handler executed');
              }
              break;
            case 'column-updated':
              if (currentHandlers.onColumnUpdated) {
                currentHandlers.onColumnUpdated(data);
                console.log('✅ onColumnUpdated handler executed');
              }
              break;
            case 'column-deleted':
              if (currentHandlers.onColumnDeleted) {
                currentHandlers.onColumnDeleted(data);
                console.log('✅ onColumnDeleted handler executed');
              }
              break;
            case 'whiteboard-updated':
              if (currentHandlers.onWhiteboardUpdated) {
                currentHandlers.onWhiteboardUpdated(data);
                console.log('✅ onWhiteboardUpdated handler executed');
              }
              break;
            default:
              console.warn('⚠️ Unknown realtime event type:', type);
          }
        } catch (e) {
          console.error('❌ Error parsing realtime WebSocket message:', e);
        }
      };

      this.realtimeSocket.onerror = (error) => {
        console.error('❌ Realtime WebSocket error:', error);
      };

      this.realtimeSocket.onclose = () => {
        console.log('📡 Realtime WebSocket connection closed');
        this.isRealtimeConnecting = false;
        this.scheduleRealtimeReconnect(organizationId, projectId, handlers);
      };
    } catch (error: any) {
      console.error('❌ Ошибка создания Realtime WebSocket подключения:', error);
      this.isRealtimeConnecting = false;
      this.scheduleRealtimeReconnect(organizationId, projectId, handlers);
    }
  }

  private scheduleRealtimeReconnect(
    organizationId?: string,
    projectId?: string,
    handlers?: RealtimeEventHandler
  ) {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log('🔄 Переподключение Realtime WebSocket...');
      this.connectRealtime(
        organizationId || this.currentOrganizationId,
        projectId || this.currentProjectId,
        handlers || this.realtimeHandlers || {}
      );
    }, this.reconnectDelay);
  }

  disconnectRealtime() {
    if (this.realtimeSocket) {
      this.realtimeSocket.close();
      this.realtimeSocket = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.isRealtimeConnecting = false;
    this.realtimeHandlers = null;
    this.currentOrganizationId = undefined;
    this.currentProjectId = undefined;
  }

  connectCallNotifications(
    onCallStarting: (data: any) => void,
    onCallReminder: (data: any) => void
  ) {
    if (this.isCallNotificationConnecting) {
      console.log('Call notification WebSocket already connecting...');
      return;
    }

    this.disconnectCallNotifications();

    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('No token for call notification WebSocket connection');
      return;
    }

    this.isCallNotificationConnecting = true;
    this.callNotificationHandlers = { onCallStarting, onCallReminder };

    const params = new URLSearchParams();
    params.append('token', token);

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/call-notifications?${params.toString()}`;

    console.log('📡 Подключение к Call Notification WebSocket:', url);

    try {
      this.callNotificationSocket = new WebSocket(url);

      this.callNotificationSocket.onopen = () => {
        console.log('✅ Call Notification WebSocket подключено');
        this.isCallNotificationConnecting = false;
      };

      this.callNotificationSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const { type, data } = message;

          console.log('🔔 Call Notification WebSocket: event received', type, data);

          switch (type) {
            case 'connected':
              console.log('✅ Call Notification WebSocket connected:', data);
              break;
            case 'call-starting':
              if (this.callNotificationHandlers?.onCallStarting) {
                this.callNotificationHandlers.onCallStarting(data);
                console.log('✅ onCallStarting handler executed');
              }
              break;
            case 'call-reminder':
              if (this.callNotificationHandlers?.onCallReminder) {
                this.callNotificationHandlers.onCallReminder(data);
                console.log('✅ onCallReminder handler executed');
              }
              break;
            default:
              console.warn('⚠️ Unknown call notification event type:', type);
          }
        } catch (e) {
          console.error('❌ Error parsing call notification WebSocket message:', e);
        }
      };

      this.callNotificationSocket.onerror = (error) => {
        console.error('❌ Call Notification WebSocket error:', error);
      };

      this.callNotificationSocket.onclose = () => {
        console.log('📡 Call Notification WebSocket connection closed');
        this.isCallNotificationConnecting = false;
        this.scheduleCallNotificationReconnect(onCallStarting, onCallReminder);
      };
    } catch (error: any) {
      console.error('❌ Ошибка создания Call Notification WebSocket подключения:', error);
      this.isCallNotificationConnecting = false;
      this.scheduleCallNotificationReconnect(onCallStarting, onCallReminder);
    }
  }

  private scheduleCallNotificationReconnect(
    onCallStarting: (data: any) => void,
    onCallReminder: (data: any) => void
  ) {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log('🔄 Переподключение Call Notification WebSocket...');
      this.connectCallNotifications(onCallStarting, onCallReminder);
    }, this.reconnectDelay);
  }

  disconnectCallNotifications() {
    if (this.callNotificationSocket) {
      this.callNotificationSocket.close();
      this.callNotificationSocket = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.isCallNotificationConnecting = false;
    this.callNotificationHandlers = null;
  }

  connectPipelineLogs(
    jobId: string,
    onLog: (data: any) => void,
    onStatus: (data: any) => void
  ) {
    if (this.isPipelineLogConnecting) {
      console.log('Pipeline log WebSocket already connecting...');
      return;
    }

    this.disconnectPipelineLogs();

    this.isPipelineLogConnecting = true;
    this.pipelineLogHandlers = { onLog, onStatus };

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const url = `${protocol}//${host}/ws/pipeline-logs/${jobId}`;

    console.log('📡 Подключение к Pipeline Log WebSocket:', url);

    try {
      this.pipelineLogSocket = new WebSocket(url);

      this.pipelineLogSocket.onopen = () => {
        console.log('✅ Pipeline Log WebSocket подключено');
        this.isPipelineLogConnecting = false;
      };

      this.pipelineLogSocket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          const { type, data } = message;

          console.log('📋 Pipeline Log WebSocket: event received', type, data);

          switch (type) {
            case 'connected':
              console.log('✅ Pipeline Log WebSocket connected:', data);
              break;
            case 'log':
              if (this.pipelineLogHandlers?.onLog) {
                this.pipelineLogHandlers.onLog(data);
              }
              break;
            case 'status':
              if (this.pipelineLogHandlers?.onStatus) {
                this.pipelineLogHandlers.onStatus(data);
              }
              break;
            default:
              console.warn('⚠️ Unknown pipeline log event type:', type);
          }
        } catch (e) {
          console.error('❌ Error parsing pipeline log WebSocket message:', e);
        }
      };

      this.pipelineLogSocket.onerror = (error) => {
        console.error('❌ Pipeline Log WebSocket error:', error);
      };

      this.pipelineLogSocket.onclose = () => {
        console.log('📡 Pipeline Log WebSocket connection closed');
        this.isPipelineLogConnecting = false;
      };
    } catch (error: any) {
      console.error('❌ Ошибка создания Pipeline Log WebSocket подключения:', error);
      this.isPipelineLogConnecting = false;
    }
  }

  disconnectPipelineLogs() {
    if (this.pipelineLogSocket) {
      this.pipelineLogSocket.close();
      this.pipelineLogSocket = null;
    }

    this.isPipelineLogConnecting = false;
    this.pipelineLogHandlers = null;
  }
}

export const websocketService = new WebSocketService();
