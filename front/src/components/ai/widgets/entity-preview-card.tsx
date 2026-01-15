import React from 'react';
import { Card, CardContent, Badge, Box, Flex, Heading, Text, Grid } from '@nicorp/nui';
import { CheckCircle2, ArrowUpRight, FileText, CheckSquare, Folder } from 'lucide-react';

export interface EntityPreviewData {
    type: 'task' | 'project' | 'file';
    title: string;
    id: string;
    status?: string;
    link?: string;
    properties?: Record<string, string>;
}

interface EntityPreviewCardProps {
    data: EntityPreviewData;
}

export function EntityPreviewCard({ data }: EntityPreviewCardProps) {
    const Icon = data.type === 'task' ? CheckSquare : data.type === 'project' ? Folder : FileText;

    return (
        <Card className="border-green-500/20 bg-green-500/5 overflow-hidden">
            <Box className="h-1 bg-green-500/50" />
            <CardContent className="p-4">
                <Flex className="items-start gap-3">
                    <Box className="mt-1 p-1.5 bg-green-500/10 rounded-full text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                    </Box>
                    <Box className="flex-1 space-y-1">
                        <Flex className="items-center justify-between">
                            <Text as="span" className="text-xs font-medium text-green-600 uppercase tracking-wider">
                                {data.type === 'task' ? 'Task Created' : 'Success'}
                            </Text>
                            {data.status && (
                                <Badge variant="outline" className="text-[10px] h-5 px-1.5 border-green-500/20 text-green-700">
                                    {data.status}
                                </Badge>
                            )}
                        </Flex>
                        <Heading level={4} className="text-sm font-bold text-foreground flex items-center gap-2">
                            <Icon className="w-4 h-4 text-muted-foreground" />
                            {data.title}
                        </Heading>

                        {data.properties && (
                            <Grid className="grid-cols-2 gap-2 mt-3 p-3 bg-background/50 rounded border border-border/50 text-xs">
                                {Object.entries(data.properties).map(([key, value]) => (
                                    <Box key={key}>
                                        <Text as="span" className="text-muted-foreground capitalize">{key}: </Text>
                                        <Text as="span" className="font-medium">{value}</Text>
                                    </Box>
                                ))}
                            </Grid>
                        )}

                        {data.link && (
                            <a
                                href={data.link}
                                className="inline-flex items-center gap-1 text-xs text-primary font-medium hover:underline mt-2"
                            >
                                View {data.type} <ArrowUpRight className="w-3 h-3" />
                            </a>
                        )}
                    </Box>
                </Flex>
            </CardContent>
        </Card>
    );
}
