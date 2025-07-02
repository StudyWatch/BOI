
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { DayPreferences } from '../types/shift';
import { getWeekStart, getWeekDates } from '../utils/shiftUtils';
import { AlertTriangle, CheckCircle, Calendar } from 'lucide-react';

interface WeekConstraintsCheckerProps {
  preferences: Record<string, DayPreferences>;
  currentMonth: Date;
  isDarkMode?: boolean;
}

interface WeekValidation {
  weekKey: string;
  weekStart: Date;
  isValid: boolean;
  counts: {
    x: number;
    minus: number;
    exams: number;
  };
  limits: {
    maxX: number;
    maxMinus: number;
  };
}

export const WeekConstraintsChecker: React.FC<WeekConstraintsCheckerProps> = ({
  preferences,
  currentMonth,
  isDarkMode = false
}) => {
  const validateWeeklyConstraints = (weekDates: string[]): WeekValidation['counts'] & WeekValidation['limits'] & { isValid: boolean } => {
    let xCount = 0;
    let minusCount = 0;
    let examsCount = 0;
    
    weekDates.forEach(date => {
      const dayPrefs = preferences[date];
      if (!dayPrefs) return;
      
      // Count exams from day notes
      if (dayPrefs.dayNote && dayPrefs.dayNote.toLowerCase().includes('מבחן')) {
        examsCount++;
      }
      
      // Count X's and minuses from all shifts
      const shiftsToCheck = ['morning', 'afternoon', 'night', 'morning2', 'yavne1', 'yavne2', 'patrolAfternoon', 'visitorsCenter'];
      
      shiftsToCheck.forEach(shiftKey => {
        const shiftPref = dayPrefs[shiftKey as keyof DayPreferences];
        if (typeof shiftPref === 'object' && shiftPref && 'choice' in shiftPref) {
          if (shiftPref.choice === 'x') xCount++;
          if (shiftPref.choice === '-') minusCount++;
        }
      });
    });
    
    // Calculate limits - 5 base X's + 2 per exam, 2 minuses always
    const maxX = 5 + (examsCount * 2);
    const maxMinus = 2;
    
    const isValid = xCount <= maxX && minusCount <= maxMinus;
    
    return {
      x: xCount,
      minus: minusCount,
      exams: examsCount,
      maxX,
      maxMinus,
      isValid
    };
  };

  const getMonthWeeks = (): WeekValidation[] => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const weeks = new Map<string, Date[]>();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const weekStart = getWeekStart(new Date(date));
      const weekKey = weekStart.toISOString().split('T')[0];
      
      if (!weeks.has(weekKey)) {
        weeks.set(weekKey, []);
      }
      weeks.get(weekKey)!.push(date);
    }
    
    return Array.from(weeks.entries()).map(([weekKey, weekDays]) => {
      const weekDates = weekDays.map(d => d.toISOString().split('T')[0]);
      const validation = validateWeeklyConstraints(weekDates);
      
      return {
        weekKey,
        weekStart: new Date(weekKey),
        isValid: validation.isValid,
        counts: {
          x: validation.x,
          minus: validation.minus,
          exams: validation.exams
        },
        limits: {
          maxX: validation.maxX,
          maxMinus: validation.maxMinus
        }
      };
    });
  };

  const weekValidations = getMonthWeeks();
  const hasErrors = weekValidations.some(w => !w.isValid);

  return (
    <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-600' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-4">
          {hasErrors ? (
            <AlertTriangle className="h-5 w-5 text-red-500" />
          ) : (
            <CheckCircle className="h-5 w-5 text-green-500" />
          )}
          <h4 className={`font-semibold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
            בדיקת מגבלות שבועיות מחוזקת
          </h4>
        </div>

        <div className="space-y-3">
          {weekValidations.map((validation) => (
            <div key={validation.weekKey} className={`p-3 rounded-lg border ${
              validation.isValid 
                ? 'bg-green-50 border-green-200' 
                : 'bg-red-50 border-red-200'
            }`}>
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span className={`font-medium ${
                    validation.isValid ? 'text-green-800' : 'text-red-800'
                  }`}>
                    שבוע {validation.weekStart.getDate()}/{validation.weekStart.getMonth() + 1}
                  </span>
                </div>
                {validation.isValid ? (
                  <CheckCircle className="h-4 w-4 text-green-600" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                )}
              </div>
              
              <div className="flex gap-2 text-sm flex-wrap">
                <Badge variant={validation.counts.x > validation.limits.maxX ? 'destructive' : 'secondary'}>
                  X: {validation.counts.x}/{validation.limits.maxX}
                </Badge>
                <Badge variant={validation.counts.minus > validation.limits.maxMinus ? 'destructive' : 'secondary'}>
                  -: {validation.counts.minus}/{validation.limits.maxMinus}
                </Badge>
                {validation.counts.exams > 0 && (
                  <Badge variant="outline" className="bg-blue-50">
                    מבחנים: {validation.counts.exams} (+{validation.counts.exams * 2} X)
                  </Badge>
                )}
              </div>

              {validation.counts.exams > 0 && (
                <div className="mt-2 text-xs text-blue-700 bg-blue-100 p-2 rounded">
                  זוהו {validation.counts.exams} מבחנים - מותרים {validation.limits.maxX} איקסים במקום 5
                </div>
              )}
            </div>
          ))}
        </div>

        {hasErrors && (
          <Alert className="mt-4" variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              יש חריגות ממגבלות שבועיות! לא ניתן לשמור את הבקשות עד לתיקון השגיאות.
              <br />
              <strong>תזכורת:</strong> מותרים עד 5 איקסים + 2 נוספים לכל מבחן, ועד 2 מינוסים בשבוע.
            </AlertDescription>
          </Alert>
        )}

        <div className="mt-4 p-3 bg-blue-50 rounded text-sm text-blue-800">
          <strong>כללי המגבלות:</strong>
          <ul className="mt-2 space-y-1 text-xs">
            <li>• מותרים עד 5 איקסים בשבוע רגיל</li>
            <li>• עבור כל מבחן בשבוע: +2 איקסים נוספים</li>
            <li>• מותרים עד 2 מינוסים בשבוע (קבוע)</li>
            <li>• שבוע נחשב מיום ראשון עד (לא כולל) ראשון הבא</li>
            <li>• מבחן מזוהה אוטומטית מהמילה "מבחן" בהערות היום</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};
