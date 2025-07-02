import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Employee,
  GeneratedSchedule,
  AssignedShift,
  WorkRuleViolation,
  SHIFT_TIMES
} from '../types/shift';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  Calendar,
  AlertTriangle,
  CheckCircle,
  Zap,
  Brain,
  TrendingUp
} from 'lucide-react';
import { generateSchedule } from '../utils/scheduleGenerator';
import { validateWorkRules } from '../utils/workRules';

interface AutoScheduleGeneratorProps {
  employees: Employee[];
  selectedMonth: Date;
  isDarkMode: boolean;
  onScheduleGenerated: (schedule: GeneratedSchedule[]) => void;
  startDate: string;
  endDate: string;
}

const AutoScheduleGenerator: React.FC<AutoScheduleGeneratorProps> = ({
  employees,
  selectedMonth,
  isDarkMode,
  onScheduleGenerated,
  startDate,
  endDate
}) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedSchedule[]>([]);
  const [generationStats, setGenerationStats] = useState<{
    totalAssignments: number;
    fairnessScore: number;
    preferenceScore: number;
  }>({
    totalAssignments: 0,
    fairnessScore: 0,
    preferenceScore: 0
  });

  const filteredSchedule = useMemo(() => {
    if (!generatedSchedule.length) return [];
    return generatedSchedule.filter(day =>
      (!startDate || day.date >= startDate) && (!endDate || day.date <= endDate)
    );
  }, [generatedSchedule, startDate, endDate]);

  const handleGenerateSchedule = async () => {
    setIsGenerating(true);
    try {
      const schedule = await generateSchedule(employees, selectedMonth, startDate, endDate);
      setGeneratedSchedule(schedule);
      onScheduleGenerated(schedule);

      const genIssues = schedule.flatMap(day => day.issues || []);
      const stats = calculateGenerationStats(schedule, employees, genIssues.length);
      setGenerationStats(stats);

      toast({
        title: 'סידור חכם נוצר בהצלחה',
        description: `נוצר סידור עם ${stats.totalAssignments} הקצאות, ${genIssues.length} בעיות`,
        variant: genIssues.length > 5 ? 'destructive' : 'default'
      });
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'שגיאה ביצירת הסידור',
        description: err.message || 'אירעה שגיאה לא צפויה',
        variant: 'destructive'
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const scheduleRecord = useMemo<Record<string, AssignedShift[]>>(() => {
    const rec: Record<string, AssignedShift[]> = {};
    filteredSchedule.forEach(day => {
      rec[day.date] = [];
      (Object.entries(day) as Array<[string, any]>).forEach(([shiftType, emps]) => {
        if (Array.isArray(emps)) {
          emps.forEach((emp: Employee) => {
            rec[day.date].push({
              employeeId: emp.id,
              date: day.date,
              shift: shiftType as any,
              role: emp.role,
              assignedBy: 'auto',
              assignedAt: new Date().toISOString()
            });
          });
        }
      });
    });
    return rec;
  }, [filteredSchedule]);

  const workViolations = useMemo<WorkRuleViolation[]>(() => {
    return employees.flatMap(emp =>
      validateWorkRules(emp, scheduleRecord, startDate, endDate)
    );
  }, [employees, scheduleRecord, startDate, endDate]);

  const allViolationMessages = useMemo<string[]>(() => {
    const genMsgs = filteredSchedule.flatMap(day => day.issues || []);
    const workMsgs = workViolations.map(
      v => `${v.message}${v.employeeId ? ' (' + (employees.find(e => e.id === v.employeeId)?.name ?? v.employeeId) + ')' : ''}`
    );
    return Array.from(new Set([...genMsgs, ...workMsgs]));
  }, [filteredSchedule, workViolations, employees]);

  const calculateGenerationStats = (
    schedule: GeneratedSchedule[],
    employees: Employee[],
    issuesCount: number
  ) => {
    let totalAssignments = 0;
    const counts: Record<string, number> = {};
    employees.forEach(emp => { counts[emp.id] = 0; });

    schedule.forEach(day => {
      Object.values(day).forEach(val => {
        if (Array.isArray(val)) {
          val.forEach(emp => {
            totalAssignments++;
            counts[emp.id]++;
          });
        }
      });
    });

    const shiftCounts = Object.values(counts);
    if (shiftCounts.length === 0) {
      return {
        totalAssignments,
        fairnessScore: 100,
        preferenceScore: 100
      };
    }
    const avg = shiftCounts.reduce((a, b) => a + b, 0) / shiftCounts.length;
    const variance =
      shiftCounts.reduce((sum, c) => sum + (c - avg) ** 2, 0) / shiftCounts.length;
    const fairnessScore = Math.max(0, 100 - Math.sqrt(variance) * 10);
    const preferenceScore = Math.min(100, Math.max(0, 85 - issuesCount * 2));

    return {
      totalAssignments,
      fairnessScore: Math.round(fairnessScore),
      preferenceScore: Math.round(preferenceScore)
    };
  };

  // שמירה גם אם יש בעיות, עם הודעה מפורטת
  const saveSchedule = async () => {
    if (!filteredSchedule.length) {
      toast({ title: 'שגיאה', description: 'אין סידור לשמירה', variant: 'destructive' });
      return;
    }

    try {
      // מחיקת סידור בטווח
      const { error: delErr } = await supabase
        .from('shift_assignments')
        .delete()
        .gte('date', startDate)
        .lte('date', endDate);
      if (delErr) throw delErr;

      // הוספת סידור חדש
      const assignments: any[] = [];
      filteredSchedule.forEach(daySchedule => {
        Object.entries(daySchedule).forEach(([shiftType, emps]) => {
          if (Array.isArray(emps)) {
            emps.forEach(emp => {
              assignments.push({
                employee_id: emp.id,
                date: daySchedule.date,
                shift_type: shiftType,
                role: emp.role,
                assigned_by: 'auto',  // ערך מותאם ל־check constraint
                assigned_at: new Date().toISOString()
              });
            });
          }
        });
      });

      if (assignments.length) {
        const { error: insErr } = await supabase
          .from('shift_assignments')
          .insert(assignments);
        if (insErr) throw insErr;
      }

      toast({
        title: 'הסידור נשמר',
        description: `נשמרו ${assignments.length} הקצאות`
      });

      if (allViolationMessages.length) {
        toast({
          title: 'הסידור כולל הפרות',
          description: `נמצאו ${allViolationMessages.length} בעיות בסידור, אנא בדוק ותקן במידת הצורך`,
          variant: 'warning'
        });
      }
    } catch (err: any) {
      console.error(err);
      toast({
        title: 'שגיאה בשמירה',
        description: err.message || 'לא ניתן לשמור את הסידור',
        variant: 'destructive'
      });
    }
  };

  // מחיקת הסידור בטווח
  const deleteSchedule = async () => {
    try {
      const { error } = await supabase
        .from('shift_assignments')
        .delete()
        .gte('date', startDate)
        .lte('date', endDate);
      if (error) throw error;
      setGeneratedSchedule([]);
      onScheduleGenerated([]);
      toast({ title: 'הסידור נמחק בהצלחה' });
    } catch (err: any) {
      toast({
        title: 'שגיאה במחיקה',
        description: err.message || 'שגיאה לא צפויה במחיקת הסידור',
        variant: 'destructive'
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card className={isDarkMode ? 'bg-gray-800 border-gray-600' : ''}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
            <Brain className="h-5 w-5" /> מחולל סידור חכם ומתקדם
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Controls */}
            <div className="flex items-center justify-between">
              <div>
                <h3 className={`font-medium ${isDarkMode ? 'text-white' : ''}`}>
                  טווח: {startDate} עד {endDate}
                </h3>
                <p className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  {employees.length} עובדים פעילים | אלגוריתם ניקוד חכם
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={handleGenerateSchedule}
                  disabled={isGenerating || !employees.length}
                  className="flex items-center gap-2"
                >
                  <Zap className="h-4 w-4" />
                  {isGenerating ? 'מחולל...' : 'חולל סידור'}
                </Button>
                {filteredSchedule.length > 0 && (
                  <>
                    <Button
                      onClick={saveSchedule}
                      variant="outline"
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" /> שמור סידור
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={deleteSchedule}
                      className="flex items-center gap-2"
                    >
                      <AlertTriangle className="h-4 w-4" /> מחק סידור
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Statistics */}
            {filteredSchedule.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="border-blue-200 bg-blue-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="h-4 w-4 text-blue-600" />
                      <span className="font-medium text-blue-800">סך הקצאות</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">
                      {generationStats.totalAssignments}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="font-medium text-green-800">ציון הוגנות</span>
                    </div>
                    <p className="text-2xl font-bold text-green-700">
                      {isNaN(generationStats.fairnessScore) ? '—' : `${generationStats.fairnessScore}%`}
                    </p>
                  </CardContent>
                </Card>
                <Card className="border-purple-200 bg-purple-50">
                  <CardContent className="pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <Brain className="h-4 w-4 text-purple-600" />
                      <span className="font-medium text-purple-800">ציון העדפות</span>
                    </div>
                    <p className="text-2xl font-bold text-purple-700">
                      {generationStats.preferenceScore}%
                    </p>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Violations - מציג את כל ההודעות בגלילה */}
            {allViolationMessages.length > 0 && (
              <div className="max-h-64 overflow-y-auto bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-800">
                    נמצאו {allViolationMessages.length} הפרות:
                  </span>
                </div>
                <ul className="text-sm text-red-700 space-y-1" dir="rtl">
                  {allViolationMessages.map((msg, i) => (
                    <li key={i}>• {msg}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* תצוגה טבלה פשוטה */}
            {filteredSchedule.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full table-auto border-collapse">
                  <thead>
                    <tr>
                      <th className="border px-2">תאריך</th>
                      {Object.entries(SHIFT_TIMES).map(([key, info]) => (
                        <th key={key} className="border px-2">{info.label}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSchedule.map(day => (
                      <tr key={day.date}>
                        <td className="border px-2">
                          {new Date(day.date).toLocaleDateString('he-IL')}
                        </td>
                        {Object.keys(SHIFT_TIMES).map(shiftKey => {
                          const emps = (day as any)[shiftKey] as Employee[] | undefined;
                          return (
                            <td key={shiftKey} className="border px-2 align-top">
                              {emps && emps.length > 0
                                ? emps.map(e => e.name).join(', ')
                                : '-'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AutoScheduleGenerator;
