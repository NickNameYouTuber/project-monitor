import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '../ui/dialog';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Calendar as CalendarIcon, Users, Repeat, Type, Palette } from 'lucide-react';
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
  colors: string[];
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
      <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Запланировать новую встречу</DialogTitle>
          <DialogDescription>
            Заполните детали встречи и пригласите участников.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-6 py-4">

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-right">Название встречи</Label>
            <Input
              id="title"
              value={newMeeting.title}
              onChange={(e) => setNewMeeting((prev: any) => ({ ...prev, title: e.target.value }))}
              placeholder="Например: Еженедельный синк, Обсуждение проекта..."
              className="col-span-3 font-medium"
            />
          </div>

          <Tabs defaultValue="details" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Детали и время</TabsTrigger>
              <TabsTrigger value="participants">Участники</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 pt-4">
              {/* Date & Time Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><CalendarIcon className="w-4 h-4" /> Дата</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !newMeeting.date && "text-muted-foreground"
                        )}
                      >
                        {newMeeting.date ? format(newMeeting.date, "PPP", { locale: ru }) : <span>Выберите дату</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={newMeeting.date}
                        onSelect={(date) => date && setNewMeeting((prev: any) => ({ ...prev, date }))}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Clock className="w-4 h-4" /> Время</Label>
                  <Input
                    type="time"
                    value={newMeeting.time}
                    onChange={(e) => setNewMeeting((prev: any) => ({ ...prev, time: e.target.value }))}
                  />
                </div>
              </div>

              {/* Duration & Type Row */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Длительность</Label>
                  <Select
                    value={newMeeting.duration?.toString()}
                    onValueChange={(value) => setNewMeeting((prev: any) => ({ ...prev, duration: Number(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Выберите длительность" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="15">15 минут</SelectItem>
                      <SelectItem value="30">30 минут</SelectItem>
                      <SelectItem value="45">45 минут</SelectItem>
                      <SelectItem value="60">1 час</SelectItem>
                      <SelectItem value="90">1.5 часа</SelectItem>
                      <SelectItem value="120">2 часа</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2"><Type className="w-4 h-4" /> Формат</Label>
                  <Select
                    value={newMeeting.type}
                    onValueChange={(value: any) => setNewMeeting((prev: any) => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="video">Видеозвонок</SelectItem>
                      <SelectItem value="audio">Аудиозвонок</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Recurrence Section */}
              <div className="space-y-3 rounded-lg border p-4 bg-muted/30">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Repeat className="w-4 h-4" /> Повторение
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant={!newMeeting.isRecurring ? 'default' : 'ghost'}
                      onClick={() => setNewMeeting((prev: any) => ({ ...prev, isRecurring: false }))}
                    >
                      Нет
                    </Button>
                    <Button
                      size="sm"
                      variant={newMeeting.isRecurring ? 'default' : 'ghost'}
                      onClick={() => setNewMeeting((prev: any) => ({
                        ...prev,
                        isRecurring: true,
                        recurrenceType: 'WEEKLY',
                      }))}
                    >
                      Да
                    </Button>
                  </div>
                </div>

                {newMeeting.isRecurring && (
                  <div className="space-y-4 pt-2 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Частота</Label>
                        <Select
                          value={newMeeting.recurrenceType || 'WEEKLY'}
                          onValueChange={(value) => setNewMeeting((prev: any) => ({ ...prev, recurrenceType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="DAILY">Ежедневно</SelectItem>
                            <SelectItem value="WEEKLY">Еженедельно</SelectItem>
                            <SelectItem value="MONTHLY">Ежемесячно</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Конец повторений</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !newMeeting.recurrenceEndDate && "text-muted-foreground"
                              )}
                            >
                              {newMeeting.recurrenceEndDate ? format(newMeeting.recurrenceEndDate, "PPP", { locale: ru }) : <span>Не задано</span>}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={newMeeting.recurrenceEndDate}
                              onSelect={(date) => date && setNewMeeting((prev: any) => ({ ...prev, recurrenceEndDate: date }))}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    {newMeeting.recurrenceType === 'WEEKLY' && (
                      <div className="space-y-2">
                        <Label>Дни недели</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {[{ l: 'Пн', v: 1 }, { l: 'Вт', v: 2 }, { l: 'Ср', v: 3 }, { l: 'Чт', v: 4 }, { l: 'Пт', v: 5 }, { l: 'Сб', v: 6 }, { l: 'Вс', v: 7 }].map((day) => {
                            const isSelected = (newMeeting.recurrenceDays || []).includes(day.v);
                            return (
                              <Button
                                key={day.v}
                                type="button"
                                size="sm"
                                variant={isSelected ? 'default' : 'outline'}
                                onClick={() => handleRecurrenceDayToggle(day.v)}
                                className={cn("w-9 h-9 p-0", isSelected && "bg-primary text-primary-foreground")}
                              >
                                {day.l}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Palette className="w-4 h-4" /> Цвет в календаре</Label>
                <MeetingColorPicker colors={colors} value={newMeeting.color} onChange={(c: string) => setNewMeeting((prev: any) => ({ ...prev, color: c }))} />
              </div>

              <div className="space-y-2">
                <Label>Описание</Label>
                <Textarea
                  value={newMeeting.description}
                  onChange={(e) => setNewMeeting((prev: any) => ({ ...prev, description: e.target.value }))}
                  placeholder="Повестка встречи, ссылки на материалы..."
                  className="min-h-[100px]"
                />
              </div>

            </TabsContent>

            <TabsContent value="participants" className="space-y-4 pt-4 min-h-[300px]">
              <div className="space-y-4">
                <Label className="text-base flex items-center gap-2"><Users className="w-4 h-4" /> Участники встречи</Label>
                <UserAutocomplete
                  selectedUsers={newMeeting.participants || []}
                  onUsersChange={(users) => setNewMeeting((prev: any) => ({ ...prev, participants: users }))}
                  label="Добавить участников"
                />

                {(!newMeeting.participants || newMeeting.participants.length === 0) && (
                  <div className="text-center py-10 text-muted-foreground border-2 border-dashed rounded-lg">
                    Никого не выбрано. <br />Начните ввод имени, чтобы найти коллег.
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>

        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(false)}>
            Отмена
          </Button>
          <Button onClick={onCreate} disabled={!newMeeting.title || !newMeeting.date}>
            Создать встречу
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


