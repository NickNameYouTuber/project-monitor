import React, { useState } from 'react';
import { X, Sparkles, Loader2, StickyNote, GitGraph } from 'lucide-react';
import { generateBrainstormIdeas, generateDiagram, AIGeneratedShape } from '../services/geminiService';

interface AIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (title: string, ideas: string[]) => void;
  onGenerateDiagram: (title: string, shapes: AIGeneratedShape[]) => void;
  isDarkMode: boolean;
}

const AIModal: React.FC<AIModalProps> = ({ isOpen, onClose, onGenerate, onGenerateDiagram, isDarkMode }) => {
  const [topic, setTopic] = useState('');
  const [mode, setMode] = useState<'BRAINSTORM' | 'DIAGRAM'>('BRAINSTORM');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) return;

    setIsLoading(true);
    setError('');
    try {
      if (mode === 'BRAINSTORM') {
          const result = await generateBrainstormIdeas(topic);
          onGenerate(result.title, result.ideas);
      } else {
          const result = await generateDiagram(topic);
          onGenerateDiagram(result.title, result.elements);
      }
      onClose();
      setTopic('');
    } catch (err) {
      setError('Failed to generate. Please check your API key.');
    } finally {
      setIsLoading(false);
    }
  };

  const themeClass = isDarkMode ? 'bg-gray-800 text-gray-100 border-gray-700' : 'bg-white text-gray-900 border-gray-200';
  const inputClass = isDarkMode 
    ? 'bg-gray-900 border-gray-700 text-white focus:border-blue-500' 
    : 'bg-white border-gray-300 text-gray-900 focus:border-blue-600';
  const subTextClass = isDarkMode ? 'text-gray-400' : 'text-gray-500';
  const tabBaseClass = "flex-1 py-2.5 text-sm font-medium rounded-md transition-all duration-200 flex items-center justify-center gap-2";
  const tabActiveClass = isDarkMode 
    ? 'bg-gray-700 text-white shadow-sm' 
    : 'bg-white text-blue-600 shadow-sm border border-gray-200';
  const tabInactiveClass = isDarkMode 
    ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50' 
    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50';

  return (
    <div className="absolute inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm transition-opacity">
      <div 
        className={`w-full max-w-lg rounded-xl shadow-2xl border flex flex-col overflow-hidden transform transition-all scale-100 ${themeClass}`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-gray-700' : 'border-gray-100'}`}>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-blue-900/30 text-blue-400' : 'bg-blue-50 text-blue-600'}`}>
                <Sparkles size={18} />
            </div>
            <h2 className="text-lg font-semibold tracking-tight">AI Assistant</h2>
          </div>
          <button 
            onClick={onClose} 
            className={`p-2 rounded-full transition-colors ${isDarkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'}`}
          >
            <X size={18} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6">
            {/* Tabs */}
            <div className={`flex p-1 rounded-lg mb-6 ${isDarkMode ? 'bg-gray-900' : 'bg-gray-100'}`}>
                <button
                    type="button"
                    onClick={() => setMode('BRAINSTORM')}
                    className={`${tabBaseClass} ${mode === 'BRAINSTORM' ? tabActiveClass : tabInactiveClass}`}
                >
                    <StickyNote size={16} />
                    Brainstorm
                </button>
                <button
                    type="button"
                    onClick={() => setMode('DIAGRAM')}
                    className={`${tabBaseClass} ${mode === 'DIAGRAM' ? tabActiveClass : tabInactiveClass}`}
                >
                    <GitGraph size={16} />
                    Diagram
                </button>
            </div>

            <div className="space-y-4">
                <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${subTextClass}`}>
                        I want to generate...
                    </label>
                    <p className={`text-sm mb-3 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        {mode === 'BRAINSTORM' 
                            ? "A collection of sticky notes with creative ideas about a specific topic." 
                            : "A structured flow diagram connecting concepts with arrows."}
                    </p>
                </div>

                <div>
                    <label className={`block text-xs font-semibold uppercase tracking-wider mb-2 ${subTextClass}`}>
                        Topic
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            value={topic}
                            onChange={(e) => setTopic(e.target.value)}
                            placeholder={mode === 'BRAINSTORM' ? "e.g., Marketing strategies for 2024" : "e.g., User registration flow"}
                            className={`w-full px-4 py-3 rounded-lg border outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm ${inputClass}`}
                            autoFocus
                        />
                    </div>
                </div>
            </div>

            {error && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
                    {error}
                </div>
            )}

            <div className="mt-8 flex justify-end gap-3">
                <button
                type="button"
                onClick={onClose}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isDarkMode 
                    ? 'text-gray-300 hover:bg-gray-700' 
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
                >
                Cancel
                </button>
                <button
                type="submit"
                disabled={isLoading || !topic.trim()}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium shadow-sm hover:shadow flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                {isLoading ? (
                    <>
                    <Loader2 size={16} className="animate-spin" />
                    Generating...
                    </>
                ) : (
                    <>
                    <Sparkles size={16} />
                    Generate
                    </>
                )}
                </button>
            </div>
        </form>
      </div>
    </div>
  );
};

export default AIModal;