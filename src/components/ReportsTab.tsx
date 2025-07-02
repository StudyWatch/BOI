
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Employee } from '../types/shift';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { BarChart3, FileSpreadsheet, Calendar, Users, Download, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ReportsTabProps {
  employees: Employee[];
  selectedMonth: Date;
  isDarkMode: boolean;
}

interface ShiftStatistics {
  employeeId: string;
  employeeName: string;
  role: string;
  totalShifts: number;
  morningShifts: number;
  afternoonShifts: number;
  nightShifts: number;
  yavneShifts: number;
  weekendShifts: number;
}

const ReportsTab: React.FC<ReportsTabProps> = ({ employees, selectedMonth, isDarkMode }) => {
  const [reportType, setReportType] = useState<'monthly' | 'employee' | 'violations'>('monthly');
  const [selectedEmployee, setSelectedEmployee] = useState<string>('all');
  const [statistics, setStatistics] = useState<ShiftStatistics[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadStatistics();
  }, [selectedMonth, reportType, selectedEmployee]);

  const loadStatistics = async () => {
    setIsLoading(true);
    try {
      const year = selectedMonth.getFullYear();
      const month = selectedMonth.getMonth();
      const startDate = new Date(year, month, 1).toISOString().split('T')[0];
      const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];

      const { data: assignments, error } = await supabase
        .from('shift_assignments')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate);

      if (error) {
        console.error('Error loading assignments:', error);
        return;
      }

      // חישוב סטטיסטיקות
      const stats: Record<string, ShiftStatistics> = {};
      
      employees.forEach(employee => {
        stats[employee.id] = {
          employeeId: employee.id,
          employeeName: employee.name,
          role: employee.role,
          totalShifts: 0,
          morningShifts: 0,
          afternoonShifts: 0,
          nightShifts: 0,
          yavneShifts: 0,
          weekendShifts: 0
        };
      });

      assignments?.forEach(assignment => {
        const stat = stats[assignment.employee_id];
        if (stat) {
          stat.totalShifts++;
          
          const isWeekend = new Date(assignment.date).getDay() === 5 || new Date(assignment.date).getDay() === 6;
          if (isWeekend) stat.weekendShifts++;

          switch (assignment.shift_type) {
            case 'morning':
            case 'morning2':
            case 'visitorsCenter':
              stat.morningShifts++;
              break;
            case 'afternoon':
            case 'patrolAfternoon':
              stat.afternoonShifts++;
              break;
            case 'night':
              stat.nightShifts++;
              break;
            case 'yavne1':
            case 'yavne2':
              stat.yavneShifts++;
              break;
          }
        }
      });

      setStatistics(Object.values(stats));
    } catch (error) {
      console.error('Error in loadStatistics:', error);
      toast({
        title: 'שגיאה',
        description: 'שגיאה בטעינת הסטטיסטיקות',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const exportStatisticsToExcel = () => {
    const wb = XLSX.utils.book_new();
    
    // דף סטטיסטיקות כללי
    const summaryData = [
      ['דוח סטטיסטיקות משמרות'],
      ['חודש:', selectedMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' })],
      [''],
      ['עובד', 'תפקיד', 'סה"כ משמרות', 'בוקר', 'צהריים', 'לילה', 'יבנה', 'סופי שבוע']
    ];

    statistics.forEach(stat => {
      summaryData.push([
        stat.employeeName,
        stat.role,
        stat.totalShifts.toString(),
        stat.morningShifts.toString(),
        stat.afternoonShifts.toString(),
        stat.nightShifts.toString(),
        stat.yavneShifts.toString(),
        stat.weekendShifts.toString()
      ]);
    });

    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'סטטיסטיקות');

    // דף סיכום תפקידים
    const roleStats = statistics.reduce((acc, stat) => {
      if (!acc[stat.role]) {
        acc[stat.role] = { count: 0, totalShifts: 0 };
      }
      acc[stat.role].count++;
      acc[stat.role].totalShifts += stat.totalShifts;
      return acc;
    }, {} as Record<string, { count: number; totalShifts: number }>);

    const roleData = [
      ['סיכום לפי תפקידים'],
      [''],
      ['תפקיד', 'מספר עובדים', 'סה"כ משמרות', 'ממוצע משמרות לעובד']
    ];

    Object.entries(roleStats).forEach(([role, data]) => {
      roleData.push([
        role,
        data.count.toString(),
        data.totalShifts.toString(),
        (Math.round(data.totalShifts / data.count * 10) / 10).toString()
      ]);
    });

    const ws2 = XLSX.utils.aoa_to_sheet(roleData);
    XLSX.utils.book_append_sheet(wb, ws2, 'סיכום תפקידים');

    // שמירת הקובץ
    const monthName = selectedMonth.toLocaleDateString('he-IL', { month: 'long', year: 'numeric' });
    XLSX.writeFile(wb, `דוח_סטטיסטיקות_${monthName}.xlsx`);

    toast({
      title: 'הורד בהצלחה',
      description: 'קובץ הדוח הורד בהצלחה',
    });
  };

  const filteredStatistics = selectedEmployee === 'all' ? 
    statistics : 
    statistics.filter(stat => stat.employeeId === selectedEmployee);

  return (
    <div className="space-y-6">
      {/* כלי בקרה */}
      <Card className={isDarkMode ? 'bg-gray-800 border-gray-600' : ''}>
        <CardHeader>
          <CardTitle className={`flex items-center gap-2 ${isDarkMode ? 'text-white' : ''}`}>
            <BarChart3 className="h-5 w-5" />
            דוחות וסטטיסטיקות
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">סוג דוח</label>
              <Select value={reportType} onValueChange={(value: any) => setReportType(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">דוח חודשי</SelectItem>
                  <SelectItem value="employee">דוח לפי עובד</SelectItem>
                  <SelectItem value="violations">דוח הפרות</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2">עובד</label>
              <Select value={selectedEmployee} onValueChange={setSelectedEmployee}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">כל העובדים</SelectItem>
                  {employees.map(employee => (
                    <SelectItem key={employee.id} value={employee.id}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={exportStatisticsToExcel}
                className="flex items-center gap-2"
                disabled={isLoading || statistics.length === 0}
              >
                <FileSpreadsheet className="h-4 w-4" />
                <Download className="h-4 w-4" />
                ייצוא לאקסל
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* סיכום מהיר */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className={isDarkMode ? 'bg-gray-800 border-gray-600' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : ''}`}>
                  {filteredStatistics.length}
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  עובדים פעילים
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={isDarkMode ? 'bg-gray-800 border-gray-600' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <Calendar className="h-8 w-8 text-green-600" />
              <div>
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : ''}`}>
                  {filteredStatistics.reduce((sum, stat) => sum + stat.totalShifts, 0)}
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  סה"כ משמרות
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={isDarkMode ? 'bg-gray-800 border-gray-600' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="h-8 w-8 text-orange-600" />
              <div>
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : ''}`}>
                  {filteredStatistics.length > 0 ? 
                    Math.round(filteredStatistics.reduce((sum, stat) => sum + stat.totalShifts, 0) / filteredStatistics.length * 10) / 10 : 
                    0}
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  ממוצע לעובד
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={isDarkMode ? 'bg-gray-800 border-gray-600' : ''}>
          <CardContent className="pt-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="h-8 w-8 text-purple-600" />
              <div>
                <div className={`text-2xl font-bold ${isDarkMode ? 'text-white' : ''}`}>
                  {filteredStatistics.reduce((sum, stat) => sum + stat.weekendShifts, 0)}
                </div>
                <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                  משמרות סופ"ש
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* טבלת נתונים */}
      <Card className={isDarkMode ? 'bg-gray-800 border-gray-600' : ''}>
        <CardHeader>
          <CardTitle className={isDarkMode ? 'text-white' : ''}>
            סטטיסטיקות משמרות לפי עובדים
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div>טוען נתונים...</div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className={isDarkMode ? 'text-gray-200' : ''}>עובד</TableHead>
                    <TableHead className={isDarkMode ? 'text-gray-200' : ''}>תפקיד</TableHead>
                    <TableHead className={isDarkMode ? 'text-gray-200' : ''}>סה"כ משמרות</TableHead>
                    <TableHead className={isDarkMode ? 'text-gray-200' : ''}>בוקר</TableHead>
                    <TableHead className={isDarkMode ? 'text-gray-200' : ''}>צהריים</TableHead>
                    <TableHead className={isDarkMode ? 'text-gray-200' : ''}>לילה</TableHead>
                    <TableHead className={isDarkMode ? 'text-gray-200' : ''}>יבנה</TableHead>
                    <TableHead className={isDarkMode ? 'text-gray-200' : ''}>סופי שבוע</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStatistics.map(stat => (
                    <TableRow key={stat.employeeId}>
                      <TableCell className={`font-medium ${isDarkMode ? 'text-white' : ''}`}>
                        {stat.employeeName}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{stat.role}</Badge>
                      </TableCell>
                      <TableCell className={isDarkMode ? 'text-gray-300' : ''}>
                        {stat.totalShifts}
                      </TableCell>
                      <TableCell className={isDarkMode ? 'text-gray-300' : ''}>
                        {stat.morningShifts}
                      </TableCell>
                      <TableCell className={isDarkMode ? 'text-gray-300' : ''}>
                        {stat.afternoonShifts}
                      </TableCell>
                      <TableCell className={isDarkMode ? 'text-gray-300' : ''}>
                        {stat.nightShifts}
                      </TableCell>
                      <TableCell className={isDarkMode ? 'text-gray-300' : ''}>
                        {stat.yavneShifts}
                      </TableCell>
                      <TableCell className={isDarkMode ? 'text-gray-300' : ''}>
                        {stat.weekendShifts}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ReportsTab;
