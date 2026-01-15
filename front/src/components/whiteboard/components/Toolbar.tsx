import React, { useRef, useState } from 'react';
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
    Redo2,
    FileUp,
    Save
} from 'lucide-react';
import { ToolType, Shape, SectionShape, ShapeType } from '../types';
import { ScrollArea, Separator, Button, Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, Box, Flex, Text } from '@nicorp/nui';
import { cn } from '@/lib/utils';

interface ToolbarProps {
    currentTool: ToolType;
    setTool: (tool: ToolType) => void;
    onOpenAI: () => void;
    isDarkMode: boolean;
    toggleDarkMode: () => void;
    onSave: () => void;
    onLoad: (file: File) => void;
    isSaving?: boolean;
    lastSaved?: Date | null;

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
    isDarkMode,
    toggleDarkMode,
    onSave,
    onLoad,
    isSaving,
    lastSaved,
    shapes,
    onScrollToSection,
    isNavOpen,
    onToggleNav,
    onUndo,
    onRedo,
    canUndo,
    canRedo
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [hoveredTooltip, setHoveredTooltip] = useState<{ label: string, top: number, left: number } | null>(null);

    const tools = [
        { type: ToolType.SELECT, icon: <MousePointer2 size={20} />, label: 'Select (V)' },
        { type: ToolType.HAND, icon: <Hand size={20} />, label: 'Pan (H)' },
        { type: ToolType.SECTION, icon: <Frame size={20} />, label: 'Section' },
        { type: ToolType.COMMENT, icon: <MessageSquare size={20} />, label: 'Comment' },
        { type: ToolType.RECTANGLE, icon: <Square size={20} />, label: 'Rectangle (R)' },
        { type: ToolType.CIRCLE, icon: <Circle size={20} />, label: 'Circle (C)' },
        { type: ToolType.ARROW, icon: <ArrowRight size={20} />, label: 'Arrow (A)' },
        { type: ToolType.STICKY, icon: <StickyNote size={20} />, label: 'Sticky Note (S)' },
        { type: ToolType.TEXT, icon: <Type size={20} />, label: 'Text (T)' },
        { type: ToolType.PENCIL, icon: <Pen size={20} />, label: 'Pen (P)' },
    ];

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            onLoad(file);
        }
        e.target.value = '';
    };

    const activeClass = isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600';
    const buttonHoverClass = isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100';

    const sections = shapes.filter(s => s.type === ShapeType.SECTION) as SectionShape[];

    return (
        <Box className={`flex flex-col gap-2 h-full py-2 z-50 pointer-events-auto transition-all duration-300 ${isNavOpen ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0 lg:translate-x-0 lg:opacity-100'
            } lg:transform-none`}>

            {/* Main Toolbar Container */}
            <Box className={`flex-1 flex flex-col items-center gap-0 p-0 rounded-xl border shadow-xl backdrop-blur-sm transition-colors overflow-hidden ${isDarkMode
                ? 'bg-gray-900/90 border-gray-700 shadow-black/20'
                : 'bg-white/90 border-gray-200 shadow-gray-200/50'
                }`}>

                {/* Undo/Redo Group */}
                <Flex className={`flex-col items-center gap-1 p-1 w-full ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100/50'}`}>
                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onUndo}
                                    disabled={!canUndo}
                                    className={`rounded-md hover:bg-transparent ${!canUndo ? 'opacity-30' : ''} ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    <Undo2 size={18} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right"><Text>Undo (Ctrl+Z)</Text></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider delayDuration={300}>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onRedo}
                                    disabled={!canRedo}
                                    className={`rounded-md hover:bg-transparent ${!canRedo ? 'opacity-30' : ''} ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-gray-900'}`}
                                >
                                    <Redo2 size={18} />
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right"><Text>Redo (Ctrl+Y)</Text></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </Flex>

                <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />

                {/* Tools Scroll Area */}
                <ScrollArea className="flex-1 w-full">
                    <Flex className="flex-col items-center gap-2 p-2">
                        {tools.map((t) => (
                            <TooltipProvider key={t.type} delayDuration={0}>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setTool(t.type)}
                                            className={cn(
                                                "w-10 h-10 rounded-lg transition-all duration-200 relative group",
                                                currentTool === t.type
                                                    ? (isDarkMode
                                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/50 scale-105'
                                                        : 'bg-blue-600 text-white shadow-lg shadow-blue-200 scale-105')
                                                    : (isDarkMode
                                                        ? 'text-gray-400 hover:bg-gray-800 hover:text-gray-100'
                                                        : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900')
                                            )}
                                        >
                                            {t.icon}
                                            {/* Active Indicator Dot */}
                                            {currentTool === t.type && (
                                                <Box className="absolute -right-1 top-1/2 -translate-y-1/2 w-1 h-1 rounded-full bg-white opacity-50" />
                                            )}
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="flex items-center gap-2">
                                        <Text className="font-semibold">{t.label}</Text>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        ))}
                    </Flex>
                </ScrollArea>

                <Separator className={isDarkMode ? 'bg-gray-700' : 'bg-gray-200'} />

                {/* AI Button */}
                <TooltipProvider delayDuration={0}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={onOpenAI}
                                className={`w-10 h-10 rounded-lg transition-all duration-300 group ${isDarkMode
                                    ? 'bg-gradient-to-br from-purple-900/50 to-blue-900/50 text-blue-300 hover:from-purple-800/50 hover:to-blue-800/50 border border-blue-500/30'
                                    : 'bg-gradient-to-br from-purple-50 to-blue-50 text-blue-600 hover:from-purple-100 hover:to-blue-100 border border-blue-200'
                                    }`}
                            >
                                <Sparkles size={20} className="animate-pulse" />
                            </Button>
                        </TooltipTrigger>
                        <TooltipContent side="right" className="bg-gradient-to-r from-purple-600 to-blue-600 border-none text-white">
                            <Flex className="items-center gap-2">
                                <Sparkles size={14} />
                                <Text className="font-semibold">AI Assistant</Text>
                            </Flex>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>

                {/* Actions Group */}
                <Flex className={`flex-col items-center gap-1 p-1 w-full mt-auto ${isDarkMode ? 'bg-gray-800/50' : 'bg-gray-100/50'}`}>
                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <label className={`w-8 h-8 flex items-center justify-center rounded-md cursor-pointer transition-colors ${isDarkMode
                                    ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
                                    }`}>
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".json"
                                        onChange={handleFileChange}
                                        ref={fileInputRef}
                                    />
                                    <FileUp size={18} />
                                </label>
                            </TooltipTrigger>
                            <TooltipContent side="right"><Text>Load Board</Text></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={onSave}
                                    disabled={isSaving}
                                    className={`rounded-md transition-colors ${isDarkMode
                                        ? 'text-gray-400 hover:text-white hover:bg-gray-700'
                                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-200'
                                        }`}
                                >
                                    {isSaving ? <Box className="w-4 h-4 rounded-full border-2 border-current border-t-transparent animate-spin" /> : <Save size={18} />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right">
                                <Flex className="flex-col gap-0.5">
                                    <Text>Save Board</Text>
                                    {lastSaved && <Text className="text-[10px] opacity-70">Saved {new Date(lastSaved).toLocaleTimeString()}</Text>}
                                </Flex>
                            </TooltipContent>
                        </Tooltip>
                    </TooltipProvider>

                    {/* Navigation Button Container */}
                    <Box className="relative flex items-center justify-center w-full">
                        <TooltipProvider>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        onClick={onToggleNav}
                                        className={`rounded-md transition-colors w-full ${isNavOpen ? activeClass : buttonHoverClass}`}
                                    >
                                        <Map size={18} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="right"><Text>Navigation</Text></TooltipContent>
                            </Tooltip>
                        </TooltipProvider>

                        {/* Navigation Popover */}
                        {isNavOpen && (
                            <Box className={`absolute left-full top-1/2 -translate-y-1/2 ml-4 w-64 rounded-lg shadow-2xl border flex flex-col z-50 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'}`}>
                                <Flex className="justify-between items-center p-4 pb-2 border-b border-gray-100/10 mb-1">
                                    <Text className="font-bold text-sm">Sections</Text>
                                    <button onClick={onToggleNav} className="hover:text-red-500 transition-colors"><X size={16} /></button>
                                </Flex>
                                <ScrollArea className="h-64 px-4 pb-4">
                                    <Flex className="flex-col gap-1">
                                        {sections.length === 0 && (
                                            <Text className="text-sm italic opacity-50 py-4 text-center">No sections found.</Text>
                                        )}
                                        {sections.map((s) => (
                                            <button
                                                key={s.id}
                                                onClick={() => onScrollToSection(s)}
                                                className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all flex items-center gap-2 group ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                                            >
                                                <Frame size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                                <Text className="truncate">{s.label || "Untitled Section"}</Text>
                                            </button>
                                        ))}
                                    </Flex>
                                </ScrollArea>
                            </Box>
                        )}
                    </Box>

                    <TooltipProvider>
                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={toggleDarkMode}
                                    className={`rounded-md transition-colors ${isDarkMode
                                        ? 'text-yellow-400 hover:bg-gray-700'
                                        : 'text-slate-700 hover:bg-gray-200'
                                        }`}
                                >
                                    {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                                </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right"><Text>Toggle Theme</Text></TooltipContent>
                        </Tooltip>
                    </TooltipProvider>
                </Flex>
            </Box>
        </Box>
    );
};

export default Toolbar;