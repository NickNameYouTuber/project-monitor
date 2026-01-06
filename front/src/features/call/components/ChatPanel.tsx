import React, { useState } from 'react';
import { Send, X } from 'lucide-react';
import { cn } from '@/components/ui/utils';

interface ChatMessage {
    id: string;
    sender: string;
    text: string;
    timestamp: number;
}

interface ChatPanelProps {
    isOpen: boolean;
    onClose: () => void;
    messages: ChatMessage[];
    onSendMessage: (text: string) => void;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({
    isOpen,
    onClose,
    messages,
    onSendMessage,
}) => {
    const [input, setInput] = useState('');

    const handleSend = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            onSendMessage(input);
            setInput('');
        }
    };

    return (
        <>
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onClose}
                />
            )}
            <div className={cn(
                "fixed top-0 right-0 h-full bg-card shadow-lg transform transition-transform duration-300 ease-in-out z-50 flex flex-col",
                "w-full md:w-80",
                "pt-12 md:pt-16 pb-20 md:pb-20",
                "border-l border-border",
                isOpen ? "translate-x-0" : "translate-x-full"
            )}>
                <div className="flex items-center justify-between px-3 md:px-4 py-3 md:py-2 border-b border-border">
                    <h3 className="font-semibold text-base md:text-lg">In-Call Messages</h3>
                    <button
                        onClick={onClose}
                        className="p-2 md:p-1 hover:bg-secondary rounded min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-4">
                    {messages.map((msg) => (
                        <div key={msg.id} className="flex flex-col">
                            <div className="flex items-baseline gap-2">
                                <span className="font-bold text-sm">{msg.sender}</span>
                                <span className="text-xs text-muted-foreground">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                            </div>
                            <p className="bg-secondary/50 p-2 rounded-md mt-1 text-sm">{msg.text}</p>
                        </div>
                    ))}
                </div>

                <form onSubmit={handleSend} className="p-3 md:p-4 border-t border-border bg-card">
                    <div className="flex gap-2">
                        <input
                            className="flex-1 bg-secondary rounded-md px-3 py-3 md:py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                            placeholder="Type a message..."
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                        />
                        <button
                            type="submit"
                            className="bg-primary text-primary-foreground p-3 md:p-2 rounded-md hover:bg-primary/90 min-w-[44px] min-h-[44px] md:min-w-0 md:min-h-0 flex items-center justify-center"
                        >
                            <Send className="w-5 h-5 md:w-4 md:h-4" />
                        </button>
                    </div>
                </form>
            </div>
        </>
    );
};
