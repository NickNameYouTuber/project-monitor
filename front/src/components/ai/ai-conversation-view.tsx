import React, { useEffect, useRef, useState } from 'react';
import { useAIAssistant } from '../../hooks/useAIAssistant';
import {
    ChatInput, AILoading, PromptSuggestions, cn,
} from '@nicorp/nui';
import { Bot, Sparkles, ArrowDown } from 'lucide-react';
import { ChatMessage } from '../chat-message';
import { useNavigate } from 'react-router-dom';
import { executeClientAction } from '../../lib/client-actions';
import { updateWidgetState } from '../../api/chat';

interface AIConversationViewProps {
    chatId: string | null;
    onBack: () => void;
}

export function AIConversationView({ chatId, onBack }: AIConversationViewProps) {
    const navigate = useNavigate();
    const { messages, isLoading, loadChat, sendMessage, setMessages } = useAIAssistant(chatId);
    const scrollRef = useRef<HTMLDivElement>(null);
    const bottomRef = useRef<HTMLDivElement>(null);
    const [showScrollBtn, setShowScrollBtn] = useState(false);

    useEffect(() => {
        if (chatId) {
            loadChat(chatId);
        } else {
            setMessages([]);
        }
    }, [chatId, loadChat, setMessages]);

    // Auto-scroll on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    // Show "scroll to bottom" button
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const onScroll = () => {
            const gap = el.scrollHeight - el.scrollTop - el.clientHeight;
            setShowScrollBtn(gap > 120);
        };
        el.addEventListener('scroll', onScroll);
        return () => el.removeEventListener('scroll', onScroll);
    }, []);

    const handleSend = async (text: string) => {
        if (!text.trim() || isLoading || !chatId) return;
        await sendMessage(text.trim());
    };

    if (!chatId) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-8">
                <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                    <Bot className="w-7 h-7 text-muted-foreground/40" />
                </div>
                <p className="text-sm text-muted-foreground mb-4">Выберите чат или начните новую беседу</p>
                <button
                    onClick={onBack}
                    className="text-sm font-medium text-primary hover:text-primary/80 transition-colors"
                >
                    ← К истории
                </button>
            </div>
        );
    }

    const visibleMessages = messages.filter(msg => !msg.isWidgetResponse);

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Messages area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain">
                <div className="max-w-3xl mx-auto px-3 sm:px-5 py-4">
                    {/* Empty state */}
                    {visibleMessages.length === 0 && !isLoading && (
                        <div className="flex flex-col items-center justify-center py-16 animate-in fade-in-0 duration-500">
                            <div className="relative mb-6">
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/15 to-blue-500/15 flex items-center justify-center ring-1 ring-violet-500/10">
                                    <Sparkles className="w-8 h-8 text-violet-500/70" />
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center ring-1 ring-emerald-500/20">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                </div>
                            </div>
                            <h3 className="text-lg font-semibold text-foreground mb-1">AI Ассистент</h3>
                            <p className="text-sm text-muted-foreground mb-8 max-w-xs text-center">
                                Помогу с задачами, проектами и ответами на вопросы
                            </p>
                            <div className="w-full max-w-sm">
                                <PromptSuggestions
                                    suggestions={[
                                        { title: '📋 Создать задачу', description: 'Создать новую задачу в проекте', prompt: 'Создай новую задачу' },
                                        { title: '📊 Статус проекта', description: 'Показать текущий статус', prompt: 'Покажи статус проекта' },
                                        { title: '💡 Помощь', description: 'Что умеет AI?', prompt: 'Что ты умеешь?' },
                                    ]}
                                    onSelect={(prompt) => handleSend(prompt)}
                                    columns={1}
                                />
                            </div>
                        </div>
                    )}

                    {/* Messages */}
                    {visibleMessages.map((msg) => {
                        const originalIndex = messages.findIndex(m => m.id === msg.id);
                        const nextMsg = messages[originalIndex + 1];
                        const isAnswered = nextMsg?.isWidgetResponse || false;

                        return (
                            <ChatMessage
                                key={msg.id}
                                message={msg}
                                isAnswered={isAnswered}
                                onAction={async (actionType, payload) => {
                                    if (actionType === 'clarification_response') {
                                        const messageText = payload.value ? String(payload.value) : '';
                                        if (messageText.trim()) {
                                            if (payload.widgetId && payload.widgetType && chatId) {
                                                try {
                                                    await updateWidgetState(chatId, msg.id, {
                                                        widgetId: payload.widgetId,
                                                        widgetType: payload.widgetType,
                                                        selectedValue: String(payload.optionId || payload.value || '')
                                                    });
                                                } catch (error) {
                                                    console.error('Failed to save widget state:', error);
                                                }
                                            }
                                            await sendMessage(messageText, true);
                                        }
                                    } else if (actionType === 'action_confirmation') {
                                        if (payload.widgetId && payload.widgetType && chatId) {
                                            try {
                                                await updateWidgetState(chatId, msg.id, {
                                                    widgetId: payload.widgetId,
                                                    widgetType: payload.widgetType,
                                                    selectedValue: payload.confirmed ? 'true' : 'false'
                                                });
                                            } catch (error) {
                                                console.error('Failed to save widget state:', error);
                                            }
                                        }
                                        if (payload.confirmed && payload.clientAction) {
                                            executeClientAction(payload.clientAction, navigate);
                                        }
                                        await sendMessage(payload.confirmed ? "Confirmed" : "Cancelled", true);
                                    }
                                }}
                            />
                        );
                    })}

                    {/* Loading */}
                    {isLoading && (
                        <div className="flex items-start gap-2.5 mb-5 animate-in fade-in-0 duration-300">
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-violet-500/15 to-blue-500/15 flex items-center justify-center ring-1 ring-violet-500/15 mt-0.5">
                                <Bot className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400 animate-pulse" />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <span className="text-[11px] font-semibold text-violet-600/70 dark:text-violet-400/70 tracking-wide uppercase pl-0.5">
                                    AI Assistant
                                </span>
                                <div className="rounded-2xl rounded-tl-sm px-4 py-3 bg-muted/60 border border-border/30">
                                    <AILoading variant="dots" />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={bottomRef} />
                </div>
            </div>

            {/* Scroll to bottom */}
            {showScrollBtn && (
                <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10">
                    <button
                        onClick={() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' })}
                        className="h-8 w-8 rounded-full bg-background border border-border shadow-lg flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                    >
                        <ArrowDown className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Input area */}
            <div className="border-t border-border/50 bg-background/95 backdrop-blur-sm">
                <div className="max-w-3xl mx-auto px-3 sm:px-5 py-3">
                    <ChatInput
                        onSend={handleSend}
                        placeholder="Напишите сообщение..."
                        isLoading={isLoading}
                        disabled={isLoading}
                        footerSlot={
                            <span className="text-[10px] text-muted-foreground/50 select-none">
                                Enter — отправить · Shift+Enter — новая строка
                            </span>
                        }
                    />
                </div>
            </div>
        </div>
    );
}
