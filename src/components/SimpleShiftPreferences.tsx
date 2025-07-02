
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Employee, UserPreferences } from '../types/shift';
import { Sun, Sunset, Moon, X, Minus, Hash, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface SimpleShiftPreferencesProps {
  employee: Employee;
  onUpdateEmployee: (prefs: UserPreferences) => void;
  onClearAllPreferences?: () => void;
  isDarkMode?: boolean;
}

type DayPart = 'morning' | 'afternoon' | 'night';
type PreferenceChoice = 'prefer' | 'avoid' | 'block' | '';

export const SimpleShiftPreferences: React.FC<SimpleShiftPreferencesProps> = ({
  employee,
  onUpdateEmployee,
  onClearAllPreferences,
  isDarkMode = false
}) => {
  const [preferences, setPreferences] = useState<Record<DayPart, PreferenceChoice>>(() => {
    const userPrefs = employee.userPreferences;
    const initial: Record<DayPart, PreferenceChoice> = {
      morning: '',
      afternoon: '',
      night: ''
    };

    if (userPrefs) {
      (['morning', 'afternoon', 'night'] as DayPart[]).forEach(dayPart => {
        if (userPrefs.preferredShifts.includes(dayPart)) {
          initial[dayPart] = 'prefer';
        } else if (userPrefs.avoidedShifts.includes(dayPart)) {
          initial[dayPart] = 'avoid';
        }
      });
    }

    return initial;
  });

  const dayParts: { key: DayPart; label: string; icon: React.ReactNode; description: string }[] = [
    {
      key: 'morning',
      label: 'בוקר',
      icon: <Sun className="h-5 w-5 text-yellow-500" />,
      description: 'כולל: בוקר (א), יבנה 1, מרכז מבקרים'
    },
    {
      key: 'afternoon',
      label: 'צהריים',
      icon: <Sunset className="h-5 w-5 text-orange-500" />,
      description: 'כולל: צהריים (ב), יבנה 2, סיור'
    },
    {
      key: 'night',
      label: 'לילה',
      icon: <Moon className="h-5 w-5 text-blue-500" />,
      description: 'כולל: לילה (ג)'
    }
  ];

  const getPreferenceIcon = (choice: PreferenceChoice) => {
    switch (choice) {
      case 'block': return <X className="h-4 w-4 text-red-500" />;
      case 'avoid': return <Minus className="h-4 w-4 text-yellow-500" />;
      case 'prefer': return <Hash className="h-4 w-4 text-green-500" />;
      default: return null;
    }
  };

  const handlePreferenceChange = (dayPart: DayPart, choice: PreferenceChoice) => {
    setPreferences(prev => ({
      ...prev,
      [dayPart]: choice
    }));
  };

  const handleSave = () => {
    const newUserPreferences: UserPreferences = {
      preferredShifts: Object.entries(preferences)
        .filter(([_, choice]) => choice === 'prefer')
        .map(([dayPart]) => dayPart as any),
      avoidedShifts: Object.entries(preferences)
        .filter(([_, choice]) => choice === 'avoid')
        .map(([dayPart]) => dayPart as any),
      notes: employee.userPreferences?.notes || ''
    };

    onUpdateEmployee(newUserPreferences);
  };

  const handleClearAll = () => {
    if (onClearAllPreferences) {
      onClearAllPreferences();
      setPreferences({
        morning: '',
        afternoon: '',
        night: ''
      });
      toast({
        title: 'נוקה בהצלחה',
        description: 'כל ההעדפות של החודש נמחקו',
      });
    }
  };

  return (
    <Card className={isDarkMode ? 'bg-gray-800 border-gray-600' : ''}>
      <CardHeader>
        <CardTitle className={`flex items-center justify-between ${isDarkMode ? 'text-white' : ''}`}>
          <span>העדפות משמרות - {employee.name}</span>
          {onClearAllPreferences && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleClearAll}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              נקה הכל
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {dayParts.map(({ key, label, icon, description }) => (
            <div key={key} className="p-4 border rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                {icon}
                <div>
                  <h4 className="font-semibold">{label}</h4>
                  <p className="text-sm text-gray-600">{description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">העדפה:</span>
                <Select
                  value={preferences[key]}
                  onValueChange={(value) => handlePreferenceChange(key, value as PreferenceChoice)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="בחר העדפה">
                      <div className="flex items-center gap-2">
                        {getPreferenceIcon(preferences[key])}
                        <span>
                          {preferences[key] === 'prefer' && 'מעדיף'}
                          {preferences[key] === 'avoid' && 'מעדיף לא'}
                          {preferences[key] === 'block' && 'חוסם'}
                          {!preferences[key] && 'ללא העדפה'}
                        </span>
                      </div>
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">ללא העדפה</SelectItem>
                    <SelectItem value="prefer">
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4 text-green-500" />
                        מעדיף
                      </div>
                    </SelectItem>
                    <SelectItem value="avoid">
                      <div className="flex items-center gap-2">
                        <Minus className="h-4 w-4 text-yellow-500" />
                        מעדיף לא
                      </div>
                    </SelectItem>
                    <SelectItem value="block">
                      <div className="flex items-center gap-2">
                        <X className="h-4 w-4 text-red-500" />
                        חוסם
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <Button onClick={handleSave} className="w-full">
            שמור העדפות
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
