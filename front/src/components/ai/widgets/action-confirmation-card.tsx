import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter, Button, cn, Box, Flex, Text } from '@nicorp/nui';
import { AlertTriangle, Check, X } from 'lucide-react';

import { ClientAction } from '../../../lib/client-actions';

export interface ActionConfirmationData {
    title: string;
    description: string;
    actionId: string;
    actionLabel?: string;
    isDangerous?: boolean;
    clientAction?: ClientAction;
}

interface ActionConfirmationCardProps {
    data: ActionConfirmationData;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ActionConfirmationCard({ data, onConfirm, onCancel }: ActionConfirmationCardProps) {
    const [isConfirmed, setIsConfirmed] = useState(false);

    const handleConfirm = () => {
        setIsConfirmed(true);
        onConfirm();
    };

    if (isConfirmed) {
        return (
            <Flex className="items-center gap-2 p-3 bg-muted/50 rounded border border-border/50 text-sm text-muted-foreground animate-in fade-in">
                <Check className="w-4 h-4 text-green-500" />
                <Text as="span">Action confirmed.</Text>
            </Flex>
        );
    }

    return (
        <Card className={cn(
            "overflow-hidden shadow-sm",
            data.isDangerous ? "border-destructive/20 bg-destructive/5" : "border-primary/20 bg-primary/5"
        )}>
            <div className={cn("h-1", data.isDangerous ? "bg-destructive/50" : "bg-primary/50")} />
            <CardHeader className="pb-2 pt-4 px-4">
                <Flex className="items-center gap-2">
                    {data.isDangerous && <AlertTriangle className="w-4 h-4 text-destructive" />}
                    <CardTitle className="text-sm font-semibold text-foreground">{data.title}</CardTitle>
                </Flex>
            </CardHeader>
            <CardContent className="px-4 pb-3">
                <Text className="text-sm text-foreground/80 leading-relaxed">{data.description}</Text>
            </CardContent>
            <CardFooter className="px-4 pb-4 pt-0 gap-2 flex justify-end">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onCancel}
                    className="h-8 hover:bg-background/50"
                >
                    Cancel
                </Button>
                <Button
                    variant={data.isDangerous ? "destructive" : "default"}
                    size="sm"
                    onClick={handleConfirm}
                    className="h-8 shadow-sm"
                >
                    {data.actionLabel || 'Confirm'}
                </Button>
            </CardFooter>
        </Card>
    );
}
