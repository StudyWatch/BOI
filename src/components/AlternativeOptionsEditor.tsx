import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Minus, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AlternativeOption {
  roles: Record<string, number>; // role -> count
}

interface AlternativeOptionsEditorProps {
  shiftType: string;
  dayType: 'weekday' | 'weekend';
  options: AlternativeOption[];
  onUpdateOptions: (options: AlternativeOption[]) => void;
}

export const AlternativeOptionsEditor: React.FC<AlternativeOptionsEditorProps> = ({
  shiftType,
  dayType,
  options,
  onUpdateOptions
}) => {
  const roles = ['ahamash', 'boker', 'mavtach', 'bokrit'];

  const getRoleLabel = (role: string) => {
    const labels = {
      ahamash: 'אחמ"ש',
      boker: 'בקר',
      mavtach: 'מאבטח',
      bokrit: 'בקרית'
    };
    return labels[role as keyof typeof labels] || role;
  };

const saveToSupabase = async (newOptions: AlternativeOption[]) => {
  const ruleValue = {
    shift_type: shiftType,
    day_type: dayType,
    alternative_options: newOptions
  };

  const { error } = await supabase
    .from('schedule_rules')
    .upsert(
      [
        {
          rule_name: 'shift_requirements',
          rule_value: JSON.parse(JSON.stringify(ruleValue)), // 🔧 המר לפורמט JSON תקני
          updated_at: new Date().toISOString()
        }
      ],
      { onConflict: 'rule_name' } // שים לב: זה מחרוזת ולא מערך
    );

  if (error) {
    console.error('❌ שגיאה בשמירה:', error);
  } else {
    console.log('✅ נשמר בהצלחה:', ruleValue);
  }
};




  const handleUpdateOptions = (newOptions: AlternativeOption[]) => {
    onUpdateOptions(newOptions);
    saveToSupabase(newOptions);
  };

  const addNewOption = () => {
    const newOption: AlternativeOption = {
      roles: { ahamash: 1 }
    };
    handleUpdateOptions([...options, newOption]);
  };

  const removeOption = (optionIndex: number) => {
    const updatedOptions = options.filter((_, index) => index !== optionIndex);
    handleUpdateOptions(updatedOptions);
  };

  const updateOptionRole = (optionIndex: number, role: string, count: number) => {
    const updatedOptions = options.map((option, index) => {
      if (index === optionIndex) {
        const updatedRoles = { ...option.roles };
        if (count > 0) {
          updatedRoles[role] = count;
        } else {
          delete updatedRoles[role];
        }
        return { ...option, roles: updatedRoles };
      }
      return option;
    });
    handleUpdateOptions(updatedOptions);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
        <Label className="text-xs sm:text-sm font-medium">אופציות חלופיות (או/או):</Label>
        <Button
          variant="outline"
          size="sm"
          onClick={addNewOption}
          className="flex items-center gap-1 text-xs sm:text-sm"
        >
          <Plus className="h-3 w-3 sm:h-4 sm:w-4" />
          הוסף אופציה
        </Button>
      </div>

      {options.map((option, optionIndex) => (
        <Card key={optionIndex} className="border-gray-200">
          <CardHeader className="pb-2 sm:pb-3">
            <CardTitle className="text-xs sm:text-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span>אופציה {optionIndex + 1}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => removeOption(optionIndex)}
                disabled={options.length === 1}
                className="text-xs"
              >
                <Minus className="h-3 w-3 sm:h-4 sm:w-4" />
                הסר
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {roles.map(role => (
                <div key={role} className="space-y-1">
                  <Label className="text-xs">{getRoleLabel(role)}</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    value={option.roles[role] || 0}
                    onChange={(e) =>
                      updateOptionRole(optionIndex, role, parseInt(e.target.value) || 0)
                    }
                    className="h-6 sm:h-8 text-xs sm:text-sm"
                  />
                </div>
              ))}
            </div>

            <div className="mt-2 sm:mt-3 text-xs text-gray-600">
              דרושים: {Object.entries(option.roles)
                .filter(([_, count]) => count > 0)
                .map(([role, count]) => `${getRoleLabel(role)} (${count})`)
                .join(' + ') || 'לא הוגדר'}
            </div>
          </CardContent>
        </Card>
      ))}

      {options.length === 0 && (
        <div className="text-center text-gray-500 py-4">
          <div className="text-xs sm:text-sm">אין אופציות חלופיות</div>
          <Button variant="outline" size="sm" onClick={addNewOption} className="mt-2 text-xs sm:text-sm">
            <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
            הוסף אופציה ראשונה
          </Button>
        </div>
      )}
    </div>
  );
};
