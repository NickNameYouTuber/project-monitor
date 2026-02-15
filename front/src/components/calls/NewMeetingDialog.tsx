import React, { useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
  Button, DatePicker, Input, Label, Textarea, Switch, cn,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Badge
} from '@nicorp/nui';
import { Clock, Calendar as CalendarIcon, Users, AlignLeft, Palette, Repeat, Video, ChevronDown, ChevronUp } from 'lucide-react';
import MeetingColorPicker from './MeetingColorPicker';
import UserAutocomplete from './UserAutocomplete';

interface MeetingFormData {
  title: string;
  participants: string[];
  description: string;
  color: string;
  date: Date | undefined;
  time: string;
  duration: number;
  isRecurring: boolean;
  recurrenceType: string;
  recurrenceDays: number[];
  recurrenceEndDate: Date | undefined;
}

interface NewMeetingDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  newMeeting: MeetingFormData;
  setNewMeeting: React.Dispatch<React.SetStateAction<MeetingFormData>>;
  colors: { name: string; value: string; bg?: string }[];
  onCreate: () => void;
  organizationId?: string;
}

export default function NewMeetingDialog({ open, setOpen, newMeeting, setNewMeeting, colors, onCreate, organizationId }: NewMeetingDialogProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleRecurrenceDayToggle = (dayValue: number) => {
    const days = newMeeting.recurrenceDays || [];
    if (days.includes(dayValue)) {
      setNewMeeting((prev) => ({ ...prev, recurrenceDays: days.filter((d: number) => d !== dayValue) }));
    } else {
      setNewMeeting((prev) => ({ ...prev, recurrenceDays: [...days, dayValue].sort() }));
    }
  };

  const isValid = !!newMeeting.title?.trim() && !!newMeeting.date;

  const durationPresets = [
    { label: '15м', value: 15 },
    { label: '30м', value: 30 },
    { label: '45м', value: 45 },
    { label: '1ч', value: 60 },
    { label: '1.5ч', value: 90 },
    { label: '2ч', value: 120 },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
        {/* Header */}
        <div className="px-6 pt-6 pb-4">
          <DialogHeader className="p-0 space-y-1.5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Video className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-lg font-semibold">Новая встреча</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  Запланируйте видеозвонок
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          <div className="space-y-5">

            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="meeting-title" className="text-sm font-medium">
                Название <span className="text-destructive">*</span>
              </Label>
              <Input
                id="meeting-title"
                value={newMeeting.title}
                onChange={(e) => setNewMeeting((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="Еженедельный синк команды"
                className="h-10"
                autoFocus
              />
            </div>

            {/* Date + Time row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <CalendarIcon className="w-3.5 h-3.5 text-muted-foreground" />
                  Дата <span className="text-destructive">*</span>
                </Label>
                <DatePicker
                  value={newMeeting.date}
                  onChange={(date) => date && setNewMeeting((prev) => ({ ...prev, date }))}
                  placeholder="Выберите"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                  Время
                </Label>
                <Input
                  type="time"
                  value={newMeeting.time}
                  onChange={(e) => setNewMeeting((prev) => ({ ...prev, time: e.target.value }))}
                  className="h-10"
                />
              </div>
            </div>

            {/* Duration chips */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">Длительность</Label>
              <div className="flex flex-wrap gap-2">
                {durationPresets.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setNewMeeting((prev) => ({ ...prev, duration: preset.value }))}
                    className={cn(
                      "h-8 px-3.5 rounded-full text-xs font-medium transition-all border",
                      newMeeting.duration === preset.value
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:border-foreground/20 hover:text-foreground"
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Participants */}
            <div className="space-y-2">
              <Label className="text-sm font-medium flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                Участники
                {(newMeeting.participants?.length || 0) > 0 && (
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 ml-auto">
                    {newMeeting.participants.length}
                  </Badge>
                )}
              </Label>
              <UserAutocomplete
                selectedUsers={newMeeting.participants || []}
                onUsersChange={(users) => setNewMeeting((prev) => ({ ...prev, participants: users }))}
                label=""
                organizationId={organizationId}
              />
            </div>

            {/* Advanced toggle */}
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full py-1"
            >
              {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              Дополнительно
              {(newMeeting.description || newMeeting.isRecurring) && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary ml-1" />
              )}
            </button>

            {/* Advanced section */}
            {showAdvanced && (
              <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-200">
                {/* Description */}
                <div className="space-y-2">
                  <Label htmlFor="meeting-desc" className="text-sm font-medium flex items-center gap-1.5">
                    <AlignLeft className="w-3.5 h-3.5 text-muted-foreground" />
                    Описание
                  </Label>
                  <Textarea
                    id="meeting-desc"
                    value={newMeeting.description}
                    onChange={(e) => setNewMeeting((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Повестка дня, ссылки..."
                    className="min-h-[80px] resize-none"
                  />
                </div>

                {/* Color */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Palette className="w-3.5 h-3.5 text-muted-foreground" />
                    Цвет
                  </Label>
                  <MeetingColorPicker colors={colors} value={newMeeting.color} onChange={(c: string) => setNewMeeting((prev) => ({ ...prev, color: c }))} />
                </div>

                {/* Recurrence */}
                <div className="space-y-3 rounded-lg border p-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium flex items-center gap-2">
                      <Repeat className="w-3.5 h-3.5 text-muted-foreground" />
                      Повторять
                    </Label>
                    <Switch
                      checked={newMeeting.isRecurring}
                      onCheckedChange={(checked: boolean) => setNewMeeting((prev) => ({ ...prev, isRecurring: checked }))}
                    />
                  </div>

                  {newMeeting.isRecurring && (
                    <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-150">
                      <Select
                        value={newMeeting.recurrenceType || 'WEEKLY'}
                        onValueChange={(value: string) => setNewMeeting((prev) => ({ ...prev, recurrenceType: value }))}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DAILY">Ежедневно</SelectItem>
                          <SelectItem value="WEEKLY">Еженедельно</SelectItem>
                          <SelectItem value="MONTHLY">Ежемесячно</SelectItem>
                        </SelectContent>
                      </Select>

                      {newMeeting.recurrenceType === 'WEEKLY' && (
                        <div className="flex gap-1 justify-center p-2 rounded-md bg-muted/50">
                          {[{ l: 'Пн', v: 1 }, { l: 'Вт', v: 2 }, { l: 'Ср', v: 3 }, { l: 'Чт', v: 4 }, { l: 'Пт', v: 5 }, { l: 'Сб', v: 6 }, { l: 'Вс', v: 7 }].map((day) => {
                            const isSelected = (newMeeting.recurrenceDays || []).includes(day.v);
                            return (
                              <button
                                key={day.v}
                                type="button"
                                onClick={() => handleRecurrenceDayToggle(day.v)}
                                className={cn(
                                  "w-8 h-8 flex items-center justify-center rounded-full text-xs font-semibold transition-all select-none",
                                  isSelected
                                    ? "bg-primary text-primary-foreground shadow-sm"
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                              >
                                {day.l}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      <div className="space-y-1.5">
                        <Label className="text-xs text-muted-foreground">До какой даты</Label>
                        <DatePicker
                          value={newMeeting.recurrenceEndDate}
                          onChange={(date) => date && setNewMeeting((prev) => ({ ...prev, recurrenceEndDate: date }))}
                          placeholder="Бессрочно"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex items-center justify-end gap-3">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button
            onClick={onCreate}
            disabled={!isValid}
            size="sm"
            className={cn("min-w-[140px]", isValid && "shadow-sm shadow-primary/20")}
          >
            <Video className="w-4 h-4 mr-2" />
            Запланировать
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
