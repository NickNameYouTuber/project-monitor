import React from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import MeetingColorPicker from './MeetingColorPicker';
import UserAutocomplete from './UserAutocomplete';

export default function NewMeetingDialog({ open, setOpen, newMeeting, setNewMeeting, colors, onCreate }: any) {
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-2xl fixed top-[50%] left-[50%] translate-x-[0%] translate-y-[0%]">
        <DialogHeader>
          <DialogTitle>Schedule New Meeting</DialogTitle>
          <DialogDescription>
            Create a new meeting and invite participants.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Meeting Title</Label>
            <Input
              id="title"
              value={newMeeting.title}
              onChange={(e) => setNewMeeting((prev: any) => ({ ...prev, title: e.target.value }))}
              placeholder="Enter meeting title"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Date</Label>
              <Calendar
                mode="single"
                selected={newMeeting.date}
                onSelect={(date) => date && setNewMeeting((prev: any) => ({ ...prev, date }))}
                className="rounded-md border"
              />
            </div>
            <div className="space-y-4">
              <div>
                <Label htmlFor="time">Time</Label>
                <Input
                  id="time"
                  type="time"
                  value={newMeeting.time}
                  onChange={(e) => setNewMeeting((prev: any) => ({ ...prev, time: e.target.value }))}
                />
              </div>
              <div>
                <Label>Duration (minutes)</Label>
                <Select 
                  value={newMeeting.duration.toString()} 
                  onValueChange={(value) => setNewMeeting((prev: any) => ({ ...prev, duration: Number(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="45">45 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="90">1.5 hours</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Meeting Type</Label>
                <Select 
                  value={newMeeting.type} 
                  onValueChange={(value: any) => setNewMeeting((prev: any) => ({ ...prev, type: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="video">Video Call</SelectItem>
                    <SelectItem value="audio">Audio Call</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Meeting Color</Label>
                <MeetingColorPicker colors={colors} value={newMeeting.color} onChange={(c) => setNewMeeting((prev: any) => ({ ...prev, color: c }))} />
              </div>
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={newMeeting.description}
              onChange={(e) => setNewMeeting((prev: any) => ({ ...prev, description: e.target.value }))}
              placeholder="Описание звонка (опционально)"
              rows={3}
            />
          </div>
          <div>
            <UserAutocomplete
              selectedUsers={newMeeting.participants || []}
              onUsersChange={(users) => setNewMeeting((prev: any) => ({ ...prev, participants: users }))}
              label="Участники"
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={onCreate}>
              Schedule Meeting
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}


