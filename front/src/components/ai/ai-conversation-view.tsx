import React, { useEffect, useRef, useState } from 'react';
import { useAIAssistant } from '../../hooks/useAIAssistant';
import { ScrollArea } from '../ui/scroll-area';
import { Textarea } from '../ui/textarea';
import { Button } from '../ui/button';
import { Send, Loader2, ArrowLeft, Bot, User } from 'lucide-react';
import { cn } from '../ui/utils';
import { ChatMessage } from '../chat-message';
import { useNavigate } from 'react-router-dom';
import { executeClientAction } from '../../lib/client-actions';

interface AIConversationViewProps {
    chatId: string | null;
    onBack: () => void;
}

export function AIConversationView({ chatId, onBack }: AIConversationViewProps) {
    const navigate = useNavigate();
    const { messages, isLoading, loadChat, sendMessage, setMessages } = useAIAssistant(chatId);
    const [inputValue, setInputValue] = useState('');
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (chatId) {
            loadChat(chatId);
        } else {
            setMessages([]);
        }
    }, [chatId, loadChat, setMessages]);

    useEffect(() => {
        // Scroll to bottom on new messages
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [messages]);

    const handleSend = async () => {
        if (!inputValue.trim() || isLoading || !chatId) return;
        const text = inputValue.trim();
        setInputValue('');
        await sendMessage(text);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    if (!chatId) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
                <p>Select a chat or start a new conversation.</p>
                <Button variant="outline" className="mt-4" onClick={onBack}>Back to History</Button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-background">
            {/* Messages */}
            <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
                <div className="space-y-6 pb-4">
                    {messages.length === 0 && (
                        <div className="text-center py-10 opacity-50">
                            <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    )}
                    {messages.map((msg) => (
                        <ChatMessage
                            key={msg.id}
                            message={msg}
                            onAction={async (actionType, payload) => {
                                console.log('Action triggered:', actionType, payload);

                                if (actionType === 'clarification_response') {
                                    // Handle widget clarification response
                                    // payload: { field: string, value: string }
                                    // Send the value as a user message
                                    await sendMessage(payload.value);
                                } else if (actionType === 'action_confirmation') {
                                    // Handle action confirmation
                                    if (payload.confirmed && payload.clientAction) {
                                        executeClientAction(payload.clientAction, navigate);
                                    }
                                    await sendMessage(payload.confirmed ? "Confirmed" : "Cancelled");
                                } else if (actionType === 'widget') { // Legacy support
                                    if (payload.selectedValue) {
                                        await sendMessage(payload.selectedValue);
                                    } else if (payload.confirmed !== undefined) {
                                        if (payload.confirmed && payload.clientAction) {
                                            executeClientAction(payload.clientAction, navigate);
                                        }
                                        await sendMessage(payload.confirmed ? "Confirmed" : "Cancelled");
                                    }
                                }
                            }}
                        />
                    ))}
                    {isLoading && (
                        <div className="flex items-start gap-3 animate-in fade-in duration-300">
                            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
                                <Bot className="w-5 h-5 text-primary" />
                            </div>
                            <div className="bg-muted rounded-lg rounded-tl-none p-4 border border-border shadow-sm">
                                <div className="flex items-center gap-3">
                                    <div className="flex gap-1">
                                        <span className="w-2 h-2 rounded-full bg-primary/60 animate-[bounce_1s_infinite_100ms]"></span>
                                        <span className="w-2 h-2 rounded-full bg-primary/60 animate-[bounce_1s_infinite_200ms]"></span>
                                        <span className="w-2 h-2 rounded-full bg-primary/60 animate-[bounce_1s_infinite_300ms]"></span>
                                    </div>
                                    <span className="text-sm font-medium text-muted-foreground">AI печатает...</span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>

            {/* Input */}
            <div className="p-4 border-t border-border bg-background">
                <div className="relative">
                    <Textarea
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Ask AI anything..."
                        className="min-h-[50px] max-h-[200px] resize-none pr-12"
                        rows={1}
                        disabled={isLoading}
                    />
                    <Button
                        size="icon"
                        className="absolute right-2 bottom-2 h-8 w-8"
                        onClick={handleSend}
                        disabled={!inputValue.trim() || isLoading}
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </div>
                <div className="text-[10px] text-muted-foreground mt-2 flex justify-between px-1">
                    <span>Enter to send, Shift + Enter for new line</span>
                    <span>AI can make mistakes. Verify important info.</span>
                </div>
            </div>
        </div>
    );
}
