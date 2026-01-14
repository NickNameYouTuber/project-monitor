import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Box, Flex } from '@nicorp/nui';
import { StructuredMessage } from './ai/structured-message';
import type { ChatMessage as ChatMessageType } from '../api/chat';

interface ChatMessageProps {
  message: ChatMessageType;
}

interface ChatMessageProps {
  message: ChatMessageType;
  onAction?: (actionId: string, value: any) => void;
  isAnswered?: boolean;
}

export function ChatMessage({ message, onAction, isAnswered }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <Flex className={`${isUser ? 'justify-end' : 'justify-start'} mb-4 group`}>
      <Box className={`max-w-[90%] ${isUser ? 'order-2' : 'order-1'} ${!isUser && 'w-full'}`}>
        {isUser ? (
          <Box className="bg-primary text-primary-foreground rounded-lg p-3 prose prose-sm max-w-none prose-headings:text-primary-foreground prose-p:text-primary-foreground prose-strong:text-primary-foreground prose-code:text-primary-foreground">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0 text-primary-foreground">{children}</p>,
                code: ({ children, className }) => {
                  const isInline = !className || !String(className).includes('language-');
                  return isInline ? (
                    <code className="bg-primary-foreground/20 text-primary-foreground px-1 py-0.5 rounded text-xs font-mono">
                      {children}
                    </code>
                  ) : (
                    <code className="block bg-primary-foreground/20 text-primary-foreground p-2 rounded text-xs overflow-x-auto font-mono">
                      {children}
                    </code>
                  );
                },
                pre: ({ children }) => <pre className="mb-2 bg-primary-foreground/20 p-2 rounded overflow-x-auto">{children}</pre>,
                h1: ({ children }) => <h1 className="text-primary-foreground font-semibold text-lg mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-primary-foreground font-semibold text-base mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-primary-foreground font-semibold text-sm mb-2">{children}</h3>,
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 text-primary-foreground">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 text-primary-foreground">{children}</ol>,
                li: ({ children }) => <li className="text-primary-foreground">{children}</li>,
                strong: ({ children }) => <strong className="text-primary-foreground font-semibold">{children}</strong>,
                em: ({ children }) => <em className="text-primary-foreground italic">{children}</em>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </Box>
        ) : (
          <Box className="pl-2 pr-4">
            <StructuredMessage message={message} onAction={onAction} isAnswered={isAnswered} />
          </Box>
        )}
      </Box>
    </Flex>
  );
}
