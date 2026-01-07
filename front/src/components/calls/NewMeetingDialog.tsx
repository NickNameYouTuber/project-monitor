import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Clock, Calendar as CalendarIcon, Users, Repeat, Type, Palette, User, X } from 'lucide-react';
import MeetingColorPicker from './MeetingColorPicker';
import UserAutocomplete from './UserAutocomplete';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { cn } from '../ui/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface NewMeetingDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  newMeeting: any;
  setNewMeeting: React.Dispatch<React.SetStateAction<any>>;
  colors: { name: string; value: string; bg?: string }[];
  onCreate: () => void;
}

export default function NewMeetingDialog({ open, setOpen, newMeeting, setNewMeeting, colors, onCreate }: NewMeetingDialogProps) {

  const handleRecurrenceDayToggle = (dayValue: number) => {
    const days = newMeeting.recurrenceDays || [];
    if (days.includes(dayValue)) {
      setNewMeeting((prev: any) => ({ ...prev, recurrenceDays: days.filter((d: number) => d !== dayValue) }));
    } else {
      setNewMeeting((prev: any) => ({ ...prev, recurrenceDays: [...days, dayValue].sort() }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-[550px] max-h-[85vh] overflow-hidden flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>Новая встреча</DialogTitle>
          <DialogDescription>
            Запланируйте звонок и пригласите коллег.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Название</Label>
            <Input
              id="title"
              value={newMeeting.title}
              onChange={(e) => setNewMeeting((prev: any) => ({ ...prev, title: e.target.value }))}
              placeholder="О чём будем говорить?"
              className="text-base font-medium"
              autoFocus
            />
          </div>

          {/* Participants - Moved up for visibility */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2"><Users className="w-4 h-4" /> Участники</Label>
            <UserAutocomplete
              selectedUsers={newMeeting.participants || []}
              onUsersChange={(users) => setNewMeeting((prev: any) => ({ ...prev, participants: users }))}
              label=""
            />
          </div>

          {/* Date & Time Row */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Дата</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !newMeeting.date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {newMeeting.date ? format(newMeeting.date, "d MMMM yyyy", { locale: ru }) : <span>Выберите дату</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start" side="top">
                  <Calendar
                    mode="single"
                    selected={newMeeting.date}
                    onSelect={(date: Date | undefined) => date && setNewMeeting((prev: any) => ({ ...prev, date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Время</Label>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Clock className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="time"
                    value={newMeeting.time}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewMeeting((prev: any) => ({ ...prev, time: e.target.value }))}
                    className="pl-9"
                  />
                </div>
                <Select
                  value={newMeeting.duration?.toString()}
                  onValueChange={(value) => setNewMeeting((prev: any) => ({ ...prev, duration: Number(value) }))}
                >
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Длит." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 мин</SelectItem>
                    <SelectItem value="30">30 мин</SelectItem>
                    <SelectItem value="45">45 мин</SelectItem>
                    <SelectItem value="60">1 ч</SelectItem>
                    <SelectItem value="90">1.5 ч</SelectItem>
                    <SelectItem value="120">2 ч</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* Recurrence (Compact) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2 text-muted-foreground font-normal text-sm cursor-pointer hover:text-foreground transition-colors"
                onClick={() => setNewMeeting((prev: any) => ({ ...prev, isRecurring: !prev.isRecurring }))}>
                <Repeat className="w-4 h-4" />
                Повторяющаяся встреча?
              </Label>
              <div className="flex items-center space-x-2">
                <span className={cn("inline-flex w-9 h-5 rounded-full ring-1 ring-inset ring-gray-200 transition-colors cursor-pointer items-center px-0.5", newMeeting.isRecurring ? "bg-primary" : "bg-muted")}
                  onClick={() => setNewMeeting((prev: any) => ({ ...prev, isRecurring: !prev.isRecurring }))}>
                  <span className={cn("h-4 w-4 rounded-full bg-white shadow-sm ring-1 ring-gray-900/5 transition-transform", newMeeting.isRecurring ? "translate-x-4" : "translate-x-0")} />
                </span>
              </div>
            </div>

            {newMeeting.isRecurring && (
              <div className="pt-2 pl-2 border-l-2 border-muted space-y-3 animate-in fade-in slide-in-from-top-1">
                <div className="flex gap-4">
                  <Select
                    value={newMeeting.recurrenceType || 'WEEKLY'}
                    onValueChange={(value: string) => setNewMeeting((prev: any) => ({ ...prev, recurrenceType: value }))}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DAILY">Ежедневно</SelectItem>
                      <SelectItem value="WEEKLY">Еженедельно</SelectItem>
                      <SelectItem value="MONTHLY">Ежемесячно</SelectItem>
                    </SelectContent>
                  </Select>

                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "flex-1 justify-start text-left font-normal",
                          !newMeeting.recurrenceEndDate && "text-muted-foreground"
                        )}
                      >
                        {newMeeting.recurrenceEndDate ? format(newMeeting.recurrenceEndDate, "d MMM yyyy", { locale: ru }) : <span>Конец повторений...</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={newMeeting.recurrenceEndDate}
                        onSelect={(date: Date | undefined) => date && setNewMeeting((prev: any) => ({ ...prev, recurrenceEndDate: date }))}
                        disabled={(date: Date) => date < new Date()}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                {newMeeting.recurrenceType === 'WEEKLY' && (
                  <div className="flex flex-wrap gap-1">
                    {[{ l: 'Пн', v: 1 }, { l: 'Вт', v: 2 }, { l: 'Ср', v: 3 }, { l: 'Чт', v: 4 }, { l: 'Пт', v: 5 }, { l: 'Сб', v: 6 }, { l: 'Вс', v: 7 }].map((day) => {
                      const isSelected = (newMeeting.recurrenceDays || []).includes(day.v);
                      return (
                        <div
                          key={day.v}
                          onClick={() => handleRecurrenceDayToggle(day.v)}
                          className={cn(
                            "w-8 h-8 flex items-center justify-center rounded-full text-xs cursor-pointer transition-all border",
                            isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-background hover:bg-muted border-border"
                          )}
                        >
                          {day.l}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-[1fr_auto] gap-4 items-start">
            <div className="space-y-2">
              <Label htmlFor="description" className="text-xs text-muted-foreground">Описание</Label>
              <Textarea
                id="description"
                value={newMeeting.description}
                onChange={(e) => setNewMeeting((prev: any) => ({ ...prev, description: e.target.value }))}
                placeholder="Добавить описание..."
                className="min-h-[80px] text-sm resize-none"
              />
            </div>
            <div className="space-y-2 pt-6">
              <MeetingColorPicker colors={colors} value={newMeeting.color} onChange={(c: string) => setNewMeeting((prev: any) => ({ ...prev, color: c }))} />
            </div>
          </div>

        </div>

        <DialogFooter className="px-6 py-4 border-t bg-muted/20">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button onClick={onCreate} disabled={!newMeeting.title || !newMeeting.date}>
            Запланировать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


