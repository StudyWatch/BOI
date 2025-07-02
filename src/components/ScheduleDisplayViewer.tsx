import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { GeneratedSchedule, Employee, SHIFT_TIMES } from '../types/shift';
import { Calendar, Download, FileSpreadsheet, RefreshCw, Users } from 'lucide-react';
import { exportToExcel } from '../utils/excelExport';
import ShiftSwapModal from './ShiftSwapModal';
import { supabase } from '@/integrations/supabase/client';

interface ScheduleDisplayViewerProps {
  employees: Employee[];
  currentEmployee?: Employee;
  month: Date;
  isDarkMode?: boolean;
  isAdmin?: boolean;
}

const ScheduleDisplayViewer: React.FC<ScheduleDisplayViewerProps> = ({
  employees,
  currentEmployee,
  month,
  isDarkMode = false,
  isAdmin = false
}) => {
  const [schedule, setSchedule] = useState<GeneratedSchedule[]>([]);
  const [swapModalOpen, setSwapModalOpen] = useState(false);
  const [selectedShift, setSelectedShift] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const startDate = new Date(month.getFullYear(), month.getMonth(), 1).toISOString().slice(0, 10);
  const endDate = new Date(month.getFullYear(), month.getMonth() + 1, 0).toISOString().slice(0, 10);

  // טעינת הסידור מבסיס הנתונים כאשר עובדי month משתנים
  useEffect(() => {
    if (employees.length === 0) {
      setSchedule([]);
      return;
    }
    loadScheduleFromDB();
  }, [month, employees]);

  async function loadScheduleFromDB() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('shift_assignments')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: true });
      if (error) throw error;

      const grouped: Record<string, GeneratedSchedule[number]> = {};
      data.forEach(row => {
        if (!grouped[row.date]) grouped[row.date] = { date: row.date };
        if (!grouped[row.date][row.shift_type]) grouped[row.date][row.shift_type] = [];
        grouped[row.date][row.shift_type].push({
          id: row.employee_id,
          name: employees.find(e => e.id === row.employee_id)?.name || 'לא ידוע',
          role: row.role
        });
      });

      const loadedSchedule = Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
      setSchedule(loadedSchedule);
    } catch (err) {
      console.error('Error loading schedule:', err);
      setSchedule([]);
    } finally {
      setLoading(false);
    }
  }

  const handleSwapRequest = (shift: any) => {
    if (!currentEmployee) return;
    setSelectedShift(shift);
    setSwapModalOpen(true);
  };

  const handleExportExcel = () => {
    exportToExcel(schedule, month);
  };

  if (loading) {
    return (
      <Card className={isDarkMode ? 'bg-gray-800 border-gray-600' : ''}>
        <CardContent className="pt-6 text-center">
          טוען סידור...
        </CardContent>
      </Card>
    );
  }

  if (schedule.length === 0) {
    return (
      <Card className={isDarkMode ? 'bg-gray-800 border-gray-600' : 'bg-muted border border-dashed border-gray-300 p-6 rounded-lg'}>
        <CardContent className="pt-6 text-center">
          <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          <div className={`text-lg font-medium mb-2 ${isDarkMode ? 'text-white' : ''}`}>
            אין סידור זמין
          </div>
          <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
            יש לגנרט סידור חדש כדי לראות את חלוקת המשמרות
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* כותרת וכפתורי פעולה */}
      <Card className={isDarkMode ? 'bg-gray-800 border-gray-600' : ''}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
              <Calendar className="h-5 w-5" />
              סידור משמרות - {month.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-sm">
                {schedule.length} ימים
              </Badge>
              {isAdmin && (
                <Button
                  onClick={handleExportExcel}
                  className="flex items-center gap-2"
                  variant="outline"
                  title="ייצוא לאקסל"
                >
                  <FileSpreadsheet className="h-4 w-4" />
                  <Download className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* טבלת הסידור */}
      <Card className={isDarkMode ? 'bg-gray-800 border-gray-600' : ''}>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className={isDarkMode ? 'text-gray-200' : ''}>תאריך</TableHead>
                  <TableHead className={isDarkMode ? 'text-gray-200' : ''}>יום</TableHead>
                  {Object.entries(SHIFT_TIMES).map(([key, info]) => (
                    <TableHead key={key} className={isDarkMode ? 'text-gray-200' : ''}>
                      {info.label}
                    </TableHead>
                  ))}
                  <TableHead className={isDarkMode ? 'text-gray-200' : ''}>בעיות</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {schedule.map(day => {
                  const date = new Date(day.date);
                  const dayName = date.toLocaleDateString('he-IL', { weekday: 'long' });
                  const dateStr = date.toLocaleDateString('he-IL');

                  return (
                    <TableRow key={day.date}>
                      <TableCell className={`font-medium ${isDarkMode ? 'text-white' : ''}`}>
                        {dateStr}
                      </TableCell>
                      <TableCell className={isDarkMode ? 'text-gray-300' : ''}>
                        {dayName}
                      </TableCell>
                      {Object.keys(SHIFT_TIMES).map(shiftKey => {
                        const assignedEmployees = day[shiftKey as keyof GeneratedSchedule] as Employee[] || [];
                        return (
                          <TableCell
                            key={shiftKey}
                            className="align-top"
                          >
                            <div className="space-y-1">
                              {assignedEmployees.length === 0 && (
                                <div className={`text-center py-2 text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                                  לא שובץ
                                </div>
                              )}
                              {assignedEmployees.map(emp => (
                                <div
                                  key={emp.id}
                                  className={`flex items-center justify-between p-2 rounded text-xs shadow-sm transition-shadow hover:shadow-md
                                    ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}
                                    ${currentEmployee?.id === emp.id ? 'ring-2 ring-blue-500' : ''}
                                  `}
                                >
                                  <div>
                                    <div className={`font-medium ${isDarkMode ? 'text-white' : ''}`}>
                                      {emp.name}
                                    </div>
                                    <Badge
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {emp.role}
                                    </Badge>
                                  </div>
                                  {currentEmployee?.id === emp.id && !isAdmin && (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => handleSwapRequest({
                                        date: day.date,
                                        shift: shiftKey,
                                        role: emp.role,
                                        assignedBy: 'auto',
                                        assignedAt: new Date().toISOString()
                                      })}
                                      className="text-xs"
                                      title="בקשת חילוף משמרת"
                                    >
                                      <RefreshCw className="h-3 w-3" />
                                    </Button>
                                  )}
                                </div>
                              ))}
                            </div>
                          </TableCell>
                        );
                      })}
                      <TableCell>
                        {day.issues && day.issues.length > 0 && (
                          <div className="space-y-1">
                            {day.issues.map((issue, idx) => (
                              <Badge key={idx} variant="destructive" className="text-xs block mb-1">
                                {issue}
                              </Badge>
                            ))}
                          </div>
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

      {/* סיכום מהיר */}
      <Card className={isDarkMode ? 'bg-gray-800 border-gray-600' : ''}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
            <Users className="h-5 w-5" />
            סיכום הסידור
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className={`text-center p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : ''}`}>
                {schedule.length}
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                ימים בסידור
              </div>
            </div>
            <div className={`text-center p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className={`text-2xl font-bold text-green-600`}>
                {schedule.filter(day => !day.issues || day.issues.length === 0).length}
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                ימים ללא בעיות
              </div>
            </div>
            <div className={`text-center p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className={`text-2xl font-bold text-red-600`}>
                {schedule.filter(day => day.issues && day.issues.length > 0).length}
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                ימים עם בעיות
              </div>
            </div>
            <div className={`text-center p-4 rounded-lg ${isDarkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : ''}`}>
                {employees.length}
              </div>
              <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                עובדים פעילים
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* מודאל חילוף משמרות */}
      {currentEmployee && selectedShift && (
        <ShiftSwapModal
          isOpen={swapModalOpen}
          onClose={() => {
            setSwapModalOpen(false);
            setSelectedShift(null);
          }}
          currentEmployee={currentEmployee}
          currentShift={selectedShift}
          employees={employees}
          onSwapRequested={() => {
            loadScheduleFromDB(); // רענון לאחר חילוף
          }}
        />
      )}
    </div>
  );
};

export default ScheduleDisplayViewer;
