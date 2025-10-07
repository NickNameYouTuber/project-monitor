import React, { useState, useEffect, useRef } from 'react';
import { X, Send, MessageCircle, Image as ImageIcon, Paperclip, Plus, FileText, CheckSquare, Calendar, User, Edit2, Check } from 'lucide-react';

interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  message: string;
  timestamp: number;
  isOwnMessage?: boolean;
  fileUrl?: string;
  fileName?: string;
  fileType?: string;
  edited?: boolean;
  task?: {
    title: string;
    description?: string;
    assignee?: string;
    watcher?: string;
    deadline?: string;
  };
}

interface ChatPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  messages: ChatMessage[];
  onSendMessage: (message: string, file?: File) => void;
  onEditMessage?: (messageId: string, newMessage: string) => void;
  currentUserId?: string;
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  isOpen,
  onToggle,
  messages,
  onSendMessage,
  onEditMessage,
  currentUserId,
}) => {
  const [inputMessage, setInputMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assignee: '',
    watcher: '',
    deadline: '',
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Закрытие dropdown при клике вне его
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    if (isDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isDropdownOpen]);

  const handleSendMessage = () => {
    if (inputMessage.trim() || selectedFile) {
      onSendMessage(inputMessage.trim(), selectedFile || undefined);
      setInputMessage('');
      setSelectedFile(null);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Проверяем размер файла (макс 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('Файл слишком большой. Максимальный размер: 10MB');
        return;
      }
      setSelectedFile(file);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleOpenFileDialog = () => {
    setIsDropdownOpen(false);
    fileInputRef.current?.click();
  };

  const handleOpenTaskModal = () => {
    setIsDropdownOpen(false);
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setEditingTaskId(null);
    setTaskForm({
      title: '',
      description: '',
      assignee: '',
      watcher: '',
      deadline: '',
    });
  };

  const handleTaskFormChange = (field: string, value: string) => {
    setTaskForm(prev => ({ ...prev, [field]: value }));
  };

  const handleCreateTask = () => {
    if (!taskForm.title.trim()) return;

    // Кодируем задачу в JSON и отправляем как специальное сообщение
    // Префикс [TASK] позволит бэкенду распознать это как задачу
    const taskData = {
      title: taskForm.title,
      description: taskForm.description || undefined,
      assignee: taskForm.assignee || undefined,
      watcher: taskForm.watcher || undefined,
      deadline: taskForm.deadline || undefined,
    };
    
    const taskMessage = `[TASK]${JSON.stringify(taskData)}`;
    
    if (editingTaskId) {
      // Редактирование существующей задачи
      if (onEditMessage) {
        onEditMessage(editingTaskId, taskMessage);
      }
      setEditingTaskId(null);
    } else {
      // Создание новой задачи
      onSendMessage(taskMessage);
    }
    
    console.log(editingTaskId ? 'Редактирование задачи:' : 'Создание задачи:', taskForm);
    handleCloseTaskModal();
  };

  const handleStartEditMessage = (messageId: string, currentText: string) => {
    setEditingMessageId(messageId);
    setEditingText(currentText);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText('');
  };

  const handleSaveEdit = () => {
    if (editingMessageId && editingText.trim() && onEditMessage) {
      onEditMessage(editingMessageId, editingText.trim());
      handleCancelEdit();
    }
  };

  const handleStartEditTask = (messageId: string, taskData: any) => {
    setEditingTaskId(messageId);
    setTaskForm({
      title: taskData.title || '',
      description: taskData.description || '',
      assignee: taskData.assignee || '',
      watcher: taskData.watcher || '',
      deadline: taskData.deadline || '',
    });
    setIsTaskModalOpen(true);
  };

  return (
    <>
      <div
        className={`fixed right-0 top-0 h-[100dvh] bg-[#1a1a1a] border-l border-[#2a2a2a] transition-transform duration-300 z-50 flex flex-col w-full md:w-[380px] ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a] flex-shrink-0">
          <h3 className="text-white font-semibold flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            Чат
          </h3>
          <button
            onClick={onToggle}
            className="text-gray-400 hover:text-white transition p-1"
            aria-label="Закрыть чат"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500 text-sm text-center">
                Нет сообщений.<br />Начните общение!
              </p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.senderId === currentUserId || msg.isOwnMessage;
              const isImage = msg.fileType?.startsWith('image/');
              
              // Парсим задачи из сообщений с префиксом [TASK]
              let taskData = msg.task;
              let displayMessage = msg.message;
              
              if (msg.message?.startsWith('[TASK]') && !msg.task) {
                try {
                  const jsonStr = msg.message.substring(6); // Убираем "[TASK]"
                  taskData = JSON.parse(jsonStr);
                  displayMessage = ''; // Не показываем JSON в тексте
                } catch (e) {
                  console.error('Ошибка парсинга задачи:', e);
                }
              }
              
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}
                >
                  {!isOwn && (
                    <span className="text-xs text-gray-500 mb-1 px-1">
                      {msg.senderName}
                    </span>
                  )}
                  <div
                    className={`max-w-[80%] rounded-xl overflow-hidden ${
                      isOwn
                        ? 'bg-blue-600 text-white'
                        : 'bg-[#2a2a2a] text-white'
                    }`}
                  >
                    {taskData && (
                      <div className="p-3 bg-black/20 border-l-2 border-green-400 space-y-2 relative group">
                        <div className="flex items-start gap-2">
                          <CheckSquare className="w-4 h-4 text-green-400 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-white">{taskData.title}</p>
                            {taskData.description && (
                              <p className="text-xs text-gray-300 mt-1">{taskData.description}</p>
                            )}
                          </div>
                          {isOwn && onEditMessage && (
                            <button
                              onClick={() => handleStartEditTask(msg.id, taskData)}
                              className="opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-white p-1"
                              title="Редактировать задачу"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                        
                        <div className="space-y-1 text-xs">
                          {taskData.assignee && (
                            <div className="flex items-center gap-2 text-gray-300">
                              <User className="w-3 h-3" />
                              <span>Исполнитель: <span className="text-white">{taskData.assignee}</span></span>
                            </div>
                          )}
                          {taskData.watcher && (
                            <div className="flex items-center gap-2 text-gray-300">
                              <User className="w-3 h-3" />
                              <span>Смотрящий: <span className="text-white">{taskData.watcher}</span></span>
                            </div>
                          )}
                          {taskData.deadline && (
                            <div className="flex items-center gap-2 text-gray-300">
                              <Calendar className="w-3 h-3" />
                              <span>Срок: <span className="text-white">{new Date(taskData.deadline).toLocaleString('ru-RU')}</span></span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                    
                    {msg.fileUrl && (
                      <div className="mb-2">
                        {isImage ? (
                          <a href={msg.fileUrl} target="_blank" rel="noopener noreferrer">
                            <img 
                              src={msg.fileUrl} 
                              alt={msg.fileName || 'Изображение'}
                              className="max-w-full h-auto rounded-lg cursor-pointer hover:opacity-90 transition"
                              style={{ maxHeight: '300px' }}
                            />
                          </a>
                        ) : (
                          <a 
                            href={msg.fileUrl} 
                            download={msg.fileName}
                            className="flex items-center gap-2 p-3 bg-black/20 hover:bg-black/30 transition rounded-lg"
                          >
                            <Paperclip className="w-4 h-4 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{msg.fileName || 'Файл'}</p>
                            </div>
                          </a>
                        )}
                      </div>
                    )}
                    {displayMessage && !taskData && (
                      editingMessageId === msg.id ? (
                        <div className="px-3 py-2 space-y-2">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full bg-[#0a0a0a] border border-[#3a3a3a] text-white text-sm rounded-lg px-2 py-1.5 focus:outline-none focus:border-blue-600 transition resize-none"
                            rows={3}
                            maxLength={500}
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={handleSaveEdit}
                              className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition"
                            >
                              <Check className="w-3 h-3" />
                              Сохранить
                            </button>
                            <button
                              onClick={handleCancelEdit}
                              className="px-2 py-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white text-xs rounded transition"
                            >
                              Отмена
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative group">
                          <p className="text-sm break-words whitespace-pre-wrap px-3 py-2">
                            {displayMessage}
                          </p>
                          {isOwn && onEditMessage && (
                            <button
                              onClick={() => handleStartEditMessage(msg.id, displayMessage)}
                              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition text-gray-400 hover:text-white p-1 bg-black/50 rounded"
                              title="Редактировать сообщение"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )
                    )}
                    <span
                      className={`text-[10px] px-3 pb-2 block ${
                        isOwn ? 'text-blue-200' : 'text-gray-500'
                      }`}
                    >
                      {formatTime(msg.timestamp)}
                      {msg.edited && <span className="ml-1">(изменено)</span>}
                    </span>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-3 sm:p-4 pb-5 sm:pb-4 border-t border-[#2a2a2a] flex-shrink-0 bg-[#1a1a1a]">
          {selectedFile && (
            <div className="mb-2 bg-[#2a2a2a] rounded-lg p-2 flex items-center gap-2">
              {selectedFile.type.startsWith('image/') ? (
                <ImageIcon className="w-4 h-4 text-blue-400 flex-shrink-0" />
              ) : (
                <Paperclip className="w-4 h-4 text-blue-400 flex-shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{selectedFile.name}</p>
                <p className="text-[10px] text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
              <button
                onClick={removeSelectedFile}
                className="text-gray-400 hover:text-white active:text-gray-200 transition p-1"
                aria-label="Удалить файл"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <div className="flex gap-2 relative">
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.txt,.zip,.rar"
            />
            
            {/* Кнопка Plus с выпадающим меню */}
            <div ref={dropdownRef} className="relative flex-shrink-0">
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                className="bg-[#2a2a2a] hover:bg-[#3a3a3a] active:bg-[#4a4a4a] text-white p-2.5 sm:p-2 rounded-lg transition"
                title="Добавить"
              >
                <Plus className="w-5 h-5" />
              </button>

              {/* Выпадающее меню */}
              {isDropdownOpen && (
                <div className="absolute bottom-full left-0 mb-2 bg-[#2a2a2a] border border-[#3a3a3a] rounded-lg shadow-xl overflow-hidden min-w-[200px] z-10">
                  <button
                    onClick={handleOpenFileDialog}
                    className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-[#3a3a3a] active:bg-[#4a4a4a] transition text-left"
                  >
                    <FileText className="w-5 h-5 text-blue-400" />
                    <span className="text-sm">Прикрепить файл</span>
                  </button>
                  <div className="h-px bg-[#3a3a3a]" />
                  <button
                    onClick={handleOpenTaskModal}
                    className="w-full flex items-center gap-3 px-4 py-3 text-white hover:bg-[#3a3a3a] active:bg-[#4a4a4a] transition text-left"
                  >
                    <CheckSquare className="w-5 h-5 text-green-400" />
                    <span className="text-sm">Поставить задачу</span>
                  </button>
                </div>
              )}
            </div>

            <input
              ref={inputRef}
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Введите сообщение..."
              className="flex-1 bg-[#2a2a2a] border border-[#3a3a3a] text-white text-sm sm:text-base rounded-lg px-3 py-2.5 sm:py-2 focus:outline-none focus:border-blue-600 transition placeholder-gray-500"
              maxLength={500}
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim() && !selectedFile}
              className="bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white p-2.5 sm:p-2 rounded-lg transition flex-shrink-0"
              aria-label="Отправить сообщение"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-40 md:hidden"
          onClick={onToggle}
        />
      )}

      {/* Модальное окно создания задачи */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[60] p-4">
          <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            {/* Заголовок */}
            <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a] sticky top-0 bg-[#1a1a1a] z-10">
              <h3 className="text-white font-semibold flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-green-400" />
                {editingTaskId ? 'Редактировать задачу' : 'Поставить задачу'}
              </h3>
              <button
                onClick={handleCloseTaskModal}
                className="text-gray-400 hover:text-white transition p-1"
                aria-label="Закрыть"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Форма */}
            <div className="p-4 space-y-4">
              {/* Название */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Название задачи *
                </label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => handleTaskFormChange('title', e.target.value)}
                  placeholder="Введите название задачи"
                  className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-600 transition placeholder-gray-500"
                  maxLength={100}
                />
              </div>

              {/* Описание */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Описание
                </label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => handleTaskFormChange('description', e.target.value)}
                  placeholder="Введите описание задачи"
                  className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-600 transition placeholder-gray-500 resize-none"
                  rows={4}
                  maxLength={500}
                />
              </div>

              {/* Исполнитель */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Исполнитель
                </label>
                <input
                  type="text"
                  value={taskForm.assignee}
                  onChange={(e) => handleTaskFormChange('assignee', e.target.value)}
                  placeholder="Выберите исполнителя"
                  className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-600 transition placeholder-gray-500"
                  maxLength={50}
                />
              </div>

              {/* Смотрящий */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Смотрящий
                </label>
                <input
                  type="text"
                  value={taskForm.watcher}
                  onChange={(e) => handleTaskFormChange('watcher', e.target.value)}
                  placeholder="Выберите смотрящего"
                  className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-600 transition placeholder-gray-500"
                  maxLength={50}
                />
              </div>

              {/* Время на исполнение */}
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2 flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Срок исполнения
                </label>
                <input
                  type="datetime-local"
                  value={taskForm.deadline}
                  onChange={(e) => handleTaskFormChange('deadline', e.target.value)}
                  className="w-full bg-[#2a2a2a] border border-[#3a3a3a] text-white text-sm rounded-lg px-3 py-2.5 focus:outline-none focus:border-blue-600 transition"
                />
              </div>

              {/* Кнопки */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={handleCloseTaskModal}
                  className="flex-1 bg-[#2a2a2a] hover:bg-[#3a3a3a] active:bg-[#4a4a4a] text-white py-2.5 rounded-lg font-medium transition"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreateTask}
                  disabled={!taskForm.title.trim()}
                  className="flex-1 bg-green-600 hover:bg-green-700 active:bg-green-800 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-2.5 rounded-lg font-medium transition"
                >
                  {editingTaskId ? 'Сохранить' : 'Создать'}
                </button>
              </div>

              {/* Информация */}
              <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3">
                <p className="text-xs text-blue-300">
                  ℹ️ Задача будет отправлена в чат и видна всем участникам звонка. Полная интеграция с системой управления задачами будет реализована в будущем.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatPanel;
