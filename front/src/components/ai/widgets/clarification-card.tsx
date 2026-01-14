import React, { useState } from 'react';
import { Button, Input, cn, Box, Flex, Text } from '@nicorp/nui';
import { MessageCircleQuestion, Send, Check, ChevronRight } from 'lucide-react';

export interface ClarificationData {
    question: string;
    field?: string;
    options?: Array<{
        value: string;
        label: string;
        description?: string;
    }>;
    multiselect?: boolean;
    allowCustomInput?: boolean;
    customInputPlaceholder?: string;
    // Multi-field support
    fields?: Array<{
        name: string;
        label: string;
        placeholder?: string;
    }>;
}

interface ClarificationCardProps {
    data: ClarificationData;
    isAnswered?: boolean;
    onSelect: (value: string | string[]) => void;
}

export function ClarificationCard({ data, onSelect, isAnswered = false }: ClarificationCardProps) {
    const [selected, setSelected] = useState<string | null>(null);
    const [customValue, setCustomValue] = useState('');
    const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
    const [submitted, setSubmitted] = useState(isAnswered);

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

    const handleMultiFieldSubmit = () => {
        if (submitted) return;
        const values = data.fields?.map(f => fieldValues[f.name]?.trim()).filter(Boolean) || [];
        if (values.length === 0) return;
        setSubmitted(true);
        // Send as comma-separated or array
        onSelect(values.join(', '));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (data.fields && data.fields.length > 0) {
                handleMultiFieldSubmit();
            } else {
                handleCustomSubmit();
            }
        }
    };

    const allFieldsFilled = data.fields?.every(f => fieldValues[f.name]?.trim()) ?? false;

    if (submitted) {
        const displayValue = data.fields && data.fields.length > 0
            ? data.fields.map(f => fieldValues[f.name]).filter(Boolean).join(', ')
            : (selected ? data.options?.find(o => o.value === selected)?.label || selected : customValue);

        return (
            <Flex className="items-center gap-2 py-2 px-3 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                <Check className="w-4 h-4 text-primary" />
                <Text as="span" className="text-primary font-medium">{displayValue}</Text>
            </Flex>
        );
    }

    // Multi-field form
    if (data.fields && data.fields.length > 0) {
        return (
            <Box className="rounded-xl border border-border bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm overflow-hidden shadow-lg animate-in slide-in-from-bottom-2 duration-300">
                <Box className="px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border/50">
                    <Flex className="items-center gap-2">
                        <Box className="p-1.5 rounded-lg bg-primary/20">
                            <MessageCircleQuestion className="w-4 h-4 text-primary" />
                        </Box>
                        <Text as="span" className="text-sm font-semibold text-foreground">{data.question}</Text>
                    </Flex>
                </Box>
                <div className="p-4 space-y-3">
                    {data.fields.map((field, idx) => (
                        <div key={field.name} className="space-y-1">
                            <label className="text-xs font-medium text-muted-foreground">{field.label}</label>
                            <Input
                                value={fieldValues[field.name] || ''}
                                onChange={(e) => setFieldValues(prev => ({ ...prev, [field.name]: e.target.value }))}
                                onKeyDown={handleKeyDown}
                                placeholder={field.placeholder || `Введите ${field.label.toLowerCase()}...`}
                                className="bg-background/80 border-border/50 focus:border-primary"
                                autoFocus={idx === 0}
                            />
                        </div>
                    ))}
                    <Button
                        onClick={handleMultiFieldSubmit}
                        disabled={!allFieldsFilled}
                        className="w-full mt-2"
                    >
                        <Send className="w-4 h-4 mr-2" />
                        Отправить
                    </Button>
                </div>
            </Box>
        );
    }

    return (
        <Box className="rounded-xl border border-border bg-gradient-to-br from-muted/50 to-muted/30 backdrop-blur-sm overflow-hidden shadow-lg animate-in slide-in-from-bottom-2 duration-300">
            {/* Header */}
            <Box className="px-4 py-3 bg-gradient-to-r from-primary/10 to-primary/5 border-b border-border/50">
                <Flex className="items-center gap-2">
                    <Box className="p-1.5 rounded-lg bg-primary/20">
                        <MessageCircleQuestion className="w-4 h-4 text-primary" />
                    </Box>
                    <Text as="span" className="text-sm font-semibold text-foreground">{data.question}</Text>
                </Flex>
            </Box>

            {/* Options */}
            <Box className="p-3 space-y-2">
                {data.options && data.options.length > 0 && (
                    <Box className="grid gap-2">
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
                            >
                                <Box className="flex-1 text-left">
                                    <Box className="font-medium text-sm text-foreground">{option.label}</Box>
                                    {option.description && (
                                        <Text className="text-xs text-muted-foreground mt-0.5">{option.description}</Text>
                                    )}
                                </Box>
                                <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                            </button>
                        ))}
                    </Box>
                )}

                {/* Custom input */}
                {data.allowCustomInput && (
                    <Flex className="gap-2 pt-2">
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
                    </Flex>
                )}
            </Box>
        </Box>
    );
}

