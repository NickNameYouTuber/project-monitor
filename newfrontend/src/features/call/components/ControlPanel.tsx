import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';

interface ControlPanelProps {
  isCameraEnabled: boolean;
  isMicrophoneEnabled: boolean;
  isScreenSharing: boolean;
  isChatOpen?: boolean;
  onToggleCamera: () => void;
  onToggleMicrophone: () => void;
  onToggleScreenShare: () => void;
  onToggleChat?: () => void;
  roomId: string;
  unreadMessages?: number;
}

const ControlPanel: React.FC<ControlPanelProps> = ({
  isCameraEnabled,
  isMicrophoneEnabled,
  isScreenSharing,
  isChatOpen = false,
  onToggleCamera,
  onToggleMicrophone,
  onToggleScreenShare,
  onToggleChat,
  roomId,
  unreadMessages = 0,
}) => {
  const navigate = useNavigate();

  const handleLeaveCall = () => {
    navigate('/dashboard');
  };

  const handleCopyLink = async () => {
    const link = `${window.location.origin}/call/${roomId}`;
    try {
      await navigator.clipboard.writeText(link);
      alert('Ссылка скопирована в буфер обмена!');
    } catch (err) {
      console.error('Ошибка копирования:', err);
    }
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-[#1a1a1a] border-t border-[#2a2a2a] z-50">
      <div className="max-w-7xl mx-auto px-3 py-3 sm:px-4 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <div className="hidden lg:flex items-center gap-2">
            <span className="text-gray-400 text-xs">ID:</span>
            <code className="bg-[#2a2a2a] text-gray-300 px-2 py-1 rounded-lg font-mono text-xs">
              {roomId.slice(0, 8)}...
            </code>
            <button
              onClick={handleCopyLink}
              className="text-blue-400 hover:text-blue-300 p-2 rounded-lg hover:bg-[#2a2a2a] transition"
              title="Копировать ссылку"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 mx-auto">
            <button
              onClick={onToggleMicrophone}
              className={`p-3 sm:p-4 rounded-xl transition ${
                isMicrophoneEnabled 
                  ? 'bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
              title={isMicrophoneEnabled ? 'Выключить микрофон' : 'Включить микрофон'}
            >
              {isMicrophoneEnabled ? (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
                </svg>
              ) : (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            <button
              onClick={onToggleCamera}
              className={`p-3 sm:p-4 rounded-xl transition ${
                isCameraEnabled 
                  ? 'bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white' 
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
              title={isCameraEnabled ? 'Выключить камеру' : 'Включить камеру'}
            >
              {isCameraEnabled ? (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
              ) : (
                <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A3.001 3.001 0 0018 13V7a3 3 0 00-3-3H8.414L3.707 2.293zM13 9.586L8.414 5H15a1 1 0 011 1v6c0 .173-.046.334-.127.473L13 9.586z" clipRule="evenodd" />
                </svg>
              )}
            </button>

            <button
              onClick={onToggleScreenShare}
              className={`p-3 sm:p-4 rounded-xl transition ${
                isScreenSharing 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white'
              }`}
              title={isScreenSharing ? 'Остановить демонстрацию' : 'Демонстрация экрана'}
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5zm5.771 7H5V5h10v7H8.771z" clipRule="evenodd" />
              </svg>
            </button>

            {onToggleChat && (
              <button
                onClick={onToggleChat}
                className={`relative p-3 sm:p-4 rounded-xl transition ${
                  isChatOpen 
                    ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                    : 'bg-[#2a2a2a] hover:bg-[#3a3a3a] text-white'
                }`}
                title={isChatOpen ? 'Закрыть чат' : 'Открыть чат'}
              >
                <MessageCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                {unreadMessages > 0 && !isChatOpen && (
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadMessages > 9 ? '9+' : unreadMessages}
                  </span>
                )}
              </button>
            )}

            <div className="hidden sm:block w-px h-8 bg-[#2a2a2a]"></div>

            <button
              onClick={handleLeaveCall}
              className="p-3 sm:p-4 rounded-xl bg-red-600 hover:bg-red-700 text-white transition"
              title="Завершить звонок"
            >
              <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
              </svg>
            </button>
          </div>

          <div className="hidden lg:block w-32"></div>
        </div>
      </div>
    </div>
  );
};

export default ControlPanel;

