import React from 'react';
import { ChatMessage, Action, Widget } from '../../api/chat';
import { cn } from '../ui/utils';
import { ClarificationCard } from './widgets/clarification-card';
import { EntityPreviewCard } from './widgets/entity-preview-card';
import { ActionConfirmationCard } from './widgets/action-confirmation-card';
import { Loader2 } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ActionCard } from '../action-card';

interface StructuredMessageProps {
    message: ChatMessage;
    isAnswered?: boolean;
    onAction?: (actionId: string, value: any) => void;
}

export function StructuredMessage({ message, isAnswered, onAction }: StructuredMessageProps) {
    // Get widgets from the message (new format)
    const widgets = message.widgets || [];

    // Legacy support: check if the message has widget actions
    const widgetAction = message.actions?.find(a => a.type === 'widget');
    const legacyActions = message.actions?.filter(a => a.notification) || [];

    return (
        <div className="space-y-3 w-full">
            {/* Text Content with Markdown */}
            {message.content && (
                <div className="prose dark:prose-invert prose-sm max-w-none prose-headings:text-foreground prose-p:text-foreground prose-strong:text-foreground prose-code:text-foreground">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            p: ({ children }) => <p className="mb-2 last:mb-0 text-foreground">{children}</p>,
                            code: ({ children, className }) => {
                                const isInline = !className || !String(className).includes('language-');
                                return isInline ? (
                                    <code className="bg-muted text-foreground px-1 py-0.5 rounded text-xs font-mono">
                                        {children}
                                    </code>
                                ) : (
                                    <code className="block bg-muted text-foreground p-2 rounded text-xs overflow-x-auto font-mono">
                                        {children}
                                    </code>
                                );
                            },
                            pre: ({ children }) => <pre className="mb-2 bg-muted p-2 rounded overflow-x-auto">{children}</pre>,
                            ul: ({ children }) => <ul className="list-disc list-inside mb-2 text-foreground">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal list-inside mb-2 text-foreground">{children}</ol>,
                            li: ({ children }) => <li className="text-foreground">{children}</li>,
                            a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{children}</a>
                        }}
                    >
                        {message.content}
                    </ReactMarkdown>
                </div>
            )}

            {/* New Widgets (from widgets array) */}
            {widgets.length > 0 && (
                <div className="space-y-2 mt-2">
                    {widgets.map((widget, index) => (
                        <div key={index} className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {renderWidgetFromType(widget, onAction, isAnswered)}
                        </div>
                    ))}
                </div>
            )}

            {/* Legacy Widget Content (from actions) */}
            {widgetAction && widgets.length === 0 && (
                <div className="mt-2 animate-in fade-in slide-in-from-bottom-2 duration-500">
                    {renderLegacyWidget(widgetAction, onAction, isAnswered)}
                </div>
            )}

            {/* Legacy Actions (Notifications) */}
            {legacyActions.length > 0 && (
                <div className="space-y-2 mt-2">
                    {legacyActions.map((action, index) => (
                        action.notification && (
                            <ActionCard
                                key={index}
                                message={action.notification.message}
                                link={action.notification.link}
                                linkText={action.notification.linkText}
                                type="success"
                            />
                        )
                    ))}
                </div>
            )}
        </div>
    );
}

function renderWidgetFromType(widget: Widget, onAction?: (actionId: string, value: any) => void, isAnswered?: boolean) {
    switch (widget.type) {
        case 'clarification':
            return (
                <ClarificationCard
                    data={widget.data}
                    isAnswered={isAnswered}
                    onSelect={(value) => onAction?.('clarification_response', {
                        field: widget.data.field,
                        value
                    })}
                />
            );
        case 'entity_preview':
            return (
                <EntityPreviewCard data={widget.data} />
            );
        case 'action_confirmation':
            return (
                <ActionConfirmationCard
                    data={widget.data}
                    onConfirm={() => onAction?.('action_confirmation', { confirmed: true })}
                    onCancel={() => onAction?.('action_confirmation', { confirmed: false })}
                />
            );
        default:
            return (
                <div className="p-3 border border-dashed border-yellow-500/50 bg-yellow-500/10 rounded text-xs text-yellow-600">
                    Unsupported widget type: {widget.type}
                </div>
            );
    }
}

function renderLegacyWidget(action: Action, onAction?: (actionId: string, value: any) => void, isAnswered?: boolean) {
    const { widgetType, data } = action.params;

    switch (widgetType) {
        case 'clarification':
            return (
                <ClarificationCard
                    data={data}
                    isAnswered={isAnswered}
                    onSelect={(value) => onAction?.(action.type, { ...data, selectedValue: value })}
                />
            );
        case 'entity_preview':
            return (
                <EntityPreviewCard data={data} />
            );
        case 'action_confirmation':
            return (
                <ActionConfirmationCard
                    data={data}
                    onConfirm={() => onAction?.(action.type, { confirmed: true })}
                    onCancel={() => onAction?.(action.type, { confirmed: false })}
                />
            );
        default:
            return (
                <div className="p-3 border border-dashed border-yellow-500/50 bg-yellow-500/10 rounded text-xs text-yellow-600">
                    Unsupported widget type: {widgetType}
                </div>
            );
    }
}

