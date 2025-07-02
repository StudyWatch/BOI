
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Employee } from '../types/shift';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Edit } from 'lucide-react';

interface EmployeeEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: Employee;
  onEmployeeUpdated: () => void;
}

const EmployeeEditModal: React.FC<EmployeeEditModalProps> = ({
  isOpen,
  onClose,
  employee,
  onEmployeeUpdated
}) => {
  const [editedEmployee, setEditedEmployee] = useState({
    name: employee.name,
    code: employee.code,
    role: employee.role,
    funnyTitle: employee.funnyTitle || ''
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    if (!editedEmployee.name || !editedEmployee.code || !editedEmployee.role) {
      toast({
        title: 'שגיאה',
        description: 'יש למלא את כל השדות הנדרשים',
        variant: 'destructive'
      });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase
        .from('employees')
        .update({
          name: editedEmployee.name,
          code: editedEmployee.code,
          role: editedEmployee.role,
          funny_title: editedEmployee.funnyTitle || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', employee.id);

      if (error) {
        console.error('Error updating employee:', error);
        toast({
          title: 'שגיאה',
          description: 'שגיאה בעדכון העובד',
          variant: 'destructive'
        });
        return;
      }

      toast({
        title: 'עודכן בהצלחה',
        description: `העובד ${editedEmployee.name} עודכן בהצלחה`,
      });

      onEmployeeUpdated();
      onClose();
    } catch (error) {
      console.error('Error in handleSave:', error);
      toast({
        title: 'שגיאה',
        description: 'אירעה שגיאה בעדכון העובד',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            עריכת עובד - {employee.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label htmlFor="edit-name" className="block text-sm font-medium mb-2">
              שם העובד *
            </label>
            <Input
              id="edit-name"
              value={editedEmployee.name}
              onChange={(e) => setEditedEmployee({ ...editedEmployee, name: e.target.value })}
              placeholder="הכנס שם העובד"
            />
          </div>
          
          <div>
            <label htmlFor="edit-code" className="block text-sm font-medium mb-2">
              קוד עובד *
            </label>
            <Input
              id="edit-code"
              value={editedEmployee.code}
              onChange={(e) => setEditedEmployee({ ...editedEmployee, code: e.target.value })}
              placeholder="למשל: EMP004"
            />
          </div>
          
          <div>
            <label htmlFor="edit-role" className="block text-sm font-medium mb-2">
              תפקיד *
            </label>
            <Select value={editedEmployee.role} onValueChange={(value: any) => setEditedEmployee({ ...editedEmployee, role: value })}>
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
            <label htmlFor="edit-funnyTitle" className="block text-sm font-medium mb-2">
              כינוי (אופציונלי)
            </label>
            <Input
              id="edit-funnyTitle"
              value={editedEmployee.funnyTitle}
              onChange={(e) => setEditedEmployee({ ...editedEmployee, funnyTitle: e.target.value })}
              placeholder="למשל: השומר הנאמן"
            />
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={isLoading}>
              ביטול
            </Button>
            <Button onClick={handleSave} disabled={isLoading}>
              {isLoading ? 'שומר...' : 'שמור שינויים'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default EmployeeEditModal;
