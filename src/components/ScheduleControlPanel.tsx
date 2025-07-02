import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell
} from '@/components/ui/table';
import { Employee, GeneratedSchedule, WorkRuleViolation, SHIFT_TIMES } from '../types/shift';
import { validateWorkRules } from '../utils/workRules';
import { Search, AlertTriangle, CheckCircle, Edit2, Users, Save } from 'lucide-react';

interface WeeklyRules {
  max_x: number;
  max_minus: number;
  min_open_mornings: number;
  max_x_with_1_exam: number;
  max_x_with_2_exams: number;
  min_open_mornings_with_1_exam: number;
  min_open_mornings_with_2_exams: number;
}

interface ScheduleControlPanelProps {
  employees: Employee[];
  schedule: GeneratedSchedule[];
  onUpdateSchedule: (schedule: GeneratedSchedule[]) => void;
}

export const ScheduleControlPanel: React.FC<ScheduleControlPanelProps> = ({
  employees,
  schedule,
  onUpdateSchedule
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [editingCell, setEditingCell] = useState<{ date: string; shift: string } | null>(null);
  const [rules, setRules] = useState<WeeklyRules | null>(null);
  const [editRules, setEditRules] = useState<WeeklyRules | null>(null);
  const [isSavingRules, setIsSavingRules] = useState(false);

  // טען חוקים מ־Supabase
  useEffect(() => {
    const loadRules = async () => {
      const { data, error } = await supabase
        .from('schedule_rules')
        .select('rule_value')
        .eq('rule_name', 'weekly_constraints')
        .single();
      if (error) {
        console.error('שגיאה בטעינת חוקים מ-Supabase:', error);
        return;
      }
      setRules(data.rule_value as unknown as WeeklyRules);
      setEditRules(data.rule_value as unknown as WeeklyRules);
    };
    loadRules();
  }, []);

  // עריכת חוקים בלייב
  const handleRuleChange = (key: keyof WeeklyRules, value: number) => {
    if (!editRules) return;
    setEditRules({
      ...editRules,
      [key]: value,
    });
  };

  // שמירה ל־DB
  const saveRulesToDB = async () => {
    if (!editRules) return;
    setIsSavingRules(true);
    // הפוך לאובייקט JSON תקני
    const { error } = await supabase
      .from('schedule_rules')
      .update({ rule_value: JSON.parse(JSON.stringify(editRules)) })
      .eq('rule_name', 'weekly_constraints');
    if (error) {
      alert('שגיאה בשמירת הגבלות');
      setIsSavingRules(false);
      return;
    }
    setRules(editRules);
    setIsSavingRules(false);
  };

  // מחשב את רשימת ההפרות לכל עובד
  const violations = useMemo(() => {
    const all: Record<string, WorkRuleViolation[]> = {};
    if (!rules) return all;

    employees.forEach(emp => {
      // ארגן את ההקצאות לפי תאריך
      const empSched: Record<string, any[]> = {};
      schedule.forEach(day => {
        const arr: any[] = [];
        Object.entries(day).forEach(([shiftType, assigned]) => {
          if (Array.isArray(assigned)) {
            assigned.forEach((a: any) => {
              if (a.id === emp.id) {
                arr.push({ date: day.date, shift: shiftType });
              }
            });
          }
        });
        empSched[day.date] = arr;
      });

      // יש לוודא ש־validateWorkRules מקבל (emp, empSched, rules)
      all[emp.id] = validateWorkRules(emp, empSched, rules);
    });

    return all;
  }, [employees, schedule, rules]);

  // פילטור תאריכים
  const filteredData = useMemo(() => {
    return schedule.filter(day => {
      if (dateFilter === 'weekdays') {
        const d = new Date(day.date).getDay();
        return d >= 1 && d <= 5;
      }
      if (dateFilter === 'weekends') {
        const d = new Date(day.date).getDay();
        return d === 0 || d === 6;
      }
      return true;
    });
  }, [schedule, dateFilter]);

  // פילטור עובדים
  const filteredEmployees = useMemo(() => {
    return employees.filter(emp => {
      const matchesName = emp.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCode = emp.code.includes(searchTerm);
      const matchesRole = roleFilter === 'all' || emp.role === roleFilter;
      return (matchesName || matchesCode) && matchesRole;
    });
  }, [employees, searchTerm, roleFilter]);

  const getEmpViolations = (id: string) => violations[id] || [];
  const violationColor = (vs: WorkRuleViolation[]) => {
    if (vs.some(v => v.severity === 'error')) return 'text-red-600 bg-red-50';
    if (vs.some(v => v.severity === 'warning')) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  const handleCellEdit = (date: string, shift: string) => {
    setEditingCell({ date, shift });
  };

  return (
    <div className="space-y-6">
      {/* חוקים להגבלות שבועיות */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Save className="h-5 w-5" />
            עדכון הגבלות שבועיות (אוטומטי מה-DB)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {editRules && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Object.entries(editRules).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-sm font-medium mb-1">{key}</label>
                  <Input
                    type="number"
                    value={value}
                    min={0}
                    onChange={e => handleRuleChange(key as keyof WeeklyRules, parseInt(e.target.value, 10) || 0)}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="flex mt-4 gap-3">
            <Button
              onClick={saveRulesToDB}
              disabled={isSavingRules || !editRules}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" /> שמור הגבלות
            </Button>
            {isSavingRules && <span>שומר...</span>}
          </div>
        </CardContent>
      </Card>

      {/* חיפוש ופילטר */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" /> חיפוש ופילטר
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium">חיפוש עובד</label>
              <Input
                placeholder="שם או קוד..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">סינון לפי תפקיד</label>
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל התפקידים</SelectItem>
                  <SelectItem value="ahamash">אחמ"ש</SelectItem>
                  <SelectItem value="boker">בקר</SelectItem>
                  <SelectItem value="mavtach">מאבטח</SelectItem>
                  <SelectItem value="bokrit">בקרית</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">סינון לפי ימים</label>
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל הימים</SelectItem>
                  <SelectItem value="weekdays">ימי חול</SelectItem>
                  <SelectItem value="weekends">סופי שבוע</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* סיכום הפרות */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> סיכום הפרות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredEmployees.map(emp => {
              const vs = getEmpViolations(emp.id);
              return (
                <div key={emp.id} className={`p-3 rounded-lg border ${violationColor(vs)}`}>
                  <div className="flex justify-between mb-2">
                    <div className="font-medium">{emp.name}</div>
                    <div className="flex items-center gap-2">
                      {vs.length === 0
                        ? <CheckCircle className="h-4 w-4 text-green-600" />
                        : <AlertTriangle className="h-4 w-4 text-red-600" />}
                      <Badge variant={vs.length === 0 ? 'default' : 'destructive'}>
                        {vs.length} הפרות
                      </Badge>
                    </div>
                  </div>
                  {vs.length > 0 && (
                    <div className="space-y-1">
                      {vs.map((v, i) => (
                        <div key={i} className="text-sm">• {v.message}</div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* טבלת שליטה מלאה */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" /> טבלת שליטה מלאה
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>תאריך</TableHead>
                  <TableHead>יום</TableHead>
                  {Object.entries(SHIFT_TIMES).map(([key, info]) => (
                    <TableHead key={key}>{info.label}</TableHead>
                  ))}
                  <TableHead>בעיות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.map(day => {
                  const dateObj = new Date(day.date);
                  const dayName = dateObj.toLocaleDateString('he-IL', { weekday: 'long' });
                  const dateStr = dateObj.toLocaleDateString('he-IL');
                  return (
                    <TableRow key={day.date}>
                      <TableCell className="font-medium">{dateStr}</TableCell>
                      <TableCell>{dayName}</TableCell>
                      {Object.keys(SHIFT_TIMES).map(shiftKey => {
                        const assigned = (day as any)[shiftKey] as Employee[] || [];
                        return (
                          <TableCell key={shiftKey}>
                            <div className="space-y-1">
                              {assigned.length > 0 ? assigned.map(emp => (
                                <div
                                  key={emp.id}
                                  className="flex items-center gap-2 p-1 rounded bg-gray-50 hover:bg-gray-100 cursor-pointer"
                                  onClick={() => handleCellEdit(day.date, shiftKey)}
                                >
                                  <span className="text-sm">{emp.name}</span>
                                  <Edit2 className="h-3 w-3 text-gray-400" />
                                </div>
                              )) : (
                                <div className="text-gray-400 text-sm">לא שובץ</div>
                              )}
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        {day.issues?.length > 0 && (
                          <Badge variant="destructive" className="text-xs">
                            {day.issues.length} בעיות
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
