
import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LogOut, Calendar, User, BarChart3, RefreshCw } from 'lucide-react';
import { Employee, GeneratedSchedule } from '../types/shift';
import { EmployeeShiftSelector } from './EmployeeShiftSelector';
import { PersonalSummary } from './PersonalSummary';
import { WeekConstraintsChecker } from './WeekConstraintsChecker';
import { UserPreferencesForm } from './UserPreferencesForm';
import ShiftSwapRequests from './ShiftSwapRequests';
import ScheduleDisplayViewer from './ScheduleDisplayViewer';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface EmployeeDashboardProps {
  employeeId: string;
  onLogout: () => void;
}

const EmployeeDashboard: React.FC<EmployeeDashboardProps> = ({ employeeId, onLogout }) => {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(true);
  const [schedule, setSchedule] = useState<GeneratedSchedule[]>([]);

  useEffect(() => {
    loadEmployee();
    loadAllEmployees();
    loadSchedule();
  }, [employeeId, selectedMonth]);

  const loadEmployee = async () => {
    try {
      console.log('Loading employee with ID:', employeeId);
      
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('id', employeeId)
        .eq('active', true)
        .single();

      if (error) {
        console.error('Error loading employee:', error);
        toast({
          title: 'שגיאה',
          description: 'שגיאה בטעינת נתוני העובד',
          variant: 'destructive'
        });
        return;
      }

      console.log('Employee data loaded:', data);

      const mappedEmployee: Employee = {
        id: data.id,
        name: data.name,
        code: data.code,
        role: data.role as 'ahamash' | 'boker' | 'mavtach' | 'bokrit',
        funnyTitle: data.funny_title || undefined,
        preferences: (data.preferences as any) || {},
        userPreferences: (data.userpreferences as any) || { 
          preferredShifts: [], 
          avoidedShifts: [], 
          notes: '' 
        }
      };

      setEmployee(mappedEmployee);
      
      toast({
        title: 'נטען בהצלחה',
        description: `ברוך הבא ${mappedEmployee.name}!`,
      });
    } catch (error) {
      console.error('Error in loadEmployee:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בטעינת הנתונים',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadAllEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('*')
        .eq('active', true)
        .order('name');

      if (error) {
        console.error('Error loading all employees:', error);
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
    } catch (error) {
      console.error('Error loading all employees:', error);
    }
  };

  const loadSchedule = async () => {
    try {
      // טוען סידור נוכחי מהמסד נתונים - לדוגמה
      setSchedule([]);
    } catch (error) {
      console.error('Error loading schedule:', error);
    }
  };

  const handleUpdateEmployee = async (updatedEmployee: Employee) => {
    try {
      console.log('Updating employee:', updatedEmployee);
      
      const { error } = await supabase
        .from('employees')
        .update({
          preferences: updatedEmployee.preferences as any,
          userpreferences: updatedEmployee.userPreferences as any,
          updated_at: new Date().toISOString()
        })
        .eq('id', updatedEmployee.id);

      if (error) {
        console.error('Error updating employee:', error);
        toast({
          title: 'שגיאה',
          description: 'שגיאה בעדכון הנתונים',
          variant: 'destructive'
        });
        return;
      }

      setEmployee(updatedEmployee);
      
      toast({
        title: 'נשמר בהצלחה',
        description: 'הנתונים עודכנו בהצלחה',
      });
    } catch (error) {
      console.error('Error in handleUpdateEmployee:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בשמירת הנתונים',
        variant: 'destructive'
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <div className="text-sm">טוען נתונים...</div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="text-red-600 text-sm">שגיאה בטעינת נתוני העובד</div>
              <Button 
                onClick={onLogout} 
                variant="outline"
                className="w-full h-12 text-base"
              >
                חזור לעמוד הכניסה
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto py-4 px-2 sm:px-6">
        {/* כותרת מותאמת לנייד */}
        <Card className="mb-4 sm:mb-6">
          <CardHeader className="pb-3 sm:pb-6">
            <div className="flex flex-col space-y-3 sm:flex-row sm:justify-between sm:items-center sm:space-y-0">
              <CardTitle className="flex flex-col space-y-2 sm:flex-row sm:items-center sm:gap-2 sm:space-y-0">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  <span className="text-lg sm:text-xl">שלום, {employee.name}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {employee.funnyTitle && (
                    <span className="text-xs sm:text-sm text-gray-500 bg-gray-100 px-2 py-1 rounded">
                      {employee.funnyTitle}
                    </span>
                  )}
                  <span className="text-xs sm:text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded font-medium">
                    {employee.role}
                  </span>
                </div>
              </CardTitle>
              <Button 
                variant="outline" 
                onClick={onLogout}
                className="w-full sm:w-auto h-12 sm:h-10 text-base sm:text-sm"
              >
                <LogOut className="h-4 w-4 mr-2" />
                התנתק
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* טאבים מותאמים לנייד */}
        <Tabs defaultValue="shifts" className="space-y-4">
          <div className="overflow-x-auto">
            <TabsList className="grid w-full grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-gray-100">
              <TabsTrigger 
                value="shifts" 
                className="flex flex-col items-center gap-1 p-2 sm:p-3 text-xs sm:text-sm min-h-[60px] sm:min-h-[50px]"
              >
                <Calendar className="h-4 w-4" />
                <span>שיבוץ משמרות</span>
              </TabsTrigger>
              <TabsTrigger 
                value="schedule" 
                className="flex flex-col items-center gap-1 p-2 sm:p-3 text-xs sm:text-sm min-h-[60px] sm:min-h-[50px]"
              >
                <Calendar className="h-4 w-4" />
                <span>סידור משמרות</span>
              </TabsTrigger>
              <TabsTrigger 
                value="summary" 
                className="flex flex-col items-center gap-1 p-2 sm:p-3 text-xs sm:text-sm min-h-[60px] sm:min-h-[50px]"
              >
                <BarChart3 className="h-4 w-4" />
                <span>סיכום אישי</span>
              </TabsTrigger>
              <TabsTrigger 
                value="constraints" 
                className="flex flex-col items-center gap-1 p-2 sm:p-3 text-xs sm:text-sm min-h-[60px] sm:min-h-[50px]"
              >
                <span>בדיקות מגבלות</span>
              </TabsTrigger>
              <TabsTrigger 
                value="preferences" 
                className="flex flex-col items-center gap-1 p-2 sm:p-3 text-xs sm:text-sm min-h-[60px] sm:min-h-[50px]"
              >
                <span>העדפות אישיות</span>
              </TabsTrigger>
              <TabsTrigger 
                value="swaps" 
                className="flex flex-col items-center gap-1 p-2 sm:p-3 text-xs sm:text-sm min-h-[60px] sm:min-h-[50px]"
              >
                <RefreshCw className="h-4 w-4" />
                <span>חילוף משמרות</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="px-1 sm:px-0">
            <TabsContent value="shifts" className="mt-4">
              <EmployeeShiftSelector
                employees={[employee]}
                selectedMonth={selectedMonth}
                onUpdateEmployee={handleUpdateEmployee}
                isDarkMode={false}
              />
            </TabsContent>

            <TabsContent value="schedule" className="mt-4">
              <ScheduleDisplayViewer
                schedule={schedule}
                employees={employees}
                currentEmployee={employee}
                month={selectedMonth}
                isDarkMode={false}
                isAdmin={false}
              />
            </TabsContent>

            <TabsContent value="summary" className="mt-4">
              <PersonalSummary
                employee={employee}
                currentMonth={selectedMonth}
                onExportPDF={() => {
                  toast({
                    title: 'בקרוב',
                    description: 'ייצוא PDF יהיה זמין בקרוב',
                  });
                }}
                onExportExcel={() => {
                  toast({
                    title: 'בקרוב',
                    description: 'ייצוא Excel יהיה זמין בקרוב',
                  });
                }}
              />
            </TabsContent>

            <TabsContent value="constraints" className="mt-4">
              <WeekConstraintsChecker
                preferences={employee.preferences}
                currentMonth={selectedMonth}
                isDarkMode={false}
              />
            </TabsContent>

            <TabsContent value="preferences" className="mt-4">
              <UserPreferencesForm
                preferences={employee.userPreferences || { preferredShifts: [], avoidedShifts: [], notes: '' }}
                onUpdatePreferences={(updatedPrefs) => {
                  const updatedEmployee = { ...employee, userPreferences: updatedPrefs };
                  handleUpdateEmployee(updatedEmployee);
                }}
                isDarkMode={false}
              />
            </TabsContent>

            <TabsContent value="swaps" className="mt-4">
              <ShiftSwapRequests
                employee={employee}
                employees={employees}
                isDarkMode={false}
                onSwapProcessed={() => {
                  loadEmployee();
                  loadAllEmployees();
                  loadSchedule();
                }}
              />
            </TabsContent>
          </div>
        </Tabs>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
