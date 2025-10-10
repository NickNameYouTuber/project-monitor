# MediaSoup Server Deployment Guide

## Предварительные требования

### Системные требования

- **OS**: Linux (Ubuntu 20.04+, Debian 11+, CentOS 8+)
- **CPU**: Минимум 2 cores, рекомендуется 4+ cores
- **RAM**: Минимум 2GB, рекомендуется 4GB+
- **Network**: Публичный IP адрес с открытыми портами

### Необходимое ПО

- Docker 20.10+
- Docker Compose 2.0+
- Node.js 18+ (для локальной разработки)

## Сетевые требования

### Порты

Следующие порты должны быть открыты в firewall:

```bash
# HTTP/Socket.IO
4001/tcp

# RTP Media (UDP предпочтительнее)
40000-40100/udp
40000-40100/tcp
```

### Firewall настройка (UFW)

```bash
sudo ufw allow 4001/tcp
sudo ufw allow 40000:40100/udp
sudo ufw allow 40000:40100/tcp
sudo ufw reload
```

### Firewall настройка (iptables)

```bash
iptables -A INPUT -p tcp --dport 4001 -j ACCEPT
iptables -A INPUT -p udp --dport 40000:40100 -j ACCEPT
iptables -A INPUT -p tcp --dport 40000:40100 -j ACCEPT
iptables-save > /etc/iptables/rules.v4
```

## Конфигурация

### 1. Настройка переменных окружения

Создайте `.env` файл на основе `.env.example`:

```bash
cd project-monitor/services/mediasoup-server
cp .env.example .env
```

**Важные переменные:**

```env
# PUBLIC IP вашего сервера (критично!)
ANNOUNCED_IP=YOUR_PUBLIC_IP_HERE

# Redis (если используется)
REDIS_URL=redis://:password@redis:6379

# Диапазон RTP портов
RTC_MIN_PORT=40000
RTC_MAX_PORT=40100

# Разрешенные origins для CORS
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
```

**⚠️ КРИТИЧНО**: `ANNOUNCED_IP` должен быть публичным IP адресом, доступным снаружи. Использование `127.0.0.1` или приватного IP приведет к проблемам с подключением через NAT.

### 2. Получение публичного IP

```bash
# Linux/Mac
curl ifconfig.me

# Или
dig +short myip.opendns.com @resolver1.opendns.com
```

### 3. Docker Compose конфигурация

В `docker-compose.yml`:

```yaml
mediasoup-server:
  environment:
    - ANNOUNCED_IP=${PUBLIC_IP:-127.0.0.1}
```

Задайте `PUBLIC_IP` в `.env` файле корневого проекта или export:

```bash
export PUBLIC_IP=YOUR_PUBLIC_IP
docker-compose up -d mediasoup-server
```

## Запуск

### Development (локально)

```bash
cd project-monitor/services/mediasoup-server
npm install
npm run dev
```

### Production (Docker)

**Полный стек:**

```bash
cd project-monitor
docker-compose up -d
```

**Только MediaSoup сервер:**

```bash
docker-compose up -d mediasoup-server
```

**Проверка логов:**

```bash
docker-compose logs -f mediasoup-server
```

## Проверка работоспособности

### 1. Health Check

```bash
curl http://localhost:4001/health
```

Ожидаемый ответ:

```json
{
  "status": "ok",
  "uptime": 123.45,
  "rooms": []
}
```

### 2. Проверка портов

```bash
# Проверка что порты слушаются
sudo netstat -tulpn | grep -E '4001|40000'

# Или
sudo ss -tulpn | grep -E '4001|40000'
```

### 3. Проверка из внешней сети

```bash
# С другого сервера/компьютера
curl http://YOUR_PUBLIC_IP:4001/health
```

## Интеграция с NIMeet

### 1. Включить MediaSoup в backend

Обновите `project-monitor/services/nimeet-backend/.env`:

```env
USE_MEDIASOUP=true
MEDIASOUP_SERVER_URL=http://mediasoup-server:4001
```

Если MediaSoup на отдельном сервере:

```env
USE_MEDIASOUP=true
MEDIASOUP_SERVER_URL=http://YOUR_MEDIASOUP_IP:4001
```

### 2. Перезапустить backend

```bash
docker-compose restart nimeet-backend
```

### 3. Включить MediaSoup в frontend

Обновите `NIMeet/frontend/.env`:

```env
REACT_APP_USE_MEDIASOUP=true
```

Пересобрать frontend:

```bash
cd NIMeet/frontend
npm run build
```

## Масштабирование

### Horizontal Scaling с Redis

Для запуска нескольких экземпляров MediaSoup сервера:

1. **Настройте Redis** (уже включен в docker-compose.yml)

2. **Запустите несколько экземпляров**:

```yaml
# docker-compose.yml
mediasoup-server-1:
  # ... config
  ports:
    - "4001:4001"
    - "40000-40100:40000-40100/udp"

mediasoup-server-2:
  # ... config
  ports:
    - "4002:4001"
    - "40101-40201:40000-40100/udp"
```

3. **Load Balancer** (nginx/HAProxy) перед MediaSoup серверами

### Vertical Scaling

Увеличьте количество Worker threads:

```javascript
// src/config/mediasoup.js
worker: {
  numWorkers: 8  // Увеличить на основе CPU cores
}
```

## Мониторинг

### Логи

```bash
# Real-time logs
docker-compose logs -f mediasoup-server

# Последние 100 строк
docker-compose logs --tail=100 mediasoup-server
```

### Метрики

Health endpoint предоставляет базовые метрики:

```bash
watch -n 5 'curl -s http://localhost:4001/health | jq'
```

Для production рекомендуется настроить:

- **Prometheus** + **Grafana** для метрик
- **ELK Stack** или **Loki** для логов
- **Alertmanager** для уведомлений

## Troubleshooting

### Проблема: Connection timeout

**Причина**: Порты RTP недоступны снаружи

**Решение**:
1. Проверьте firewall правила
2. Проверьте `ANNOUNCED_IP` - должен быть публичный IP
3. Проверьте cloud provider security groups (AWS, GCP, Azure)

```bash
# Тест с другого сервера
nc -zvu YOUR_PUBLIC_IP 40000
```

### Проблема: ICE connection failed

**Причина**: Неверный `ANNOUNCED_IP` или закрытые порты

**Решение**:
1. Убедитесь что `ANNOUNCED_IP` совпадает с публичным IP
2. Проверьте что TURN server работает
3. Проверьте browser console для ICE candidates

### Проблема: High CPU usage

**Причина**: Слишком мало workers или слишком много участников

**Решение**:
1. Увеличьте количество workers
2. Оптимизируйте codecs (отключите VP9/H264 если не нужны)
3. Ограничьте max bitrate

### Проблема: Audio/Video не идет

**Причина**: Producer/Consumer не создаются

**Решение**:
1. Проверьте логи MediaSoup сервера
2. Проверьте browser console на ошибки
3. Проверьте что frontend использует `REACT_APP_USE_MEDIASOUP=true`

## Backup и Recovery

### Backup

MediaSoup сервер stateless, но для безопасности:

```bash
# Backup конфигурации
tar -czf mediasoup-config-backup.tar.gz \
  project-monitor/services/mediasoup-server/src/config \
  project-monitor/services/mediasoup-server/.env
```

### Recovery

В случае сбоя:

1. **Быстрый перезапуск**:
```bash
docker-compose restart mediasoup-server
```

2. **Полная переустановка**:
```bash
docker-compose down mediasoup-server
docker-compose up -d --build mediasoup-server
```

3. **Rollback к mesh P2P**:
```bash
# В nimeet-backend/.env
USE_MEDIASOUP=false

docker-compose restart nimeet-backend
```

## Performance Tuning

### Linux Kernel

Для production увеличьте лимиты:

```bash
# /etc/sysctl.conf
net.core.rmem_max=134217728
net.core.wmem_max=134217728
net.ipv4.udp_mem=65536 131072 262144
fs.file-max=2097152

# Применить
sudo sysctl -p
```

### Docker

Увеличьте ресурсы для контейнера:

```yaml
mediasoup-server:
  deploy:
    resources:
      limits:
        cpus: '4'
        memory: 4G
      reservations:
        cpus: '2'
        memory: 2G
```

## Security

### 1. HTTPS/WSS

В production **всегда** используйте HTTPS:

```nginx
# nginx config
server {
    listen 443 ssl;
    server_name mediasoup.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:4001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 2. CORS

Ограничьте разрешенные origins:

```env
ALLOWED_ORIGINS=https://yourdomain.com
```

### 3. Redis Authentication

Используйте пароль для Redis:

```env
REDIS_URL=redis://:strong_password_here@redis:6379
```

## Changelog

- **2025-01-09**: Первая версия deployment guide

## Support

При проблемах:

1. Проверьте логи: `docker-compose logs mediasoup-server`
2. Проверьте health endpoint
3. Создайте issue с подробным описанием и логами

