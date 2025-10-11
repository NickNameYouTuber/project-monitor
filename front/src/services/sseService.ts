class SSEService {
  private abortController: AbortController | null = null;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private reconnectDelay = 3000;
  private isConnecting = false;

  async connect(onCallStarting: (data: any) => void, onCallReminder: (data: any) => void) {
    if (this.isConnecting) {
      console.log('SSE уже подключается...');
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      console.warn('Нет токена для SSE подключения');
      return;
    }

    this.isConnecting = true;
    this.abortController = new AbortController();

    const url = `/api/call-notifications/stream`;
    console.log('📡 Подключение к SSE:', url);

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'text/event-stream',
        },
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`SSE ошибка: ${response.status} ${response.statusText}`);
      }

      console.log('✅ SSE подключено');
      this.isConnecting = false;

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Нет reader для SSE stream');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          console.log('📡 SSE stream завершен');
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          console.log('📦 Сырая строка SSE:', line);

          const eventMatch = line.match(/event:\s*(.+)/);
          const dataMatch = line.match(/data:\s*(.+)/);

          if (eventMatch && dataMatch) {
            const eventType = eventMatch[1].trim();
            const eventData = dataMatch[1].trim();

            console.log(`📨 SSE событие: ${eventType}`, eventData);

            try {
              const data = JSON.parse(eventData);

              if (eventType === 'call-starting') {
                console.log('🔔 Получено уведомление о начале звонка:', data);
                onCallStarting(data);
              } else if (eventType === 'call-reminder') {
                console.log('⏰ Получено напоминание о звонке:', data);
                onCallReminder(data);
              } else if (eventType === 'connected') {
                console.log('✅ SSE connected:', data);
              }
            } catch (e) {
              console.error('Ошибка парсинга SSE данных:', e);
            }
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('SSE подключение отменено');
        return;
      }

      console.error('❌ SSE ошибка:', error);
      this.isConnecting = false;
      this.scheduleReconnect(onCallStarting, onCallReminder);
    }
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
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    this.isConnecting = false;
  }
}

export const sseService = new SSEService();

