import React, { useRef, useState, useEffect } from 'react';
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
  ChevronUp,
  ChevronDown,
  Undo2,
  Redo2
} from 'lucide-react';
import { ToolType, Shape, SectionShape, ShapeType } from '../types';

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

const ScrollArea = ({ 
    children, 
    className = "", 
    isDarkMode,
    maxHeight
}: { 
    children?: React.ReactNode, 
    className?: string,
    isDarkMode: boolean,
    maxHeight?: string
}) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const [canScrollUp, setCanScrollUp] = useState(false);
    const [canScrollDown, setCanScrollDown] = useState(false);

    const checkScroll = () => {
        if (scrollRef.current) {
            const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
            setCanScrollUp(scrollTop > 0);
            setCanScrollDown(scrollTop + clientHeight < scrollHeight - 1);
        }
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [children]);

    return (
        <div className="relative flex flex-col min-h-0 shrink-0 rounded-inherit w-full">
            {/* Up Indicator */}
            <div className={`absolute top-0 left-0 right-0 h-4 bg-gradient-to-b ${isDarkMode ? 'from-gray-800' : 'from-white'} to-transparent z-10 pointer-events-none flex justify-center items-start pt-0.5 transition-opacity duration-200 ${canScrollUp ? 'opacity-100' : 'opacity-0'}`}>
                <ChevronUp size={10} className={isDarkMode ? 'text-gray-400' : 'text-gray-400'} />
            </div>
            
            <div 
                ref={scrollRef}
                className={`overflow-y-auto overflow-x-hidden ${className}`}
                style={{ 
                    maxHeight,
                    scrollbarWidth: 'none', /* Firefox */
                    msOverflowStyle: 'none'  /* IE 10+ */
                }}
                onScroll={checkScroll}
            >
                <style dangerouslySetInnerHTML={{__html: `
                    .overflow-y-auto::-webkit-scrollbar {
                        display: none;
                    }
                `}} />
                {children}
            </div>

            {/* Down Indicator */}
            <div className={`absolute bottom-0 left-0 right-0 h-4 bg-gradient-to-t ${isDarkMode ? 'from-gray-800' : 'from-white'} to-transparent z-10 pointer-events-none flex justify-center items-end pb-0.5 transition-opacity duration-200 ${canScrollDown ? 'opacity-100' : 'opacity-0'}`}>
                <ChevronDown size={10} className={isDarkMode ? 'text-gray-400' : 'text-gray-400'} />
            </div>
        </div>
    );
};

const Toolbar: React.FC<ToolbarProps> = ({ 
  currentTool, 
  setTool, 
  onOpenAI, 
  isDarkMode, 
  toggleDarkMode,
  onSave,
  onLoad,
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

  const handleMouseEnter = (e: React.MouseEvent, label: string) => {
      const rect = e.currentTarget.getBoundingClientRect();
      setHoveredTooltip({
          label,
          top: rect.top + (rect.height / 2),
          left: rect.right + 12 
      });
  };

  const handleMouseLeave = () => {
      setHoveredTooltip(null);
  };

  const themeClass = isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700';
  const buttonHoverClass = isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100';
  const activeClass = isDarkMode ? 'bg-blue-900/50 text-blue-400' : 'bg-blue-100 text-blue-600';
  const disabledClass = 'opacity-30 cursor-not-allowed';

  const sections = shapes.filter(s => s.type === ShapeType.SECTION) as SectionShape[];

  return (
    <>
        {/* Fixed Tooltip Layer */}
        {hoveredTooltip && (
            <div 
                className="fixed z-[100] px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg pointer-events-none whitespace-nowrap transform -translate-y-1/2 animate-in fade-in zoom-in-95 duration-100 origin-left"
                style={{ top: hoveredTooltip.top, left: hoveredTooltip.left }}
            >
                {hoveredTooltip.label}
                {/* Tiny arrow pointing left */}
                <div className="absolute top-1/2 -left-1 -translate-y-1/2 border-4 border-transparent border-r-gray-900"></div>
            </div>
        )}

        <div className="relative flex flex-col gap-3 z-50 pointer-events-none select-none">
            
            {/* Main Tools Group */}
            <div className={`shadow-xl border rounded-lg flex flex-col pointer-events-auto ${themeClass}`}>
                <ScrollArea isDarkMode={isDarkMode} maxHeight="50vh" className="p-2 gap-2 flex flex-col w-max">
                    {tools.map((t) => (
                        <button
                            key={t.type}
                            onClick={() => setTool(t.type)}
                            onMouseEnter={(e) => handleMouseEnter(e, t.label)}
                            onMouseLeave={handleMouseLeave}
                            className={`p-3 rounded-md transition-colors flex items-center justify-center group relative ${
                                currentTool === t.type 
                                ? activeClass
                                : buttonHoverClass
                            }`}
                            aria-label={t.label}
                        >
                            {t.icon}
                        </button>
                    ))}
                </ScrollArea>
            </div>

            {/* Undo / Redo Group */}
            <div className={`shadow-xl border rounded-lg flex flex-col p-2 gap-2 pointer-events-auto ${themeClass}`}>
                <button
                    onClick={onUndo}
                    disabled={!canUndo}
                    onMouseEnter={(e) => handleMouseEnter(e, "Undo (Ctrl+Z)")}
                    onMouseLeave={handleMouseLeave}
                    className={`p-3 rounded-md transition-colors flex items-center justify-center group relative ${!canUndo ? disabledClass : buttonHoverClass}`}
                    aria-label="Undo"
                >
                    <Undo2 size={20} />
                </button>
                <button
                    onClick={onRedo}
                    disabled={!canRedo}
                    onMouseEnter={(e) => handleMouseEnter(e, "Redo (Ctrl+Y)")}
                    onMouseLeave={handleMouseLeave}
                    className={`p-3 rounded-md transition-colors flex items-center justify-center group relative ${!canRedo ? disabledClass : buttonHoverClass}`}
                    aria-label="Redo"
                >
                    <Redo2 size={20} />
                </button>
            </div>

            {/* Bottom Actions Group */}
            <div className={`shadow-xl border rounded-lg flex flex-col p-2 gap-2 pointer-events-auto ${themeClass}`}>
                <button
                    onClick={onOpenAI}
                    onMouseEnter={(e) => handleMouseEnter(e, "AI Assist")}
                    onMouseLeave={handleMouseLeave}
                    className={`p-3 rounded-md transition-colors flex items-center justify-center group relative text-purple-600 ${isDarkMode ? 'hover:bg-purple-900/30' : 'hover:bg-purple-50'}`}
                    aria-label="AI Brainstorm"
                >
                    <Sparkles size={20} />
                </button>

                {/* Navigation Button Container */}
                <div className="relative flex items-center justify-center">
                    <button
                        onClick={onToggleNav}
                        onMouseEnter={(e) => handleMouseEnter(e, "Navigation")}
                        onMouseLeave={handleMouseLeave}
                        className={`p-3 rounded-md transition-colors flex items-center justify-center group w-full ${isNavOpen ? activeClass : buttonHoverClass}`}
                        aria-label="Section Navigation"
                    >
                        <Map size={20} />
                    </button>

                    {/* Navigation Popover */}
                    {isNavOpen && (
                        <div className={`absolute left-full top-1/2 -translate-y-1/2 ml-4 w-64 rounded-lg shadow-2xl border flex flex-col z-50 ${isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-200' : 'bg-white border-gray-200 text-gray-700'}`}>
                            <div className="flex justify-between items-center p-4 pb-2 border-b border-gray-100/10 mb-1">
                                <h3 className="font-bold text-sm">Sections</h3>
                                <button onClick={onToggleNav} className="hover:text-red-500 transition-colors"><X size={16} /></button>
                            </div>
                            <ScrollArea isDarkMode={isDarkMode} maxHeight="16rem" className="px-4 pb-4 space-y-1">
                                {sections.length === 0 && (
                                    <div className="text-sm italic opacity-50 py-4 text-center">No sections found.</div>
                                )}
                                {sections.map((s) => (
                                    <button 
                                        key={s.id}
                                        onClick={() => onScrollToSection(s)}
                                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-all flex items-center gap-2 group ${isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
                                    >
                                        <Frame size={14} className="opacity-50 group-hover:opacity-100 transition-opacity" />
                                        <span className="truncate">{s.label || "Untitled Section"}</span>
                                    </button>
                                ))}
                            </ScrollArea>
                        </div>
                    )}
                </div>

                <button
                    onClick={toggleDarkMode}
                    onMouseEnter={(e) => handleMouseEnter(e, isDarkMode ? "Light Mode" : "Dark Mode")}
                    onMouseLeave={handleMouseLeave}
                    className={`p-3 rounded-md transition-colors flex items-center justify-center group relative ${buttonHoverClass}`}
                    aria-label="Toggle Theme"
                >
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
            </div>

            <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                accept=".json" 
                className="hidden" 
            />
        </div>
    </>
  );
};

export default Toolbar;