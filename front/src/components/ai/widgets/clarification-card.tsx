import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { HelpCircle } from 'lucide-react';
import { cn } from '../../ui/utils';

export interface ClarificationData {
    question: string;
    options: Array<{
        value: string;
        label: string;
        description?: string;
    }>;
    multiselect?: boolean;
}

interface ClarificationCardProps {
    data: ClarificationData;
    onSelect: (value: string | string[]) => void;
}

export function ClarificationCard({ data, onSelect }: ClarificationCardProps) {
    const [selected, setSelected] = useState<string | null>(null);

    const handleSelect = (value: string) => {
        setSelected(value);
        onSelect(value);
    };

    return (
        <Card className="border-primary/20 bg-primary/5 shadow-sm overflow-hidden">
            <CardHeader className="pb-3 pt-4 px-4 bg-primary/10 border-b border-primary/10">
                <div className="flex items-center gap-2 text-primary">
                    <HelpCircle className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Clarification Needed</span>
                </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
                <p className="text-sm font-medium leading-normal">{data.question}</p>
                <div className="flex flex-col gap-2">
                    {data.options.map((option) => (
                        <Button
                            key={option.value}
                            variant="outline"
                            className={cn(
                                "justify-start h-auto py-3 px-3 relative border-border/50 hover:bg-background/80",
                                selected === option.value && "border-primary bg-primary/5 text-primary"
                            )}
                            onClick={() => handleSelect(option.value)}
                        >
                            <div className="text-left">
                                <div className="font-semibold text-sm">{option.label}</div>
                                {option.description && (
                                    <div className="text-xs text-muted-foreground font-normal mt-0.5 opacity-90">
                                        {option.description}
                                    </div>
                                )}
                            </div>
                            {selected === option.value && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary" />
                            )}
                        </Button>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}
