import React, { useEffect, useRef, useState } from 'react';
import { useAIAssistant } from '../../hooks/useAIAssistant';
import { ScrollArea, Textarea, Button, cn, Box, Flex, Text } from '@nicorp/nui';
import { Send, Loader2, ArrowLeft, Bot, User } from 'lucide-react';
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
            <Flex className="flex-col items-center justify-center h-full text-center p-6 text-muted-foreground">
                <Text>Select a chat or start a new conversation.</Text>
                <Button variant="outline" className="mt-4" onClick={onBack}>Back to History</Button>
            </Flex>
        );
    }

    return (
        <Flex className="flex-col h-full overflow-hidden bg-background">
            {/* Messages */}
            <ScrollArea className="flex-1 min-h-0 p-4" ref={scrollAreaRef}>
                <Box className="space-y-6 pb-4">
                    {messages.length === 0 && (
                        <Box className="text-center py-10 opacity-50">
                            <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
                            <Text>No messages yet. Start the conversation!</Text>
                        </Box>
                    )}
                    {messages
                        .filter(msg => !msg.isWidgetResponse) // Hide widget response messages
                        .map((msg) => {
                            // Check if this message has been answered by looking at the next message in the original array
                            const originalIndex = messages.findIndex(m => m.id === msg.id);
                            const nextMsg = messages[originalIndex + 1];
                            const isAnswered = nextMsg?.isWidgetResponse || false;

                            return (
                                <ChatMessage
                                    key={msg.id}
                                    message={msg}
                                    isAnswered={isAnswered}
                                    onAction={async (actionType, payload) => {
                                        console.log('Action triggered:', actionType, payload);

                                        if (actionType === 'clarification_response') {
                                            // Handle widget clarification response - pass true to hide this message
                                            await sendMessage(payload.value, true);
                                        } else if (actionType === 'action_confirmation') {
                                            if (payload.confirmed && payload.clientAction) {
                                                executeClientAction(payload.clientAction, navigate);
                                            }
                                            await sendMessage(payload.confirmed ? "Confirmed" : "Cancelled", true);
                                        } else if (actionType === 'widget') { // Legacy support
                                            if (payload.selectedValue) {
                                                await sendMessage(payload.selectedValue, true);
                                            } else if (payload.confirmed !== undefined) {
                                                if (payload.confirmed && payload.clientAction) {
                                                    executeClientAction(payload.clientAction, navigate);
                                                }
                                                await sendMessage(payload.confirmed ? "Confirmed" : "Cancelled", true);
                                            }
                                        }
                                    }}
                                />
                            );
                        })}
                    {isLoading && (
                        <Flex className="items-center gap-2 py-2 pl-11 animate-in fade-in duration-300">
                            <Flex className="gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-[bounce_1s_infinite_0ms]"></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-[bounce_1s_infinite_150ms]"></span>
                                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-[bounce_1s_infinite_300ms]"></span>
                            </Flex>
                            <Text as="span" className="text-sm text-muted-foreground">AI печатает</Text>
                        </Flex>
                    )}
                </Box>
            </ScrollArea>

            {/* Input */}
            <Box className="p-4 border-t border-border bg-background">
                <Box className="relative">
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
                </Box>
                <Flex className="text-[10px] text-muted-foreground mt-2 justify-between px-1">
                    <Text as="span">Enter to send, Shift + Enter for new line</Text>
                    <Text as="span">AI can make mistakes. Verify important info.</Text>
                </Flex>
            </Box>
        </Flex>
    );
}
