import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import type { Column } from '../App';

interface EditColumnDialogProps {
  column: Column | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSave: (column: Column | Omit<Column, 'id' | 'order'>) => void;
  onCancel: () => void;
}

const colorOptions = [
  { value: 'bg-gray-500', label: 'Gray' },
  { value: 'bg-red-500', label: 'Red' },
  { value: 'bg-yellow-500', label: 'Yellow' },
  { value: 'bg-green-500', label: 'Green' },
  { value: 'bg-blue-500', label: 'Blue' },
  { value: 'bg-indigo-500', label: 'Indigo' },
  { value: 'bg-purple-500', label: 'Purple' },
  { value: 'bg-pink-500', label: 'Pink' },
];

export function EditColumnDialog({ column, open, onOpenChange, onSave, onCancel }: EditColumnDialogProps) {
  const [title, setTitle] = useState('');
  const [color, setColor] = useState('bg-gray-500');

  useEffect(() => {
    if (column) {
      setTitle(column.title);
      setColor(column.color);
    } else {
      setTitle('');
      setColor('bg-gray-500');
    }
  }, [column]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (column) {
      // Editing existing column
      onSave({
        ...column,
        title: title.trim(),
        color,
      });
    } else {
      // Creating new column
      onSave({
        title: title.trim(),
        color,
      });
    }
  };

  if (open !== undefined) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{column ? 'Edit Column' : 'Add New Column'}</DialogTitle>
            <DialogDescription>
              {column ? 'Update column details.' : 'Create a new column for your board.'}
            </DialogDescription>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Column Title</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter column title"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label>Color</Label>
              <div className="grid grid-cols-4 gap-2">
                {colorOptions.map((colorOption) => (
                  <button
                    key={colorOption.value}
                    type="button"
                    className={`p-3 rounded-lg border-2 flex items-center justify-center ${
                      color === colorOption.value ? 'border-foreground' : 'border-transparent'
                    }`}
                    onClick={() => setColor(colorOption.value)}
                  >
                    <div className={`w-6 h-6 rounded-full ${colorOption.value}`} />
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange?.(false) || onCancel()}>
                Cancel
              </Button>
              <Button type="submit">{column ? 'Update' : 'Create'} Column</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    );
  }

  // Inline form (for use inside other dialogs)
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Column Title</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter column title"
          required
        />
      </div>
      
      <div className="space-y-2">
        <Label>Color</Label>
        <div className="grid grid-cols-4 gap-2">
          {colorOptions.map((colorOption) => (
            <button
              key={colorOption.value}
              type="button"
              className={`p-3 rounded-lg border-2 flex items-center justify-center ${
                color === colorOption.value ? 'border-foreground' : 'border-transparent'
              }`}
              onClick={() => setColor(colorOption.value)}
            >
              <div className={`w-6 h-6 rounded-full ${colorOption.value}`} />
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">{column ? 'Update' : 'Create'} Column</Button>
      </div>
    </form>
  );
}