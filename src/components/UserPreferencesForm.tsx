
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { UserPreferences } from '../types/shift';
import { Settings, Sun, Sunset, Moon } from 'lucide-react';

interface UserPreferencesFormProps {
  preferences: UserPreferences;
  onUpdatePreferences: (preferences: UserPreferences) => void;
  isDarkMode?: boolean;
}

export const UserPreferencesForm: React.FC<UserPreferencesFormProps> = ({
  preferences,
  onUpdatePreferences,
  isDarkMode = false
}) => {
  const [localPrefs, setLocalPrefs] = useState<UserPreferences>({
    preferredShifts: preferences?.preferredShifts || [],
    avoidedShifts: preferences?.avoidedShifts || [],
    notes: preferences?.notes || ''
  });

  const handleShiftPreferenceChange = (
    shift: 'morning' | 'afternoon' | 'night', 
    type: 'preferred' | 'avoided', 
    checked: boolean
  ) => {
    const newPrefs = { ...localPrefs };
    
    if (type === 'preferred') {
      if (checked) {
        newPrefs.preferredShifts = [...newPrefs.preferredShifts.filter(s => s !== shift), shift];
        newPrefs.avoidedShifts = newPrefs.avoidedShifts.filter(s => s !== shift);
      } else {
        newPrefs.preferredShifts = newPrefs.preferredShifts.filter(s => s !== shift);
      }
    } else {
      if (checked) {
        newPrefs.avoidedShifts = [...newPrefs.avoidedShifts.filter(s => s !== shift), shift];
        newPrefs.preferredShifts = newPrefs.preferredShifts.filter(s => s !== shift);
      } else {
        newPrefs.avoidedShifts = newPrefs.avoidedShifts.filter(s => s !== shift);
      }
    }
    
    setLocalPrefs(newPrefs);
  };

  const handleSave = () => {
    onUpdatePreferences(localPrefs);
  };

  const shiftIcons = {
    morning: Sun,
    afternoon: Sunset,
    night: Moon
  };

  const shiftLabels = {
    morning: 'בוקר',
    afternoon: 'צהריים',
    night: 'לילה'
  };

  return (
    <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-600' : ''}`}>
      <CardHeader>
        <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
          <Settings className="h-5 w-5" />
          העדפות קבועות
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            העדפות משמרות
          </h4>
          
          {(['morning', 'afternoon', 'night'] as const).map(shift => {
            const Icon = shiftIcons[shift];
            return (
              <div key={shift} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span className={`font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
                    {shiftLabels[shift]}
                  </span>
                </div>
                
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={localPrefs.preferredShifts.includes(shift)}
                      onCheckedChange={(checked) => 
                        handleShiftPreferenceChange(shift, 'preferred', checked as boolean)
                      }
                    />
                    מעדיף
                  </label>
                  
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={localPrefs.avoidedShifts.includes(shift)}
                      onCheckedChange={(checked) => 
                        handleShiftPreferenceChange(shift, 'avoided', checked as boolean)
                      }
                    />
                    מעדיף לא
                  </label>
                </div>
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <label className={`block font-medium ${isDarkMode ? 'text-gray-200' : 'text-gray-700'}`}>
            הערות נוספות
          </label>
          <Textarea
            placeholder="הערות כלליות על העדפותיך..."
            value={localPrefs.notes}
            onChange={(e) => setLocalPrefs({ ...localPrefs, notes: e.target.value })}
            className={`${isDarkMode ? 'bg-gray-700 border-gray-600 text-white' : ''}`}
          />
        </div>

        <Button onClick={handleSave} className="w-full">
          שמור העדפות
        </Button>
      </CardContent>
    </Card>
  );
};
