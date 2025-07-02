
import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from 'lucide-react';
import { Employee, DayPreferences, ShiftChoice, SHIFT_TIMES, getActiveShifts } from '../types/shift';

interface DailyShiftSelectorProps {
  employee: Employee;
  selectedDate: string;
  onShiftChange: (shift: keyof DayPreferences, choice: ShiftChoice) => void;
  onNoteChange: (note: string) => void;
  isDarkMode?: boolean;
}

export const DailyShiftSelector: React.FC<DailyShiftSelectorProps> = ({
  employee,
  selectedDate,
  onShiftChange,
  onNoteChange,
  isDarkMode = false
}) => {
  const activeShiftsForDate = getActiveShifts(selectedDate);

  const getShiftChoice = (shift: keyof DayPreferences): ShiftChoice => {
    if (!employee.preferences[selectedDate]) {
      return 'none' as ShiftChoice;
    }

    const dayPrefs = employee.preferences[selectedDate];
    const shiftPref = dayPrefs?.[shift];
    
    if (typeof shiftPref === 'object' && 'choice' in shiftPref) {
      return shiftPref.choice || 'none' as ShiftChoice;
    }
    
    return 'none' as ShiftChoice;
  };

  const getChoiceColor = (choice: ShiftChoice) => {
    const colors = {
      'x': 'bg-red-500 text-white',
      '#': 'bg-green-500 text-white', 
      '-': 'bg-yellow-500 text-black',
      '!': 'bg-purple-500 text-white',
      'none': 'bg-gray-200 text-gray-600'
    };
    return colors[choice] || colors['none'];
  };

  const getChoiceLabel = (choice: ShiftChoice) => {
    const labels = {
      'x': 'חוסם',
      '#': 'מעדיף',
      '-': 'זמין',
      '!': 'דחוף',
      'none': 'לא נבחר'
    };
    return labels[choice] || labels['none'];
  };

  const getShiftLabel = (shift: string) => {
    return SHIFT_TIMES[shift as keyof typeof SHIFT_TIMES]?.label || shift;
  };

  return (
    <Card className={isDarkMode ? 'bg-gray-800 border-gray-600' : ''}>
      <CardHeader>
        <CardTitle className={`${isDarkMode ? 'text-white' : ''}`}>
          <Calendar className="h-5 w-5 inline mr-2" />
          העדפות יומיות - {employee.name}
        </CardTitle>
        <div className="text-sm text-gray-600">
          {new Date(selectedDate).toLocaleDateString('he-IL', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* משמרות בוקר */}
        <div className="space-y-3">
          <h4 className="font-medium text-lg border-b pb-2">משמרות בוקר</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeShiftsForDate.morning.map(shift => (
              <div key={shift} className="space-y-2">
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  {getShiftLabel(shift)}
                </label>
                <Select
                  value={getShiftChoice(shift as keyof DayPreferences)}
                  onValueChange={(value) => onShiftChange(shift as keyof DayPreferences, value === 'none' ? '' as ShiftChoice : value as ShiftChoice)}
                >
                  <SelectTrigger>
                    <SelectValue>
                      <Badge className={getChoiceColor(getShiftChoice(shift as keyof DayPreferences))}>
                        {getChoiceLabel(getShiftChoice(shift as keyof DayPreferences))}
                      </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">לא נבחר</SelectItem>
                    <SelectItem value="#">מעדיף</SelectItem>
                    <SelectItem value="-">זמין</SelectItem>
                    <SelectItem value="x">חוסם</SelectItem>
                    <SelectItem value="!">דחוף</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        {/* משמרות צהריים */}
        <div className="space-y-3">
          <h4 className="font-medium text-lg border-b pb-2">משמרות צהריים</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeShiftsForDate.afternoon.map(shift => (
              <div key={shift} className="space-y-2">
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  {getShiftLabel(shift)}
                </label>
                <Select
                  value={getShiftChoice(shift as keyof DayPreferences)}
                  onValueChange={(value) => onShiftChange(shift as keyof DayPreferences, value === 'none' ? '' as ShiftChoice : value as ShiftChoice)}
                >
                  <SelectTrigger>
                    <SelectValue>
                      <Badge className={getChoiceColor(getShiftChoice(shift as keyof DayPreferences))}>
                        {getChoiceLabel(getShiftChoice(shift as keyof DayPreferences))}
                      </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">לא נבחר</SelectItem>
                    <SelectItem value="#">מעדיף</SelectItem>
                    <SelectItem value="-">זמין</SelectItem>
                    <SelectItem value="x">חוסם</SelectItem>
                    <SelectItem value="!">דחוף</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        {/* משמרות לילה */}
        <div className="space-y-3">
          <h4 className="font-medium text-lg border-b pb-2">משמרות לילה</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeShiftsForDate.night.map(shift => (
              <div key={shift} className="space-y-2">
                <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                  {getShiftLabel(shift)}
                </label>
                <Select
                  value={getShiftChoice(shift as keyof DayPreferences)}
                  onValueChange={(value) => onShiftChange(shift as keyof DayPreferences, value === 'none' ? '' as ShiftChoice : value as ShiftChoice)}
                >
                  <SelectTrigger>
                    <SelectValue>
                      <Badge className={getChoiceColor(getShiftChoice(shift as keyof DayPreferences))}>
                        {getChoiceLabel(getShiftChoice(shift as keyof DayPreferences))}
                      </Badge>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">לא נבחר</SelectItem>
                    <SelectItem value="#">מעדיף</SelectItem>
                    <SelectItem value="-">זמין</SelectItem>
                    <SelectItem value="x">חוסם</SelectItem>
                    <SelectItem value="!">דחוף</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
        </div>

        {/* הערות ליום */}
        <div className="space-y-2 pt-4 border-t">
          <label className={`block text-sm font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            הערות ליום
          </label>
          <Textarea
            className={`w-full p-2 border rounded-md ${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            placeholder="הערות נוספות ליום זה..."
            value={employee.preferences[selectedDate]?.dayNote || ''}
            onChange={(e) => onNoteChange(e.target.value)}
          />
        </div>
      </CardContent>
    </Card>
  );
};
