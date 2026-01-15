import React from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
  Button, Calendar, Input, Label, Textarea, Separator, Switch, cn,
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
  Popover, PopoverContent, PopoverTrigger,
  Box, Flex, Heading, Text
} from '@nicorp/nui';
import { Clock, Calendar as CalendarIcon, Users, AlignLeft } from 'lucide-react';
import MeetingColorPicker from './MeetingColorPicker';
import UserAutocomplete from './UserAutocomplete';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface NewMeetingDialogProps {
  open: boolean;
  setOpen: (open: boolean) => void;
  newMeeting: any;
  setNewMeeting: React.Dispatch<React.SetStateAction<any>>;
  colors: { name: string; value: string; bg?: string }[];
  onCreate: () => void;
  organizationId?: string; // NEW: For filtering users to org members
}

export default function NewMeetingDialog({ open, setOpen, newMeeting, setNewMeeting, colors, onCreate, organizationId }: NewMeetingDialogProps) {

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
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] sm:h-[600px] overflow-hidden flex flex-col p-0">
        <Flex className="h-full flex-col sm:flex-row overflow-auto sm:overflow-hidden">
          {/* Left Column: General Info */}
          <Box className="w-full sm:w-[60%] p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 sm:border-r sm:h-full sm:overflow-hidden">
            <DialogHeader className="p-0 space-y-1">
              <DialogTitle className="text-lg sm:text-xl">Новая встреча</DialogTitle>
              <DialogDescription className="text-xs sm:text-sm">
                Основные детали встречи
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 flex-1 sm:overflow-y-auto sm:pr-2">
              <div className="space-y-2">
                <Label htmlFor="title" className="text-sm font-medium">Название</Label>
                <Input
                  id="title"
                  value={newMeeting.title}
                  onChange={(e) => setNewMeeting((prev: any) => ({ ...prev, title: e.target.value }))}
                  placeholder="Например, Еженедельный синк"
                  className="bg-muted/30"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <Users className="w-4 h-4 text-muted-foreground" />
                  Участники
                </Label>
                <UserAutocomplete
                  selectedUsers={newMeeting.participants || []}
                  onUsersChange={(users) => setNewMeeting((prev: any) => ({ ...prev, participants: users }))}
                  label=""
                  organizationId={organizationId}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium flex items-center gap-2">
                  <AlignLeft className="w-4 h-4 text-muted-foreground" />
                  Описание
                </Label>
                <Textarea
                  id="description"
                  value={newMeeting.description}
                  onChange={(e) => setNewMeeting((prev: any) => ({ ...prev, description: e.target.value }))}
                  placeholder="Повестка дня, ссылки на документы..."
                  className="min-h-[100px] resize-none bg-muted/30"
                />
              </div>

              <div className="space-y-2 pt-2">
                <Label className="text-xs text-muted-foreground uppercase tracking-wider">Цвет встречи</Label>
                <MeetingColorPicker colors={colors} value={newMeeting.color} onChange={(c: string) => setNewMeeting((prev: any) => ({ ...prev, color: c }))} />
              </div>
            </div>
          </Box>
          {/* Right Column: Time & Settings */}
          <Box className="w-full sm:w-[40%] bg-muted p-4 sm:p-6 flex flex-col gap-4 sm:gap-6 sm:h-full sm:overflow-y-auto">
            <Box className="space-y-1">
              <Heading level={3} className="font-semibold text-sm">Время и дата</Heading>
              <Text className="text-xs text-muted-foreground">Когда состоится встреча?</Text>
            </Box>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Дата</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant={"outline"}
                      className={cn(
                        "w-full justify-start text-left font-normal bg-background hover:bg-background/80",
                        !newMeeting.date && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {newMeeting.date ? format(newMeeting.date, "d MMMM yyyy", { locale: ru }) : <span>Выберите дату</span>}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end" side="bottom">
                    <Calendar
                      mode="single"
                      selected={newMeeting.date}
                      onSelect={(date: Date | undefined) => date && setNewMeeting((prev: any) => ({ ...prev, date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Начало</Label>
                  <Input
                    type="time"
                    value={newMeeting.time}
                    onChange={(e) => setNewMeeting((prev: any) => ({ ...prev, time: e.target.value }))}
                    className="bg-background"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">Длительность</Label>
                  <Select
                    value={newMeeting.duration?.toString()}
                    onValueChange={(value) => setNewMeeting((prev: any) => ({ ...prev, duration: Number(value) }))}
                  >
                    <SelectTrigger className="bg-background">
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

              <Separator />

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Повторять встречу</Label>
                  <Switch
                    checked={newMeeting.isRecurring}
                    onCheckedChange={(checked: boolean) => setNewMeeting((prev: any) => ({ ...prev, isRecurring: checked }))}
                  />
                </div>

                {newMeeting.isRecurring && (
                  <div className="space-y-3 animate-in fade-in slide-in-from-top-2 pt-2">
                    <Select
                      value={newMeeting.recurrenceType || 'WEEKLY'}
                      onValueChange={(value: string) => setNewMeeting((prev: any) => ({ ...prev, recurrenceType: value }))}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="DAILY">Ежедневно</SelectItem>
                        <SelectItem value="WEEKLY">Еженедельно</SelectItem>
                        <SelectItem value="MONTHLY">Ежемесячно</SelectItem>
                      </SelectContent>
                    </Select>

                    {newMeeting.recurrenceType === 'WEEKLY' && (
                      <div className="flex flex-wrap gap-1.5 justify-center bg-background p-2 rounded-md border">
                        {[{ l: 'Пн', v: 1 }, { l: 'Вт', v: 2 }, { l: 'Ср', v: 3 }, { l: 'Чт', v: 4 }, { l: 'Пт', v: 5 }, { l: 'Сб', v: 6 }, { l: 'Вс', v: 7 }].map((day) => {
                          const isSelected = (newMeeting.recurrenceDays || []).includes(day.v);
                          return (
                            <div
                              key={day.v}
                              onClick={() => handleRecurrenceDayToggle(day.v)}
                              className={cn(
                                "w-7 h-7 flex items-center justify-center rounded-md text-[10px] font-medium cursor-pointer transition-all border select-none",
                                isSelected ? "bg-primary text-primary-foreground border-primary" : "bg-muted text-muted-foreground border-transparent hover:bg-muted/80"
                              )}
                            >
                              {day.l}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="space-y-1">
                      <Label className="text-[10px] text-muted-foreground uppercase">До какой даты</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant={"outline"}
                            size="sm"
                            className={cn(
                              "w-full justify-start text-left font-normal bg-background h-8 text-xs",
                              !newMeeting.recurrenceEndDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-3 w-3" />
                            {newMeeting.recurrenceEndDate ? format(newMeeting.recurrenceEndDate, "d MMM yyyy", { locale: ru }) : <span>Бессрочно</span>}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="end">
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
                  </div>
                )}
              </div>
            </div>

            <div className="mt-auto pt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Отмена
              </Button>
              <Button onClick={onCreate} disabled={!newMeeting.title || !newMeeting.date} className="w-full sm:w-auto">
                Запланировать
              </Button>
            </div>
          </Box>
        </Flex>
      </DialogContent >
    </Dialog >
  );
}
