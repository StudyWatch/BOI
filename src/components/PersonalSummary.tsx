import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Calendar, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { differenceInHours, differenceInDays, parseISO } from 'date-fns';

interface ShiftAssignment {
  date: string;
  shift_type: string;
  role: string;
  assigned_by: 'auto' | 'manual' | 'swap' | string;
  assigned_at: string;
  notes?: string | null;
}

interface Shift {
  date: string;
  shift: string;
  role: string;
  assignedBy: string;
  dateObj: Date;
  notes?: string | null;
}

interface Employee {
  id: string;
  name: string;
}

interface PersonalSummaryProps {
  employee: Employee;
  currentMonth: Date;
  onExportPDF: () => void;
  onExportExcel: () => void;
  isDarkMode?: boolean;
}

// פונקציה שממפה תתי משמרות לקטגוריות ראשיות
const normalizeShiftType = (shift: string): 'morning' | 'afternoon' | 'night' | 'other' => {
  const morningShifts = ['morning', 'morning2', 'yavne1', 'visitorsCenter'];
  const afternoonShifts = ['afternoon', 'patrolAfternoon', 'yavne2'];
  const nightShifts = ['night'];
  if (morningShifts.includes(shift)) return 'morning';
  if (afternoonShifts.includes(shift)) return 'afternoon';
  if (nightShifts.includes(shift)) return 'night';
  return 'other';
};

export const PersonalSummary: React.FC<PersonalSummaryProps> = ({
  employee,
  currentMonth,
  onExportPDF,
  onExportExcel,
  isDarkMode = false,
}) => {
  const [loading, setLoading] = useState(false);
  const [shiftsArr, setShiftsArr] = useState<Shift[]>([]);

  useEffect(() => {
    if (!employee?.id) return;

    const fetchShifts = async () => {
      setLoading(true);
      const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).toISOString().slice(0, 10);
      const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).toISOString().slice(0, 10);

      const { data, error } = await supabase
        .from('shift_assignments')
        .select('date,shift_type,role,assigned_by,assigned_at,notes')
        .eq('employee_id', employee.id)
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: true });

      if (error) {
        setShiftsArr([]);
      } else {
        setShiftsArr(
          (data || []).map((shift: ShiftAssignment) => ({
            date: shift.date,
            shift: shift.shift_type,
            role: shift.role,
            assignedBy: shift.assigned_by,
            dateObj: parseISO(shift.date),
            notes: shift.notes ?? null,
          }))
        );
      }
      setLoading(false);
    };

    fetchShifts();
  }, [employee, currentMonth]);

  // ספירת משמרות לפי קטגוריה
  const shiftCounts = useMemo(() => {
    const counts: Record<'morning' | 'afternoon' | 'night' | 'other', number> = {
      morning: 0,
      afternoon: 0,
      night: 0,
      other: 0,
    };
    shiftsArr.forEach((shift) => {
      const norm = normalizeShiftType(shift.shift);
      counts[norm]++;
    });
    return counts;
  }, [shiftsArr]);

  // המשמרת הבאה - גם אם היום!
  const nextShift = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return (
      shiftsArr.find((s) => {
        const shiftDate = new Date(s.dateObj);
        shiftDate.setHours(0, 0, 0, 0);
        return shiftDate >= now;
      }) || null
    );
  }, [shiftsArr]);

  const timeToNextShift = useMemo(() => {
    if (!nextShift) return null;
    const now = new Date();
    const shiftDate = new Date(nextShift.dateObj);
    now.setHours(0, 0, 0, 0);
    shiftDate.setHours(0, 0, 0, 0);
    const days = differenceInDays(shiftDate, now);
    const hours = differenceInHours(shiftDate, now) % 24;
    if (days === 0) return 'היום';
    if (days === 1) return 'מחר';
    if (days > 1) return `בעוד ${days} ימים`;
    return null;
  }, [nextShift]);

  // עזר לייצוג
  const shiftTypeColor = (shift: string) => {
    const norm = normalizeShiftType(shift);
    if (norm === 'morning') return 'bg-yellow-100 text-yellow-800';
    if (norm === 'afternoon') return 'bg-orange-100 text-orange-800';
    if (norm === 'night') return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };
  const getShiftTypeLabel = (shift: string) => {
    const norm = normalizeShiftType(shift);
    if (norm === 'morning') return 'בוקר';
    if (norm === 'afternoon') return 'צהריים';
    if (norm === 'night') return 'לילה';
    return shift;
  };
  const getRoleLabel = (role: string) => {
    if (role === 'ahamash') return 'אחמ"ש';
    if (role === 'boker') return 'בקר';
    if (role === 'mavtach') return 'מאבטח';
    if (role === 'bokrit') return 'בקרית';
    return role;
  };
  const getRoleColor = (role: string) => {
    if (role === 'ahamash') return 'bg-green-100 text-green-800';
    if (role === 'boker') return 'bg-yellow-100 text-yellow-800';
    if (role === 'mavtach') return 'bg-red-100 text-red-800';
    if (role === 'bokrit') return 'bg-purple-100 text-purple-800';
    return 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <Card className={isDarkMode ? 'bg-gray-800 border-gray-600' : ''}>
        <CardContent className="pt-6 text-center">טוען משמרות...</CardContent>
      </Card>
    );
  }

  return (
    <Card className={`w-full ${isDarkMode ? 'bg-gray-800 border-gray-600' : ''}`}>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            סיכום אישי - {currentMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
          </CardTitle>
          <div className="flex gap-2">
            <Button onClick={onExportPDF} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button onClick={onExportExcel} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* סטטיסטיקות משמרות */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-yellow-50 rounded-lg">
            <div className="text-2xl font-bold text-yellow-800">{shiftCounts.morning}</div>
            <div className="text-sm text-yellow-600">משמרות בוקר</div>
          </div>
          <div className="text-center p-3 bg-orange-50 rounded-lg">
            <div className="text-2xl font-bold text-orange-800">{shiftCounts.afternoon}</div>
            <div className="text-sm text-orange-600">משמרות צהריים</div>
          </div>
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-800">{shiftCounts.night}</div>
            <div className="text-sm text-blue-600">משמרות לילה</div>
          </div>
          <div className="text-center p-3 bg-gray-50 rounded-lg">
            <div className="text-2xl font-bold text-gray-800">{shiftCounts.other}</div>
            <div className="text-sm text-gray-600">משמרות אחרות</div>
          </div>
          <div className="text-center p-3 bg-gray-100 rounded-lg">
            <div className="text-2xl font-bold text-gray-900">{shiftsArr.length}</div>
            <div className="text-sm text-gray-700">סה"כ משמרות</div>
          </div>
        </div>

        {/* המשמרת הבאה */}
     {/* המשמרת הבאה - עיצוב חדש */}
{nextShift ? (
  <div className="flex flex-col items-center justify-center rounded-2xl bg-blue-50 dark:bg-blue-900 p-6 shadow-md mb-6">
    <div className="flex flex-row items-center justify-center gap-4">
      <Calendar className="w-12 h-12 text-blue-600" />
      <div className="flex flex-col items-start">
        <div className="text-lg font-extrabold text-blue-900 dark:text-white mb-2 tracking-tight">
          המשמרת הבאה
        </div>
        <div className="flex flex-row items-center gap-3 mb-2">
          <span className="text-2xl font-bold text-blue-800 dark:text-white">
            {getShiftTypeLabel(nextShift.shift)}
          </span>
          <span className="text-xl font-semibold text-gray-600 dark:text-gray-200">
            - {getRoleLabel(nextShift.role)}
          </span>
        </div>
        <div className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-1">
          {nextShift.dateObj.toLocaleDateString('he-IL')}
        </div>
        <div className="flex flex-row items-center gap-2">
          <Clock className="w-7 h-7 text-blue-600" />
          <span className="text-lg font-medium text-blue-700 dark:text-blue-200">{timeToNextShift}</span>
        </div>
      </div>
    </div>
  </div>
) : (
  <div className="text-gray-500 dark:text-gray-400">אין משמרות עתידיות מתוזמנות</div>
)}


        {/* רשימת משמרות */}
        <div className="space-y-2">
          <h4 className="font-semibold text-gray-800 dark:text-gray-200">משמרות משובצות:</h4>
          {shiftsArr.length === 0 ? (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">אין משמרות משובצות עדיין</p>
          ) : (
            <div className="max-h-64 overflow-y-auto space-y-2">
              {shiftsArr.map((shift, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {shift.dateObj.toLocaleDateString('he-IL')}
                    </span>
                    <Badge className={shiftTypeColor(shift.shift)}>
                      {getShiftTypeLabel(shift.shift)}
                    </Badge>
                    <Badge className={getRoleColor(shift.role)}>
                      {getRoleLabel(shift.role)}
                    </Badge>
                    {shift.notes && (
                      <Badge variant="outline" className="text-xs border-blue-300 bg-blue-50 text-blue-800">
                        {shift.notes}
                      </Badge>
                    )}
                  </div>
                  <Badge variant={shift.assignedBy === 'auto' ? 'secondary' : 'default'}>
                    {shift.assignedBy === 'auto'
                      ? 'אוטומטי'
                      : shift.assignedBy === 'manual'
                      ? 'ידני'
                      : shift.assignedBy === 'swap'
                      ? 'החלפה'
                      : shift.assignedBy}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
