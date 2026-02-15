import React, { useState } from 'react';
import { Button, Input, ChatFollowUp, Box, Flex, Text } from '@nicorp/nui';
import { Send, Check } from 'lucide-react';

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

    const handleCustomSubmit = (text?: string) => {
        const valueToSubmit = text || customValue.trim();
        if (submitted || !valueToSubmit) return;
        setSubmitted(true);
        onSelect(valueToSubmit);
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
            <Box className="rounded-lg border border-border bg-muted/50 overflow-hidden">
                <Box className="px-4 py-3 border-b border-border/50">
                    <Text as="span" className="text-sm font-semibold text-foreground">{data.question}</Text>
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
        <Box className="space-y-2">
            {/* Options with ChatFollowUp */}
            {data.options && data.options.length > 0 && (
                <ChatFollowUp
                    question={data.question}
                    options={data.options.map(opt => ({
                        id: opt.value,
                        label: opt.label,
                        description: opt.description
                    }))}
                    onSelect={(optionId, label) => handleSelect(optionId)}
                    selected={selected || undefined}
                    allowFreeText={data.allowCustomInput}
                    onFreeTextSubmit={handleCustomSubmit}
                    columns={data.options.length > 2 ? 2 : 1}
                />
            )}

            {/* Custom input only (no options) */}
            {(!data.options || data.options.length === 0) && data.allowCustomInput && (
                <Flex className="gap-2">
                    <Input
                        value={customValue}
                        onChange={(e) => setCustomValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={data.customInputPlaceholder || 'Введите свой вариант...'}
                        className="flex-1 bg-background/80 border-border/50 focus:border-primary"
                    />
                    <Button
                        size="icon"
                        onClick={() => handleCustomSubmit()}
                        disabled={!customValue.trim()}
                        className="shrink-0"
                    >
                        <Send className="w-4 h-4" />
                    </Button>
                </Flex>
            )}
        </Box>
    );
}

