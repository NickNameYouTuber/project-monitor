import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { MessageCircleQuestion, Send, Check, ChevronRight } from 'lucide-react';
import { cn } from '../../ui/utils';

export interface ClarificationData {
    question: string;
    field?: string;
    options: Array<{
        value: string;
        label: string;
        description?: string;
    }>;
    multiselect?: boolean;
    allowCustomInput?: boolean;
    customInputPlaceholder?: string;
}

interface ClarificationCardProps {
    data: ClarificationData;
    onSelect: (value: string | string[]) => void;
}

export function ClarificationCard({ data, onSelect }: ClarificationCardProps) {
    const [selected, setSelected] = useState<string | null>(null);
    const [customValue, setCustomValue] = useState('');
    const [submitted, setSubmitted] = useState(false);

    const handleSelect = (value: string) => {
        if (submitted) return;
        setSelected(value);
        setSubmitted(true);
        onSelect(value);
    };

    const handleCustomSubmit = () => {
        if (submitted || !customValue.trim()) return;
        setSubmitted(true);
        onSelect(customValue.trim());
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleCustomSubmit();
        }
    };

    if (submitted) {
        return (
            <div className="flex items-center gap-2 py-2 px-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                <Check className="w-4 h-4 text-primary" />
                <span className="text-primary font-medium">
                    {selected ? data.options?.find(o => o.value === selected)?.label || selected : customValue}
                </span>
            </div>
        );
    }

    return (
        <div className="rounded-xl border border-border bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm overflow-hidden shadow-lg animate-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <div className="px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/20">
                        <MessageCircleQuestion className="w-4 h-4 text-primary" />
                    </div>
                    <span className="text-sm font-semibold text-foreground">{data.question}</span>
                </div>
            </div>

            {/* Options */}
            <div className="p-3 space-y-2">
                {data.options && data.options.length > 0 && (
                    <div className="grid gap-2">
                        {data.options.map((option, idx) => (
                            <button
                                key={option.value}
                                className={cn(
                                    "group flex items-center gap-3 w-full p-3 rounded-lg border transition-all duration-200",
                                    "bg-background/80 hover:bg-background border-border/50 hover:border-primary/50",
                                    "hover:shadow-md hover:scale-[1.01] active:scale-[0.99]",
                                    selected === option.value && "border-primary bg-primary/5"
                                )}
                                onClick={() => handleSelect(option.value)}
                                style={{ animationDelay: `${idx * 50}ms` }}
                            >
                                <div className="flex-1 text-left">
                                    <div className="font-medium text-sm text-foreground">{option.label}</div>
                                    {option.description && (
                                        <div className="text-xs text-muted-foreground mt-0.5">{option.description}</div>
                                    )}
                                </div>
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                            </button>
                        ))}
                    </div>
                )}

                {/* Custom input */}
                {data.allowCustomInput && (
                    <div className="flex gap-2 pt-2">
                        <Input
                            value={customValue}
                            onChange={(e) => setCustomValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={data.customInputPlaceholder || 'Введите свой вариант...'}
                            className="flex-1 bg-background/80 border-border/50 focus:border-primary"
                        />
                        <Button
                            size="icon"
                            onClick={handleCustomSubmit}
                            disabled={!customValue.trim()}
                            className="shrink-0"
                        >
                            <Send className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
