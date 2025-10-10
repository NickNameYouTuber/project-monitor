/**
 * Connection Debug Panel
 * Панель для мониторинга состояния WebRTC/MediaSoup соединений
 */

import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface TransportState {
  type: 'send' | 'recv';
  state: string;
  lastUpdate: number;
}

interface ProducerState {
  kind: string;
  id: string;
  state: string;
  trackState: string;
}

interface ConsumerState {
  peerId: string;
  kind: string;
  id: string;
  state: string;
  trackState: string;
}

interface ReconnectAttempt {
  transportType: string;
  attempt: number;
  timestamp: number;
  success: boolean;
}

interface ConnectionDebugPanelProps {
  isOpen: boolean;
  onClose: () => void;
  transports?: TransportState[];
  producers?: ProducerState[];
  consumers?: ConsumerState[];
  reconnectAttempts?: ReconnectAttempt[];
  errors?: Array<{ message: string; timestamp: number }>;
}

export const ConnectionDebugPanel: React.FC<ConnectionDebugPanelProps> = ({
  isOpen,
  onClose,
  transports = [],
  producers = [],
  consumers = [],
  reconnectAttempts = [],
  errors = []
}) => {
  const [autoScroll, setAutoScroll] = useState(true);

  useEffect(() => {
    if (autoScroll && isOpen) {
      const errorList = document.getElementById('error-list');
      if (errorList) {
        errorList.scrollTop = errorList.scrollHeight;
      }
    }
  }, [errors, autoScroll, isOpen]);

  if (!isOpen) return null;

  const getStateColor = (state: string) => {
    switch (state) {
      case 'connected':
      case 'live':
        return 'text-green-500';
      case 'connecting':
      case 'checking':
        return 'text-yellow-500';
      case 'disconnected':
      case 'failed':
      case 'ended':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="fixed bottom-4 right-4 w-[600px] max-h-[80vh] bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-lg shadow-2xl z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-700">
        <h3 className="text-lg font-semibold text-white">Мониторинг соединений</h3>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-800 rounded transition"
          aria-label="Закрыть"
        >
          <X className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Transports */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">Transports</h4>
          {transports.length === 0 ? (
            <p className="text-sm text-gray-500">Нет активных transports</p>
          ) : (
            <div className="space-y-2">
              {transports.map((transport, idx) => (
                <div key={idx} className="bg-gray-800/50 rounded p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{transport.type}</span>
                    <span className={`font-medium ${getStateColor(transport.state)}`}>
                      {transport.state}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    Last update: {new Date(transport.lastUpdate).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Producers */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">
            Producers ({producers.length})
          </h4>
          {producers.length === 0 ? (
            <p className="text-sm text-gray-500">Нет активных producers</p>
          ) : (
            <div className="space-y-2">
              {producers.map((producer) => (
                <div key={producer.id} className="bg-gray-800/50 rounded p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">{producer.kind}</span>
                    <div className="flex items-center gap-2">
                      <span className={`font-medium ${getStateColor(producer.trackState)}`}>
                        track: {producer.trackState}
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    ID: {producer.id}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Consumers */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">
            Consumers ({consumers.length})
          </h4>
          {consumers.length === 0 ? (
            <p className="text-sm text-gray-500">Нет активных consumers</p>
          ) : (
            <div className="space-y-2 max-h-[200px] overflow-y-auto">
              {consumers.map((consumer) => (
                <div key={consumer.id} className="bg-gray-800/50 rounded p-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">
                      {consumer.kind} ({consumer.peerId.slice(0, 8)}...)
                    </span>
                    <span className={`font-medium ${getStateColor(consumer.trackState)}`}>
                      {consumer.trackState}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1 truncate">
                    ID: {consumer.id}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reconnect Attempts */}
        <div>
          <h4 className="text-sm font-semibold text-gray-300 mb-2">
            Попытки переподключения ({reconnectAttempts.length})
          </h4>
          {reconnectAttempts.length === 0 ? (
            <p className="text-sm text-gray-500">Нет попыток переподключения</p>
          ) : (
            <div className="space-y-1 max-h-[150px] overflow-y-auto">
              {reconnectAttempts.slice(-10).map((attempt, idx) => (
                <div key={idx} className="bg-gray-800/50 rounded px-2 py-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">
                      {attempt.transportType} - попытка #{attempt.attempt}
                    </span>
                    <span className={attempt.success ? 'text-green-500' : 'text-red-500'}>
                      {attempt.success ? '✓' : '✗'}
                    </span>
                  </div>
                  <div className="text-gray-500">
                    {new Date(attempt.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Errors */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-semibold text-gray-300">
              Ошибки ({errors.length})
            </h4>
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                className="rounded"
              />
              Auto-scroll
            </label>
          </div>
          {errors.length === 0 ? (
            <p className="text-sm text-gray-500">Нет ошибок</p>
          ) : (
            <div
              id="error-list"
              className="space-y-1 max-h-[200px] overflow-y-auto bg-red-900/10 rounded p-2"
            >
              {errors.slice(-20).map((error, idx) => (
                <div key={idx} className="text-xs">
                  <span className="text-red-400">
                    [{new Date(error.timestamp).toLocaleTimeString()}]
                  </span>{' '}
                  <span className="text-gray-300">{error.message}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-700 text-xs text-gray-500">
        Обновляется в реальном времени | MediaSoup SFU Architecture
      </div>
    </div>
  );
};

export default ConnectionDebugPanel;

