import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ActionCard } from './action-card';
import type { ChatMessage as ChatMessageType, Action } from '../api/chat';

interface ChatMessageProps {
  message: ChatMessageType;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  const actions: Action[] = message.actions || [];

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div
          className={`rounded-lg p-3 ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-card text-card-foreground border border-border'
          }`}
        >
          {isUser ? (
            <div className="prose prose-sm max-w-none prose-headings:text-primary-foreground prose-p:text-primary-foreground prose-strong:text-primary-foreground prose-code:text-primary-foreground">
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
            </div>
          ) : (
            <div className="prose prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <p className="mb-2 last:mb-0 text-foreground">{children}</p>,
                  code: ({ children, className }) => {
                    const isInline = !className || !String(className).includes('language-');
                    return isInline ? (
                      <code className="bg-muted text-foreground px-1 py-0.5 rounded text-xs font-mono">
                        {children}
                      </code>
                    ) : (
                      <code className="block bg-muted text-foreground p-2 rounded text-xs overflow-x-auto font-mono">
                        {children}
                      </code>
                    );
                  },
                  pre: ({ children }) => <pre className="mb-2 bg-muted p-2 rounded overflow-x-auto">{children}</pre>,
                  h1: ({ children }) => <h1 className="text-foreground font-semibold text-lg mb-2">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-foreground font-semibold text-base mb-2">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-foreground font-semibold text-sm mb-2">{children}</h3>,
                  ul: ({ children }) => <ul className="list-disc list-inside mb-2 text-foreground">{children}</ul>,
                  ol: ({ children }) => <ol className="list-decimal list-inside mb-2 text-foreground">{children}</ol>,
                  li: ({ children }) => <li className="text-foreground">{children}</li>,
                  strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
                  em: ({ children }) => <em className="text-foreground italic">{children}</em>,
                }}
              >
                {message.content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        {!isUser && actions.length > 0 && (
          <div className="mt-2 space-y-2">
            {actions.map((action, index) => {
              if (action.notification) {
                return (
                  <ActionCard
                    key={index}
                    message={action.notification.message}
                    link={action.notification.link}
                    linkText={action.notification.linkText}
                    type="success"
                  />
                );
              }
              return null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}
