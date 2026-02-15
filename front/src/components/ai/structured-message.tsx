import React from 'react';
import { ChatMessage as ChatMsg, Widget } from '../../api/chat';
import {
    MarkdownRenderer,
    ChatQuestion, ChatActionCard, ChatEntityPreview, ChatResultCard,
    cn,
} from '@nicorp/nui';
import { useNavigate } from 'react-router-dom';

// ---------------------------------------------------------------------------
// StructuredMessage — renders an AI message with markdown + widgets
// Widgets render inside a styled container matching the new chat design.
// All widget.data access is null-safe via helper `d()`.
// ---------------------------------------------------------------------------

interface StructuredMessageProps {
    message: ChatMsg;
    isAnswered?: boolean;
    onAction?: (actionId: string, value: Record<string, any>) => void;
}

/** Safe accessor for widget.data fields */
function d(widget: Widget, key: string, fallback: any = ''): any {
    if (!widget.data || typeof widget.data !== 'object') return fallback;
    const val = (widget.data as Record<string, any>)[key];
    return val ?? fallback;
}

export function StructuredMessage({ message, isAnswered, onAction }: StructuredMessageProps) {
    const navigate = useNavigate();
    const widgets = Array.isArray(message.widgets) ? message.widgets : [];

    return (
        <div className="space-y-3 w-full">
            {/* Markdown text in a bubble */}
            {message.content && (
                <div className={cn(
                    "rounded-2xl rounded-tl-sm px-4 py-3",
                    "bg-muted/60 text-foreground",
                    "border border-border/30",
                )}>
                    <div className="prose dark:prose-invert prose-sm max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:leading-relaxed [&_pre]:rounded-lg [&_code]:text-[13px]">
                        <MarkdownRenderer content={message.content} />
                    </div>
                </div>
            )}

            {/* Widgets */}
            {widgets.length > 0 && (
                <div className="space-y-2.5 pl-0.5">
                    {widgets.map((widget, idx) => (
                        <div key={widget.id || idx} className="animate-in fade-in-0 slide-in-from-bottom-1 duration-300" style={{ animationDelay: `${idx * 80}ms` }}>
                            <RenderWidget
                                widget={widget}
                                messageId={message.id}
                                isAnswered={isAnswered}
                                onAction={onAction}
                                navigate={navigate}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Widget renderer
// ---------------------------------------------------------------------------

interface RenderWidgetProps {
    widget: Widget;
    messageId: string;
    isAnswered?: boolean;
    onAction?: (actionId: string, value: Record<string, any>) => void;
    navigate: ReturnType<typeof useNavigate>;
}

function RenderWidget({ widget, messageId, isAnswered, onAction, navigate }: RenderWidgetProps) {
    if (!widget.data || typeof widget.data !== 'object') return null;

    switch (widget.type) {
        // ── Question with options ──────────────────────────────────────
        case 'clarification': {
            const rawOptions = d(widget, 'options', []);
            const options = Array.isArray(rawOptions) ? rawOptions : [];

            return (
                <ChatQuestion
                    id={widget.id || `${messageId}-q-${Math.random().toString(36).slice(2, 6)}`}
                    question={String(d(widget, 'question'))}
                    options={options.map((o: any) => ({
                        id: String(o?.value ?? o?.id ?? ''),
                        label: String(o?.label ?? o?.value ?? o?.id ?? ''),
                        description: o?.description ? String(o.description) : undefined,
                    }))}
                    selectedId={widget.selectedValue ?? null}
                    disabled={isAnswered || !!widget.selectedValue}
                    allowFreeText={!!d(widget, 'allowCustomInput', false)}
                    columns={options.length > 2 ? 2 : 1}
                    onSelect={(optionId, label) => {
                        onAction?.('clarification_response', {
                            field: d(widget, 'field'),
                            value: label,
                            optionId,
                            widgetId: widget.id ?? '',
                            widgetType: 'clarification',
                        });
                    }}
                    onFreeTextSubmit={(text) => {
                        onAction?.('clarification_response', {
                            field: d(widget, 'field'),
                            value: text,
                            widgetId: widget.id ?? '',
                            widgetType: 'clarification',
                        });
                    }}
                />
            );
        }

        // ── Entity preview (task / project / file) ────────────────────
        case 'entity_preview': {
            const link = d(widget, 'link', '');
            return (
                <ChatEntityPreview
                    type={d(widget, 'type', 'task')}
                    title={String(d(widget, 'title'))}
                    id={d(widget, 'id', undefined)}
                    status={d(widget, 'status', undefined)}
                    properties={d(widget, 'properties', null)}
                    onNavigate={link ? () => navigate(link) : undefined}
                />
            );
        }

        // ── Action confirmation ("Do you want to …?") ────────────────
        case 'action_confirmation': {
            return (
                <ChatActionCard
                    type="info"
                    title={String(d(widget, 'title'))}
                    description={d(widget, 'description', undefined)}
                    action={
                        !isAnswered && !widget.selectedValue
                            ? {
                                  label: String(d(widget, 'actionLabel', 'Подтвердить')),
                                  onClick: () => {
                                      onAction?.('action_confirmation', {
                                          confirmed: true,
                                          clientAction: d(widget, 'clientAction', null),
                                          widgetId: widget.id ?? '',
                                          widgetType: 'action_confirmation',
                                      });
                                  },
                              }
                            : undefined
                    }
                />
            );
        }

        // ── Action result / notification ──────────────────────────────
        case 'action_notification':
        case 'action_result': {
            const link = d(widget, 'link', '');
            const linkText = String(d(widget, 'linkText', 'Перейти'));
            const title = String(d(widget, 'message', d(widget, 'title', 'Готово')));

            return (
                <ChatResultCard
                    title={title}
                    description={d(widget, 'description', undefined)}
                    linkLabel={linkText}
                    onNavigate={link ? () => navigate(link) : undefined}
                    metadata={d(widget, 'metadata', null)}
                    variant={widget.type === 'action_result' ? 'highlight' : 'success'}
                />
            );
        }

        default:
            return null;
    }
}
