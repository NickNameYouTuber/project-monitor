import React, { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { COLORS, STROKE_COLORS, Shape, ShapeType, ArrowShape, SectionShape } from '../types';
import { Trash2, MoveRight, Circle as CircleIcon, Minus, Palette, X } from 'lucide-react';
import { getProjectTasks, linkElementToTask, unlinkElementFromTask } from '../../../api/whiteboards';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, Button, Input, Box, Flex, Separator } from '@nicorp/nui';

interface PropertiesPanelProps {
  selectedShape: Shape | null;
  updateShape: (id: string, updates: Partial<Shape>, saveHistory?: boolean) => void;
  deleteShape: (id: string) => void;
  projectId?: string | null;
  elementId?: string | null;
  shapes?: Shape[];
  onAddShape?: (shape: Shape) => void;
}

const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ selectedShape, updateShape, deleteShape, projectId, elementId, shapes = [], onAddShape }) => {
  const { theme } = useTheme();
  const isDarkMode = theme === 'dark';
  if (!selectedShape) return null;

  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const section = selectedShape.type === ShapeType.SECTION ? selectedShape as SectionShape : null;

  // Load tasks only once
  useEffect(() => {
    if (projectId && !tasks.length) {
      getProjectTasks(projectId)
        .then(setTasks)
        .catch(console.error);
    }
  }, [projectId, tasks.length]);

  const handleLinkTaskToShape = (taskId: string) => {
    const task = tasks.find(t => t.id === taskId);
    const updates: Partial<Shape> = { taskId };
    // If it's a sticky/text and empty, auto-fill text
    if ((selectedShape.type === ShapeType.STICKY || selectedShape.type === ShapeType.TEXT) &&
      !('text' in selectedShape && selectedShape.text)) {
      (updates as any).text = task?.title || '';
    }
    updateShape(selectedShape.id, updates, true);
  };

  const handleMoveToSection = (sectionId: string) => {
    const targetSection = shapes.find(s => s.id === sectionId) as SectionShape;
    if (targetSection) {
      // Move to center of section
      const newX = targetSection.x + targetSection.width / 2 - (('width' in selectedShape ? selectedShape.width : 0) / 2);
      const newY = targetSection.y + targetSection.height / 2 - (('height' in selectedShape ? selectedShape.height : 0) / 2);
      updateShape(selectedShape.id, { x: newX, y: newY }, true);
    }
  };

  const handleCreateTaskSticky = (taskId: string) => {
    if (!onAddShape || selectedShape.type !== ShapeType.SECTION) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    const section = selectedShape as SectionShape;
    const padding = 20;
    // Simple placement: Top-left of section + padding
    // Ideally we would find a free spot, but for now simple.

    // Generate new ID locally (we assume generateId helper is not available here, so we use math.random or pass a helper?
    // WhiteboardPage generates IDs. We can just use a simple random string here or pass generator.
    const id = Math.random().toString(36).substr(2, 9);

    const newSticky: Shape = {
      id,
      type: ShapeType.STICKY,
      x: section.x + padding,
      y: section.y + padding + 40, // Below label
      width: 150,
      height: 150,
      rotation: 0,
      fill: COLORS[2], // Yellow default
      stroke: 'transparent',
      text: task.title,
      taskId: task.id
    };

    onAddShape(newSticky);
  };

  const availableSections = shapes.filter(s => s.type === ShapeType.SECTION && s.id !== selectedShape.id) as SectionShape[];


  // Removed absolute positioning, added pointer-events-auto
  return (
    <Box className="border rounded-xl flex items-center p-2 gap-4 z-50 pointer-events-auto shadow-2xl bg-card text-card-foreground">

      {/* Task Linking - Multi-Select Support for Sections */}
      {projectId && selectedShape.type === ShapeType.SECTION && (
        <>
          <Flex className="flex-col gap-2 items-start">
            <span className="text-xs font-medium text-muted-foreground w-full">Linked Tasks</span>
            <Flex className="flex-wrap gap-1 max-w-[200px]">
              {(selectedShape as SectionShape).taskIds?.map(taskId => {
                const task = tasks.find(t => t.id === taskId);
                return task ? (
                  <div key={taskId} className="flex items-center gap-1 bg-accent text-accent-foreground px-1.5 py-0.5 rounded text-[10px]">
                    <span className="truncate max-w-[80px]">{task.title}</span>
                    <button onClick={() => {
                      // Unlink specific task
                      // Since backend unlink API is singular (unlinkElementFromTask), 
                      // we might need to rely on the fact that if we link multiple, they stick?
                      // OR if we unlink, we might need to re-link others?
                      // Let's try to just update local state logic and call unlink if it's the LAST one?
                      // Actually, if we want M:N, we should call unlink if we remove one.
                      // BUT unlinkElementFromTask(id) might remove ALL.
                      // Let's assume for now we just remove from local array and try to sync via link calls?
                      // No, that's risky. 
                      // Let's try calling linkElementToTask with remaining?
                      // OR better: if user removes one, we update the shape state locally.
                      // AND we call unlinkElementFromTask if array becomes empty.
                      // For removing a single one from many, we might be limited by backend.
                      // User said: "I removed it in none ... but it is still linked".
                      // This implies we NEED to call unlink.

                      const newTaskIds = ((selectedShape as SectionShape).taskIds || []).filter(id => id !== taskId);
                      updateShape(selectedShape.id, { taskIds: newTaskIds } as Partial<SectionShape>, true);
                      // If empty, call unlink
                      if (newTaskIds.length === 0) {
                        unlinkElementFromTask(elementId!).catch(console.error);
                      } else {
                        // If we remove one, how to let backend know?
                        // Maybe we just link the first existing one to update the 'primary' link?
                        linkElementToTask(elementId!, newTaskIds[0]).catch(console.error);
                      }
                    }} className="hover:text-destructive">
                      <X size={10} />
                    </button>
                  </div>
                ) : null;
              })}
            </Flex>
            <Select
              value="add_new"
              onValueChange={(taskId) => {
                if (taskId === "add_new") return;
                const currentIds = (selectedShape as SectionShape).taskIds || [];
                if (!currentIds.includes(taskId)) {
                  const newIds = [...currentIds, taskId];
                  updateShape(selectedShape.id, { taskIds: newIds } as Partial<SectionShape>, true);
                  if (elementId) {
                    linkElementToTask(elementId, taskId).catch(console.error);
                  }
                }
              }}
            >
              <SelectTrigger className="w-full h-7 text-xs bg-background border-border">
                <SelectValue placeholder="+ Link Task" />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground border-border max-h-60">
                {tasks
                  .filter(t => !((selectedShape as SectionShape).taskIds || []).includes(t.id))
                  .map(task => (
                    <SelectItem key={task.id} value={task.id} className="text-xs hover:bg-accent hover:text-accent-foreground">
                      {task.title}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </Flex>
          <Separator orientation="vertical" className="h-6 bg-border" />
        </>
      )}

      {/* Legacy/Single Link for Non-Sections */}
      {projectId && selectedShape.type !== ShapeType.ARROW && selectedShape.type !== ShapeType.PATH && selectedShape.type !== ShapeType.SECTION && (
        <>
          <Flex className="items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground w-20">Linked Task</span>
            <Select
              value={selectedShape.taskId || "none"}
              onValueChange={(val) => {
                const taskId = val === "none" ? "" : val;
                handleLinkTaskToShape(taskId);
                if (elementId) {
                  if (taskId) {
                    linkElementToTask(elementId, taskId).catch(console.error);
                  } else {
                    unlinkElementFromTask(elementId).catch(console.error);
                  }
                }
              }}
            >
              <SelectTrigger className="w-40 h-8 text-xs bg-background border-border">
                <SelectValue placeholder="Link Task" />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground border-border max-h-60">
                <SelectItem value="none" className="text-xs">None</SelectItem>
                {tasks.map(task => (
                  <SelectItem key={task.id} value={task.id} className="text-xs hover:bg-accent hover:text-accent-foreground">
                    {task.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Flex>
          <Separator orientation="vertical" className="h-6 bg-border" />
        </>
      )}

      {/* Move to Section (for non-sections) */}
      {selectedShape.type !== ShapeType.SECTION && availableSections.length > 0 && (
        <>
          <Flex className="items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Section</span>
            <Select onValueChange={handleMoveToSection}>
              <SelectTrigger className="w-32 h-8 text-xs bg-background border-border">
                <SelectValue placeholder="Move to..." />
              </SelectTrigger>
              <SelectContent className="bg-popover text-popover-foreground border-border max-h-60">
                {availableSections.map(s => (
                  <SelectItem key={s.id} value={s.id} className="text-xs hover:bg-accent hover:text-accent-foreground">
                    {s.label || "Untitled Section"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Flex>
          <Separator orientation="vertical" className="h-6 bg-border" />
        </>
      )}

      {selectedShape.type === ShapeType.SECTION && (
        <>
          <Flex className="items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Label</span>
            <Input
              type="text"
              value={section?.label || ''}
              onChange={(e) => updateShape(selectedShape.id, { label: e.target.value } as Partial<SectionShape>, true)}
              className="h-8 w-32 px-2 text-sm bg-background border-border"
            />
            <Separator orientation="vertical" className="h-6 bg-border" />
          </Flex>



        </>
      )}

      {/* Fill Color Picker (Not for Path/Arrow) */}
      {selectedShape.type !== ShapeType.PATH && selectedShape.type !== ShapeType.ARROW && (
        <Flex className="items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Fill</span>
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
        <Separator orientation="vertical" className="h-6 bg-border" />
      )}

      {/* Stroke Color Picker */}
      <Flex className="items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Stroke</span>
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

      <Separator orientation="vertical" className="h-6 bg-border" />

      {/* Arrow Specific Controls */}
      {selectedShape.type === ShapeType.ARROW && (
        <>
          <Flex className="items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Start</span>
            <div className="flex bg-muted rounded-md overflow-hidden border border-border">
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

          <Separator orientation="vertical" className="h-6 bg-border" />

          <Flex className="items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">End</span>
            <div className="flex bg-muted rounded-md overflow-hidden border border-border">
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
        className="text-destructive hover:bg-destructive/10"
        title="Delete"
      >
        <Trash2 size={18} />
      </Button>
    </Box>
  );
};

export default PropertiesPanel;