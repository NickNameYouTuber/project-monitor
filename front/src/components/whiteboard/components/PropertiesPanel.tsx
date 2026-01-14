import React, { useState, useEffect } from 'react';
import { COLORS, STROKE_COLORS, Shape, ShapeType, ArrowShape, SectionShape } from '../types';
import { Trash2, MoveRight, Circle as CircleIcon, Minus, Palette, X } from 'lucide-react';
import { getProjectTasks, linkElementToTask, unlinkElementFromTask } from '../../../api/whiteboards';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button, Input, Box, Flex, Separator } from '@nicorp/nui';

interface PropertiesPanelProps {
  selectedShape: Shape | null;
  updateShape: (id: string, updates: Partial<Shape>, saveHistory?: boolean) => void;
  deleteShape: (id: string) => void;
  isDarkMode: boolean;
  projectId?: string | null;
  elementId?: string | null;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedShape, updateShape, deleteShape, isDarkMode, projectId, elementId }) => {
  if (!selectedShape) return null;

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const section = selectedShape.type === ShapeType.SECTION ? selectedShape as SectionShape : null;

  useEffect(() => {
    if (projectId && selectedShape.type === ShapeType.SECTION) {
      setLoading(true);
      getProjectTasks(projectId)
        .then(setTasks)
        .catch(console.error)
        .finally(() => setLoading(false));
    }
  }, [projectId, selectedShape]);

  const handleLinkTask = async (taskId: string) => {
    if (!elementId) return;
    try {
      await linkElementToTask(elementId, taskId);
      const taskIds = section?.taskIds || [];
      if (!taskIds.includes(taskId)) {
        updateShape(selectedShape.id, { taskIds: [...taskIds, taskId] } as Partial<SectionShape>, true);
      }
    } catch (error) {
      console.error('Failed to link task:', error);
    }
  };

  const handleUnlinkTask = async (taskId: string) => {
    if (!elementId) return;
    try {
      await unlinkElementFromTask(elementId);
      const taskIds = section?.taskIds || [];
      updateShape(selectedShape.id, { taskIds: taskIds.filter(id => id !== taskId) } as Partial<SectionShape>, true);
    } catch (error) {
      console.error('Failed to unlink task:', error);
    }
  };

  const themeClass = isDarkMode ? 'bg-gray-800 border-gray-700 text-gray-200 shadow-xl' : 'bg-white border-gray-200 text-gray-700 shadow-md';
  const separatorClass = isDarkMode ? 'bg-gray-600' : 'bg-gray-200';

  // Removed absolute positioning, added pointer-events-auto
  return (
    <Box className={`border rounded-lg flex items-center p-2 gap-4 z-50 pointer-events-auto ${themeClass}`}>

      {selectedShape.type === ShapeType.SECTION && (
        <>
          <Flex className="items-center gap-2">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Label</span>
            <Input
              type="text"
              value={section?.label || ''}
              onChange={(e) => updateShape(selectedShape.id, { label: e.target.value } as Partial<SectionShape>, true)}
              className="h-7 w-32 px-2 text-sm"
            />
            <Separator orientation="vertical" className="h-6" />
          </Flex>
          {projectId && (
            <>
              <Flex className="items-center gap-2">
                <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Задача</span>
                <Select onValueChange={handleLinkTask} disabled={loading}>
                  <SelectTrigger className="w-40 h-8 text-xs">
                    <SelectValue placeholder="Выбрать задачу" />
                  </SelectTrigger>
                  <SelectContent>
                    {tasks.map(task => (
                      <SelectItem key={task.id} value={task.id}>
                        {task.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Flex>
              {section?.taskIds && section.taskIds.length > 0 && (
                <Flex className="items-center gap-1 flex-wrap">
                  {section.taskIds.map(taskId => {
                    const task = tasks.find(t => t.id === taskId);
                    return task ? (
                      <Flex key={taskId} className={`items-center gap-1 px-2 py-1 rounded text-xs ${isDarkMode ? 'bg-gray-700' : 'bg-gray-100'}`}>
                        <span>{task.title}</span>
                        <button
                          onClick={() => handleUnlinkTask(taskId)}
                          className="hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </Flex>
                    ) : null;
                  })}
                </Flex>
              )}
              <Separator orientation="vertical" className="h-6" />
            </>
          )}
        </>
      )}

      {/* Fill Color Picker (Not for Path/Arrow) */}
      {selectedShape.type !== ShapeType.PATH && selectedShape.type !== ShapeType.ARROW && (
        <Flex className="items-center gap-2">
          <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Fill</span>
          <Flex className="gap-1 items-center">
            {COLORS.slice(0, 5).map(c => (
              <button
                key={c}
                onClick={() => updateShape(selectedShape.id, { fill: c }, true)}
                className={`w-6 h-6 rounded-full border ${selectedShape.fill === c ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300'}`}
                style={{ backgroundColor: c }}
              />
            ))}
            {/* Custom Color Picker */}
            <label className="w-6 h-6 rounded-full border border-gray-300 cursor-pointer relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-red-500 via-green-500 to-blue-500 hover:opacity-80 transition-opacity">
              <input
                type="color"
                value={selectedShape.fill}
                onChange={(e) => updateShape(selectedShape.id, { fill: e.target.value }, true)}
                className="absolute opacity-0 w-full h-full cursor-pointer"
              />
            </label>
          </Flex>
        </Flex>
      )}

      {selectedShape.type !== ShapeType.PATH && selectedShape.type !== ShapeType.ARROW && (
        <Separator orientation="vertical" className="h-6" />
      )}

      {/* Stroke Color Picker */}
      <Flex className="items-center gap-2">
        <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Stroke</span>
        <Flex className="gap-1 items-center">
          {STROKE_COLORS.map(c => (
            <button
              key={c}
              onClick={() => updateShape(selectedShape.id, { stroke: c }, true)}
              className={`w-6 h-6 rounded-full border relative overflow-hidden ${selectedShape.stroke === c ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-300'}`}
              style={{ backgroundColor: c === 'transparent' ? (isDarkMode ? '#374151' : 'white') : c }}
            >
              {c === 'transparent' && (
                <div className="absolute inset-0 bg-red-500 rotate-45 w-[1px] h-[150%] left-[10px] -top-1"></div>
              )}
            </button>
          ))}
          {/* Custom Stroke Picker */}
          <label className="w-6 h-6 rounded-full border border-gray-300 cursor-pointer relative overflow-hidden flex items-center justify-center bg-gradient-to-br from-yellow-500 via-purple-500 to-pink-500 hover:opacity-80 transition-opacity">
            <input
              type="color"
              value={selectedShape.stroke === 'transparent' ? '#000000' : selectedShape.stroke}
              onChange={(e) => updateShape(selectedShape.id, { stroke: e.target.value }, true)}
              className="absolute opacity-0 w-full h-full cursor-pointer"
            />
          </label>
        </Flex>
      </Flex>

      <Separator orientation="vertical" className="h-6" />

      {/* Arrow Specific Controls */}
      {selectedShape.type === ShapeType.ARROW && (
        <>
          <Flex className="items-center gap-2">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>Start</span>
            <div className="flex bg-gray-100/10 rounded-md overflow-hidden border border-gray-200/20">
              <button
                onClick={() => updateShape(selectedShape.id, { startHead: 'none' }, true)}
                className={`p-1 ${selectedShape.startHead === 'none' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100/10'}`}
              ><Minus size={16} /></button>
              <button
                onClick={() => updateShape(selectedShape.id, { startHead: 'arrow' }, true)}
                className={`p-1 ${selectedShape.startHead === 'arrow' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100/10'}`}
              ><MoveRight size={16} className="rotate-180" /></button>
              <button
                onClick={() => updateShape(selectedShape.id, { startHead: 'circle' }, true)}
                className={`p-1 ${selectedShape.startHead === 'circle' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100/10'}`}
              ><CircleIcon size={16} /></button>
            </div>
          </Flex>

          <Separator orientation="vertical" className="h-6" />

          <Flex className="items-center gap-2">
            <span className={`text-xs font-medium ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>End</span>
            <div className="flex bg-gray-100/10 rounded-md overflow-hidden border border-gray-200/20">
              <button
                onClick={() => updateShape(selectedShape.id, { endHead: 'none' }, true)}
                className={`p-1 ${selectedShape.endHead === 'none' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100/10'}`}
              ><Minus size={16} /></button>
              <button
                onClick={() => updateShape(selectedShape.id, { endHead: 'arrow' }, true)}
                className={`p-1 ${selectedShape.endHead === 'arrow' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100/10'}`}
              ><MoveRight size={16} /></button>
              <button
                onClick={() => updateShape(selectedShape.id, { endHead: 'circle' }, true)}
                className={`p-1 ${selectedShape.endHead === 'circle' ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100/10'}`}
              ><CircleIcon size={16} /></button>
            </div>
          </Flex>

          <Separator orientation="vertical" className="h-6" />
        </>
      )}

      <Button
        variant="ghost"
        size="icon"
        onClick={() => deleteShape(selectedShape.id)}
        className="text-red-500 hover:bg-red-500/10"
        title="Delete"
      >
        <Trash2 size={18} />
      </Button>
    </Box>
  );
};

export default PropertiesPanel;