import React, { useRef, useState } from 'react';
import { useTheme } from 'next-themes';
import {
    MousePointer2,
    Square,
    Circle,
    StickyNote,
    Type,
    Pen,
    Hand,
    Sparkles,
    ArrowRight,
    Moon,
    Sun,
    MessageSquare,
    Frame,
    Map,
    X,
    Undo2,
    Redo2
} from 'lucide-react';
import { ToolType, Shape, SectionShape, ShapeType } from '../types';
import { ScrollArea, Separator, Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Box, Flex, Text } from '@nicorp/nui';
import { cn } from '@/lib/utils';

interface ToolbarProps {
    currentTool: ToolType;
    setTool: (tool: ToolType) => void;
    onOpenAI: () => void;
    // Navigation props
    shapes: Shape[];
    onScrollToSection: (s: SectionShape) => void;
    isNavOpen: boolean;
    onToggleNav: () => void;

    // History props
    onUndo: () => void;
    onRedo: () => void;
    canUndo: boolean;
    canRedo: boolean;
}

const Toolbar: React.FC<ToolbarProps> = ({
    currentTool,
    setTool,
    onOpenAI,
    shapes,
    onScrollToSection,
    isNavOpen,
    onToggleNav,
    onUndo,
    onRedo,
    canUndo,
    canRedo
}) => {
    const { theme } = useTheme();
    const isDarkMode = theme === 'dark';
    const [hoveredTooltip, setHoveredTooltip] = useState<{ label: string, top: number, left: number } | null>(null);

    const tools = [
        { type: ToolType.SELECT, icon: <MousePointer2 size={18} />, label: 'Select (V)' },
        { type: ToolType.HAND, icon: <Hand size={18} />, label: 'Hand (H)' },
    ];

    const creationTools = [
        { type: ToolType.RECTANGLE, icon: <Square size={18} />, label: 'Rectangle (R)' },
        { type: ToolType.CIRCLE, icon: <Circle size={18} />, label: 'Circle (C)' },
        { type: ToolType.ARROW, icon: <ArrowRight size={18} />, label: 'Arrow (A)' },
        { type: ToolType.STICKY, icon: <StickyNote size={18} />, label: 'Sticky (S)' },
        { type: ToolType.TEXT, icon: <Type size={18} />, label: 'Text (T)' },
        { type: ToolType.PENCIL, icon: <Pen size={18} />, label: 'Pen (P)' },
    ];

    const sections = shapes.filter(s => s.type === ShapeType.SECTION) as SectionShape[];

    return (
        <Box className={`flex flex-col gap-2 h-full py-6 z-50 pointer-events-auto select-none`} style={{ maxHeight: '100%' }}>

            {/* Main Toolbar Container */}
            <div className="flex flex-col items-center gap-2 p-2 rounded-2xl border shadow-2xl backdrop-blur-md bg-card/95 border-border/50">

                {/* Undo/Redo Group */}
                <div className="flex flex-col gap-1 p-1 w-full bg-muted/30 rounded-lg">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onUndo}
                                    disabled={!canUndo}
                                    className="w-8 h-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
                                >
                                    <Undo2 size={16} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right"><Text>Undo (Ctrl+Z)</Text></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onRedo}
                                    disabled={!canRedo}
                                    className="w-8 h-8 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground disabled:opacity-30"
                                >
                                    <Redo2 size={16} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right"><Text>Redo (Ctrl+Y)</Text></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </div>

                <Separator className="bg-border/50 w-8" />

                {/* Primary Tools */}
                <div className="flex flex-col gap-1 p-1">
                    {tools.map((t) => (
                        <TooltipProvider key={t.type} delayDuration={0}>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => setTool(t.type)}
                                        className={cn(
                                            "w-9 h-9 rounded-xl transition-all duration-200",
                                            currentTool === t.type
                                                ? "bg-primary text-primary-foreground shadow-sm scale-105"
                                                : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        {t.icon}
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right" className="bg-popover text-popover-foreground border-border">
                                    <Text className="text-xs">{t.label}</Text>
                                </TooltipContent>
                            </Tooltip>
                        </TooltipProvider>
                    ))}
                </div>

                <Separator className="bg-border/50 w-8" />

                {/* Creation Tools */}
                <ScrollArea className="flex-1 w-full min-h-0 px-1">
                    <div className="flex flex-col gap-1">
                        {creationTools.map((t) => (
                            <TooltipProvider key={t.type} delayDuration={0}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setTool(t.type)}
                                            className={cn(
                                                "w-9 h-9 rounded-xl transition-all duration-200",
                                                currentTool === t.type
                                                    ? "bg-primary text-primary-foreground shadow-sm scale-105"
                                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                            )}
                                        >
                                            {t.icon}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="bg-popover text-popover-foreground border-border">
                                        <Text className="text-xs">{t.label}</Text>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                    </div>
                </ScrollArea>

                <Separator className="bg-border/50 w-8" />

                {/* AI & Navigation */}
                <div className="flex flex-col gap-2 p-1 w-full mt-auto">
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onOpenAI}
                                    className="w-9 h-9 rounded-xl text-purple-500 hover:bg-purple-100/20 hover:text-purple-600 transition-colors"
                                >
                                    <Sparkles size={18} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right"><Text>AI Assistant</Text></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <Box className="relative flex items-center justify-center w-full">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onToggleNav}
                                        className={cn(
                                            "w-9 h-9 rounded-xl transition-all",
                                            isNavOpen ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        )}
                                    >
                                        <Map size={18} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right"><Text>Navigation</Text></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {/* Navigation Popover */}
                        {isNavOpen && (
                            <div className="absolute left-full top-1/2 -translate-y-1/2 ml-4 w-64 rounded-xl shadow-2xl border flex flex-col z-50 bg-popover text-popover-foreground border-border animate-in fade-in slide-in-from-left-2 duration-200">
                                <div className="flex justify-between items-center p-4 pb-2 border-b border-border/50 mb-1">
                                    <Text className="font-bold text-sm">Sections</Text>
                                    <button onClick={onToggleNav} className="hover:text-destructive transition-colors"><X size={16} /></button>
                                </div>
                                <ScrollArea className="h-64 px-2 pb-2">
                                    <div className="flex flex-col gap-1 p-1">
                                        {sections.length === 0 && (
                                            <Text className="text-sm italic opacity-50 py-4 text-center">No sections found.</Text>
                                        )}
                                        {sections.map((s) => (
                                            <button
                                                key={s.id}
                                                onClick={() => onScrollToSection(s)}
                                                className="w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center gap-2 group hover:bg-muted/50"
                                            >
                                                <Frame size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                                <Text className="truncate">{s.label || "Untitled Section"}</Text>
                                            </button>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        )}
                    </Box>
                </div>
            </div>
        </Box>
    );
};

export default Toolbar;