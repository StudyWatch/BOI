import React, { useState, useEffect } from 'react';
import { ScheduleControlPanel } from './ScheduleControlPanel';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { CalendarDays, ChevronDown, SlidersHorizontal, Zap, Calendar, Users, Settings, FileSpreadsheet, Download, UserPlus } from "lucide-react";

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Employee, GeneratedSchedule } from '../types/shift';
import { EmployeeShiftSelector } from './EmployeeShiftSelector';
import { ShiftRequirementsManager } from './ShiftRequirementsManager';
import EmployeeManagement from './EmployeeManagement';
import AutoScheduleGenerator from './AutoScheduleGenerator';
import ScheduleDisplayViewer from './ScheduleDisplayViewer';
import ReportsTab from './ReportsTab';
import { MobileAdminMenu } from './MobileAdminMenu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';

const AdminDashboard: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [shiftRequirements, setShiftRequirements] = useState<Record<string, any>>({});
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);
  const [generatedSchedule, setGeneratedSchedule] = useState<GeneratedSchedule[]>([]);
  const [activeTab, setActiveTab] = useState('employees');

  // טווח הסידור
  const [rangeType, setRangeType] = useState<'week'|'half1'|'half2'|'month'|'custom'>('month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [startDate, setStartDate] = useState<string>(selectedMonth.toISOString().slice(0,10));
  const [endDate, setEndDate] = useState<string>(selectedMonth.toISOString().slice(0,10));

  useEffect(() => {
    loadEmployeesFromDatabase();
    const storedDarkMode = localStorage.getItem('darkMode') === 'true';
    setIsDarkMode(storedDarkMode);
  }, []);

  useEffect(() => {
    const year = selectedMonth.getFullYear();
    const month = selectedMonth.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let start = '', end = '';
    switch (rangeType) {
      case 'week':
        start = new Date(year, month, 1).toISOString().slice(0,10);
        end = new Date(year, month, 7).toISOString().slice(0,10);
        break;
      case 'half1':
        start = new Date(year, month, 1).toISOString().slice(0,10);
        end = new Date(year, month, 15).toISOString().slice(0,10);
        break;
      case 'half2':
        start = new Date(year, month, 16).toISOString().slice(0,10);
        end = new Date(year, month, daysInMonth).toISOString().slice(0,10);
        break;
      case 'month':
        start = new Date(year, month, 1).toISOString().slice(0,10);
        end = new Date(year, month, daysInMonth).toISOString().slice(0,10);
        break;
      case 'custom':
        start = customStart;
        end = customEnd;
        break;
    }
    setStartDate(start);
    setEndDate(end);
  }, [rangeType, customStart, customEnd, selectedMonth]);

  useEffect(() => {
    localStorage.setItem('darkMode', String(isDarkMode));
    document.body.classList.toggle('dark', isDarkMode);
  }, [isDarkMode]);

  // --------------------
  // CRUD עובדים (כמו שהיה אצלך)
  // --------------------
  const loadEmployeesFromDatabase = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) {
        toast({
          title: 'שגיאה',
          description: 'שגיאה בטעינת רשימת העובדים',
          variant: 'destructive'
        });
        return;
      }

      if (!data || data.length === 0) {
        await createSampleEmployees();
        return;
      }

      const mappedEmployees: Employee[] = data.map(emp => ({
        id: emp.id,
        name: emp.name,
        code: emp.code,
        role: emp.role as 'ahamash' | 'boker' | 'mavtach' | 'bokrit',
        funnyTitle: emp.funny_title || undefined,
        preferences: (emp.preferences as any) || {},
        userPreferences: (emp.userpreferences as any) || {
          preferredShifts: [],
          avoidedShifts: [],
          notes: ''
        }
      }));

      setEmployees(mappedEmployees);

      toast({
        title: 'נטען בהצלחה',
        description: `נטענו ${mappedEmployees.length} עובדים`,
      });
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בטעינת הנתונים',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const createSampleEmployees = async () => {
    try {
      const sampleEmployees = [
        {
          name: 'דוד כהן',
          code: 'EMP001',
          role: 'ahamash',
          funny_title: 'האחמש הראשי',
          active: true,
          preferences: {},
          userpreferences: { preferredShifts: ['morning'], avoidedShifts: ['night'], notes: '' }
        },
        {
          name: 'מיכל לוי',
          code: 'EMP002',
          role: 'boker',
          funny_title: 'בקרית על',
          active: true,
          preferences: {},
          userpreferences: { preferredShifts: ['afternoon'], avoidedShifts: [], notes: '' }
        },
        {
          name: 'יוסי אברהם',
          code: 'EMP003',
          role: 'mavtach',
          funny_title: 'השומר הנאמן',
          active: true,
          preferences: {},
          userpreferences: { preferredShifts: ['night'], avoidedShifts: ['morning'], notes: '' }
        },
        {
          name: 'שרה מזרחי',
          code: 'EMP004',
          role: 'mavtach',
          funny_title: 'מאבטחת יבנה ומרכז מבקרים',
          active: true,
          preferences: {},
          userpreferences: { preferredShifts: ['yavne1', 'yavne2', 'visitorsCenter'], avoidedShifts: [], notes: 'מתמחה ביבנה ומרכז מבקרים' }
        }
      ];

      await supabase
        .from('employees')
        .insert(sampleEmployees)
        .select();

      await loadEmployeesFromDatabase();

      toast({
        title: 'נוצרו עובדים לדוגמה',
        description: 'נוצרו 4 עובדים לדוגמה במערכת כולל מאבטח יבנה ומרכז מבקרים',
      });
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה ביצירת עובדים לדוגמה',
        variant: 'destructive'
      });
    }
  };

  const handleUpdateEmployee = async (updatedEmployee: Employee) => {
    try {
      const { error } = await supabase
        .from('employees')
        .update({
          preferences: updatedEmployee.preferences as any,
          userpreferences: updatedEmployee.userPreferences as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedEmployee.id);

      if (error) {
        toast({
          title: 'שגיאה',
          description: 'שגיאה בעדכון נתוני העובד',
          variant: 'destructive'
        });
        return;
      }

      const updatedEmployees = employees.map(employee =>
        employee.id === updatedEmployee.id ? updatedEmployee : employee
      );
      setEmployees(updatedEmployees);

      toast({
        title: 'נשמר בהצלחה',
        description: 'נתוני העובד עודכנו בהצלחה',
      });
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בעדכון הנתונים',
        variant: 'destructive'
      });
    }
  };

  const handleDateChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedMonth(new Date(event.target.value));
  };

  const handleUpdateRequirements = (requirements: Record<string, any>) => {
    setShiftRequirements(requirements);
  };

  const handleUpdateSchedule = (schedule: GeneratedSchedule[]) => {
    setGeneratedSchedule(schedule);
  };

  const regenerateSchedule = async () => {
    if (!generatedSchedule || generatedSchedule.length === 0) {
      toast({
        title: 'אין סידור קיים',
        description: 'יש ליצור סידור תחילה לפני ריענון',
        variant: 'destructive'
      });
      return;
    }

    try {
      setGeneratedSchedule([]);
      toast({
        title: 'מחולל סידור מחדש...',
        description: 'הסידור מתחדש עם אותן הגדרות והעדפות',
      });
    } catch (error) {
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בחידוש הסידור',
        variant: 'destructive'
      });
    }
  };

  const exportRequestsToExcel = () => {
    try {
      const year = selectedMonth.getFullYear();
      const monthIndex = selectedMonth.getMonth();
      const monthName = selectedMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
      const exportData: any[] = [];

      exportData.push(['שם עובד', 'תאריך', 'יום', 'משמרת', 'בקשה', 'קוד בקשה', 'הערת יום']);

      employees.forEach(employee => {
        const preferences = employee.preferences || {};

        Object.keys(preferences).forEach(dateStr => {
          const dayPrefs = preferences[dateStr];
          const date = new Date(dateStr);
          const dayName = date.toLocaleDateString('he-IL', { weekday: 'long' });

          const shiftTypes = [
            { key: 'morning', name: 'בוקר' },
            { key: 'afternoon', name: 'צהריים' },
            { key: 'night', name: 'לילה' },
            { key: 'morning2', name: 'משמרת ארוכה' },
            { key: 'yavne1', name: 'יבנה 1' },
            { key: 'yavne2', name: 'יבנה 2' },
            { key: 'visitorsCenter', name: 'מרכז מבקרים' }
          ];

          shiftTypes.forEach(({ key, name }) => {
            const shiftPref = dayPrefs[key as keyof typeof dayPrefs];
            if (typeof shiftPref === 'object' && shiftPref && 'choice' in shiftPref) {
              const choice = (shiftPref as { choice: string }).choice;
              if (choice && choice !== '') {
                let choiceDescription = '';
                switch (choice) {
                  case '#':
                    choiceDescription = 'מבקש';
                    break;
                  case '-':
                    choiceDescription = 'לא זמין';
                    break;
                  case 'x':
                    choiceDescription = 'לא רוצה';
                    break;
                  case '!':
                    choiceDescription = 'מוכן';
                    break;
                  default:
                    choiceDescription = choice;
                }
                exportData.push([
                  employee.name,
                  dateStr,
                  dayName,
                  name,
                  choiceDescription,
                  choice,
                  dayPrefs.dayNote || ''
                ]);
              }
            }
          });
        });
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(exportData);
      ws['!cols'] = [
        { wch: 15 }, { wch: 12 }, { wch: 10 }, { wch: 15 },
        { wch: 12 }, { wch: 8 }, { wch: 25 }
      ];
      XLSX.utils.book_append_sheet(wb, ws, 'בקשות עובדים');
      XLSX.writeFile(wb, `בקשות_${monthName.replace(' ', '_')}.xlsx`);

      toast({
        title: 'ייצוא הושלם',
        description: `קובץ הבקשות של ${monthName} הורד בהצלחה`,
      });
    } catch (error) {
      toast({
        title: 'שגיאה בייצוא',
        description: 'אירעה שגיאה בייצוא קובץ הבקשות',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-4 px-2 sm:py-10 sm:px-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div>טוען נתונים...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className={isDarkMode ? 'dark' : ''}>
      <div className="container mx-auto py-4 px-2 sm:py-10 sm:px-4">
        <Card className={`${isDarkMode ? 'bg-gray-800 border-gray-600' : ''}`}>
          <CardHeader className="pb-3 sm:pb-6">
            <CardTitle className={`flex flex-col sm:flex-row items-start sm:items-center gap-2 justify-between ${isDarkMode ? 'text-white' : ''}`}>
              <div className="flex items-center gap-2">
                <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
                <span className="text-lg sm:text-xl">לוח ניהול - פאנל סדרן</span>
              </div>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <span className="text-xs sm:text-sm">עובדים פעילים: {employees.length}</span>
                <div className="flex items-center gap-2">
                  <MobileAdminMenu
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    isDarkMode={isDarkMode}
                    employeesCount={employees.length}
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setIsDarkMode(!isDarkMode)}
                    className="text-xs sm:text-sm"
                  >
                    {isDarkMode ? '☀️' : '🌙'}
                  </Button>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
              {/* Desktop Tabs - Hidden on mobile */}
              <div className="hidden sm:block">
                <TabsList className="grid w-full grid-cols-8 h-auto">
                  <TabsTrigger value="employees" className={`${isDarkMode ? 'text-gray-200' : ''} text-xs p-2`}>
                    <div className="flex flex-col items-center gap-1">
                      <Users className="h-3 w-3" />
                      <span>עובדים</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="management" className={`${isDarkMode ? 'text-gray-200' : ''} text-xs p-2`}>
                    <div className="flex flex-col items-center gap-1">
                      <UserPlus className="h-3 w-3" />
                      <span>ניהול עובדים</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="shifts" className={`${isDarkMode ? 'text-gray-200' : ''} text-xs p-2`}>
                    <div className="flex flex-col items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>משמרות</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="requirements" className={`${isDarkMode ? 'text-gray-200' : ''} text-xs p-2`}>
                    <div className="flex flex-col items-center gap-1">
                      <Settings className="h-3 w-3" />
                      <span>הגדרות דרישות</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="schedule" className={`${isDarkMode ? 'text-gray-200' : ''} text-xs p-2`}>
                    <div className="flex flex-col items-center gap-1">
                      <Zap className="h-3 w-3" />
                      <span>מחולל סידור</span>
                    </div>
                  </TabsTrigger>
                  {/* 👇 חדש - פאנל שליטה */}
                  <TabsTrigger value="control-panel" className={`${isDarkMode ? 'text-gray-200' : ''} text-xs p-2`}>
                    <div className="flex flex-col items-center gap-1">
                      <Settings className="h-3 w-3" />
                      <span>פאנל שליטה</span>
                    </div>
                  </TabsTrigger>
                  {/* 👆 סוף חדש */}
                  <TabsTrigger value="schedule-view" className={`${isDarkMode ? 'text-gray-200' : ''} text-xs p-2`}>
                    <div className="flex flex-col items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>תצוגת סידור</span>
                    </div>
                  </TabsTrigger>
                  <TabsTrigger value="reports" className={`${isDarkMode ? 'text-gray-200' : ''} text-xs p-2`}>
                    <div className="flex flex-col items-center gap-1">
                      <FileSpreadsheet className="h-3 w-3" />
                      <span>דוחות</span>
                    </div>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="employees" className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <h3 className={`text-base sm:text-lg font-semibold ${isDarkMode ? 'text-white' : ''}`}>
                    ניהול עובדים - עריכת העדפות ({employees.length} עובדים)
                  </h3>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <Button
                      onClick={exportRequestsToExcel}
                      className="flex items-center gap-2 text-xs sm:text-sm"
                      variant="outline"
                      disabled={employees.length === 0}
                      size="sm"
                    >
                      <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4" />
                      ייצוא בקשות לאקסל
                    </Button>
                    <Button
                      onClick={createSampleEmployees}
                      className="flex items-center gap-2 text-xs sm:text-sm"
                      variant="outline"
                      size="sm"
                    >
                      <UserPlus className="h-3 w-3 sm:h-4 sm:w-4" />
                      צור עובדים לדוגמה
                    </Button>
                  </div>
                </div>
                <EmployeeShiftSelector
                  employees={employees}
                  selectedMonth={selectedMonth}
                  onUpdateEmployee={handleUpdateEmployee}
                  isDarkMode={isDarkMode}
                />
              </TabsContent>

              <TabsContent value="control-panel" className="space-y-4">
                <ScheduleControlPanel
                  employees={employees}
                  schedule={generatedSchedule}
                  onUpdateSchedule={setGeneratedSchedule}
                />
              </TabsContent>

              <TabsContent value="management" className="space-y-4">
                <EmployeeManagement
                  employees={employees}
                  onEmployeesChange={loadEmployeesFromDatabase}
                  isDarkMode={isDarkMode}
                />
              </TabsContent>

              <TabsContent value="shifts" className="space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <h3 className={`text-base sm:text-lg font-semibold ${isDarkMode ? 'text-white' : ''}`}>
                    תצוגת משמרות חודשית
                  </h3>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 w-full sm:w-auto">
                    <input
                      type="month"
                      value={selectedMonth.toISOString().slice(0, 7)}
                      onChange={handleDateChange}
                      className="border rounded px-2 py-1 text-sm w-full sm:w-auto"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => downloadExcel(employees, selectedMonth)}
                      className="flex items-center gap-1 text-xs sm:text-sm w-full sm:w-auto"
                      disabled={employees.length === 0}
                    >
                      <FileSpreadsheet className="h-3 w-3 sm:h-4 sm:w-4" />
                      <Download className="h-3 w-3 sm:h-4 sm:w-4" />
                      הורד אקסל
                    </Button>
                  </div>
                </div>
                {employees.length === 0 ? (
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-gray-500 mb-4 text-sm">אין עובדים במערכת</div>
                        <Button onClick={createSampleEmployees} size="sm">
                          <UserPlus className="h-4 w-4 mr-2" />
                          צור עובדים לדוגמה
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="text-center text-gray-500 text-sm">
                    בחר בטאב "עובדים" כדי לראות ולערוך את ההעדפות של העובדים
                  </div>
                )}
              </TabsContent>

              <TabsContent value="requirements" className="space-y-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className={`text-base sm:text-lg font-semibold ${isDarkMode ? 'text-white' : ''}`}>
                    הגדרת דרישות תפקידים למשמרות
                  </h3>
                </div>
                <ShiftRequirementsManager onUpdateRequirements={setShiftRequirements} />
              </TabsContent>

              {/* ======= מחולל סידור עם טווח דינמי ======= */}
              <TabsContent value="schedule" className="space-y-4">
                <div className="flex flex-row items-center justify-between mb-2 gap-4">
                  <h3 className={`text-base sm:text-lg font-semibold ${isDarkMode ? 'text-white' : ''}`}>
                    מחולל סידור אוטומטי
                  </h3>
                  <Button
                    onClick={regenerateSchedule}
                    variant="outline"
                    className="flex items-center gap-2 text-xs sm:text-sm"
                    disabled={!generatedSchedule || generatedSchedule.length === 0}
                    size="sm"
                  >
                    <Zap className="h-3 w-3 sm:h-4 sm:w-4" />
                    חולל סידור מחדש
                  </Button>
                </div>
                {/* בחירת טווח */}
                <div className="flex flex-col items-center mb-6 gap-2">
                  <div className="flex items-center gap-4">
                    <span className="font-semibold text-lg flex items-center gap-2">
                      <SlidersHorizontal className="h-5 w-5 text-blue-500" />
                      בחר טווח סידור
                    </span>
                    <Select value={rangeType} onValueChange={value => setRangeType(value as typeof rangeType)}>
                      <SelectTrigger className="w-56 h-12 rounded-xl border-2 border-blue-400 shadow-lg text-base font-medium hover:border-blue-600 transition">
                        <CalendarDays className="h-5 w-5 text-blue-600 mr-2" />
                        <SelectValue placeholder="בחר טווח" />
                        <ChevronDown className="h-5 w-5 ml-2 text-blue-600" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="week">שבוע ראשון של החודש</SelectItem>
                        <SelectItem value="half1">חצי חודש (1–15)</SelectItem>
                        <SelectItem value="half2">חצי חודש (16–סוף)</SelectItem>
                        <SelectItem value="month">חודש מלא</SelectItem>
                        <SelectItem value="custom">מותאם אישית...</SelectItem>
                      </SelectContent>
                    </Select>
                    {rangeType === "custom" && (
                      <div className="flex gap-1 items-center">
                        <input
                          type="date"
                          value={customStart}
                          onChange={e => setCustomStart(e.target.value)}
                          className="rounded-lg border px-2 py-1 text-base w-32"
                        />
                        <span className="text-gray-400 font-medium">עד</span>
                        <input
                          type="date"
                          value={customEnd}
                          onChange={e => setCustomEnd(e.target.value)}
                          className="rounded-lg border px-2 py-1 text-base w-32"
                        />
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-blue-700 mt-2 font-semibold">
                    {rangeType === "week" && "שיבוץ לשבוע הראשון של החודש"}
                    {rangeType === "half1" && "שיבוץ לחצי חודש ראשון (1–15)"}
                    {rangeType === "half2" && "שיבוץ לחצי חודש שני (16–סוף)"}
                    {rangeType === "month" && "שיבוץ לחודש מלא"}
                    {rangeType === "custom" && customStart && customEnd && `שיבוץ מ־${customStart} עד ${customEnd}`}
                  </div>
                </div>
                <AutoScheduleGenerator
                  employees={employees}
                  selectedMonth={selectedMonth}
                  isDarkMode={isDarkMode}
                  onScheduleGenerated={setGeneratedSchedule}
                  startDate={startDate}
                  endDate={endDate}
                />
              </TabsContent>
              {/* ======= סוף מחולל סידור ======= */}

              <TabsContent value="schedule-view" className="space-y-4">
                <ScheduleDisplayViewer
                  schedule={generatedSchedule}
                  employees={employees}
                  month={selectedMonth}
                  isDarkMode={isDarkMode}
                  isAdmin={true}
                />
              </TabsContent>

              <TabsContent value="reports" className="space-y-4">
                <ReportsTab
                  employees={employees}
                  selectedMonth={selectedMonth}
                  isDarkMode={isDarkMode}
                />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const generateExcelData = (employees: Employee[], month: Date) => {
  const year = month.getFullYear();
  const monthIndex = month.getMonth();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const header = ['שם העובד', 'תפקיד', ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const data = [header];

  employees.forEach(employee => {
    const employeeData = [employee.name, employee.role, ...Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, monthIndex, i + 1).toISOString().split('T')[0];
      const dayPreferences = employee.preferences[date];

      if (!dayPreferences) {
        return '';
      }

      const shifts = Object.keys(dayPreferences)
        .filter(key => key !== 'dayNote')
        .map(shiftKey => {
          const shift = dayPreferences[shiftKey as keyof Omit<typeof dayPreferences, 'dayNote'>];
          if (typeof shift === 'object' && shift !== null && 'choice' in shift) {
            return `${shiftKey}:${(shift as { choice: string }).choice}`;
          }
          return '';
        })
        .filter(shift => shift !== '')
        .join('; ');

      return `${shifts}${dayPreferences.dayNote ? `\nNote: ${dayPreferences.dayNote}` : ''}`;
    })];
    data.push(employeeData);
  });

  return data;
};

const downloadExcel = (employees: Employee[], month: Date) => {
  const data = generateExcelData(employees, month);
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet(data);
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
  XLSX.writeFile(wb, `shifts_${month.getFullYear()}_${month.getMonth() + 1}.xlsx`);

  toast({
    title: 'הורד בהצלחה',
    description: 'קובץ האקסל הורד בהצלחה',
  });
};

export default AdminDashboard;
