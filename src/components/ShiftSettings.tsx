import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ShiftSettings as ShiftSettingsType, SHIFT_TIMES } from '../types/shift';
import { Settings, Save, MessageSquare, Clock } from 'lucide-react';

interface ShiftSettingsProps {
  settings: ShiftSettingsType;
  onUpdateSettings: (settings: ShiftSettingsType) => void;
}

export const ShiftSettings: React.FC<ShiftSettingsProps> = ({
  settings,
  onUpdateSettings
}) => {
  const [localSettings, setLocalSettings] = useState<ShiftSettingsType>(settings);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  const handleSave = () => {
    onUpdateSettings(localSettings);
  };

  const toggleShiftForDate = (date: string, shift: string) => {
    const newSettings = { ...localSettings };
    if (!newSettings.activeShifts[date]) {
      newSettings.activeShifts[date] = [];
    }
    
    const shiftIndex = newSettings.activeShifts[date].indexOf(shift as any);
    if (shiftIndex > -1) {
      newSettings.activeShifts[date].splice(shiftIndex, 1);
    } else {
      newSettings.activeShifts[date].push(shift as any);
    }
    
    setLocalSettings(newSettings);
  };

  const getActiveShiftsForDate = (date: string) => {
    return localSettings.activeShifts[date] || Object.keys(SHIFT_TIMES);
  };

  const getCurrentMonth = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const days = [];
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push(date.toISOString().split('T')[0]);
    }
    return days;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          הגדרות סידור והודעות מערכת
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* הודעת מערכת */}
        <div className="space-y-2">
          <label className="text-sm font-medium">הודעת מערכת</label>
          <Textarea
            placeholder="הודעה שתוצג לכל העובדים בראש הדף..."
            value={localSettings.systemMessage || ''}
            onChange={(e) => setLocalSettings({
              ...localSettings,
              systemMessage: e.target.value
            })}
            className="min-h-20"
          />
        </div>

        {/* מועד אחרון להגשה */}
        <div className="space-y-2">
          <label className="text-sm font-medium">מועד אחרון להגשת בקשות</label>
          <Input
            type="datetime-local"
            value={localSettings.deadline || ''}
            onChange={(e) => setLocalSettings({
              ...localSettings,
              deadline: e.target.value
            })}
          />
        </div>

        {/* נעילת המערכת */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <label className="text-sm font-medium">נעילת המערכת</label>
            <p className="text-xs text-gray-600">עובדים לא יוכלו לערוך בקשות</p>
          </div>
          <Switch
            checked={localSettings.isLocked || false}
            onCheckedChange={(checked) => setLocalSettings({
              ...localSettings,
              isLocked: checked
            })}
          />
        </div>

        {/* הגדרת משמרות פעילות */}
        <div className="space-y-4">
          <h4 className="font-medium">משמרות פעילות לחודש הנוכח</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {getCurrentMonth().map(date => {
              const dayName = new Date(date).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric' });
              const activeShifts = getActiveShiftsForDate(date);
              
              return (
                <Card key={date} className="p-3">
                  <div className="font-medium text-sm mb-2">{dayName}</div>
                  <div className="space-y-2">
                    {Object.entries(SHIFT_TIMES).map(([shiftKey, shiftInfo]) => (
                      <div key={shiftKey} className="flex items-center justify-between">
                        <div className="text-xs">
                          <div>{shiftInfo.label}</div>
                          <div className="text-gray-500">{shiftInfo.start}-{shiftInfo.end}</div>
                        </div>
                        <Switch
                          checked={activeShifts.includes(shiftKey)}
                          onCheckedChange={() => toggleShiftForDate(date, shiftKey)}
                        />
                      </div>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* סיכום משמרות פעילות */}
        <div className="border-t pt-4">
          <h4 className="font-medium mb-2">סיכום משמרות פעילות</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(SHIFT_TIMES).map(([shiftKey, shiftInfo]) => {
              const activeDays = getCurrentMonth().filter(date => 
                getActiveShiftsForDate(date).includes(shiftKey)
              ).length;
              
              return (
                <Badge key={shiftKey} variant="outline">
                  {shiftInfo.label}: {activeDays} ימים
                </Badge>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2">
          <Button onClick={handleSave} className="flex items-center gap-2">
            <Save className="h-4 w-4" />
            שמור הגדרות
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
