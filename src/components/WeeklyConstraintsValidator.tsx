import React, { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { AlertTriangle, XCircle, MinusCircle, BookOpen, Sun } from 'lucide-react';

interface WeeklyConstraintsValidatorProps {
  preferences: Record<string, any>;
  currentDate: string;
  onValidationChange: (isValid: boolean, counts: { x: number; minus: number; exams: number }) => void;
  onBlockInput?: (shouldBlock: boolean, message?: string) => void;
}

interface WeeklyRules {
  max_x: number;
  max_minus: number;
  min_open_mornings: number;
  max_x_with_1_exam: number;
  max_x_with_2_exams: number;
  min_open_mornings_with_1_exam: number;
  min_open_mornings_with_2_exams: number;
}

export const WeeklyConstraintsValidator: React.FC<WeeklyConstraintsValidatorProps> = ({
  preferences,
  currentDate,
  onValidationChange,
  onBlockInput
}) => {
  const [weekStats, setWeekStats] = useState({ x: 0, minus: 0, exams: 0, blockedMornings: 0 });
  const [rules, setRules] = useState<WeeklyRules | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    const loadRules = async () => {
      const { data, error } = await supabase
        .from('schedule_rules')
        .select('rule_value')
        .eq('rule_name', 'weekly_constraints')
        .single();

      if (!error && data?.rule_value) {
        setRules(data.rule_value as unknown as WeeklyRules);
      } else {
        console.error('שגיאה בטעינת החוקים:', error);
      }
    };

    loadRules();
  }, []);

  const getWeekStart = (date: Date): Date => {
    const d = new Date(date);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d;
  };

  const validateAndBlock = useCallback((x: number, minus: number, exams: number, blockedMornings: number) => {
    if (!rules) return { isValid: true, message: '' };

    const allowedX = exams === 0 ? rules.max_x : exams === 1 ? rules.max_x_with_1_exam : rules.max_x_with_2_exams;
    const allowedMinus = rules.max_minus;
    const requiredOpenMornings = exams === 0 ? rules.min_open_mornings : exams === 1 ? rules.min_open_mornings_with_1_exam : rules.min_open_mornings_with_2_exams;
    const maxBlockedMornings = 5 - requiredOpenMornings;

    const exceedsX = x > allowedX;
    const exceedsMinus = minus > allowedMinus;
    const blocksTooManyMornings = blockedMornings > maxBlockedMornings;

    return {
      isValid: !(exceedsX || exceedsMinus || blocksTooManyMornings),
      message: [
        exceedsX ? `חרגת ממכסת האיקסים השבועית (${x}/${allowedX})` : '',
        exceedsMinus ? `חרגת ממכסת המינוסים השבועית (${minus}/${allowedMinus})` : '',
        blocksTooManyMornings ? `יש להשאיר לפחות ${requiredOpenMornings} בקרים פתוחים בין ראשון–חמישי` : ''
      ].filter(Boolean).join('\n')
    };
  }, [rules]);

  useEffect(() => {
    if (!rules) return;

    const monthStart = new Date(currentDate);
    monthStart.setDate(1);
    const monthEnd = new Date(monthStart.getFullYear(), monthStart.getMonth() + 1, 0);

    const weeksMap = new Map<string, string[]>();

    for (let d = new Date(monthStart); d <= monthEnd; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const weekStartDate = getWeekStart(d);
      const key = `${weekStartDate.toISOString().split('T')[0]}-${d.getMonth()}-${d.getFullYear()}`;

      if (!weeksMap.has(key)) weeksMap.set(key, []);
      weeksMap.get(key)!.push(dateStr);
    }

    let blocked = false;
    let message = '';
    let totalX = 0;
    let totalMinus = 0;
    let totalExams = 0;
    let totalBlockedMornings = 0;

    weeksMap.forEach(dates => {
      let x = 0;
      let minus = 0;
      let exams = 0;
      let blockedMornings = 0;

      dates.forEach(date => {
        const d = new Date(date);
        const isWeekday = d.getDay() >= 0 && d.getDay() <= 4;
        const dayPrefs = preferences[date];
        if (dayPrefs) {
          if (dayPrefs.dayNote?.toLowerCase().includes('מבחן')) exams++;
          const shifts = ['morning', 'afternoon', 'night', 'yavne1', 'yavne2', 'patrolAfternoon', 'visitorsCenter'];
          shifts.forEach(shift => {
            const choice = dayPrefs[shift]?.choice;
            if (choice === 'x') x++;
            if (choice === '-') minus++;
          });
          if (isWeekday && dayPrefs.morning?.choice === 'x') blockedMornings++;
        }
      });

      totalX += x;
      totalMinus += minus;
      totalExams += exams;
      totalBlockedMornings += blockedMornings;

      const result = validateAndBlock(x, minus, exams, blockedMornings);
      if (!result.isValid) {
        blocked = true;
        message = result.message;
      }
    });

    setIsBlocked(blocked);
    if (onBlockInput) {
      onBlockInput(blocked, message);
    }
    onValidationChange(!blocked, { x: totalX, minus: totalMinus, exams: totalExams });
    setWeekStats({ x: totalX, minus: totalMinus, exams: totalExams, blockedMornings: totalBlockedMornings });
  }, [preferences, currentDate, rules, validateAndBlock, onValidationChange, onBlockInput]);

  const over = (a: number, b: number) => a > b;

  return (
    <Card className={`transition-colors ${isBlocked ? 'border-red-500 bg-red-50' : 'border-green-500 bg-green-50'} fixed top-4 left-4 z-50 w-64 sm:w-72`}>
      <CardContent className="p-3">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <XCircle className="h-4 w-4 text-red-600" />
              <span>איקסים השבוע:</span>
            </div>
            <span className={`font-bold ${over(weekStats.x, rules?.max_x || 0) ? 'text-red-600' : 'text-green-600'}`}>
              {weekStats.x}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <MinusCircle className="h-4 w-4 text-orange-600" />
              <span>מינוסים השבוע:</span>
            </div>
            <span className={`font-bold ${over(weekStats.minus, rules?.max_minus || 0) ? 'text-red-600' : 'text-green-600'}`}>
              {weekStats.minus}
            </span>
          </div>

          {weekStats.exams > 0 && (
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-1">
                <BookOpen className="h-4 w-4 text-blue-600" />
                <span>מבחנים השבוע:</span>
              </div>
              <span className="font-bold text-blue-600">{weekStats.exams}</span>
            </div>
          )}

          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-1">
              <Sun className="h-4 w-4 text-yellow-600" />
              <span>בקרים חסומים (א׳–ה׳):</span>
            </div>
            <span className={`font-bold ${over(weekStats.blockedMornings, rules?.min_open_mornings || 3) ? 'text-red-600' : 'text-green-600'}`}>
              {weekStats.blockedMornings}
            </span>
          </div>

          {isBlocked && (
            <div className="flex items-center gap-1 text-xs text-red-600 mt-2">
              <AlertTriangle className="h-3 w-3" />
              <span>חריגה ממגבלות – לא ניתן לשמור</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};