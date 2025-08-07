import { Box } from '@mantine/core';
import { useEffect, useRef } from 'react';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginWidgetProps {
  botName: string;
  buttonSize?: 'large' | 'medium' | 'small';
  cornerRadius?: number;
  requestAccess?: boolean;
  usePic?: boolean;
  dataOnauth: (user: TelegramUser) => void;
}

declare global {
  interface Window {
    TelegramLoginWidget?: {
      dataOnauth: (user: TelegramUser) => void;
    };
  }
}

export default function TelegramLoginWidget({
  botName,
  buttonSize = 'large',
  cornerRadius = 10,
  requestAccess = true,
  usePic = true,
  dataOnauth,
}: TelegramLoginWidgetProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    window.TelegramLoginWidget = {
      dataOnauth: (user) => dataOnauth(user),
    };

    if (containerRef.current) containerRef.current.innerHTML = '';

    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', buttonSize);
    script.setAttribute('data-radius', String(cornerRadius));
    script.setAttribute('data-request-access', requestAccess ? 'write' : 'read');
    script.setAttribute('data-userpic', usePic ? 'true' : 'false');
    script.setAttribute('data-onauth', 'TelegramLoginWidget.dataOnauth(user)');

    containerRef.current?.appendChild(script);

    return () => {
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [botName, buttonSize, cornerRadius, requestAccess, usePic, dataOnauth]);

  return <Box ref={containerRef} ta="center" />;
}


