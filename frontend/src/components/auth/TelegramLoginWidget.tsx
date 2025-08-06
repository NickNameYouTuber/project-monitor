import React, { useEffect, useRef } from 'react';
import { Box } from '@mantine/core';

interface TelegramLoginWidgetProps {
  botName: string; 
  buttonSize?: 'large' | 'medium' | 'small';
  cornerRadius?: number;
  requestAccess?: boolean;
  usePic?: boolean;
  dataOnauth: (user: TelegramUser) => void;
}

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

declare global {
  interface Window {
    TelegramLoginWidget: {
      dataOnauth: (user: TelegramUser) => void;
    };
  }
}

const TelegramLoginWidget: React.FC<TelegramLoginWidgetProps> = ({ 
  botName,
  buttonSize = 'large',
  cornerRadius = 8,
  requestAccess = true,
  usePic = true,
  dataOnauth
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Save the callback function in global scope so the widget can call it
    window.TelegramLoginWidget = {
      dataOnauth: (user) => {
        console.log('Telegram login success:', user);
        dataOnauth(user);
      }
    };

    // Clear any existing widgets
    if (containerRef.current) {
      containerRef.current.innerHTML = '';
    }

    // Create the script
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-radius', cornerRadius.toString());
    script.setAttribute('data-request-access', requestAccess ? 'write' : 'read');
    script.setAttribute('data-userpic', usePic ? 'true' : 'false');
    script.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)');
    
    // Append the script to the container
    if (containerRef.current) {
      containerRef.current.appendChild(script);
    }

    // Cleanup
    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [botName, buttonSize, cornerRadius, requestAccess, usePic, dataOnauth]);

  return (
    <Box ref={containerRef} ta="center" />
  );
};

export default TelegramLoginWidget;
