import React from 'react';
import {
    MarkdownRenderer, cn,
} from '@nicorp/nui';
import { StructuredMessage } from './ai/structured-message';
import type { ChatMessage as ChatMessageType } from '../api/chat';
import { Bot, User, Copy, Check } from 'lucide-react';

interface ChatMessageProps {
    message: ChatMessageType;
    onAction?: (actionId: string, value: any) => void;
    isAnswered?: boolean;
}

export function ChatMessage({ message, onAction, isAnswered }: ChatMessageProps) {
    const isUser = message.role === 'user';
    const [copied, setCopied] = React.useState(false);
    const time = message.createdAt
        ? new Date(message.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
        : undefined;

    const handleCopy = React.useCallback(() => {
        if (message.content) {
            navigator.clipboard.writeText(message.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    }, [message.content]);

    if (isUser) {
        return (
            <div className="flex justify-end mb-5 group animate-in fade-in-0 slide-in-from-right-2 duration-300">
                <div className="flex items-end gap-2.5 max-w-[75%]">
                    <div className="flex flex-col items-end gap-1">
                        <div className={cn(
                            "rounded-2xl rounded-br-sm px-4 py-2.5",
                            "bg-primary text-primary-foreground",
                            "shadow-sm shadow-primary/10",
                        )}>
                            <div className="text-sm leading-relaxed whitespace-pre-wrap">
                                {message.content}
                            </div>
                        </div>
                        {time && (
                            <span className="text-[10px] text-muted-foreground/50 px-1 select-none">
                                {time}
                            </span>
                        )}
                    </div>
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center ring-1 ring-primary/20">
                        <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                </div>
            </div>
        );
    }

    // AI message
    const hasWidgets = Array.isArray(message.widgets) && message.widgets.length > 0;

    return (
        <div className="flex justify-start mb-5 group animate-in fade-in-0 slide-in-from-left-2 duration-300">
            <div className="flex items-start gap-2.5 max-w-[88%] sm:max-w-[82%]">
                {/* AI Avatar */}
                <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/15 to-blue-500/15 flex items-center justify-center ring-1 ring-violet-500/15 mt-0.5">
                    <Bot className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                </div>

                {/* Content */}
                <div className="flex flex-col gap-1.5 min-w-0 flex-1">
                    {/* Label */}
                    <div className="flex items-center gap-2 pl-0.5">
                        <span className="text-[11px] font-semibold text-violet-600/70 dark:text-violet-400/70 tracking-wide uppercase">
                            AI Assistant
                        </span>
                        {time && (
                            <span className="text-[10px] text-muted-foreground/40 select-none">
                                {time}
                            </span>
                        )}
                    </div>

                    {/* Message body */}
                    {hasWidgets ? (
                        <div className="space-y-2.5">
                            <StructuredMessage message={message} onAction={onAction} isAnswered={isAnswered} />
                        </div>
                    ) : (
                        <div className={cn(
                            "rounded-2xl rounded-tl-sm px-4 py-3",
                            "bg-muted/60 text-foreground",
                            "border border-border/30",
                        )}>
                            <div className="prose dark:prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:leading-relaxed [&_pre]:rounded-lg [&_code]:text-[13px]">
                                <MarkdownRenderer content={message.content || ''} />
                            </div>
                        </div>
                    )}

                    {/* Actions row */}
                    <div className="flex items-center gap-1 pl-0.5 h-5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                        <button
                            type="button"
                            onClick={handleCopy}
                            className={cn(
                                "h-6 px-1.5 rounded-md flex items-center gap-1 text-[10px] font-medium transition-all",
                                copied
                                    ? "text-emerald-500"
                                    : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/80",
                            )}
                            title="Копировать"
                        >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? 'Скопировано' : 'Копировать'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
