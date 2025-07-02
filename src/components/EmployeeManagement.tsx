
import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { UserPlus, UserMinus, Edit } from 'lucide-react';
import { Employee } from '../types/shift';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import EmployeeEditModal from './EmployeeEditModal';

interface EmployeeManagementProps {
  employees: Employee[];
  onEmployeesChange: () => void;
  isDarkMode: boolean;
}

const EmployeeManagement: React.FC<EmployeeManagementProps> = ({ 
  employees, 
  onEmployeesChange, 
  isDarkMode 
}) => {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [newEmployee, setNewEmployee] = useState({
    name: '',
    code: '',
    role: 'mavtach' as 'ahamash' | 'boker' | 'mavtach' | 'bokrit',
    funnyTitle: ''
  });

  const handleAddEmployee = async () => {
    if (!newEmployee.name || !newEmployee.code || !newEmployee.role) {
      toast({
        title: 'שגיאה',
        description: 'יש למלא את כל השדות הנדרשים',
        variant: 'destructive'
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('employees')
        .insert({
          name: newEmployee.name,
          code: newEmployee.code,
          role: newEmployee.role,
          funny_title: newEmployee.funnyTitle || null,
          active: true,
          preferences: {},
          userpreferences: { preferredShifts: [], avoidedShifts: [], notes: '' }
        });

      if (error) {
        console.error('Error adding employee:', error);
        toast({
          title: 'שגיאה',
          description: 'שגיאה בהוספת העובד',
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'נוסף בהצלחה',
        description: `העובד ${newEmployee.name} נוסף בהצלחה`,
      });

      setNewEmployee({ name: '', code: '', role: 'mavtach', funnyTitle: '' });
      setIsAddDialogOpen(false);
      onEmployeesChange();
    } catch (error) {
      console.error('Error in handleAddEmployee:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בהוספת העובד',
        variant: 'destructive'
      });
    }
  };

  const handleEditEmployee = (employee: Employee) => {
    setSelectedEmployee(employee);
    setEditModalOpen(true);
  };

  const handleRemoveEmployee = async (employeeId: string, employeeName: string) => {
    if (!confirm(`האם אתה בטוח שברצונך להסיר את העובד ${employeeName}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('employees')
        .update({ active: false })
        .eq('id', employeeId);

      if (error) {
        console.error('Error removing employee:', error);
        toast({
          title: 'שגיאה',
          description: 'שגיאה בהסרת העובד',
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'הוסר בהצלחה',
        description: `העובד ${employeeName} הוסר בהצלחה`,
      });

      onEmployeesChange();
    } catch (error) {
      console.error('Error in handleRemoveEmployee:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בהסרת העובד',
        variant: 'destructive'
      });
    }
  };

  return (
    <>
      <Card className={isDarkMode ? 'bg-gray-800 border-gray-600' : ''}>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className={isDarkMode ? 'text-white' : ''}>
              ניהול עובדים ({employees.length} עובדים פעילים)
            </CardTitle>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <UserPlus className="h-4 w-4" />
                  הוסף עובד חדש
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>הוספת עובד חדש</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="name" className="block text-sm font-medium mb-2">
                      שם העובד *
                    </label>
                    <Input
                      id="name"
                      value={newEmployee.name}
                      onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })}
                      placeholder="הכנס שם העובד"
                    />
                  </div>
                  <div>
                    <label htmlFor="code" className="block text-sm font-medium mb-2">
                      קוד עובד *
                    </label>
                    <Input
                      id="code"
                      value={newEmployee.code}
                      onChange={(e) => setNewEmployee({ ...newEmployee, code: e.target.value })}
                      placeholder="למשל: EMP004"
                    />
                  </div>
                  <div>
                    <label htmlFor="role" className="block text-sm font-medium mb-2">
                      תפקיד *
                    </label>
                    <Select value={newEmployee.role} onValueChange={(value: any) => setNewEmployee({ ...newEmployee, role: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="בחר תפקיד" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ahamash">אחמש</SelectItem>
                        <SelectItem value="boker">בקר</SelectItem>
                        <SelectItem value="mavtach">מאבטח</SelectItem>
                        <SelectItem value="bokrit">בקרית</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label htmlFor="funnyTitle" className="block text-sm font-medium mb-2">
                      כינוי (אופציונלי)
                    </label>
                    <Input
                      id="funnyTitle"
                      value={newEmployee.funnyTitle}
                      onChange={(e) => setNewEmployee({ ...newEmployee, funnyTitle: e.target.value })}
                      placeholder="למשל: השומר הנאמן"
                    />
                  </div>
                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                      ביטול
                    </Button>
                    <Button onClick={handleAddEmployee}>
                      הוסף עובד
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {employees.map((employee) => (
              <div
                key={employee.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  isDarkMode ? 'bg-gray-700 border-gray-600' : 'bg-gray-50'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div>
                    <div className={`font-medium ${isDarkMode ? 'text-white' : ''}`}>
                      {employee.name}
                    </div>
                    <div className={`text-sm ${isDarkMode ? 'text-gray-300' : 'text-gray-500'}`}>
                      {employee.code} • {employee.role}
                      {employee.funnyTitle && ` • ${employee.funnyTitle}`}
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleEditEmployee(employee)}
                    className="text-blue-600 hover:bg-blue-50"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveEmployee(employee.id, employee.name)}
                    className="text-red-600 hover:bg-red-50"
                  >
                    <UserMinus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* מודאל עריכת עובד */}
      {selectedEmployee && (
        <EmployeeEditModal
          isOpen={editModalOpen}
          onClose={() => {
            setEditModalOpen(false);
            setSelectedEmployee(null);
          }}
          employee={selectedEmployee}
          onEmployeeUpdated={onEmployeesChange}
        />
      )}
    </>
  );
};

export default EmployeeManagement;
