class SSEService {
  private eventSource: EventSource | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectDelay = 3000;

  connect(onCallStarting: (data: any) => void, onCallReminder: (data: any) => void) {
    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('Нет токена для SSE подключения');
      return;
    }

    const url = `/api/call-notifications/stream`;
    console.log('📡 Подключение к SSE:', url);

    this.eventSource = new EventSource(url);

    this.eventSource.addEventListener('connected', (event) => {
      console.log('✅ SSE подключено:', event.data);
    });

    this.eventSource.addEventListener('call-starting', (event) => {
      console.log('🔔 Получено уведомление о начале звонка:', event.data);
      try {
        const data = JSON.parse(event.data);
        onCallStarting(data);
      } catch (e) {
        console.error('Ошибка парсинга SSE данных:', e);
      }
    });

    this.eventSource.addEventListener('call-reminder', (event) => {
      console.log('⏰ Получено напоминание о звонке:', event.data);
      try {
        const data = JSON.parse(event.data);
        onCallReminder(data);
      } catch (e) {
        console.error('Ошибка парсинга SSE данных:', e);
      }
    });

    this.eventSource.onerror = (error) => {
      console.error('❌ SSE ошибка:', error);
      this.disconnect();
      this.scheduleReconnect(onCallStarting, onCallReminder);
    };
  }

  private scheduleReconnect(onCallStarting: (data: any) => void, onCallReminder: (data: any) => void) {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
    }

    this.reconnectTimeout = setTimeout(() => {
      console.log('🔄 Переподключение SSE...');
      this.connect(onCallStarting, onCallReminder);
    }, this.reconnectDelay);
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
  }
}

export const sseService = new SSEService();

